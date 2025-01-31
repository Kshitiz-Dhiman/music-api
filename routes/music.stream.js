const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const path = require('path');
const os = require('os');

router.get('/:videoId', async (req, res) => {
    const { videoId } = req.params;

    // Determine platform-specific yt-dlp path
    const isWindows = os.platform() === 'win32';
    // const ytDlpPath = process.env.YT_DLP_PATH || (isWindows
    //     ? path.join(process.cwd(), 'bin', 'yt-dlp.exe')
    //     : '/usr/local/bin/yt-dlp');
    const ytDlpPath = path.join(process.cwd(), 'bin', 'yt-dlp');
    try {
        const ytDlpProcess = spawn(ytDlpPath, [
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '--no-playlist',
            '-o', '-',
            `https://www.youtube.com/watch?v=${videoId}`
        ], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        ytDlpProcess.stderr.on('data', (data) => {
            console.error(`yt-dlp error: ${data}`);
        });

        ytDlpProcess.on('error', (error) => {
            console.error('Process error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Stream failed',
                    details: error.message
                });
            }
            res.end();
        });

        await pipeline(ytDlpProcess.stdout, res);

    } catch (error) {
        console.error('Stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Stream failed',
                details: error.message
            });
        }
        res.end();
    }
});

module.exports = router;
