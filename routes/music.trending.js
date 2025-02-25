const express = require('express');
const router = express.Router();

// Base URL for JioSaavn API
const baseUrl = "https://www.jiosaavn.com/api.php";

// Endpoints configuration
const endpoints = {
    trending: 'content.getTrending',
    featured_playlists: 'webapi.getFeaturedPlaylists',
    charts: 'webapi.getCharts',
    top_shows: 'webapi.getTopShows',
    top_artists: 'webapi.getTopArtists',
    top_albums: 'webapi.getTopAlbums',
    mix_details: 'webapi.getMixDetails',
    label_details: 'webapi.getLabelDetails',
    featured_stations: 'webradio.createFeaturedStations',
    actor_top_songs: 'webapi.getActorTopSongs',
    lyrics: 'lyrics.getLyrics',
    footer_details: 'webapi.getFooterDetails',
    mega_menu: 'webapi.getMegaMenu'
};

// Utility functions
const parseBool = (value) => {
    return ["true", "1"].includes(String(value).toLowerCase());
};

const validLangs = (lang) => {
    const supportedLangs = ["hindi", "english", "punjabi", "tamil", "telugu", "marathi", "gujarati", "bengali", "kannada", "bhojpuri", "malayalam", "urdu", "haryanvi", "rajasthani", "odia", "assamese"];
    return lang ? lang.split(",")
        .filter(l => supportedLangs.includes(l.toLowerCase()))
        .join(",") : "hindi,english";
};

const isJioSaavnLink = (link) => {
    try {
        const url = new URL(link);
        return url.hostname.includes('jiosaavn.com');
    } catch {
        return false;
    }
};

const tokenFromLink = (link) => {
    try {
        const url = new URL(link);
        return url.pathname.split("/").pop() || "";
    } catch {
        return "";
    }
};

// API call helper
const api = async (path, params = {}) => {
    const searchParams = new URLSearchParams({
        _format: "json",
        _marker: "0",
        ctx: "web6dot0",
        api_version: "4",
        ...params.query
    });

    const url = `${baseUrl}?__call=${path}&${searchParams}`;
    const response = await fetch(url, {
        headers: {
            cookie: `L=hindi,english; gdpr_acceptance=true; DL=english`
        }
    });

    return response.json();
};

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

        let result = await api(endpoints.trending, {
            query: {
                entity_type,
                entity_language: validLangs(lang).split(",")[0]
            }
        });

        if (!result.length) {
            result = await api(endpoints.trending, {
                query: {
                    entity_language: validLangs(lang).split(",")[0]
                }
            });

            result = result.filter(t => t.type === entity_type);

            if (!result.length) {
                throw new Error("Failed to fetch trending items");
            }
        }

        if (parseBool(raw)) {
            return res.json(result);
        }

        const response = {
            status: "Success",
            message: "✅ Currently Trending fetched successfully",
            data: result.map(item => ({
                id: item.id,
                title: item.title,
                type: item.type,
                subtitle: item.more_info.artistMap.primary_artists.map(artist => artist.name).join(", "),
                image: parseBool(mini) ? item.image : {
                    small: item.image,
                    medium: item.image.replace("150x150", "250x250"),
                    large: item.image.replace("150x150", "500x500")
                },
                url: item.perma_url,
                language: item.language
            }))
        };

        res.json(response);
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

// Other routes following similar pattern...
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

        const result = await api(endpoints.mix_details, {
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
