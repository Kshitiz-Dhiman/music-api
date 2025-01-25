import express from 'express';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { param, validationResult } from 'express-validator';

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
        const videoInfo = await ytdl.getInfo(req.params.youtubeId);
        const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' });

        console.log("Starting ffmpeg stream with format URL:", format.url);
        const stream = ffmpeg(format.url)
            .setFfmpegPath(ffmpegPath)
            .audioCodec('libmp3lame')
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
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
