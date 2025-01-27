const express = require('express');
const YoutubeMusicApi = require('youtube-music-api');
const router = express.Router();
const YTMusic = require('ytmusic-api');

router.get("/homepagetopalbums", async (req, res) => {
    try {
        const api = new YoutubeMusicApi();
        await api.initalize();
        const search = await api.search('music', 'album');
        res.status(200).json(search);
    } catch (e) {
        console.error("Error fetching home page top albums:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.get("/getalbum", (req, res) => {
    try {
        const api = new YoutubeMusicApi();
        api.initalize().then(async () => {
            const search = await api.search(req.query.q, "ALBUM");
            res.status(200).json(search);
        });
    } catch (e) {
        console.error("Error fetching album:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



router.get("/album/:id", async (req, res) => {
    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        ytmusic.getAlbum(req.params.id).then((album) => {
            res.json(album);
        });
    } catch (e) {
        console.error("Error fetching album:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;
