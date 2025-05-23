# yt-dlp Web UI

A simple web interface for [yt-dlp](https://github.com/yt-dlp/yt-dlp), a powerful YouTube-DL fork with additional features and fixes.

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
-   **`uv`**: This project uses `uv` for fast environment and package management. Install `uv` by following the [official instructions](https://github.com/astral-sh/uv) (e.g., `pip install uv` or using their recommended installers).
-   **`ffmpeg`**: `yt-dlp` requires `ffmpeg` for many operations, especially for merging separate video and audio streams or for converting audio formats.
    -   Download `ffmpeg` from [ffmpeg.org](https://ffmpeg.org/download.html) or use pre-built static versions from [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds). Ensure `ffmpeg` (and `ffprobe`) is in your system's PATH or accessible by `yt-dlp`.

### Project Files for Dependency Management

-   **`pyproject.toml`**: Lists the project's direct, high-level dependencies.
-   **`uv.lock`**: An auto-generated lock file that captures the full, resolved dependency tree from `pyproject.toml`, ensuring version consistency.
-   **`requirements.txt`**: An auto-generated file derived from `uv.lock` that explicitly lists all direct and transitive dependencies. This file is used by `uv pip sync requirements.txt` for reliable environment setup.

### Installation Steps

1.  **Clone the repository** (or download and extract the source code):
    ```bash
    git clone https://github.com/xiiizoux/yt-dlp-webui.git
    cd yt-dlp-webui
    ```

2.  **Create and activate a virtual environment**:

    *   **Using `uv` (recommended for this project):**
        ```bash
        uv venv
        ```
        Then activate it:
        -   On macOS and Linux: `source .venv/bin/activate`
        -   On Windows: `.venv\Scripts\activate`

    *   **Alternatively, using Python's built-in `venv` module:**
        ```bash
        python -m venv venv 
        ```
        Then activate it:
        -   On macOS and Linux: `source venv/bin/activate`
        -   On Windows: `venv\Scripts\activate`
    
    Choose **one** of the above methods to create and activate your virtual environment. The `uv` method is preferred for consistency with the project's dependency management.

3.  **Install dependencies**:
    The full list of dependencies, including all sub-dependencies, is provided in `requirements.txt`. This file is generated from `uv.lock` to ensure consistent, reproducible environments.
    With your virtual environment activated, install them using `uv`:
    ```bash
    uv pip sync requirements.txt
    ```
    This command installs the exact versions specified in `requirements.txt`.

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

## Handling YouTube Bot Detection

YouTube sometimes requires verification that you're not a bot. When this happens, you'll see an error message like "Sign in to confirm you're not a bot". To resolve this issue:

### Option 1: Use a cookies.txt file

1. Create a `cookies.txt` file in the root directory of the application (same folder as `web_server.py`).
2. Add your YouTube cookies to this file. You can use browser extensions like [Get cookies.txt](https://chrome.google.com/webstore/detail/get-cookiestxt/bgaddhkoddajcdgocldbbfleckgcbcid) for Chrome or [Cookie Quick Manager](https://addons.mozilla.org/en-US/firefox/addon/cookie-quick-manager/) for Firefox.
3. Make sure you're logged into YouTube in your browser before exporting the cookies.

### Option 2: Use browser cookies automatically

The application will attempt to use cookies from your Chrome browser if a `cookies.txt` file is not found. This requires:

1. Being logged into YouTube in Chrome
2. Running the application on the same machine where Chrome is installed

For more detailed information, see the [yt-dlp FAQ on cookies](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp).

## Disclaimer

This project relies entirely on `yt-dlp` for its functionality. Please ensure that your use of this tool complies with the terms of service of any websites you are downloading content from. Respect copyright laws and the rights of content creators. This tool is provided for personal, fair use only.
