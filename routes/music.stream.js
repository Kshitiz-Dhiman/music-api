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
        return res.status(400).json({ errors: errors.array() });
    }

    res.setHeader('Content-Type', 'audio/mpeg');

    try {
        const info = await ytdl.getInfo(req.params.youtubeId);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

        const proc = ffmpeg(format?.url)
            .setFfmpegPath(ffmpegPath)  // For local dev, just set the path to ffmpeg.exe here like: setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe')
            .toFormat('mp3');

        proc.on('end', () => {
            console.log('All done! Processing finished successfully');
        });

        proc.on('error', (err) => {
            console.error('Whoops! Error in processing:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Something went wrong with the stream' });
            }
        });

        proc.pipe(res, { end: true });
    } catch (error) {
        console.error('Yikes! Error in fetching YouTube stream:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Oops! Error fetching YouTube stream' });
        }
    }
});

module.exports = router;
