const express = require('express');
const router = express.Router();
const {
    api,
    apiWithRetry,
    endpoints,
    parseBool,
    validLangs,
    isJioSaavnLink,
    tokenFromLink,
    formatQualityImage
} = require('../utils/apiUtils');

router.use(["/*"], async (req, res, next) => {
    const { id, link, token } = req.query;
    const path = req.path;

    try {
        // General validation for main routes
        if (path === '/' || path === '/songs' || path === '/albums' || path === '/top-songs') {
            if (!id && !link && !token) {
                throw new Error("Please provide artist id, link or token");
            }

            if (link && !isJioSaavnLink(link)) {
                throw new Error("Please provide a valid JioSaavn artist link");
            }
        }

        next();
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const {
            id: artistid = "",
            link = "",
            token = "",
            raw = "",
            mini = ""
        } = req.query;
        const result = await api(endpoints.artist.details, {
            query: {
                artistId: artistid,
                token: token || tokenFromLink(link),
                type: "",
                n_song: "10",
                n_album: "10",
                p: "",
            }
        });

        if (!result.artistId) {
            throw new Error("Artist not found, please check the id, link or token");
        }

        if (parseBool(raw)) {
            return res.json(result);
        }

        const response = {
            status: "Success",
            message: "✅ Artist details fetched successfully",
            data: {
                id: result.artistId,
                image: formatQualityImage(result.image),
                title: result.name,
                subtitle: result.subtitle,
                follower_count: result.follower_count,
                topSongs: result.topSongs.map(song => {
                    return {
                        id: song.id,
                        title: song.title,
                        subtitle: song.subtitle,
                        image: formatQualityImage(song.image),
                        play_count: song.play_count,
                        more_info: song.more_info
                    };
                }),
                topAlbums: result.topAlbums.map(album => {
                    return {
                        id: album.id,
                        title: album.title,
                        subtitle: album.subtitle,
                        image: formatQualityImage(album.image),
                        year: album.year,
                        more_info: album.more_info
                    };
                }),
                dedicated_artist_playlist: result.dedicated_artist_playlist,
                featured_artist_playlist: result.featured_artist_playlist,
                singles: result.singles.map(song => {
                    return {
                        id: song.id,
                        title: song.title,
                        subtitle: song.subtitle,
                        image: formatQualityImage(song.image),
                        play_count: song.play_count,
                        more_info: song.more_info
                    };
                }),
                latest_release: result.latest_release,
                similarArtists: result.similarArtists
            }
        };

        res.json(response);
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

router.get("/top-songs", async (req, res) => {
    try {
        const {
            id: artistid = "",
            song_id,
            link = "",
            token = "",
            lang = "",
            raw = "",
            mini = "",
            limit = "50"
        } = req.query;
        const result = await api(endpoints.artist.top_songs, {
            query: {
                artist_ids: artistid,
                song_id,
                token: token || tokenFromLink(link),
                type: "artist",
                n_song: limit,
                language: ""
            }
        });

        if (parseBool(raw)) {
            return res.json(result);
        }
        const response = {
            status: "Success",
            message: "✅ Artist top songs fetched successfully",
            data: result.map(song => {
                return {
                    id: song.id,
                    title: song.title,
                    subtitle: song.subtitle,
                    image: formatQualityImage(song.image),
                    play_count: song.play_count,
                    more_info: song.more_info
                }
            })
        };

        res.json(response);
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

router.get("/more-songs", async (req, res) => {
    try {
        const {
            id: artistid = "",
            link = "",
            token = "",
            page = "",
            category = "",
            sort = "",
            lang = "",
            raw = "",
            mini = ""
        } = req.query;

        const result = await api(endpoints.artist.songs, {
            query: {
                artistId: artistid || tokenFromLink(link),
                page,
                category,
                sort,
                language: ""
            }
        });

        if (!result.topSongs?.songs) {
            throw new Error("No songs found for this artist");
        }

        if (parseBool(raw)) {
            return res.json(result);
        }

        const songs = result.topSongs.songs.map(song => {
            if (parseBool(mini)) {
                return {
                    id: song.id,
                    name: song.title,
                    image: formatQualityImage(song.image),
                    url: song.perma_url,
                    type: song.type
                };
            }

            return {
                id: song.id,
                name: song.title,
                subtitle: song.subtitle,
                type: song.type,
                url: song.perma_url,
                image: formatQualityImage(song.image),
                language: song.language,
                year: song.year,
                play_count: Number.parseInt(song.play_count || "0"),
                explicit: song.explicit_content === "1",
                list_count: Number.parseInt(song.list_count || "0"),
                list_type: song.list_type,
                music: song.music,
                more_info: song.more_info,
            };
        });

        const response = {
            status: "Success",
            message: "✅ Artist songs fetched successfully",
            data: {
                id: result.artistId,
                name: result.name,
                image: formatQualityImage(result.image),
                follower_count: Number.parseInt(result.follower_count || "0"),
                type: "artist",
                is_verified: result.isVerified,
                dominant_language: result.dominantLanguage,
                dominant_type: result.dominantType,
                top_songs: {
                    total: result.topSongs.total,
                    last_page: result.topSongs.last_page,
                    songs
                }
            }
        };

        res.json(response);
    } catch (error) {
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

router.get("/more-albums", async (req, res) => {
    try {
        const {
            id,
            link = "",
            token = "",
            page = "",
            category = "",
            lang = "",
            raw = "",
            mini = "",
            sort_order = "asc"
        } = req.query;

        const result = await api(endpoints.artist.albums, {
            query: {
                artistId: id,
                page,
                category,
                sort_order,
                n_song: "50"
            }
        });

        const response = {
            status: "Success",
            message: "✅ Artist albums fetched successfully",
            data: {
                id: result.artistId,
                title: result.name,
                image: formatQualityImage(result.image),
                topAlbums: result.topAlbums
            }
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
