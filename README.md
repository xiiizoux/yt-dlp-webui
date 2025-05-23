# yt-dlp Web UI

## Description

This project provides a web-based user interface for the powerful `yt-dlp` command-line video downloader. Its purpose is to offer a more user-friendly way to interact with some of `yt-dlp`'s most common features without needing to use the command line directly.

## Features

-   **Video Information**: Fetches and displays available video formats, thumbnail, title, uploader, duration, and description.
-   **Video and Audio Downloads**: Supports downloading video and audio content.
-   **User-Configurable Download Options**:
    -   **Audio-Only**: Option to download only the audio track.
    -   **Audio Format Selection**: Choose preferred audio format (MP3, M4A, Opus, WAV, or Best).
    -   **Video Quality Selection**: Choose preferred video quality (Best, 1080p, 720p, 480p, or 360p) for video downloads.
    -   **Subtitle Embedding**: Option to embed English subtitles into the video (if available).
-   **Responsive Design**: The UI is designed to be usable on various screen sizes.

## Core Technology

This web UI is a wrapper around the versatile `yt-dlp` tool. All video fetching and downloading capabilities are powered by `yt-dlp`.

-   **`yt-dlp` Official Repository**: [https://github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Setup and Installation

### Prerequisites

-   **Python 3.x**: Ensure Python 3 (version 3.7 or newer recommended) is installed.
-   **`pip`**: The Python package installer, usually included with Python.
-   **`ffmpeg`**: `yt-dlp` requires `ffmpeg` for many operations, especially for merging separate video and audio streams (common for high-quality formats) or for converting audio formats.
    -   Download `ffmpeg` from [ffmpeg.org](https://ffmpeg.org/download.html) or use pre-built static versions from [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds). Ensure `ffmpeg` (and `ffprobe`) is in your system's PATH or accessible by `yt-dlp`.

### Installation Steps

1.  **Clone the repository** (or download and extract the source code):
    ```bash
    git clone https://github.com/xiiizoux/yt-dlp-webui.git
    cd yt-dlp-webui
    ```

2.  **Create and activate a virtual environment** (highly recommended):

    **Option 1: Using Python's built-in `venv` module**
    ```bash
    python -m venv venv 
    ```
    -   On macOS and Linux:
        ```bash
        source venv/bin/activate
        ```
    -   On Windows:
        ```bash
        venv\Scripts\activate
        ```

    **Option 2: Using `uv` (if installed)**
    
    First, ensure `uv` is installed. If not, you can install it by following the instructions at [https://github.com/astral-sh/uv](https://github.com/astral-sh/uv).
    
    ```bash
    uv venv
    ```
    -   On macOS and Linux:
        ```bash
        source .venv/bin/activate
        ```
    -   On Windows:
        ```bash
        .venv\Scripts\activate
        ```
    
    Choose **one** of the above methods to create and activate your virtual environment.

3.  **Install dependencies**:
    ```bash
    pip install Flask yt-dlp
    ```

## Running the Application

1.  **Start the Flask server**:
    ```bash
    python web_server.py
    ```

2.  **Access the Web UI**:
    Open your web browser and go to: `http://127.0.0.1:5000`

    **Note on Downloads**: When you download a file, it is first downloaded to a temporary `downloads` directory on the server. The file is then streamed to your browser. After the stream is complete (or if an error occurs), the file is automatically deleted from the server's `downloads` directory.

## How to Use

1.  Open the web application in your browser.
2.  Enter the URL of the video you want to download into the input field.
3.  Adjust the "Download Options" (audio only, audio format, video quality, embed subtitles) as needed.
4.  Click the "Fetch Formats" button.
5.  The application will display video metadata and a list of available formats.
6.  Find your desired format in the list and click the "Download (Direct)" or "Download (via Server)" button next to it.
    - "Download (Direct)" links attempt to use the direct URL from the content provider if no server-side processing (like audio extraction or subtitle embedding) is needed.
    - "Download (via Server)" will process the download through the backend, applying any selected options.

## Disclaimer

This project relies entirely on `yt-dlp` for its functionality. Please ensure that your use of this tool complies with the terms of service of any websites you are downloading content from. Respect copyright laws and the rights of content creators. This tool is provided for personal, fair use only.
