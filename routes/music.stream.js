const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const router = express.Router();

const ffmpegPath = "C:/ffmpeg/bin/ffmpeg.exe";

router.get("/:youtubeId", async (req, res) => {
    try {
        const videoId = req.params.youtubeId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Fetch video information
        const info = await ytdl.getInfo(videoUrl);

        // Filter audio-only formats
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        const format = audioFormats[0];

        if (!format) {
            return res.status(404).json({ error: 'No audio format found' });
        }

        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream and trim the audio to the first 30 seconds
        const stream = ffmpeg(ytdl(videoUrl, { format: format }))
            .setFfmpegPath(ffmpegPath)
            .audioCodec('libmp3lame')
            .duration(30)
            .format('mp3')
            .noVideo()
            .on('start', (commandLine) => {
                console.log(`Spawned Ffmpeg with command: ${commandLine}`);
            })
            .on('end', () => {
                console.log('All done! Processing finished successfully');
            })
            .on('error', (error) => {
                console.error('FFmpeg error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Something went wrong with the stream' });
                }
            });

        res.setHeader('Transfer-Encoding', 'chunked');
        stream.pipe(res, { end: true });
    } catch (error) {
        console.error('Stream fetch failed:', error);
        res.status(500).json({
            error: 'Stream fetch failed',
            details: error.message
        });
    }
});

module.exports = router;
