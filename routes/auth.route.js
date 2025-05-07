const express = require('express');
const router = express.Router();
const { oauth2client } = require('../utils/googleConfig');
const { default: axios } = require('axios');
const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
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

// Google OAuth login route
router.get('/google', async (req, res) => {
    try {
        const { code } = req.query;
        const googleRes = await oauth2client.getToken(code);

        oauth2client.setCredentials(googleRes.tokens);

        const userRes = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`);

        console.log(userRes.data);
        const { email, name, picture } = userRes.data;

        let user = await userModel.findOne({ email });
        if (!user) {
            user = await userModel.create({ email, name, image: picture });
        }
        const { _id } = user;
        const token = jwt.sign({ _id, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_TIMEOUT });

        return res.status(200).json({ token, user: { _id, email, name, image: picture } });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});

// Get user info route
router.get('/user', verifyToken, async (req, res) => {
    try {
        const user = await userModel.findOne({ _id: req.user._id });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                image: user.image
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Error fetching user information' });
    }
});

module.exports = router;
