import os
import json # Used by app.logger.debug for pretty printing opts
import logging
from logging.handlers import RotatingFileHandler
import sys
from pathlib import Path
import time
import uuid
from threading import Thread

# Try to import dotenv for environment variable support
try:
    from dotenv import load_dotenv
    # Load environment variables from .env file if it exists
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

try:
    from flask import Flask, request, jsonify, send_from_directory
    import yt_dlp
    from yt_dlp import YoutubeDL
except ImportError:
    print("Flask and yt-dlp are required. Install them with: pip install Flask yt-dlp")
    sys.exit(1)

# Create Flask app instance
app = Flask(__name__) # Simplified as static files are served from root.

# 存储下载进度的全局字典
download_progress = {}

# 自定义进度钩子函数
def progress_hook(d, download_id):
    """
    处理下载进度的函数
    """
    try:
        if download_id not in download_progress:
            download_progress[download_id] = {
                'status': 'waiting',
                'progress': 0,
                'filename': '',
                'speed': '',
                'eta': '',
                'total_bytes': 0,
                'downloaded_bytes': 0,
                'error': None
            }
        
        if d['status'] == 'downloading':
            download_progress[download_id]['status'] = 'downloading'
            download_progress[download_id]['filename'] = d.get('filename', '').split('/')[-1]
            download_progress[download_id]['speed'] = d.get('_speed_str', '')
            download_progress[download_id]['eta'] = d.get('_eta_str', '')
            
            # Calculate progress percentage
            if 'total_bytes' in d and d['total_bytes'] > 0:
                download_progress[download_id]['total_bytes'] = d['total_bytes']
                download_progress[download_id]['downloaded_bytes'] = d['downloaded_bytes']
                progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                download_progress[download_id]['progress'] = round(progress, 1)
            elif 'total_bytes_estimate' in d and d['total_bytes_estimate'] > 0:
                download_progress[download_id]['total_bytes'] = d['total_bytes_estimate']
                download_progress[download_id]['downloaded_bytes'] = d['downloaded_bytes']
                progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
                download_progress[download_id]['progress'] = round(progress, 1)
        
        elif d['status'] == 'finished':
            # Download finished, now post-processing
            download_progress[download_id]['status'] = 'processing'
            download_progress[download_id]['progress'] = 100
            download_progress[download_id]['filename'] = d.get('filename', '').split('/')[-1]
        
        elif d['status'] == 'error':
            download_progress[download_id]['status'] = 'error'
            download_progress[download_id]['error'] = d.get('error', 'Unknown error')
    except Exception as e:
        app.logger.error(f"Error in progress_hook: {str(e)}")
        # 确保即使出错也能更新进度状态
        if download_id in download_progress:
            download_progress[download_id]['status'] = 'error'
            download_progress[download_id]['error'] = f"Error tracking progress: {str(e)}"

# Get downloads directory from environment variable or use default
DOWNLOADS_DIR = os.environ.get('DOWNLOADS_DIR', os.path.join(os.getcwd(), 'downloads'))
# Convert relative path to absolute if needed
if not os.path.isabs(DOWNLOADS_DIR):
    DOWNLOADS_DIR = os.path.join(os.getcwd(), DOWNLOADS_DIR)
# Ensure the downloads directory exists
if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)

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
            'extractor_retries': 3,  # Retry extraction
            'socket_timeout': 30,    # Increase timeout
            'nocheckcertificate': True,  # Skip HTTPS certificate validation
            # For YouTube bot detection issues
            # Get cookies file path from environment variable or use default
            'cookiefile': os.environ.get('COOKIES_FILE', os.path.join(os.getcwd(), 'cookies.txt')) 
                if os.path.exists(os.environ.get('COOKIES_FILE', os.path.join(os.getcwd(), 'cookies.txt'))) else None,
            # Alternatively, use browser cookies if available
            'cookiesfrombrowser': ('chrome',) 
                if not os.path.exists(os.environ.get('COOKIES_FILE', os.path.join(os.getcwd(), 'cookies.txt'))) else None,
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
        
        # Check for specific YouTube errors
        error_str = str(e_dl)
        
        # YouTube bot detection
        if "Sign in to confirm you're not a bot" in error_str:
            return jsonify({
                'error': "YouTube bot detection triggered. Please create a cookies.txt file with your YouTube cookies.",
                'details': "See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp for instructions."
            }), 403
            
        # Failed to extract player response error
        if "Failed to extract any player response" in error_str:
            return jsonify({
                'error': "YouTube extraction failed. This may be due to YouTube API changes.",
                'details': "Try using a different video URL or check if the video is available in your region. You can also try creating a cookies.txt file with your YouTube cookies."
            }), 500
        
        app.logger.error(f"DownloadError for URL {url}: {str(e_dl)}")
        return jsonify({'error': user_message}), 500
    except Exception as e_general:
        app.logger.error(f"Unexpected error for URL {url}: {str(e_general)}")
        return jsonify({'error': f"An unexpected error occurred while fetching video info."}), 500


