# Use the official Node.js image
FROM node:14

# Install FFmpeg and yt-dlp dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the local code
COPY . .

# Set environment variables
ENV FF_PATH=/usr/bin/ffmpeg
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp

# Expose port
EXPOSE 3000

# Start the service
CMD ["npm", "start"]
