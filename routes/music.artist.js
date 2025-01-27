const express = require('express');
const YoutubeMusicApi = require('youtube-music-api');
const router = express.Router();
const YTMusic = require('ytmusic-api');
const { query, param, validationResult } = require('express-validator');

router.get("/getartist", [
    query('q').notEmpty().withMessage('Query parameter "q" is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const api = new YoutubeMusicApi();
        await api.initalize();
        const search = await api.search(req.query.q, "ARTIST");
        res.status(200).json(search);
    } catch (e) {
        console.error("Error fetching artist:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/artist/:id", [
    param('id').notEmpty().withMessage('Path parameter "id" is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        const artist = await ytmusic.getArtist(req.params.id);
        res.json(artist);
    } catch (e) {
        console.error("Error fetching artist:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
