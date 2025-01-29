const express = require('express');
const router = express.Router();
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const ytdl = require('ytdl-core');

// Set ffmpeg path
const ffmpegPath = "C:/ffmpeg/bin/ffmpeg.exe";  // Adjust this path as needed
ffmpeg.setFfmpegPath(ffmpegPath);

class YouTubeMusicAPI {
    constructor() {
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/json',
            'X-Goog-Visitor-Id': '',
            'Origin': 'https://music.youtube.com',
            'Referer': 'https://music.youtube.com/',
            'X-YouTube-Client-Name': '67',
            'X-YouTube-Client-Version': '1.20230731.00.00'
        };

        this.context = {
            client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20230731.00.00',
                hl: 'en',
                gl: 'US',
                clientScreen: 'WATCH',
                androidSdkVersion: 30
            },
            user: {
                lockedSafetyMode: false
            },
            request: {
                useSsl: true,
                internalExperimentFlags: [],
                consistencyTokenJars: []
            }
        };
    }

    async initialize() {
        try {
            const visitorId = await this.getVisitorId();
            this.headers['X-Goog-Visitor-Id'] = visitorId;
            console.log('API initialized with visitor ID:', visitorId);
        } catch (error) {
            console.error('Failed to initialize API:', error);
            throw error;
        }
    }

    async getVisitorId() {
        try {
            const response = await axios.get('https://music.youtube.com', {
                headers: {
                    'User-Agent': this.headers['User-Agent'],
                    'Accept': this.headers['Accept'],
                    'Accept-Language': this.headers['Accept-Language']
                }
            });

            const html = response.data;
            const visitorDataMatch = html.match(/"VISITOR_DATA":"([^"]+)"/);

            if (visitorDataMatch && visitorDataMatch[1]) {
                return visitorDataMatch[1];
            }

            throw new Error('Could not extract VISITOR_DATA');
        } catch (error) {
            console.error('Error getting visitor ID:', error.message);
            throw error;
        }
    }

    async search(query) {
        const url = 'https://music.youtube.com/youtubei/v1/search';

        const data = {
            query: query,
            context: this.context,
            params: 'EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D'
        };

        try {
            const response = await axios.post(url, data, { headers: this.headers });
            return this.parseSearchResults(response.data);
        } catch (error) {
            console.error('Search error:', error.message);
            throw error;
        }
    }

    parseSearchResults(data) {
        const results = [];

        try {
            const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

            if (!contents) return results;

            for (const section of contents) {
                const musicShelf = section.musicShelfRenderer;
                if (!musicShelf?.contents) continue;

                for (const item of musicShelf.contents) {
                    try {
                        const mrlir = item.musicResponsiveListItemRenderer;
                        if (!mrlir) continue;

                        const runs = mrlir.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
                        if (!runs?.[0]) continue;

                        const videoId = runs[0].navigationEndpoint?.watchEndpoint?.videoId;
                        if (!videoId) continue;

                        const title = runs[0].text;
                        const artist = mrlir.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Unknown Artist';

                        results.push({ videoId, title, artist });
                    } catch (itemError) {
                        continue;
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('Error parsing search results:', error);
            return results;
        }
    }
}

// Initialize the API
const youtubeMusic = new YouTubeMusicAPI();
youtubeMusic.initialize().catch(console.error);

// Search endpoint
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = await youtubeMusic.search(q);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Search failed', details: error.message });
    }
});

// Stream endpoint
router.get('/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { duration } = req.query; // Optional duration in seconds

        // Get video info
        const info = await ytdl.getInfo(videoId);
        const audioFormat = ytdl.chooseFormat(info.formats, {
            quality: 'highestaudio',
            filter: 'audioonly'
        });

        if (!audioFormat) {
            return res.status(404).json({ error: 'No audio format found' });
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Create ffmpeg command
        const stream = ffmpeg(audioFormat.url)
            .setFfmpegPath(ffmpegPath)
            .audioCodec('libmp3lame')
            .format('mp3')
            .noVideo();

        // Add duration limit if specified
        if (duration) {
            stream.duration(parseInt(duration));
        }

        // Add event handlers
        stream
            .on('start', (commandLine) => {
                console.log(`Spawned FFmpeg with command: ${commandLine}`);
            })
            .on('error', (error) => {
                console.error('FFmpeg error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Streaming failed' });
                }
            });

        // Pipe the stream to response
        stream.pipe(res, { end: true });
    } catch (error) {
        console.error('Stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Stream failed',
                details: error.message
            });
        }
    }
});

module.exports = router;
