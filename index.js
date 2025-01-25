import express from "express";
import cors from "cors";

const app = express();

//Routes
import musicStream from "./routes/music.stream.js";
import homePage from "./routes/music.home.js";

app.use("/stream", musicStream);
app.use("/home", homePage);
app.get("/", (req, res) => {
    res.send("Hello World");
});
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
