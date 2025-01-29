const express = require('express');
const YoutubeMusicApi = require('youtube-music-api');
const router = express.Router();
const YTMusic = require('ytmusic-api');
const { check, validationResult } = require('express-validator');

router.get("/homepagesongs", async (req, res) => {
    try {
        const api = new YoutubeMusicApi();
        await api.initalize().then(async () => {
            const search = await api.search("song");
            res.status(200).json(search);
        })
    } catch (e) {
        console.error("Error fetching home page songs:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/suggestions", [
    check('q').notEmpty().withMessage('Query parameter q is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

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

router.get("/getsong", [
    check('q').notEmpty().withMessage('Query parameter q is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const api = new YoutubeMusicApi();
        await api.initalize();
        const search = await api.search(req.query.q, "SONG");
        res.status(200).json(search);
    } catch (e) {
        console.error("Error fetching song:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/lyrics/:id", [
    check('id').notEmpty().withMessage('Parameter id is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        const lyrics = await ytmusic.getLyrics(req.params.id);
        res.json(lyrics);
    } catch (e) {
        console.error("Error fetching lyrics:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/song/:id", [
    check('id').notEmpty().withMessage('Parameter id is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        const song = await ytmusic.getSong(req.params.id);
        res.json(song);
    } catch (e) {
        console.error("Error fetching song:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
