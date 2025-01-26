# Use the official Node.js image
FROM node:14

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the local code to the container image
COPY . .

# Set environment variables
ENV FF_PATH=/usr/bin/ffmpeg

# Expose the port the app runs on
EXPOSE 3000

# Run the web service on container startup
CMD ["npm", "start"]
