const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    image: {
        type: String,
    },
    likedSong: {
        type: Array,
    },
    likedAlbum: {
        type: Array,
    },
    likedArtist: {
        type: Array,
    },
    history: {
        type: Array,
    }
})

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
