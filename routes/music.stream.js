const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { Readable } = require('stream');

// Helper function to get video info
async function getVideoInfo(videoId, ytDlpPath) {
    return new Promise((resolve, reject) => {
        const infoProcess = spawn(ytDlpPath, [
            '--print', '{"duration": %(duration)s, "title": %(title)j}',
            '--no-playlist',
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        let infoData = '';
        infoProcess.stdout.on('data', (chunk) => {
            infoData += chunk.toString();
        });

        infoProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(infoData));
                } catch (err) {
                    reject(new Error(`Failed to parse video info: ${err.message}`));
                }
            } else {
                reject(new Error(`Info process exited with code ${code}`));
            }
        });

        infoProcess.on('error', reject);
    });
}

// router.get('/:videoId', async (req, res) => {
//     const { videoId } = req.params;
//     const ytDlpPath = path.join(process.cwd(), 'bin', 'yt-dlp');

//     try {
//         // 1. Get video info first
//         const info = await getVideoInfo(videoId, ytDlpPath);
//         const totalDuration = info.duration;

//         // Approximate bitrate for estimation (128 kbps)
//         const bitRate = 128 * 1000; // bits per second
//         const estimatedFileSize = Math.ceil(totalDuration * bitRate / 8); // in bytes

//         // 2. Parse range header if it exists
//         const rangeHeader = req.headers.range;
//         let startByte = 0;
//         let endByte = estimatedFileSize - 1;
//         let startTime = 0;

//         if (rangeHeader) {
//             const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
//             if (match) {
//                 startByte = parseInt(match[1]);
//                 if (match[2]) {
//                     endByte = parseInt(match[2]);
//                 }

//                 // Calculate approximate time position based on byte range
//                 startTime = (startByte / estimatedFileSize) * totalDuration;

//                 // Set status to 206 Partial Content
//                 res.status(206);
//                 res.setHeader('Content-Range', `bytes ${startByte}-${endByte}/${estimatedFileSize}`);
//                 res.setHeader('Accept-Ranges', 'bytes');
//                 res.setHeader('Content-Length', endByte - startByte + 1);
//             }
//         } else {
//             // Normal full content response
//             res.status(200);
//             res.setHeader('Content-Length', estimatedFileSize);
//             res.setHeader('Accept-Ranges', 'bytes');
//         }

//         // Set common headers
//         res.setHeader('Content-Type', 'audio/mpeg');

//         // 3. Prepare yt-dlp args - Use download section only if we're not starting from the beginning
//         const downloadArgs = startTime > 0 ? [`--download-sections=*${startTime.toFixed(2)}-`] : [];

//         // 4. Spawn yt-dlp process
//         const ytDlpProcess = spawn(ytDlpPath, [
//             '-f', 'bestaudio',
//             '--extract-audio',
//             '--audio-format', 'mp3',
//             '--audio-quality', '0',
//             '--no-playlist',
//             ...downloadArgs,
//             '-o', '-', // output to stdout
//             `https://www.youtube.com/watch?v=${videoId}`
//         ], {
//             stdio: ['ignore', 'pipe', 'pipe']
//         });

//         // 5. Handle errors
//         ytDlpProcess.stderr.on('data', (data) => {
//             console.error(`yt-dlp error: ${data.toString()}`);
//         });

//         // Handle unexpected process termination
//         ytDlpProcess.on('error', (error) => {
//             console.error('Process error:', error);
//             if (!res.headersSent) {
//                 res.status(500).json({
//                     error: 'Stream failed',
//                     details: error.message
//                 });
//             } else if (!res.writableEnded) {
//                 res.end();
//             }
//         });

//         // 6. Pipe the output with proper error handling
//         ytDlpProcess.stdout.on('error', (error) => {
//             console.error('Stdout error:', error);
//             if (!res.writableEnded) {
//                 res.end();
//             }
//         });

//         res.on('close', () => {
//             // Client closed connection - need to clean up
//             console.log('Connection closed by client');
//             ytDlpProcess.kill();
//         });

//         ytDlpProcess.stdout.pipe(res);

//     } catch (error) {
//         console.error('Stream error:', error);
//         if (!res.headersSent) {
//             res.status(500).json({
//                 error: 'Stream failed',
//                 details: error.message
//             });
//         } else if (!res.writableEnded) {
//             res.end();
//         }
//     }
// });
router.get('/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const ytDlpPath = path.join(process.cwd(), 'bin', 'yt-dlp');

    try {
        // Get video info
        const info = await getVideoInfo(videoId, ytDlpPath);

        // Set headers for download
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(info.title)}.mp3"`);

        // Spawn yt-dlp process to download
        const ytDlpProcess = spawn(ytDlpPath, [
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '--no-playlist',
            '-o', '-', // output to stdout
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        // Handle errors
        ytDlpProcess.stderr.on('data', (data) => {
            console.error(`yt-dlp error: ${data.toString()}`);
        });

        ytDlpProcess.on('error', (error) => {
            console.error('Process error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Download failed',
                    details: error.message
                });
            } else if (!res.writableEnded) {
                res.end();
            }
        });

        // Pipe the output
        ytDlpProcess.stdout.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: 'Download failed',
            details: error.message
        });
    }
});
module.exports = router;
