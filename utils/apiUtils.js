const jwt = require('jsonwebtoken');

const BASE_URL = "https://www.jiosaavn.com/api.php";
const Crypto = require('crypto-js');
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

// Format quality image utility
const formatQualityImage = (imageUrl) => {
    if (!imageUrl) return { small: "", medium: "", large: "" };

    return {
        small: imageUrl,
        medium: imageUrl.replace("150x150", "250x250"),
        large: imageUrl.replace("150x150", "500x500")
    };
};

// Main API call helper with improved error handling
const api = async (path, params = {}) => {
    try {
        const searchParams = new URLSearchParams({
            _format: "json",
            _marker: "0",
            ctx: "web6dot0",
            api_version: "4",
            ...params.query
        });

        const url = `${BASE_URL}?__call=${path}&${searchParams}`;
        // console.log("Requesting URL:", url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Cookie': `L=${validLangs(params.query?.entity_language || params.query?.language || "hindi,english")}; gdpr_acceptance=true; DL=english`,
                'Referer': 'https://www.jiosaavn.com/'
            }
        });

        // Check if response is ok
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        // First try to parse as JSON
        try {
            const jsonData = await response.json();
            return jsonData;
        } catch (jsonError) {
            // If JSON parsing fails, get the text content for debugging
            const text = await response.text();
            console.error("Failed to parse JSON response. First 200 chars:", text.substring(0, 200));

            // If it looks like HTML, throw a clear error
            if (text.includes("<html") || text.includes("<!DOCTYPE")) {
                throw new Error("Received HTML instead of JSON. JioSaavn API might be blocking the request.");
            }

            // Otherwise, try to manually parse the response
            try {
                // Try to clean and parse the response
                const cleanedText = text.trim()
                    .replace(/\n/g, ' ')
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"')
                    .replace(/\\&/g, '&')
                    .replace(/\\r/g, '');

                // If it's a string and looks like JSON, parse it
                if (cleanedText.startsWith('{') || cleanedText.startsWith('[')) {
                    return JSON.parse(cleanedText);
                }

                throw new Error("Unable to parse API response as JSON");
            } catch (parseError) {
                console.error("Failed to manually parse response:", parseError);
                throw new Error("Failed to parse API response: " + jsonError.message);
            }
        }
    } catch (error) {
        console.error("API call error:", error);
        throw error;
    }
};

// Retry mechanism for API calls
const apiWithRetry = async (path, params = {}, retries = 3) => {
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await api(path, params);
        } catch (error) {
            console.log(`API call attempt ${attempt + 1} failed: ${error.message}`);
            lastError = error;

            // Wait before retrying (increasing delay with each retry)
            if (attempt < retries - 1) {
                const delay = 1000 * (attempt + 1); // 1s, 2s, 3s
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // If we get here, all retries failed
    throw lastError;
};

// Common API endpoints
const endpoints = {
    all: 'autocomplete.get',
    trending: 'content.getTrending',
    top_search: 'content.getTrending',
    songs: 'search.getResults',
    albums: 'search.getAlbumResults',
    playlists: 'search.getPlaylistResults',
    artists: 'search.getArtistResults',
    more: 'search.getMoreResults',
    featured_playlists: 'webapi.getFeaturedPlaylists',
    charts: 'webapi.getCharts',
    top_shows: 'webapi.getTopShows',
    top_artists: 'webapi.getTopArtists',
    top_albums: 'webapi.getTopAlbums',
    mix_details: 'webapi.getMixDetails',
    label_details: 'webapi.getLabelDetails',
    featured_stations: 'webradio.createFeaturedStations',
    artist: {
        details: "artist.getArtistPageDetails",
        songs: "artist.getArtistMoreSong",
        albums: "artist.getArtistMoreAlbum",
        top_songs: "search.artistOtherTopSongs"
    },
    album: {
        details: "content.getAlbumDetails"
    },
    song: {
        details: "song.getDetails"
    },
    playlist: {
        details: "playlist.getDetails"
    },
    lyrics: 'lyrics.getLyrics'
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
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
module.exports = {
    BASE_URL,
    api,
    apiWithRetry,
    endpoints,
    parseBool,
    validLangs,
    isJioSaavnLink,
    tokenFromLink,
    formatQualityImage,
    verifyToken,
    createDownloadLinks
};