@app.route('/download_progress/<download_id>', methods=['GET'])
def get_download_progress(download_id):
    """
    获取特定下载任务的进度
    """
    if download_id not in download_progress:
        return jsonify({'error': 'Download ID not found'}), 404
    
    progress_data = download_progress[download_id].copy()
    
    # 如果下载已完成，从进度字典中移除该条目
    if progress_data['status'] == 'completed':
        # 保留一段时间后清理
        pass
    
    # 确保所有值都是可序列化的
    for key in list(progress_data.keys()):
        if not isinstance(progress_data[key], (str, int, float, bool, list, dict, type(None))):
            progress_data[key] = str(progress_data[key])
    
    return jsonify(progress_data)

@app.route('/start_download', methods=['GET'])
def start_download():
    """
    开始下载视频并返回下载ID，用于跟踪进度
    """
    url = request.args.get('url')
    format_id = request.args.get('format_id')
    audio_only_str = request.args.get('audioOnly', 'false')
    audio_only = audio_only_str.lower() == 'true'
    
    if not url:
        return jsonify({'error': 'URL is required for download.'}), 400
    if not format_id and not audio_only:
        return jsonify({'error': 'Format ID is required for video downloads.'}), 400
    
    # 获取可能需要的其他参数
    audio_format_pref = request.args.get('audioFormat', 'best')
    video_quality_pref = request.args.get('videoQuality', 'best')
    embed_subs_str = request.args.get('embedSubs', 'false')
    embed_subs = embed_subs_str.lower() == 'true'
    
    # 生成唯一下载ID
    download_id = str(uuid.uuid4())
    
    # 在新线程中启动下载，传递所有需要的参数
    thread = Thread(target=download_video_task, args=(download_id, url, format_id, audio_only, audio_format_pref, video_quality_pref, embed_subs))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'download_id': download_id,
        'status': 'started'
    })

@app.route('/download_video/<download_id>', methods=['GET'])
def download_completed_video(download_id):
    """
    下载已完成处理的视频文件
    """
    if download_id not in download_progress:
        return jsonify({'error': 'Download ID not found'}), 404
    
    progress_data = download_progress[download_id]
    
    if progress_data['status'] != 'completed':
        return jsonify({'error': 'Download not completed yet'}), 400
    
    filename = progress_data.get('filename_on_server')
    if not filename or not os.path.exists(filename):
        return jsonify({'error': 'File not found on server'}), 404
    
    suggested_filename = progress_data.get('suggested_filename', os.path.basename(filename))
    mimetype = progress_data.get('mimetype', 'application/octet-stream')
    
    return send_from_directory(
        directory=os.path.dirname(filename),
        path=os.path.basename(filename),
        as_attachment=True,
        download_name=suggested_filename,
        mimetype=mimetype
    )

