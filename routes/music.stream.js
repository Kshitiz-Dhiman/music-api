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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        console.log("Fetching video info for ID:", req.params.youtubeId);
        const videoUrl = `https://www.youtube.com/watch?v=${req.params.youtubeId}`;
        const audioStream = ytdl(videoUrl, { quality: 'lowestaudio', filter: 'audioonly' });

        console.log("Starting ffmpeg stream with video URL:", videoUrl);
        const stream = ffmpeg(audioStream)
            .setFfmpegPath(ffmpegPath)
            .audioCodec('libmp3lame')
            .audioBitrate(128) // Compress the audio to 128 kbps
            .format('mp3')
            .on('end', () => {
                console.log('All done! Processing finished successfully');
            })
            .on('error', (err) => {
                console.error('Whoops! Error in processing:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Something went wrong with the stream' });
                }
            });

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');
        stream.pipe(res, { end: true });
    } catch (e) {
        console.error("Error fetching video info:", e);
        res.status(500).json({ error: "Error fetching video info" });
    }
});

module.exports = router;
