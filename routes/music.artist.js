const express = require('express');
const YoutubeMusicApi = require('youtube-music-api');
const router = express.Router();
const YTMusic = require('ytmusic-api');

router.get("/getartist", (req, res) => {
    try {
        const api = new YoutubeMusicApi();
        api.initalize().then(async () => {
            const search = await api.search(req.query.q, "ARTIST");
            res.status(200).json(search);
        });
    } catch (e) {
        console.error("Error fetching artist:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/artist/:id", async (req, res) => {
    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        ytmusic.getArtist(req.params.id).then((artist) => {
            res.json(artist);
        });
    } catch (e) {
        console.error("Error fetching artist:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
