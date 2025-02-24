const { Router, Request, Response, NextFunction } = require('express');
const Crypto = require('crypto-js');

const router = Router();
const baseUrl = "https://www.jiosaavn.com/api.php";

// Utility function to make API calls
const api = async (path, params = {}) => {
    const searchParams = new URLSearchParams({
        _format: "json",
        _marker: "0",
        ctx: "web6dot0",
        api_version: "4",
        ...params
    });

    const url = `${baseUrl}?__call=${path}&${searchParams}`;

    const response = await fetch(url, {
        headers: {
            cookie: "L=hindi,english; gdpr_acceptance=true; DL=english"
        }
    });

    return response.json();
};
function createDownloadLinks(encryptedMediaUrl) {
    const qualities = [
        { id: "_12", bitrate: "12kbps" },
        { id: "_48", bitrate: "48kbps" },
        { id: "_96", bitrate: "96kbps" },
        { id: "_160", bitrate: "160kbps" },
        { id: "_320", bitrate: "320kbps" },
    ];

    const key = "38346591";

    const decrypted = Crypto.DES.decrypt(
        { ciphertext: Crypto.enc.Base64.parse(encryptedMediaUrl) },
        Crypto.enc.Utf8.parse(key),
        { mode: Crypto.mode.ECB }
    );

    const decryptedLink = decrypted.toString(Crypto.enc.Utf8);

    for (const q of qualities) {
        if (decryptedLink.includes(q.id)) {
            return qualities.map(({ id, bitrate }) => ({
                quality: bitrate,
                link: decryptedLink.replace(q.id, id),
            }));
        }
    }

    return decryptedLink;
}
// Middleware to validate request parameters
// router.use("/", async (req, res, next) => {
//     const { id, link } = req.query;

//     if (!id && !link) {
//         return res.status(400).json({
//             status: "Failed",
//             message: "Please provide song id(s) or link"
//         });
//     }

//     next();
// });

// Get song details
router.get("/", async (req, res, next) => {
    const { id, link, mini = "false" } = req.query;

    try {
        // Get the token either from link or use the ID directly
        const pids = link ? extractTokenFromLink(link) : id;

        const result = await api("song.getDetails", {
            pids  // Now pids is properly defined
        });

        if (!result.songs) {
            throw new Error("Song not found");
        }
        const encryptedMediaUrl = result.songs[0]?.more_info?.encrypted_media_url;

        if (!encryptedMediaUrl) {
            throw new Error("No media URL found");
        }

        const download = createDownloadLinks(encryptedMediaUrl);
        res.json({
            status: "Success",
            message: "Song details fetched successfully",
            data: parseMini(mini) ? miniResponse(result) : result,
            download: download
        });

    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

// Get song recommendations
// Get song recommendations
router.get("/recommend", async (req, res) => {
    const { id, lang = "hindi,english" } = req.query;

    try {
        // Changed from reco.getRecommendedSongs to reco.getreco
        const result = await api("reco.getreco", {
            pid: id,
            language: lang
        });

        // Add validation for the response
        if (result.error) {
            throw new Error(result.error.msg || "Failed to get recommendations");
        }

        res.json({
            status: "Success",
            message: "Recommendations fetched successfully",
            data: result.map((song) => (
                {
                    id: song.id,
                    title: song.title,
                    image: song.image,
                    artists: song.more_info.artistMap.primary_artists,
                    download_url: createDownloadLinks(song.more_info.encrypted_media_url),
                }
            ))
        });

    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
const extractTokenFromLink = (link) => {
    const url = new URL(link);
    return url.pathname.split("/").pop() || "";
};

const parseMini = (mini) => {
    return mini?.toLowerCase() === "true";
};

const miniResponse = (data) => {
    const { id, title, url, image } = data.songs[0];
    return { id, title, url, image };
};

module.exports = router;