def download_video_task(download_id, url, format_id, audio_only, audio_format_pref='best', video_quality_pref='best', embed_subs=False):
    """
    后台下载视频任务
    """
    filename_on_server = None
    
    # 初始化下载进度记录
    download_progress[download_id] = {
        'status': 'waiting',
        'progress': 0,
        'filename': '',
        'speed': '',
        'eta': '',
        'total_bytes': 0,
        'downloaded_bytes': 0,
        'error': None
    }

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
            
        # 不需要创建进度钩子实例，因为我们现在使用函数

        # --- Construct ydl_opts based on user preferences ---
        # 定义一个内部函数，而不是使用lambda
        def hook_wrapper(d):
            progress_hook(d, download_id)
            
        ydl_opts = {
            'noplaylist': True,
            'overwrites': True, # Important for retries or if filename clashes (though we try to make them unique)
            'quiet': True,
            'no_warnings': True,
            # 添加跳过SSL证书验证的选项，解决Twitter等网站的下载问题
            'nocheckcertificate': True,
            # 添加重试次数，提高下载成功率
            'retries': 10,
            # Use a more unique filename template to avoid issues with concurrent downloads or special characters.
            # %(id)s (video ID) and %(format_id)s are good for uniqueness.
            'outtmpl': os.path.join(DOWNLOADS_DIR, '%(id)s_%(format_id)s.%(ext)s'),
            # 添加进度钩子函数
            'progress_hooks': [hook_wrapper],
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
            # 修改：确保视频下载包含音频轨道
            # 如果用户选择了特定格式，我们将其与最佳音频轨道合并
            # 这样即使用户选择的格式只有视频没有音频，我们也能确保最终文件有声音
            selected_format = f"{format_id}+bestaudio/best" if format_id else 'bestvideo+bestaudio/best'
            
            # 添加合并输出格式，确保音视频可以正确合并
            ydl_opts['merge_output_format'] = 'mp4'

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

        # 创建一个可序列化的选项副本用于日志记录
        log_opts = ydl_opts.copy()
        log_opts.pop('progress_hooks', None)  # 移除不可序列化的钩子函数
        app.logger.debug(f"Attempting download with effective yt-dlp opts: {json.dumps(log_opts, indent=2)}")
        
        # Perform download
        with YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=True)
            except yt_dlp.utils.DownloadError as de_inner:
                app.logger.error(f"yt-dlp DownloadError during download for {url}: {str(de_inner)}")
                download_progress[download_id]['status'] = 'error'
                download_progress[download_id]['error'] = f"Download failed: {str(de_inner)}"
                return
            except Exception as e_inner_extract:
                app.logger.error(f"yt-dlp generic error during download for {url}: {str(e_inner_extract)}")
                download_progress[download_id]['status'] = 'error'
                download_progress[download_id]['error'] = f"An error occurred during video processing: {str(e_inner_extract)}"
                return

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
                download_progress[download_id]['status'] = 'error'
                download_progress[download_id]['error'] = 'File not found on server after download processing.'
                return
            
            # Determine mimetype based on actual downloaded extension
            mimetype = f"audio/{downloaded_ext}" if audio_only else f"video/{downloaded_ext}"
            if downloaded_ext in ['mp3', 'm4a', 'opus', 'wav', 'mp4', 'mkv', 'webm']:
                 mimetype = f"{'audio' if audio_only else 'video'}/{downloaded_ext}"
            else: # Generic fallback
                mimetype = 'application/octet-stream'

            # 更新下载进度信息，标记为完成
            download_progress[download_id]['status'] = 'completed'
            download_progress[download_id]['filename_on_server'] = filename_on_server
            download_progress[download_id]['suggested_filename'] = suggested_filename
            download_progress[download_id]['mimetype'] = mimetype
            
            app.logger.info(f"Download completed: {filename_on_server} as {suggested_filename} with mimetype {mimetype}")

    except yt_dlp.utils.DownloadError as e_outer_dl: # Errors before or during ydl context
        error_message = str(e_outer_dl)
        app.logger.error(f"Outer DownloadError for {url}: {error_message}")
        
        # Check for YouTube bot detection
        if "Sign in to confirm you're not a bot" in error_message:
            download_progress[download_id]['status'] = 'error'
            download_progress[download_id]['error'] = "YouTube bot detection triggered. Please create a cookies.txt file with your YouTube cookies."
            download_progress[download_id]['details'] = "See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp for instructions."
            return
            
        download_progress[download_id]['status'] = 'error'
        download_progress[download_id]['error'] = f"A download error occurred: {error_message}"
        return
    except Exception as e_general_outer:
        app.logger.error(f"Outer general error for {url}: {str(e_general_outer)}")
        download_progress[download_id]['status'] = 'error'
        download_progress[download_id]['error'] = f"An unexpected server error occurred during download preparation: {str(e_general_outer)}"
        return
    # 不在下载后立即删除文件，而是等待用户下载完成
    # 可以添加一个定时任务来清理过期的文件

if __name__ == '__main__':
    # Get port from environment variable or use default 5001 (to avoid conflicts with AirPlay on macOS)
    port = int(os.environ.get('PORT', 5001))
    
    # Get debug mode from environment variable or default to True
    debug_mode = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')
    
    print(f"Serving on http://127.0.0.1:{port}")
    print(f"Video downloads will be saved to: {DOWNLOADS_DIR}")
    
    # Set up basic logging for the app
    log_file = os.environ.get('LOG_FILE', 'web_server.log')
    if not app.debug:
        file_handler = RotatingFileHandler(log_file, maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('yt-dlp Web UI startup')

    app.run(host='0.0.0.0', port=port, debug=debug_mode)
