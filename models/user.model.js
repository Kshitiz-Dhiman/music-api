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
    likedSong: [
        {
            songId: String,
            title: String,
            artist: String,
            image: String
        }
    ],
    likedAlbum: {
        type: Array,
    },
    likedArtist: {
        type: Array,
    },
    history: [
        {
            songId: String,
            title: String,
            artist: String,
            image: String,
        }
    ],
})

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
