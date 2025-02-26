const { Router } = require('express');
const Crypto = require('crypto-js');

const router = Router();
const baseUrl = "https://www.jiosaavn.com/api.php";

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

router.get("/", async (req, res, next) => {
    const { id, link } = req.query;

    try {
        const pids = link ? extractTokenFromLink(link) : id;
        const result = await api("song.getDetails", { pids });

        if (!result.songs) {
            throw new Error("Song not found");
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
                    artists: song.more_info.artistMap.primary_artists[0]?.image || null
                },
                album: {
                    id: song.more_info.album_id,
                    name: song.more_info.album,
                    url: song.more_info.album_url
                },
                artists: {
                    primary: song.more_info.artistMap.primary_artists.map(artist => ({
                        id: artist.id,
                        name: artist.name,
                        role: artist.role,
                        image: artist.image,
                        url: artist.perma_url
                    })),
                    all: song.more_info.artistMap.artists.map(artist => ({
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
        res.status(400).json({
            status: "Failed",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
/*
      {
              id: song.id,
              title: song.title,
              subtitle: song.subtitle,
              image: song.image,
              artists: song.more_info.artistMap.primary_artists,
              download: createDownloadLinks(encryptedMediaUrl)
          }*/
// Get song recommendations
// Get song recommendations
router.get("/recommend", async (req, res) => {
    const { id, lang = "hindi,english" } = req.query;

    try {
        const result = await api("reco.getreco", {
            pid: id,
            language: lang
        });

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
