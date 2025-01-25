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
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const videoInfo = await ytdl.getInfo(req.params.youtubeId);
            try {
                const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' });

                // const stream = ffmpeg(format.url)
                //     .setFfmpegPath(ffmpegPath)
                //     .audioCodec('libmp3lame')
                //     .format('mp3')
                //     .on('end', () => {
                //         console.log('All done! Processing finished successfully');
                //     })
                //     .on('error', (err) => {
                //         console.error('Whoops! Error in processing:', err);
                //         if (!res.headersSent) {
                //             res.status(500).json({ error: 'Something went wrong with the stream' });
                //         }
                //     });

                try {
                    res.setHeader('Content-Type', 'audio/mpeg');
                    // res.setHeader('Transfer-Encoding', 'chunked');
                    // stream.pipe(res, { end: true });
                    res.json({ url: format.url });
                } catch (e) {
                    console.error("Error setting response headers or sending response:", e);
                    res.status(500).json({ error: 'Error setting response headers or sending response' });
                }
            } catch (e) {
                console.error("Error choosing format:", e);
                res.status(500).json({ error: 'Error choosing format' });
            }
        } catch (e) {
            console.error("Error fetching video info:", e);
            res.status(500).json({ error: 'Error fetching video info' });
        }
    } catch (e) {
        console.error("Error validating request:", e);
        res.status(500).json({ error: 'Error validating request' });
    }
});

export default router;
