// 语言翻译配置
const translations = {
  'zh': {
    // 导航和标题
    'helpCenter': '帮助中心',
    'blog': '博客',
    'language': '中文',
    
    // 主要内容
    'videoBadge': '视频一键下载',
    'heroTitle': '视频下载器',
    'heroSubtitle': '快速、安全地下载喜爱的视频、图片、音乐',
    
    // 输入和按钮
    'urlPlaceholder': 'https://www.youtube.com/watch?v=...',
    'pasteButton': '粘贴',
    'clearButton': '清除',
    'convertButton': '提取视频链接',
    'loading': '正在获取视频信息...',
    
    // 视频信息
    'videoTitle': '视频标题',
    'videoTab': '视频',
    'audioTab': '音频',
    'imageTab': '图片',
    'downloadButton': '下载',
    'formatLabel': '格式',
    'resolutionLabel': '分辨率',
    'extractThumbnail': '提取视频缩略图',
    'downloadThumbnail': '下载缩略图',
    
    // 错误信息
    'enterUrlError': '请输入视频URL。',
    'invalidUrlError': '请输入有效的URL（例如，以http://、https://或www.开头）。',
    'fetchError': '获取视频信息失败。请检查您的连接并重试。',
    'noFormatsAudio': '没有可用的音频格式',
    'noFormatsVideo': '没有可用的视频格式',
    'selectFormatError': '请选择至少一种格式',
    'downloadStarted': '下载已开始...',
    'downloadError': '下载出错',
    
    // 下载进度
    'starting': '开始下载...',
    'preparing': '准备中...',
    'waiting': '等待中...',
    'downloading': '下载中:',
    'processing': '处理中...',
    'completed': '下载完成',
    'error': '错误',
    
    // 页脚
    'footerCopyright': '© 2025 VideoDownload - 基于 <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">yt-dlp</a> 构建 | <a href="https://github.com/xiiizoux/yt-dlp-webui" target="_blank"><i class="fab fa-github"></i> GitHub</a>',
    'disclaimer': '本工具仅供个人学习和合法用途使用，请尊重版权并遵守相关法律法规'
  },
  'en': {
    // Navigation and titles
    'helpCenter': 'Help Center',
    'blog': 'Blog',
    'language': 'English',
    
    // Main content
    'videoBadge': 'One-Click Video Download',
    'heroTitle': 'Video Downloader',
    'heroSubtitle': 'Download your favorite videos, images, and music quickly and safely',
    
    // Input and buttons
    'urlPlaceholder': 'https://www.youtube.com/watch?v=...',
    'pasteButton': 'Paste',
    'clearButton': 'Clear',
    'convertButton': 'Extract Video Link',
    'loading': 'Fetching video information...',
    
    // Video info
    'videoTitle': 'Video Title',
    'videoTab': 'Video',
    'audioTab': 'Audio',
    'imageTab': 'Image',
    'downloadButton': 'Download',
    'formatLabel': 'Format',
    'resolutionLabel': 'Resolution',
    'extractThumbnail': 'Extract Video Thumbnail',
    'downloadThumbnail': 'Download Thumbnail',
    
    // Error messages
    'enterUrlError': 'Please enter a video URL.',
    'invalidUrlError': 'Please enter a valid URL (e.g., starting with http://, https://, or www.).',
    'fetchError': 'Failed to fetch video information. Please check your connection and try again.',
    'noFormatsAudio': 'No audio formats available',
    'noFormatsVideo': 'No video formats available',
    'selectFormatError': 'Please select at least one format',
    'downloadStarted': 'Download started...',
    'downloadError': 'Download error',
    
    // Download progress
    'starting': 'Starting download...',
    'preparing': 'Preparing...',
    'waiting': 'Waiting...',
    'downloading': 'Downloading:',
    'processing': 'Processing...',
    'completed': 'Download completed',
    'error': 'Error',
    
    // Footer
    'footerCopyright': '© 2025 VideoDownload - Powered by <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">yt-dlp</a> | <a href="https://github.com/xiiizoux/yt-dlp-webui" target="_blank"><i class="fab fa-github"></i> GitHub</a>',
    'disclaimer': 'This tool is for personal learning and legal purposes only. Please respect copyright and comply with relevant laws and regulations.'
  }
};

// 导出翻译对象
if (typeof module !== 'undefined' && module.exports) {
  module.exports = translations;
}
