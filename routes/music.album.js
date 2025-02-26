const express = require('express');
const router = express.Router();
const Crypto = require('crypto-js');
// Constants
const BASE_URL = 'https://www.jiosaavn.com/api.php';
const endpoints = {
    id: 'content.getAlbumDetails',
    link: 'webapi.get',
    recommend: 'reco.getAlbumReco',
    same_year: 'search.topAlbumsoftheYear'
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

const parseBool = (value) => {
    return ["true", "1"].includes(String(value).toLowerCase());
};

const validLangs = (lang) => {
    const supportedLangs = ["hindi", "english", "punjabi", "tamil", "telugu", "marathi",
        "gujarati", "bengali", "kannada", "bhojpuri", "malayalam", "urdu", "haryanvi",
        "rajasthani", "odia", "assamese"];
    return lang ? lang.split(",")
        .filter(l => supportedLangs.includes(l.toLowerCase()))
        .join(",") : "hindi,english";
};

const isJioSaavnLink = (link) => {
    try {
        const url = new URL(link);
        return url.hostname.includes('jiosaavn.com') && url.pathname.includes('album');
    } catch {
        return false;
    }
};

const tokenFromLink = (link) => {
    try {
        return new URL(link).pathname.split("/").pop() || "";
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

    const url = `${BASE_URL}?__call=${path}&${searchParams}`;
    const response = await fetch(url, {
        headers: {
            cookie: `L=hindi,english; gdpr_acceptance=true; DL=english`
        }
    });
    return response.json();
};

// Middleware for parameter validation
router.use(['/', '/recommend', '/same-year'], (req, res, next) => {
    const { id, link, token, year } = req.query;
    const path = req.path;

    try {
        if (path === '/') {
            if (!id && !link && !token) {
                throw new Error("Please provide album id, link or a token");
            }
            if (link && !isJioSaavnLink(link)) {
                throw new Error("Please provide a valid JioSaavn album link");
            }
        }

        if (path === '/recommend' && !id) {
            throw new Error("Please provide album id");
        }

        if (path === '/same-year' && !year) {
            throw new Error("Please provide album year");
        }

        next();
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

// Get album details
router.get('/', async (req, res) => {
    try {
        const {
            id: albumid = "",
            link = "",
            token = "",
            raw = "",
            mini = ""
        } = req.query;

        const result = await api(endpoints.id, {
            query: {
                albumid,
                token: token || tokenFromLink(link),
                type: "album"
            }
        });


        if (result.error) {
            throw new Error(result.error.msg || "API Error occurred");
        }

        if (!result) {
            throw new Error("No album found, please check the id");
        }

        const formattedResponse = {
            status: "Success",
            message: "✅ Album Details fetched successfully",
            data: {
                id: result.id,
                title: result.title,
                subtitle: result.subtitle,
                description: result.header_desc,
                releaseDate: result.year,
                image: {
                    small: result.image.replace("150x150", "50x50"),
                    medium: result.image.replace("150x150", "500x500"),
                    large: result.image
                },
                songs: result.list.map(song => ({
                    id: song.id,
                    title: song.title,
                    subtitle: song.subtitle,
                    duration: song.more_info.duration,
                    image: {
                        small: song.image.replace("150x150", "50x50"),
                        medium: song.image.replace("150x150", "500x500"),
                        large: song.image
                    },
                    artists: song.more_info.artistMap.primary_artists.map(artist => ({
                        id: artist.id,
                        name: artist.name,
                        image: artist.image
                    })),
                    album: {
                        id: song.more_info.album_id,
                        name: song.more_info.album,
                        url: song.more_info.album_url
                    },
                    url: song.perma_url,
                    downloadUrl: createDownloadLinks(song.more_info.encrypted_media_url),
                    year: song.year,
                    releaseDate: song.more_info.release_date,
                    label: song.more_info.label,
                    copyright: song.more_info.copyright_text
                }))
            }
        };

        res.json(formattedResponse);
    } catch (error) {
        console.error('Album API Error:', error);
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

// Get album recommendations
router.get('/recommend', async (req, res) => {
    try {
        const { id: albumid, lang = "", raw = "", mini = "" } = req.query;

        const result = await api(endpoints.recommend, {
            query: {
                albumid,
                language: validLangs(lang)
            }
        });

        if (parseBool(raw)) {
            return res.json(result);
        }

        const response = {
            status: "Success",
            message: "✅ Album Recommendations fetched successfully",
            data: result.map(album => parseBool(mini) ? {
                id: album.id,
                title: album.title,
                image: album.image,
                url: album.url
            } : album)
        };

        res.json(response);
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

// Get albums from same year
router.get('/same-year', async (req, res) => {
    try {
        const {
            year: album_year = "",
            lang = "",
            raw = "",
            mini = ""
        } = req.query;

        const result = await api(endpoints.same_year, {
            query: {
                album_year,
                album_lang: validLangs(lang)
            }
        });

        if (!result.length) {
            throw new Error("No albums found, please check the year");
        }

        if (parseBool(raw)) {
            return res.json(result);
        }

        const response = {
            status: "Success",
            message: `✅ Albums from ${album_year} fetched successfully`,
            data: result.map(album => parseBool(mini) ? {
                id: album.id,
                title: album.title,
                year: album.year,
                image: album.image
            } : album)
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
