const { Router } = require('express');
const Crypto = require('crypto-js');
const {
    api,
    apiWithRetry,
    parseBool,
    validLangs,
    tokenFromLink,
    formatQualityImage
} = require('../utils/apiUtils');

const router = Router();

function createDownloadLinks(encryptedMediaUrl) {
    if (!encryptedMediaUrl) {
        return [];
    }

    const qualities = [
        { id: "_12", bitrate: "12kbps" },
        { id: "_48", bitrate: "48kbps" },
        { id: "_96", bitrate: "96kbps" },
        { id: "_160", bitrate: "160kbps" },
        { id: "_320", bitrate: "320kbps" },
    ];

    const key = "38346591";

    try {
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

        // If no quality markers found, return as is
        return [{ quality: "unknown", link: decryptedLink }];
    } catch (error) {
        console.error("Error decrypting media URL:", error);
        return [];
    }
}

// Main song details endpoint
router.get("/", async (req, res) => {
    const { id, link, raw } = req.query;

    try {
        if (!id && !link) {
            throw new Error("Either song ID or link is required");
        }

        const pids = link ? tokenFromLink(link) : id;
        const result = await apiWithRetry("song.getDetails", {
            query: { pids }
        });

        if (!result.songs || result.songs.length === 0) {
            throw new Error("Song not found");
        }

        // Return raw response if requested
        if (parseBool(raw)) {
            return res.json(result);
        }

        const song = result.songs[0];
        const encryptedMediaUrl = song?.more_info?.encrypted_media_url;

        if (!encryptedMediaUrl) {
            throw new Error("No media URL found");
        }

        // Format the response with valuable information
        res.json({
            status: "Success",
            message: "Song details fetched successfully",
            data: {
                id: song.id,
                title: song.title,
                subtitle: song.subtitle,
                type: song.type,
                year: song.year,
                duration: song.more_info.duration,
                language: song.language,
                playCount: song.play_count,
                images: {
                    small: song.image.replace("150x150", "50x50"),
                    medium: song.image.replace("150x150", "500x500"),
                    large: song.image,
                    artists: song.more_info.artistMap?.primary_artists?.[0]?.image || null
                },
                album: {
                    id: song.more_info.album_id,
                    name: song.more_info.album,
                    url: song.more_info.album_url
                },
                artists: {
                    primary: (song.more_info.artistMap?.primary_artists || []).map(artist => ({
                        id: artist.id,
                        name: artist.name,
                        role: artist.role,
                        image: artist.image,
                        url: artist.perma_url
                    })),
                    all: (song.more_info.artistMap?.artists || []).map(artist => ({
                        id: artist.id,
                        name: artist.name,
                        role: artist.role,
                        image: artist.image || null,
                        url: artist.perma_url
                    }))
                },
                download: createDownloadLinks(encryptedMediaUrl),
                releaseDate: song.more_info.release_date,
                label: song.more_info.label,
                copyright: song.more_info.copyright_text,
                url: song.perma_url
            }
        });

    } catch (error) {
        console.error("Song details error:", error);
        res.status(400).json({
            status: "Failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

// Get song recommendations
router.get("/recommend", async (req, res) => {
    const { id, lang = "hindi,english", raw, mini } = req.query;

    try {
        if (!id) {
            throw new Error("Song ID is required");
        }

        const result = await apiWithRetry("reco.getreco", {
            query: {
                pid: id,
                language: validLangs(lang)
            }
        });

        if (result.error) {
            throw new Error(result.error.msg || "Failed to get recommendations");
        }

        // Return raw response if requested
        if (parseBool(raw)) {
            return res.json(result);
        }

        const formattedResults = result.map((song) => {
            // Basic version for mini=true
            if (parseBool(mini)) {
                return {
                    id: song.id,
                    title: song.title,
                    image: song.image
                };
            }

            // Full version
            return {
                id: song.id,
                title: song.title,
                subtitle: song.subtitle,
                image: formatQualityImage(song.image),
                artists: song.more_info?.artistMap?.primary_artists || [],
                download: createDownloadLinks(song.more_info?.encrypted_media_url)
            };
        });

        res.json({
            status: "Success",
            message: "Recommendations fetched successfully",
            data: formattedResults
        });

    } catch (error) {
        console.error("Recommendations error:", error);
        res.status(400).json({
            status: "Failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

module.exports = router;