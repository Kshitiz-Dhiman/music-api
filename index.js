const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const dotenv = require('dotenv');
dotenv.config();

//Routes

const musicOptions = require("./routes/music.song.js");
const musicArtist = require("./routes/music.artist.js");
const musicAlbum = require("./routes/music.album.js");
const songDetails = require("./routes/music.song.details.js");
app.use("/search", musicOptions);

app.use("/artist", musicArtist);
app.use("/album", musicAlbum);
app.use("/song", songDetails);

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to the music app"
    });
});
app.listen(4000, () => {
    console.log("Server is running on port 4000");
});
