import os
import json # Used by app.logger.debug for pretty printing opts
from flask import Flask, request, jsonify, send_from_directory
from yt_dlp import YoutubeDL

app = Flask(__name__, static_folder='web') # 'web' is not used as static_folder, files are at root.
                                         # However, this doesn't break anything for the current setup.
                                         # For correctness if actual static files were in /web, it would be:
                                         # app = Flask(__name__, static_folder='static')
                                         # and ensure an actual 'static' folder exists.
                                         # Given current structure, static_folder isn't strictly necessary
                                         # as Flask serves index.html from root by default if no static_folder is hit.
                                         # For clarity, could be app = Flask(__name__) if no distinct static folder.
                                         # Let's assume the intent was to serve from root, so Flask's default is fine.
app = Flask(__name__) # Simplified as static files are served from root.

# Ensure the 'downloads' directory exists
DOWNLOADS_DIR = os.path.join(os.getcwd(), 'downloads')
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR)

@app.route('/')
def index():
    # Serves index.html from the root directory where web_server.py is located
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:filename>')
def send_static_file(filename):
    # Serves other static files like script.js, style.css from the root directory
    return send_from_directory(os.getcwd(), filename)

@app.route('/get_video_info', methods=['POST'])
def get_video_info():
    data = request.get_json()
    url = data.get('url')
    # Options from client (e.g., audioOnly) are received but not used by this endpoint,
    # as its primary goal is to list all available formats.
    # client_options = data.get('options', {}) 

    if not url:
        app.logger.warning("URL is required but not provided.")
        return jsonify({'error': 'URL is required'}), 400

    app.logger.info(f"Fetching video info for URL: {url}")
    try:
        # ydl_opts for fetching information without downloading
        ydl_opts = {
            'noplaylist': True, # Ensure we don't process playlists
            'quiet': True,
            'no_warnings': True,
            # 'skip_download': True, # We are only fetching info
            # 'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', # Removed for comprehensive format listing
        }
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            if 'formats' in info:
                for f in info['formats']:
                    # Be more inclusive with formats
                    formats.append({
                        'format_id': f.get('format_id'),
                        'ext': f.get('ext'),
                        'resolution': f"{f.get('width')}x{f.get('height')}" if f.get('width') and f.get('height') else f.get('resolution'),
                        'format_note': f.get('format_note'),
                        'filesize': f.get('filesize'),
                        'filesize_approx': f.get('filesize_approx'),
                        'fps': f.get('fps'),
                        'vcodec': f.get('vcodec'),
                        'acodec': f.get('acodec'),
                        'tbr': f.get('tbr'),
                        'abr': f.get('abr'),
                        'vbr': f.get('vbr'),
                        'url': f.get('url'),
                        'manifest_url': f.get('manifest_url'),
                        'protocol': f.get('protocol'),
                        'language': f.get('language'),
                    })
            # Fallback if no 'formats' array, but top-level URL exists (e.g., direct image URL)
            elif 'url' in info: # This case might be rare for typical video URLs yt-dlp processes
                app.logger.info(f"No 'formats' array, using top-level info for URL: {url}")
                formats.append({
                    'format_id': info.get('format_id', 'source'), # Use 'source' or 'direct' if no specific id
                    'ext': info.get('ext', 'unknown'),
                    'resolution': f"{info.get('width')}x{info.get('height')}" if info.get('width') and info.get('height') else info.get('resolution', 'N/A'),
                    'format_note': info.get('format_note', 'Direct Source'),
                    'filesize': info.get('filesize'), # Might be None
                    'filesize_approx': info.get('filesize_approx'),
                    'fps': info.get('fps'),
                    'vcodec': info.get('vcodec', 'N/A'),
                    'acodec': info.get('acodec', 'N/A'),
                    'tbr': info.get('tbr'),
                    'abr': info.get('abr'),
                    'vbr': info.get('vbr'),
                    'url': info.get('url'),
                    'manifest_url': info.get('manifest_url'),
                    'protocol': info.get('protocol'),
                    'language': info.get('language'),
                })

            return jsonify({
                'title': info.get('title'),
                'uploader': info.get('uploader'),
                'duration': info.get('duration'),
                'duration_string': info.get('duration_string'),
                'thumbnail': info.get('thumbnail'),
                'description': info.get('description'),
                'webpage_url': info.get('webpage_url'),
                'formats': formats,
                'original_url': url # Echo back the requested URL for reference
            })
    except yt_dlp.utils.DownloadError as e_dl:
        error_message_lower = str(e_dl).lower()
        user_message = f"Failed to fetch video information: {str(e_dl)}" # Default detailed message

        # More specific error messages based on content
        if "unsupported url" in error_message_lower:
            user_message = f"Unsupported URL: {url}. Please ensure it's a valid video page."
        elif "this video is private" in error_message_lower:
            user_message = "This video is private and cannot be accessed."
        elif "video is unavailable" in error_message_lower:
            user_message = "This video is unavailable."
        elif "geo-restricted" in error_message_lower or "region-restricted" in error_message_lower:
            user_message = "This video is geo-restricted and not available in your region."
        elif "unable to extract video data" in error_message_lower: # Common yt-dlp error
            user_message = "Could not extract video data. The video might be private, deleted, or the URL is incorrect."
        
        app.logger.error(f"DownloadError for URL {url}: {str(e_dl)}")
        return jsonify({'error': user_message}), 500
    except Exception as e_general:
        app.logger.error(f"Unexpected error for URL {url}: {str(e_general)}")
        return jsonify({'error': f"An unexpected error occurred while fetching video info."}), 500


