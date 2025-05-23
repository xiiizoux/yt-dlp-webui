FROM python:3.12-slim

WORKDIR /app

# Install ffmpeg and other necessary dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg gcc python3-dev curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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
