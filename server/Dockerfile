# Use Node.js 18 as the base image
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Copy Prisma schema first for dependency caching
COPY ./prisma /usr/src/app/prisma

# Copy package files and install Node.js dependencies
COPY package*.json ./

# Install OpenSSL 3.x and OpenSSL 1.1 (in case Prisma needs it)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl  procps\
    && rm -rf /var/lib/apt/lists/*
    
RUN npm install
RUN npm install -g @nestjs/cli

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Define the command to start the application
CMD ["npm", "run", "start:dev"]

# ONCE THIS CONTAINER IS RUNNING
# npx prisma migrate deploy

# node -v
# v18.20.5
# npm -v
# 10.8.2