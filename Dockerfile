FROM node:18

WORKDIR /app
COPY . .

# Make yt-dlp executable
RUN chmod +x /app/bin/yt-dlp

ENV YT_DLP_PATH=/app/bin/yt-dlp

RUN npm install

EXPOSE 3000
CMD ["npm", "start"]
