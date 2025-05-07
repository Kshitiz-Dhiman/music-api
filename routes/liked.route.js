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
        // console.log(id);
        if (!id) {
            return res.status(404).json({ message: 'Provide a id' });
        }

        const user = await userModel.findOne({ _id: req.user._id });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.likedSong.includes(id)) {
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
        const { songId } = req.body;

        const user = await userModel.findOne({ _id: req.user._id });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.likedSong.includes(songId)) {
            await userModel.findByIdAndUpdate(
                req.user._id,
                { $pull: { likedSong: songId } },
                { new: true }
            );
            return res.status(200).json({ message: 'Song removed from liked songs', liked: false });
        } else {
            await userModel.findByIdAndUpdate(
                req.user._id,
                { $push: { likedSong: songId } },
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
