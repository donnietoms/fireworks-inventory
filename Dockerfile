# Use Node.js base image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Build the frontend
RUN npm run build

# Expose the port
EXPOSE 10000

# Start script: run backend server and serve frontend
CMD sh -c "node server/index.js & npx serve -s dist -l $PORT"