@app.route('/download_video', methods=['GET'])
def download_video():
    url = request.args.get('url')
    format_id = request.args.get('format_id') # This is the specific format_id from the list
    filename_on_server = None

    # Get download options from query parameters
    # Convert boolean strings to actual booleans, provide defaults
    audio_only_str = request.args.get('audioOnly', 'false')
    audio_only = audio_only_str.lower() == 'true'
    
    audio_format_pref = request.args.get('audioFormat', 'best')
    video_quality_pref = request.args.get('videoQuality', 'best') # e.g., '720', 'best'
    
    embed_subs_str = request.args.get('embedSubs', 'false')
    embed_subs = embed_subs_str.lower() == 'true'

    if not url:
        app.logger.warning("Download request failed: URL is required.")
        return jsonify({'error': 'URL is required for download.'}), 400
    if not format_id and not audio_only: # format_id is crucial unless it's audio_only where we can be more flexible
        app.logger.warning(f"Download request for {url} failed: Format ID is required for video downloads.")
        return jsonify({'error': 'Format ID is required for video downloads.'}), 400

    app.logger.info(f"Download request for URL: {url}, Format ID: {format_id}, Options: audio_only={audio_only}, audio_format={audio_format_pref}, video_quality={video_quality_pref}, embed_subs={embed_subs}")

    try:
        if not os.path.exists(DOWNLOADS_DIR):
            os.makedirs(DOWNLOADS_DIR)

        # --- Construct ydl_opts based on user preferences ---
        ydl_opts = {
            'noplaylist': True,
            'overwrites': True, # Important for retries or if filename clashes (though we try to make them unique)
            'quiet': True,
            'no_warnings': True,
            # Use a more unique filename template to avoid issues with concurrent downloads or special characters.
            # %(id)s (video ID) and %(format_id)s are good for uniqueness.
            'outtmpl': os.path.join(DOWNLOADS_DIR, '%(id)s_%(format_id)s.%(ext)s'),
        }
        
        postprocessors = []

        if audio_only:
            ydl_opts['extract_audio'] = True
            # Let yt-dlp choose the best audio format if 'best' is specified by user
            if audio_format_pref != 'best':
                ydl_opts['audioformat'] = audio_format_pref
                # Add postprocessor for specific audio format conversion if not 'best'
                # This ensures the desired codec is used.
                postprocessors.append({
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': audio_format_pref,
                    'preferredquality': '0', # yt-dlp default, usually high quality for specified codec
                })
            # Format selection for audio_only:
            # If 'best' audio format is chosen, 'bestaudio/best' lets yt-dlp pick the container.
            # If a specific audio_format_pref is given, request it directly.
            ydl_opts['format'] = 'bestaudio/best' if audio_format_pref == 'best' else f'bestaudio[ext={audio_format_pref}]/bestaudio'

        else: # Video download (or video + audio)
            # Start with the user-selected format_id if available, otherwise default to a flexible choice.
            # The format_id from the client is generally a good specific choice.
            selected_format = format_id if format_id else 'bestvideo+bestaudio/best'

            if video_quality_pref != 'best':
                try:
                    quality_val = int(video_quality_pref)
                    # Refine format: select best video up to specified height, plus best audio.
                    # This string appends to the user's selected_format or yt-dlp's default.
                    # It prefers formats that are already combined or allows merging.
                    ydl_opts['format'] = f"{selected_format}[height<=?{quality_val}]/bestvideo[height<=?{quality_val}]+bestaudio/best[height<=?{quality_val}]"
                except ValueError:
                    app.logger.warning(f"Invalid video_quality_pref '{video_quality_pref}', defaulting to '{selected_format}'.")
                    ydl_opts['format'] = selected_format # Fallback to selected_format if quality is not 'best' or numeric
            else:
                ydl_opts['format'] = selected_format # Use the format_id or default if quality is 'best'
        
        if embed_subs:
            ydl_opts['writesubtitles'] = True
            ydl_opts['subtitleslangs'] = ['en'] # Target English subtitles
            ydl_opts['embedsubtitles'] = True   # Embed subtitles into the video file
            # yt-dlp handles postprocessing for subtitle embedding if the output container supports it (e.g., mkv, mp4).
            # Consider adding 'merge_output_format': 'mkv' if subtitle embedding often fails for mp4.

        if postprocessors: # Add any accumulated postprocessors
            ydl_opts['postprocessors'] = postprocessors
        # --- End of ydl_opts construction ---

        app.logger.debug(f"Attempting download with effective yt-dlp opts: {json.dumps(ydl_opts, indent=2)}")
        
        # Perform download
        with YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=True)
            except yt_dlp.utils.DownloadError as de_inner:
                app.logger.error(f"yt-dlp DownloadError during download for {url}: {str(de_inner)}")
                return jsonify({'error': f"Download failed: {str(de_inner)}"}), 500
            except Exception as e_inner_extract:
                app.logger.error(f"yt-dlp generic error during download for {url}: {str(e_inner_extract)}")
                return jsonify({'error': f"An error occurred during video processing: {str(e_inner_extract)}"}), 500

            filename_on_server = ydl.prepare_filename(info)
            
            # Determine suggested filename for client (more robustly)
            title = info.get('title', 'video')
            # Extension should be from 'info' after download and potential postprocessing
            downloaded_ext = info.get('ext', 'unknown') 
            if audio_only and audio_format_pref != 'best':
                # If a specific audio format was requested, use that for the extension,
                # as postprocessing should have converted it.
                downloaded_ext = audio_format_pref
            
            suggested_filename = f"{title}.{downloaded_ext}"

            if not filename_on_server or not os.path.exists(filename_on_server):
                app.logger.error(f"File not found on server after download attempt: {filename_on_server} for URL {url}")
                return jsonify({'error': 'File not found on server after download processing.'}), 500
            
            # Determine mimetype based on actual downloaded extension
            mimetype = f"audio/{downloaded_ext}" if audio_only else f"video/{downloaded_ext}"
            if downloaded_ext in ['mp3', 'm4a', 'opus', 'wav', 'mp4', 'mkv', 'webm']:
                 mimetype = f"{'audio' if audio_only else 'video'}/{downloaded_ext}"
            else: # Generic fallback
                mimetype = 'application/octet-stream'


            app.logger.info(f"Streaming file {filename_on_server} as {suggested_filename} with mimetype {mimetype}")
            return send_from_directory(
                directory=os.path.dirname(filename_on_server),
                path=os.path.basename(filename_on_server),
                as_attachment=True,
                download_name=suggested_filename,
                mimetype=mimetype
            )

    except yt_dlp.utils.DownloadError as e_outer_dl: # Errors before or during ydl context
        app.logger.error(f"Outer DownloadError for {url}: {str(e_outer_dl)}")
        return jsonify({'error': f"A download error occurred: {str(e_outer_dl)}"}), 500
    except Exception as e_general_outer:
        app.logger.error(f"Outer general error for {url}: {str(e_general_outer)}")
        return jsonify({'error': f"An unexpected server error occurred during download preparation."}), 500
    finally:
        if filename_on_server and os.path.exists(filename_on_server):
            try:
                os.remove(filename_on_server)
                app.logger.info(f"Successfully deleted temporary file: {filename_on_server}")
            except OSError as e_remove:
                app.logger.error(f"Error deleting temporary file {filename_on_server}: {str(e_remove)}")

if __name__ == '__main__':
    # Before running the app, ensure Flask is installed.
    # You can typically install it using pip:
    # pip install Flask yt-dlp
    print("Flask and yt-dlp are required. Install them with: pip install Flask yt-dlp")
    print(f"Serving on http://127.0.0.1:5000")
    print(f"Video downloads will be saved to: {DOWNLOADS_DIR}")
    # Set up basic logging for the app
    if not app.debug:
        import logging
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler('web_server.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('yt-dlp Web UI startup')

    app.run(host='0.0.0.0', port=5000, debug=True)
