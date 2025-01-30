FROM node:18

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl

# Download and setup yt-dlp with proper permissions
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp && \
    ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp

# Verify installation
RUN yt-dlp --version

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV FF_PATH=/usr/bin/ffmpeg
ENV YT_DLP_PATH=/usr/bin/yt-dlp

EXPOSE 3000
CMD ["npm", "start"]
