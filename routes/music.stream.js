const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { param, validationResult } = require("express-validator");
const router = express.Router();
const ffmpegPath = 'C:/ffmpeg/bin/ffmpeg.exe';

const validateYouTubeId = [
    param('youtubeId').isString().withMessage('Invalid YouTube ID'),
];

router.get("/:youtubeId", validateYouTubeId, async (req, res) => {
    try {
        // Set longer timeout
        req.setTimeout(30000);  // 30 seconds

        const info = await ytdl.getInfo(req.params.youtubeId);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

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
