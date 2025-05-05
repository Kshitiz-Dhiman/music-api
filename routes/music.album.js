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

router.use("/", async (req, res, next) => {
    try {
        const { id, link, token } = req.query;

        if (!id && !link && !token) {
            throw new Error("Please provide album id, link or token");
        }

        if (link && !isJioSaavnLink(link)) {
            throw new Error("Please provide a valid JioSaavn album link");
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
            id = "",
            link = "",
            token = "",
            raw = "",
            mini = ""
        } = req.query;

        const albumId = id || tokenFromLink(link) || token;
        console.log(`Fetching album details for ID: ${albumId}`);

        const result = await apiWithRetry(endpoints.album.details, {
            query: {
                albumid: albumId
            }
        });

        // For debugging
        console.log(`Album data received. Title: ${result.title}, Has list property: ${!!result.list}`);

        // Return raw response if requested (useful for debugging)
        if (parseBool(raw)) {
            return res.json(result);
        }

        if (!result.id) {
            throw new Error("Album not found, please check the id, link or token");
        }

        // Use the 'list' property instead of 'songs' as per the API structure
        const songsList = result.list || [];

        // Explicitly handle empty songs case
        if (!songsList || !Array.isArray(songsList) || songsList.length === 0) {
            console.warn(`Album ${result.id} "${result.title}" has no songs`);

            // Construct response with empty songs array
            const response = {
                status: "Success",
                message: "✅ Album details fetched successfully (no songs available)",
                data: {
                    id: result.id,
                    title: result.title,
                    subtitle: result.subtitle || "",
                    type: result.type || "",
                    image: formatQualityImage(result.image),
                    url: result.perma_url || "",
                    songs_count: result.list_count ? parseInt(result.list_count) : 0,
                    language: result.language || "",
                    year: result.year || "",
                    play_count: result.play_count || 0,
                    explicit: result.explicit_content === 1,
                    description: result.description || "",
                    is_dolby_content: result.more_info?.is_dolby_content === true,
                    is_dolby_sound: result.more_info?.is_dolby_sound === true,
                    label: result.more_info?.label || "",
                    header_desc: result.header_desc || "",
                    artists: result.more_info?.artistMap?.primary_artists?.map(artist => ({
                        id: artist.id,
                        name: artist.name,
                        role: artist.role || "",
                        image: artist.image || "",
                        type: artist.type || "",
                        url: artist.perma_url || ""
                    })) || [],
                    songs: [],
                    notice: "This album doesn't have any available songs"
                }
            };

            return res.json(response);
        }

        // Format songs array from album data - with expanded error handling
        const songs = [];
        try {
            for (const song of songsList) {
                // Skip invalid songs
                if (!song || !song.id) {
                    console.warn('Skipping invalid song in album:', result.id);
                    continue;
                }

                // Return minimal data if mini=true
                if (parseBool(mini)) {
                    songs.push({
                        id: song.id,
                        title: song.title,
                        subtitle: song.subtitle,
                        image: song.image,
                    });
                    continue;
                }

                // Return detailed song info
                songs.push({
                    id: song.id,
                    title: song.title,
                    subtitle: song.subtitle,
                    type: song.type,
                    image: formatQualityImage(song.image),
                    perma_url: song.perma_url,
                    description: song.description || "",
                    position: song.position || 0,
                    has_lyrics: song.has_lyrics === "true" || song.more_info?.has_lyrics === "true",
                    explicit: song.explicit_content === 1 || song.explicit_content === "1",
                    play_count: song.play_count || 0,
                    language: song.language,
                    duration: song.more_info?.duration || 0,
                    label: song.more_info?.label || "",
                    year: song.year || "",
                    artists: song.more_info?.artistMap?.primary_artists?.map(artist => ({
                        id: artist.id,
                        name: artist.name,
                        role: artist.role || "",
                        image: artist.image || "",
                        type: artist.type || "",
                        url: artist.perma_url || ""
                    })) || []
                });
            }
        } catch (songError) {
            console.error("Error processing songs in album:", songError);
            // Continue with any songs we were able to process
        }

        // Use the list_count property for song count
        const songsCount = songs.length || (result.list_count ? parseInt(result.list_count) : 0);

        // Construct final response object
        const response = {
            status: "Success",
            message: "✅ Album details fetched successfully",
            data: {
                id: result.id,
                title: result.title,
                subtitle: result.subtitle || "",
                type: result.type || "",
                image: formatQualityImage(result.image),
                url: result.perma_url || "",
                songs_count: songsCount,
                language: result.language || "",
                year: result.year || "",
                play_count: result.play_count || 0,
                explicit: result.explicit_content === 1 || result.explicit_content === "1",
                description: result.description || "",
                is_dolby_content: result.more_info?.is_dolby_content === true,
                is_dolby_sound: result.more_info?.is_dolby_sound === true,
                label: result.more_info?.label || result.more_info?.label_url?.split("/")[2]?.replace(/-albums.*$/, "") || "",
                header_desc: result.header_desc || "",
                artists: result.more_info?.artistMap?.primary_artists?.map(artist => ({
                    id: artist.id,
                    name: artist.name,
                    role: artist.role || "",
                    image: artist.image || "",
                    type: artist.type || "",
                    url: artist.perma_url || ""
                })) || [],
                songs: songs,
                copyright: result.more_info?.copyright_text || ""
            }
        };

        res.json(response);
    } catch (error) {
        console.error("Album details error:", error);
        // Add the album ID to the error response for easier debugging
        res.status(400).json({
            status: "Failed",
            message: error.message,
            albumId: id || tokenFromLink(link) || token
        });
    }
});

