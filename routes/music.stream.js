const express = require("express");
const ytdl = require("ytdl-core-discord");
const router = express.Router();

router.get("/:youtubeId", async (req, res) => {
    res.setHeader('Content-Type', 'audio/mpeg');

    try {
        const stream = await ytdl(req.params.youtubeId, {
            filter: 'audioonly',
            quality: 'highestaudio',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/'
                }
            }
        });

        stream.pipe(res);
    } catch (error) {
        console.error('YouTube stream error:', error);
        res.status(500).json({
            error: 'Stream fetch failed',
            details: error.message
        });
    }
});

module.exports = router;
