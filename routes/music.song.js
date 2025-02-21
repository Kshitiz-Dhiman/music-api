const express = require('express');
const router = express.Router();
const axios = require('axios');
const { URLSearchParams } = require('url');

// Base URL and endpoints configuration
const BASE_URL = 'https://www.jiosaavn.com/api.php';
const endpoints = {
    all: 'autocomplete.get',
    top_search: 'content.getTrending',
    songs: 'search.getResults',
    albums: 'search.getAlbumResults',
    playlists: 'search.getPlaylistResults',
    artists: 'search.getArtistResults',
    more: 'search.getMoreResults'
};

// Enhanced headers and request configuration
const getRequestConfig = () => ({
    headers: {
        'Cookie': 'L=english; gdpr_acceptance=true; DL=english',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': 'https://www.jiosaavn.com',
        'Referer': 'https://www.jiosaavn.com',
    },
    timeout: 10000, // 10 second timeout
    validateStatus: status => status >= 200 && status < 300
});

// Retrying mechanism for API calls
const apiWithRetry = async (path, params = {}, maxRetries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const searchParams = new URLSearchParams({
                __call: path,
                _format: 'json',
                _marker: '0',
                ctx: 'web6dot0',
                api_version: '4',
                ...params
            });

            const url = `${BASE_URL}?${searchParams}`;

            const response = await axios.get(url, getRequestConfig());

            // Validate response data
            if (!response.data) {
                throw new Error('Empty response received from JioSaavn');
            }

            return response.data;
        } catch (error) {
            lastError = error;
            console.error(`API call attempt ${attempt} failed:`, error.message);

            // If it's the last attempt, throw the error
            if (attempt === maxRetries) {
                throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            }

            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

router.use(limiter);

// Search endpoint with enhanced validation and error handling
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
            query: query.trim(),
            isVersion4: false
        });

        if (!result || typeof result !== 'object') {
            throw new Error('Invalid response format from JioSaavn');
        }

        const response = raw === 'true' ? result : {
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

        // Cache headers
        res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
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
