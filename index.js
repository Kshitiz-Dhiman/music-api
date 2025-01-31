const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const dotenv = require('dotenv');
dotenv.config();

//Routes
const musicStream = require("./routes/music.stream.js");
const musicOptions = require("./routes/music.song.js");
const musicArtist = require("./routes/music.artist.js");
const musicAlbum = require("./routes/music.album.js");
app.use("/music", musicOptions);
app.use("/stream", musicStream);
app.use("/artist", musicArtist);
app.use("/album", musicAlbum);
// Add this to your main app.js or server.js
const { execSync } = require('child_process');

function checkYtDlp() {
    try {
        const version = execSync('yt-dlp --version').toString().trim();
        console.log('✅ yt-dlp is installed, version:', version);
        return true;
    } catch (error) {
        console.error('❌ yt-dlp is not installed or not accessible:', error.message);
        return false;
    }
}

// Call this when your server starts
checkYtDlp();
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to the music app"
    });
});
app.listen(3000, () => {
    checkYtDlp();
    console.log("Server is running on port 3000");
});
