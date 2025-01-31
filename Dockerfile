FROM node:18

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp
RUN ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp

WORKDIR /app
COPY . .
RUN npm install

ENV YT_DLP_PATH=/usr/bin/yt-dlp

EXPOSE 3000
CMD ["npm", "start"]
