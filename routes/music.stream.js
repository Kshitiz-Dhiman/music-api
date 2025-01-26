const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { param, validationResult } = require("express-validator");
const router = express.Router();
const ffmpegPath = process.env.FF_PATH || 'C:/ffmpeg/bin/ffmpeg.exe';
const dotenv = require('dotenv');
dotenv.config();
const validateYouTubeId = [
    param('youtubeId').isString().withMessage('Invalid YouTube ID'),
];

router.get("/:youtubeId", validateYouTubeId, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    res.setHeader('Content-Type', 'audio/mpeg');

    try {
        const info = await ytdl.getInfo(req.params.youtubeId, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/'
                }
            }
        });

        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highestaudio',
            filter: 'audioonly',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/'
                }
            }
        });

        if (!format) {
            return res.status(404).json({ error: 'No suitable audio format found' });
        }

        const proc = ffmpeg(format.url)
            .setFfmpegPath(ffmpegPath)
            .toFormat('mp3');

        proc.on('error', (err) => {
            console.error('FFmpeg processing error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: `Stream processing error: ${err.message}` });
            }
        });

        proc.pipe(res, { end: true });
    } catch (error) {
        console.error('YouTube stream error:', error);
        res.status(500).json({
            error: 'Stream fetch failed',
            details: error.message
        });
    }
});

module.exports = router;
