const express = require("express");
const { YTMusic } = require("ytmusic-api");
const { query, validationResult } = require("express-validator");
const router = express.Router();

// Middleware for input validation
const validateQuery = [
    query('q').notEmpty().withMessage('Query parameter "q" is required')
];

router.get("/suggestions", validateQuery, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        const musics = await ytmusic.search(req.query.q);
        res.json(musics);
    } catch (e) {
        console.error("Error fetching music suggestions:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
