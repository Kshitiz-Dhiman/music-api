const express = require("express");
const ytdl = require("ytdl-core");
const router = express.Router();

router.get("/:youtubeId", async (req, res) => {
    try {
        const videoId = req.params.youtubeId;

        const info = await ytdl.getInfo(videoId, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': 'YOUR_YOUTUBE_COOKIE_HERE', // Add your cookie
                    'Referer': 'https://www.youtube.com/'
                }
            }
        });

        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        const format = audioFormats[0];

        if (!format) {
            return res.status(404).json({ error: 'No audio format found' });
        }

        res.setHeader('Content-Type', 'audio/mpeg');

        const stream = ytdl(videoId, {
            format: format,
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': 'VISITOR_INFO1_LIVE=UaZN2cW2ilU; HSID=ACnq2eUTem6LoFsAW; SSID=A4RZHehduX_mj2Atz; APISID=l5DdmxVAKUrMLRnZ/A9xjmRCv-1U1dvsO8; SAPISID=C2AcXePwNtDzdMmv/A_RA7BygTRKlZm_Ni; __Secure-1PAPISID=C2AcXePwNtDzdMmv/A_RA7BygTRKlZm_Ni' // Repeat cookie
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
