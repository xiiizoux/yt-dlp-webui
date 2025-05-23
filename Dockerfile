FROM python:3.10-slim

WORKDIR /app

# Install ffmpeg and other necessary dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg gcc python3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies with pip upgrade
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create downloads directory and ensure proper permissions
RUN mkdir -p /app/downloads && \
    chmod 777 /app/downloads

# Create an empty cookies.txt file if it doesn't exist
RUN touch /app/cookies.txt && \
    chmod 666 /app/cookies.txt

# Expose port
EXPOSE 5001

# Command to run the application
CMD ["python", "web_server.py"]
