const express = require('express');
const route = express.Router();

route.get('/generate', async (req, res) => {
    try {
        res.send('Music generation started');
    } catch (err) {
        console.error(err);
        res.status(500).send('Music generation failed');
    }
});

module.exports = route;
