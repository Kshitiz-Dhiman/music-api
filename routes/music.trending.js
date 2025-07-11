const express = require('express');
const router = express.Router();
const {
    apiWithRetry,
    endpoints,
    parseBool,
    validLangs,
    isJioSaavnLink,
    tokenFromLink,
    formatQualityImage,
    createDownloadLinks
} = require('../utils/apiUtils');

// Trending route
router.get("/trending", async (req, res) => {
    try {
        const {
            type: entity_type = "",
            lang = "",
            raw = "",
            mini = ""
        } = req.query;

        if (entity_type && !["song", "album", "playlist"].includes(entity_type)) {
            throw new Error("Invalid entity type");
        }

        let result;
        try {
            result = await apiWithRetry(endpoints.trending, {
                query: {
                    entity_type,
                    entity_language: validLangs(lang).split(",")[0]
                }
            });
        } catch (apiError) {
            console.error("Primary API call failed, trying fallback", apiError);
            // Fallback to a different approach
            result = await apiWithRetry(endpoints.trending, {
                query: {
                    entity_language: validLangs(lang).split(",")[0]
                }
            });

            if (entity_type) {
                result = result.filter(t => t.type === entity_type);
            }
        }

        if (!result || !result.length) {
            throw new Error("Failed to fetch trending items");
        }

        if (parseBool(raw)) {
            return res.json(result);
        }

        // Map the results safely
        const response = {
            status: "Success",
            message: "✅ Currently Trending fetched successfully",
            data: result.map(item => {
                try {
                    // Handle potential missing properties safely
                    const artistList = item.more_info?.artistMap?.primary_artists || [];
                    const subtitle = artistList.length > 0
                        ? artistList.map(artist => artist.name || "").filter(Boolean).join(", ")
                        : (item.subtitle || "");

                    return {
                        id: item.id,
                        title: item.title || "",
                        type: item.type || "",
                        subtitle,
                        image: parseBool(mini) ? item.image : formatQualityImage(item.image),
                        url: item.perma_url || "",
                        language: item.language || "",
                        download_urls: createDownloadLinks(item.more_info.encrypted_media_url),
                        artists: artistList
                    };
                } catch (mappingError) {
                    console.error("Error mapping item:", mappingError, item);
                    // Return a minimal valid object if mapping fails
                    return {
                        id: item.id || "unknown",
                        title: item.title || "Unknown Title",
                        type: item.type || "unknown",
                        subtitle: "Error parsing item details",
                        image: formatQualityImage(item.image),
                        download_urls: createDownloadLinks(item.more_info.encrypted_media_url),
                    };
                }
            })
        };

        res.json(response);
    } catch (error) {
        console.error("Trending API Error:", error);
        res.status(400).json({
            status: "Failed",
            message: error.message || "Error fetching trending data"
        });
    }
});

// Mix details route
router.get("/mix", async (req, res) => {
    try {
        const {
            token = "",
            link = "",
            page = "",
            n = "20",
            lang = "",
            raw = "",
            mini = ""
        } = req.query;

        if (!link && !token) {
            throw new Error("Please provide a valid token or link");
        }

        if (link && !(isJioSaavnLink(link) && link.includes("mix"))) {
            throw new Error("Please provide a valid link");
        }

        const result = await apiWithRetry(endpoints.mix_details, {
            query: {
                token: token || tokenFromLink(link),
                type: "mix",
                p: page,
                n,
                language: validLangs(lang)
            }
        });

        if (!result.id) {
            throw new Error("Failed to fetch mix details");
        }

        if (parseBool(raw)) {
            return res.json(result);
        }

        const response = {
            status: "Success",
            message: "✅ Mix Details fetched successfully",
            data: parseBool(mini) ? {
                id: result.id,
                title: result.title,
                songs: result.songs.map(s => ({
                    id: s.id,
                    title: s.title,
                    image: s.image
                }))
            } : result
        };

        res.json(response);
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

module.exports = router;
