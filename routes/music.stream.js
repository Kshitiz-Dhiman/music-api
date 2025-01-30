const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

router.get('/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const ytDlpPath = process.env.YT_DLP_PATH || 'C:\\yt-dlp\\yt-dlp.exe';

    try {
        const ytDlpProcess = spawn(ytDlpPath, [
            '-f',
            'bestaudio/best',
            '--extract-audio',
            '--audio-format',
            'mp3',
            '-o',
            '-',
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        ytDlpProcess.stderr.on('data', (data) => {
            console.error('yt-dlp stderr:', data.toString());
        });

        ytDlpProcess.on('error', (error) => {
            console.error('Process error:', error);
            res.status(500).send('Error streaming audio');
        });

        await pipeline(ytDlpProcess.stdout, res);

    } catch (error) {
        console.error('Stream error:', error);
        if (!res.headersSent) {
            res.status(500).send('Error streaming audio');
        }
        res.end();
    }
});

module.exports = router;
