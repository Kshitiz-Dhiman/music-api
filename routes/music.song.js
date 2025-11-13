const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    apiWithRetry,
    endpoints,
    parseBool
} = require('../utils/apiUtils');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

router.use(limiter);

router.get('/', async (req, res) => {
    try {
        const { q: query = '', raw = 'false' } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                status: 'Failed',
                message: 'Valid search query is required'
            });
        }

        const result = await apiWithRetry(endpoints.all, {
            query: {
                query: query.trim(),
                isVersion4: false
            }
        });

        if (!result || typeof result !== 'object') {
            throw new Error('Invalid response format from JioSaavn');
        }
        const response = parseBool(raw) ? result : {
            status: 'Success',
            message: '✅ Search results fetched successfully',
            data: {
                songs: result.songs || { data: [] },
                albums: result.albums || { data: [] },
                playlists: result.playlists || { data: [] },
                artists: result.artists || { data: [] },
                top_query: result.topquery || { data: [] },
                shows: result.shows || { data: [] }
            }
        };

        res.set('Cache-Control', 'public, max-age=300');
        res.json(response);
    } catch (error) {
        console.error('Search endpoint error:', error);
        res.status(500).json({
            status: 'Failed',
            message: 'An error occurred while fetching search results',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
