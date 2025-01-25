const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//Routes
const musicStream = require("./routes/music.stream.js");
const homePage = require("./routes/music.home.js");
app.use("/stream", musicStream);
app.use("/home", homePage);
app.get("/", (req, res) => {
    res.json("Music rahh");
});
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
