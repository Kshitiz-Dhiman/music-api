const express = require('express');
const router = express.Router();
const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Checking if song is liked or not
router.get('/song', verifyToken, async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(404).json({ message: 'Provide a id' });
        }

        const user = await userModel.findOne({ _id: req.user._id });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the song exists in the likedSong array by songId
        const songExists = user.likedSong.some(song => song.songId === id);

        if (songExists) {
            return res.status(200).json({ message: 'Song is liked', liked: true });
        } else {
            return res.status(200).json({ message: 'Song is not liked', liked: false });
        }
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Error" })
    }
})

router.post('/song', verifyToken, async (req, res) => {
    try {
        const { songId, title, artist, image } = req.body;

        if (!songId) {
            return res.status(400).json({ message: 'Song ID is required' });
        }

        const user = await userModel.findOne({ _id: req.user._id });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the song exists in the likedSong array by songId
        const songIndex = user.likedSong.findIndex(song => song.songId === songId);

        if (songIndex !== -1) {
            // Song exists, remove it
            await userModel.findByIdAndUpdate(
                req.user._id,
                { $pull: { likedSong: { songId: songId } } },
                { new: true }
            );
            return res.status(200).json({ message: 'Song removed from liked songs', liked: false });
        } else {
            // Song doesn't exist, add it with additional info
            const songInfo = {
                songId,
                title: title || 'Unknown Title',
                artist: artist || 'Unknown Artist',
                image: image || ''
            };

            await userModel.findByIdAndUpdate(
                req.user._id,
                { $push: { likedSong: songInfo } },
                { new: true }
            );
            return res.status(200).json({ message: 'Song added to liked songs', liked: true });
        }
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: 'Error updating liked songs' });
    }
});

router.get('/songs', verifyToken, async (req, res) => {
    try {
        const user = await userModel.findOne({ _id: req.user._id });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ likedSongs: user.likedSong });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: 'Error fetching liked songs' });
    }
});

module.exports = router;
