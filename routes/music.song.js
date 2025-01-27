const express = require('express');
const YoutubeMusicApi = require('youtube-music-api');
const router = express.Router();
const YTMusic = require('ytmusic-api');

router.get("/homepagesongs", async (req, res) => {
    try {
        const api = new YoutubeMusicApi();
        await api.initialize();
        const search = await api.search('music', 'song');
        res.status(200).json(search);
    } catch (e) {
        console.error("Error fetching home page songs:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.get("/suggestions", async (req, res) => {
    try {
        const api = new YoutubeMusicApi();
        await api.initalize();
        const search = await api.getSearchSuggestions(req.query.q);
        res.status(200).json(search);
    } catch (e) {
        console.error("Error fetching music suggestions:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.get("/getsong", (req, res) => {
    try {
        const api = new YoutubeMusicApi();
        api.initalize().then(async () => {
            const search = await api.search(req.query.q, "SONG");
            res.status(200).json(search);
        });
    } catch (e) {
        console.error("Error fetching song:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.get("/lyrics/:id", async (req, res) => {
    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        ytmusic.getLyrics(req.params.id).then((lyrics) => {
            res.json(lyrics);
        });
    } catch (e) {
        console.error("Error fetching lyrics:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.get("/song/:id", async (req, res) => {
    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        ytmusic.getSong(req.params.id).then((song) => {
            res.json(song);
        });
    } catch (e) {
        console.error("Error fetching song:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
module.exports = router;