// Get recommended albums based on an album
router.get("/recommendations", async (req, res) => {
    try {
        const {
            id = "",
            link = "",
            token = "",
            lang = "hindi,english",
            raw = "",
            mini = ""
        } = req.query;

        if (!id && !link && !token) {
            throw new Error("Please provide album id, link or token");
        }

        const albumId = id || tokenFromLink(link) || token;

        const result = await apiWithRetry("reco.getAlbumReco", {
            query: {
                albumid: albumId,
                language: validLangs(lang)
            }
        });

        if (!result || result.length === 0) {
            throw new Error("No recommendations found for this album");
        }

        // Return raw response if requested
        if (parseBool(raw)) {
            return res.json(result);
        }

        // Format albums data
        const albums = result.map(album => {
            // Return minimal data if mini=true
            if (parseBool(mini)) {
                return {
                    id: album.id,
                    title: album.title,
                    subtitle: album.subtitle,
                    image: album.image,
                };
            }

            // Return detailed album info
            return {
                id: album.id,
                title: album.title,
                subtitle: album.subtitle || "",
                type: album.type,
                image: formatQualityImage(album.image),
                url: album.perma_url,
                language: album.language,
                year: album.year,
                play_count: album.play_count || 0,
                explicit: album.explicit_content === 1,
                list_count: album.more_info?.song_count || 0,
                list_type: album.more_info?.list_type || "",
                artists: album.more_info?.artistMap?.primary_artists?.map(artist => ({
                    id: artist.id,
                    name: artist.name,
                    role: artist.role || "",
                    url: artist.perma_url || ""
                })) || []
            };
        });

        const response = {
            status: "Success",
            message: "✅ Album recommendations fetched successfully",
            data: albums
        };

        res.json(response);
    } catch (error) {
        console.error("Album recommendations error:", error);
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

// Get all albums by an artist
router.get("/by-artist", async (req, res) => {
    try {
        const {
            id = "",
            link = "",
            token = "",
            page = 1,
            limit = 10,
            raw = "",
            mini = ""
        } = req.query;

        if (!id && !link && !token) {
            throw new Error("Please provide artist id, link or token");
        }

        const artistId = id || tokenFromLink(link) || token;

        const result = await apiWithRetry(endpoints.artist.albums, {
            query: {
                artistId: artistId,
                page: page,
                n_song: limit,
                category: "",
                sort_order: "desc"
            }
        });

        if (!result.topAlbums || !result.topAlbums.albums) {
            throw new Error("No albums found for this artist");
        }

        // Return raw response if requested
        if (parseBool(raw)) {
            return res.json(result);
        }

        // Format albums data
        const albums = result.topAlbums.albums.map(album => {
            // Return minimal data if mini=true
            if (parseBool(mini)) {
                return {
                    id: album.albumid,
                    title: album.title,
                    year: album.year,
                    image: album.image,
                };
            }

            // Return detailed album info
            return {
                id: album.albumid,
                title: album.title,
                year: album.year,
                type: album.type,
                image: formatQualityImage(album.image),
                url: album.perma_url,
                songCount: album.songs_count || 0,
                explicit: album.explicit_content === 1,
                artist: {
                    id: result.artistId,
                    name: result.name,
                    image: result.image
                }
            };
        });

        const response = {
            status: "Success",
            message: "✅ Artist albums fetched successfully",
            data: {
                artistId: result.artistId,
                artistName: result.name,
                totalAlbums: result.topAlbums.total,
                lastPage: result.topAlbums.last_page,
                currentPage: parseInt(page),
                albums: albums
            }
        };

        res.json(response);
    } catch (error) {
        console.error("Artist albums error:", error);
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

// Get top albums (trending)
router.get("/top", async (req, res) => {
    try {
        const {
            lang = "hindi,english",
            year = "",
            raw = "",
            mini = ""
        } = req.query;

        const language = validLangs(lang);

        const result = await apiWithRetry(endpoints.top_albums, {
            query: {
                language: language,
                year: year
            }
        });

        if (!result.albums || result.albums.length === 0) {
            throw new Error("No top albums found");
        }

        // Return raw response if requested
        if (parseBool(raw)) {
            return res.json(result);
        }

        // Format albums data
        const albums = result.albums.map(album => {
            // Return minimal data if mini=true
            if (parseBool(mini)) {
                return {
                    id: album.id,
                    title: album.title,
                    subtitle: album.subtitle,
                    image: album.image,
                };
            }

            // Return detailed album info
            return {
                id: album.id,
                title: album.title,
                subtitle: album.subtitle || "",
                type: album.type,
                image: formatQualityImage(album.image),
                url: album.perma_url,
                language: album.language,
                year: album.year,
                play_count: album.play_count || 0,
                explicit: album.explicit_content === 1,
                list_count: album.more_info?.song_count || 0,
                artists: album.more_info?.artistMap?.primary_artists?.map(artist => ({
                    id: artist.id,
                    name: artist.name,
                    role: artist.role || "",
                    url: artist.perma_url || ""
                })) || []
            };
        });

        const response = {
            status: "Success",
            message: "✅ Top albums fetched successfully",
            data: albums
        };

        res.json(response);
    } catch (error) {
        console.error("Top albums error:", error);
        res.status(400).json({
            status: "Failed",
            message: error.message
        });
    }
});

module.exports = router;
