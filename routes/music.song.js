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

// API helper function with better error handling
const api = async (path, params = {}) => {
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

        const response = await axios.get(url, {
            headers: {
                'cookie': 'L=english; gdpr_acceptance=true; DL=english',
                'accept': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('API call failed:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to fetch data from JioSaavn');
    }
};

// Search endpoint with improved error handling and validation
router.get('/', async (req, res) => {
    try {
        const { q: query = '', raw = 'false' } = req.query;

        if (!query) {
            throw new Error('Search query is required');
        }

        const result = await api(endpoints.all, {
            query,
            isVersion4: false
        });

        if (!result || (!result.albums && !result.songs && !result.artists)) {
            throw new Error('No search results found');
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

        res.json(response);
    } catch (error) {
        res.status(400).json({
            status: 'Failed',
            message: error.message
        });
    }
});

module.exports = router;
