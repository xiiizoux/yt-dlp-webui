FROM python:3.12-alpine

WORKDIR /app

# Install ffmpeg and other necessary dependencies
RUN apk add --no-cache ffmpeg gcc musl-dev python3-dev curl wget bash

# 安装最新版本的 yt-dlp 以确保更好的兼容性
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Install uv
RUN pip install uv

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies with uv (using --system flag since we're in a Docker container)
RUN uv pip install --system --no-cache -r requirements.txt

# Copy application code
COPY . .

# Create downloads directory and ensure proper permissions
RUN mkdir -p /app/downloads && \
    chmod 777 /app/downloads

# Create a directory for cookies file with write permissions
RUN mkdir -p /app/config && \
    chmod 777 /app/config

# Expose port
EXPOSE 5001

# Command to run the application
CMD ["python", "web_server.py"]
