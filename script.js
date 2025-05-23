// 全局变量
let activeDownloadId = null;
let downloadProgressInterval = null;
let currentLang = localStorage.getItem('language') || 'zh';

// 开始下载函数
async function startDownload(event) {
    const button = event.currentTarget;
    const url = button.dataset.url;
    const formatId = button.dataset.formatId;
    const audioOnly = button.dataset.audioOnly;
    
    // 禁用按钮并显示加载状态
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translations[currentLang].starting}`;
    
    try {
        // 调用开始下载API
        const response = await fetch(`/start_download?url=${encodeURIComponent(url)}&format_id=${encodeURIComponent(formatId)}&audioOnly=${audioOnly}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 保存下载ID
        activeDownloadId = data.download_id;
        
        // 创建一个包含下载链接的容器元素
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'download-container';
        
        // 创建进度条容器
        const progressContainer = document.createElement('div');
        progressContainer.className = 'download-progress-container';
        progressContainer.innerHTML = `
            <div class="download-progress-bar">
                <div class="download-progress" style="width: 0%"></div>
            </div>
            <div class="download-progress-info">
                <span class="download-progress-percent">0%</span>
                <span class="download-progress-status">${translations[currentLang].preparing}</span>
            </div>
        `;
        
        // 将按钮从其原始父元素中移除
        const formatItem = button.closest('.format-button');
        button.parentNode.removeChild(button);
        
        // 将按钮添加到新容器中
        downloadContainer.appendChild(button);
        
        // 将进度条添加到新容器中
        downloadContainer.appendChild(progressContainer);
        
        // 将新容器添加到格式项中
        formatItem.appendChild(downloadContainer);
        
        // 开始轮询下载进度
        if (downloadProgressInterval) {
            clearInterval(downloadProgressInterval);
        }
        
        downloadProgressInterval = setInterval(() => checkDownloadProgress(activeDownloadId, button, progressContainer), 1000);
        
    } catch (error) {
        console.error('Error starting download:', error);
        button.innerHTML = originalText;
        button.disabled = false;
        alert(translations[currentLang].downloadError + ': ' + error.message);
    }
}

// 检查下载进度
async function checkDownloadProgress(downloadId, button, progressContainer) {
    try {
        const response = await fetch(`/download_progress/${downloadId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch progress');
        }
        
        // 更新进度条
        const progressBar = progressContainer.querySelector('.download-progress');
        const progressPercent = progressContainer.querySelector('.download-progress-percent');
        const progressStatus = progressContainer.querySelector('.download-progress-status');
        
        // 设置进度条宽度
        progressBar.style.width = `${data.progress}%`;
        progressPercent.textContent = `${data.progress}%`;
        
        // 更新状态文本
        let statusText = '';
        switch (data.status) {
            case 'waiting':
                statusText = translations[currentLang].waiting;
                break;
            case 'downloading':
                // 显示下载速度和文件大小
                // 处理速度显示
                let speed = data.speed;
                if (typeof speed === 'string' && speed) {
                    // 已经是格式化的字符串，直接使用
                    speed = speed;
                } else {
                    // 尝试格式化数字
                    speed = formatSpeed(data.downloaded_bytes / 10); // 简单估算
                }
                
                // 处理文件大小显示
                const size = formatSize(data.total_bytes);
                statusText = `${translations[currentLang].downloading}: ${speed} - ${size}`;
                break;
            case 'processing':
                statusText = translations[currentLang].processing;
                break;
            case 'completed':
                statusText = translations[currentLang].completed;
                clearInterval(downloadProgressInterval);
                
                // 下载完成后，启动实际的文件下载
                setTimeout(() => {
                    window.location.href = `/download_video/${downloadId}`;
                    
                    // 重置按钮状态
                    button.disabled = false;
                    button.innerHTML = `<i class="fas fa-download"></i> ${translations[currentLang].downloadButton}`;
                    
                    // 可选：在下载开始后移除进度条
                    setTimeout(() => {
                        progressContainer.remove();
                    }, 3000);
                }, 1000);
                break;
            case 'error':
                statusText = `${translations[currentLang].error}: ${data.error}`;
                clearInterval(downloadProgressInterval);
                
                // 重置按钮状态
                button.disabled = false;
                button.innerHTML = `<i class="fas fa-download"></i> ${translations[currentLang].downloadButton}`;
                break;
        }
        
        progressStatus.textContent = statusText;
        
    } catch (error) {
        console.error('Error checking download progress:', error);
        clearInterval(downloadProgressInterval);
        
        // 重置按钮状态
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-download"></i> ${translations[currentLang].downloadButton}`;
    }
}

// 格式化文件大小
function formatSize(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    
    // 确保 bytes 是数字
    bytes = Number(bytes);
    if (isNaN(bytes)) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// 格式化下载速度
function formatSpeed(bytesPerSecond) {
    // 如果已经是字符串格式，直接返回
    if (typeof bytesPerSecond === 'string' && bytesPerSecond) {
        return bytesPerSecond;
    }
    
    // 如果是数字，进行格式化
    if (!bytesPerSecond || isNaN(bytesPerSecond) || bytesPerSecond === 0) return '0 B/s';
    
    // 确保 bytesPerSecond 是数字
    bytesPerSecond = Number(bytesPerSecond);
    if (isNaN(bytesPerSecond)) return '0 B/s';
    
    return `${formatSize(bytesPerSecond)}/s`;
}

document.addEventListener('DOMContentLoaded', () => {
    
    // 主题切换功能
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // 语言切换功能
    const languageToggle = document.getElementById('languageToggle');
    const currentLanguageEl = document.getElementById('currentLanguage');
    
    // 检查本地存储中的主题设置
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.documentElement.setAttribute('lang', currentLang);
    
    // 初始化页面语言
    updateLanguage(currentLang);
    
    // 根据当前主题更新图标
    updateThemeIcon(currentTheme);
    
    // 主题切换按钮点击事件
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // 更新主题
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // 更新图标
        updateThemeIcon(newTheme);
    });
    
    // 语言切换按钮点击事件
    languageToggle.addEventListener('click', () => {
        // 切换语言
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        
        // 更新语言
        updateLanguage(currentLang);
        
        // 保存语言设置
        localStorage.setItem('language', currentLang);
        document.documentElement.setAttribute('lang', currentLang);
    });
    
    // 更新主题图标
    function updateThemeIcon(theme) {
        themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    // 更新页面语言
    function updateLanguage(lang) {
        // 更新语言切换按钮文本
        currentLanguageEl.textContent = translations[lang].language;
        
        // 更新导航栏文本
        document.querySelector('.app-nav a:nth-child(1)').innerHTML = `<i class="fas fa-question-circle"></i> ${translations[lang].helpCenter}`;
        document.querySelector('.app-nav a:nth-child(2)').innerHTML = `<i class="fas fa-rss"></i> ${translations[lang].blog}`;
        
        // 更新主要内容
        document.querySelector('.youtube-badge').innerHTML = `<i class="fab fa-youtube"></i> ${translations[lang].videoBadge}`;
        document.querySelector('.hero-title').textContent = translations[lang].heroTitle;
        document.querySelector('.hero-subtitle').textContent = translations[lang].heroSubtitle;
        
        // 更新输入和按钮
        document.getElementById('videoUrl').placeholder = translations[lang].urlPlaceholder;
        document.getElementById('fetchButton').textContent = translations[lang].pasteButton;
        document.getElementById('convertButton').textContent = translations[lang].convertButton;
        document.querySelector('.loading-indicator span').textContent = translations[lang].loading;
        
        // 更新视频信息区域
        document.querySelector('.video-info-title').innerHTML = `${translations[lang].videoTitle}: <span id="videoTitle">Video Title</span>`;
        document.querySelector('[data-tab="video"]').innerHTML = `<i class="fas fa-video"></i> ${translations[lang].videoTab}`;
        document.querySelector('[data-tab="audio"]').innerHTML = `<i class="fas fa-music"></i> ${translations[lang].audioTab}`;
        document.querySelector('[data-tab="image"]').innerHTML = `<i class="fas fa-image"></i> ${translations[lang].imageTab}`;
        
        // 更新图片标签页内容
        document.querySelector('.image-formats p').textContent = translations[lang].extractThumbnail;
        document.querySelector('.download-thumbnail-button').textContent = translations[lang].downloadThumbnail;
        
        // 更新页脚
        document.getElementById('copyright').textContent = translations[lang].copyright;
        document.getElementById('poweredBy').textContent = translations[lang].poweredBy;
        document.getElementById('disclaimer').textContent = translations[lang].disclaimer;
    }
    // DOM Element References
    const elements = {
        videoUrlInput: document.getElementById('videoUrl'),
        fetchButton: document.getElementById('fetchButton'),
        clearButton: document.getElementById('clearButton'),
        convertButton: document.getElementById('convertButton'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        videoInfoDiv: document.getElementById('videoInfo'),
        videoTitleEl: document.getElementById('videoTitle'),
        videoThumbnailEl: document.getElementById('videoThumbnail'),
        thumbnailPreviewEl: document.getElementById('thumbnailPreview'),
        videoDurationEl: document.getElementById('videoDuration'),
        downloadFeedbackEl: document.getElementById('downloadFeedback'),
        feedbackMessageEl: document.querySelector('.feedback-message'),
        tabButtons: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        audioFormatsContainer: document.querySelector('.audio-formats'),
        videoFormatsContainer: document.querySelector('.video-formats'),
        imageFormatsContainer: document.querySelector('.image-formats')
    };

    // 保存所选格式的变量
    let selectedAudioFormat = null;
    let selectedVideoFormat = null;
    let currentVideoData = null;

    // 初始化标签页切换功能
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // 移除所有标签页的活动状态
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加活动状态到当前标签页
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // 处理格式按钮点击
    function handleFormatButtonClick(button, isAudio) {
        // 移除同组中其他按钮的选中状态
        const container = isAudio ? elements.audioFormatsContainer : elements.videoFormatsContainer;
        container.querySelectorAll('.format-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 添加选中状态到当前按钮
        button.classList.add('selected');
        
        // 保存所选格式
        const formatId = button.dataset.formatId;
        if (isAudio) {
            selectedAudioFormat = formatId;
            selectedVideoFormat = null; // 如果选择了音频格式，则取消视频格式选择
        } else {
            selectedVideoFormat = formatId;
            selectedAudioFormat = null; // 如果选择了视频格式，则取消音频格式选择
        }
    }

    // 显示错误信息
    function displayError(message, details) {
        elements.loadingIndicator.style.display = 'none';
        elements.videoInfoDiv.style.display = 'block'; // 显示信息部分以显示错误
        
        // 清除之前的内容
        elements.videoTitleEl.textContent = currentLang === 'zh' ? '错误' : 'Error';
        elements.videoThumbnailEl.src = '';
        elements.thumbnailPreviewEl.src = '';
        
        // 清除音频和视频格式容器
        elements.audioFormatsContainer.innerHTML = '';
        elements.videoFormatsContainer.innerHTML = '';
        
        // 在音频格式容器中显示错误信息
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        elements.audioFormatsContainer.appendChild(errorDiv);
        
        // 如果提供了详细信息，则添加
        if (details) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'error-details';
            detailsDiv.textContent = details;
            elements.audioFormatsContainer.appendChild(detailsDiv);
        }
        
        // 为YouTube机器人检测添加特殊消息
        if (message.includes('YouTube bot detection') || message.includes('Sign in to confirm you\'re not a bot')) {
            const helpDiv = document.createElement('div');
            helpDiv.className = 'bot-detection-help';
            
            const helpTitle = currentLang === 'zh' ? '如何解决此问题:' : 'How to fix this issue:';
            const step1 = currentLang === 'zh' ? '在应用程序文件夹中创建cookies.txt文件' : 'Create a cookies.txt file in the application folder';
            const step2 = currentLang === 'zh' ? '使用浏览器扩展（如"Get cookies.txt"）将您的YouTube cookies添加到此文件' : 'Add your YouTube cookies to this file (use a browser extension like "Get cookies.txt")';
            const step3 = currentLang === 'zh' ? '重新启动应用程序' : 'Restart the application';
            const moreInfo = currentLang === 'zh' ? '有关更多信息，请参阅README文件。' : 'For more information, see the README file.';
            
            helpDiv.innerHTML = `
                <h4><i class="fas fa-info-circle"></i> ${helpTitle}</h4>
                <ol>
                    <li>${step1}</li>
                    <li>${step2}</li>
                    <li>${step3}</li>
                </ol>
                <p>${moreInfo}</p>
            `;
            elements.audioFormatsContainer.appendChild(helpDiv);
        }
    }

    // 显示视频元数据
    function displayVideoMetadata(data) {
        currentVideoData = data;
        elements.videoTitleEl.textContent = data.title || '视频标题不可用';
        
        if (data.thumbnail) {
            elements.videoThumbnailEl.src = data.thumbnail;
            elements.thumbnailPreviewEl.src = data.thumbnail;
        }
        
        // 设置视频时长
        if (data.duration) {
            const duration = formatDuration(data.duration);
            elements.videoDurationEl.textContent = duration;
        } else {
            elements.videoDurationEl.textContent = '未知';
        }
        
        // 设置缩略图下载按钮
        if (data.thumbnail) {
            const downloadThumbnailButton = document.querySelector('.download-thumbnail-button');
            if (downloadThumbnailButton) {
                downloadThumbnailButton.href = data.thumbnail;
                downloadThumbnailButton.download = `${data.title || 'thumbnail'}.jpg`;
            }
        }
    }

    // 格式化视频时长
    function formatDuration(seconds) {
        if (!seconds) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // 显示可用的格式
    function displayFormats(formats, originalUrl) { 
        // 清除之前的格式列表
        elements.audioFormatsContainer.innerHTML = ''; 
        elements.videoFormatsContainer.innerHTML = '';

        // 分离音频和视频格式
        const audioFormats = [];
        const videoFormats = [];

        formats.forEach(format => {
            // 防御性地获取格式属性
            const formatId = format.format_id || 'N/A';
            const ext = format.ext || 'N/A';
            const vcodec = format.vcodec || 'N/A';
            const acodec = format.acodec || 'N/A';
            const resolution = format.resolution || '';
            const fileSize = format.filesize ? 
                `${(Number(format.filesize) / 1024 / 1024).toFixed(1)}MB` : 
                (format.filesize_approx ? `~${(Number(format.filesize_approx) / 1024 / 1024).toFixed(1)}MB` : '');
            
            // 判断是音频还是视频格式
            const isAudioOnly = vcodec === 'none' || vcodec === 'N/A';
            
            if (isAudioOnly && acodec !== 'none') {
                // 音频格式
                const audioBitrate = format.abr ? `${Math.round(format.abr)}kbps` : '';
                const formatInfo = {
                    id: formatId,
                    ext: ext,
                    bitrate: audioBitrate,
                    size: fileSize,
                    label: `${ext.toUpperCase()}${audioBitrate ? ` (${audioBitrate})` : ''}${fileSize ? ` ${fileSize}` : ''}`
                };
                audioFormats.push(formatInfo);
            } else if (vcodec !== 'none' && resolution) {
                // 视频格式
                const formatInfo = {
                    id: formatId,
                    ext: ext,
                    resolution: resolution,
                    size: fileSize,
                    label: `${resolution}${fileSize ? ` ${fileSize}` : ''}`
                };
                videoFormats.push(formatInfo);
            }
        });

        // 按照比特率或分辨率排序
        audioFormats.sort((a, b) => {
            const bitrateA = a.bitrate ? parseInt(a.bitrate) : 0;
            const bitrateB = b.bitrate ? parseInt(b.bitrate) : 0;
            return bitrateB - bitrateA; // 降序排列
        });
        
        videoFormats.sort((a, b) => {
            const resA = parseInt(a.resolution);
            const resB = parseInt(b.resolution);
            return resB - resA; // 降序排列
        });

        // 创建音频格式按钮
        audioFormats.forEach(format => {
            const formatItem = document.createElement('div');
            formatItem.className = 'format-button';
            formatItem.dataset.formatId = format.id;
            
            const formatInfo = document.createElement('div');
            formatInfo.className = 'format-info';
            
            const formatLabel = document.createElement('div');
            formatLabel.className = 'format-label';
            formatLabel.innerHTML = `<strong>${translations[currentLang].formatLabel}: ${format.ext.toUpperCase()}</strong>${format.bitrate ? ` (${format.bitrate})` : ''}`;
            formatInfo.appendChild(formatLabel);
            
            if (format.size) {
                const formatSize = document.createElement('div');
                formatSize.className = 'format-size';
                formatSize.innerHTML = `<i class="fas fa-file"></i> ${format.size}`;
                formatInfo.appendChild(formatSize);
            }
            
            formatItem.appendChild(formatInfo);
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-button';
            downloadBtn.innerHTML = `<i class="fas fa-download"></i> ${translations[currentLang].downloadButton}`;
            downloadBtn.dataset.url = originalUrl;
            downloadBtn.dataset.formatId = format.id;
            downloadBtn.dataset.audioOnly = 'true';
            downloadBtn.onclick = startDownload;
            formatItem.appendChild(downloadBtn);
            
            formatItem.addEventListener('click', (e) => {
                if (e.target !== downloadBtn && !downloadBtn.contains(e.target)) {
                    handleFormatButtonClick(formatItem, true);
                }
            });
            
            elements.audioFormatsContainer.appendChild(formatItem);
        });

        // 创建视频格式按钮
        videoFormats.forEach(format => {
            const formatItem = document.createElement('div');
            formatItem.className = 'format-button';
            formatItem.dataset.formatId = format.id;
            
            const formatInfo = document.createElement('div');
            formatInfo.className = 'format-info';
            
            const formatLabel = document.createElement('div');
            formatLabel.className = 'format-label';
            formatLabel.innerHTML = `<strong>${translations[currentLang].resolutionLabel}: ${format.resolution}</strong> (${format.ext.toUpperCase()})`;
            formatInfo.appendChild(formatLabel);
            
            if (format.size) {
                const formatSize = document.createElement('div');
                formatSize.className = 'format-size';
                formatSize.innerHTML = `<i class="fas fa-file"></i> ${format.size}`;
                formatInfo.appendChild(formatSize);
            }
            
            formatItem.appendChild(formatInfo);
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-button';
            downloadBtn.innerHTML = `<i class="fas fa-download"></i> ${translations[currentLang].downloadButton}`;
            downloadBtn.dataset.url = originalUrl;
            downloadBtn.dataset.formatId = format.id;
            downloadBtn.dataset.audioOnly = 'false';
            downloadBtn.onclick = startDownload;
            formatItem.appendChild(downloadBtn);
            
            formatItem.addEventListener('click', (e) => {
                if (e.target !== downloadBtn && !downloadBtn.contains(e.target)) {
                    handleFormatButtonClick(formatItem, false);
                }
            });
            
            elements.videoFormatsContainer.appendChild(formatItem);
        });

        // 如果没有音频格式，显示提示
        if (audioFormats.length === 0) {
            const noFormats = document.createElement('p');
            noFormats.textContent = translations[currentLang].noFormatsAudio;
            elements.audioFormatsContainer.appendChild(noFormats);
        }

        // 如果没有视频格式，显示提示
        if (videoFormats.length === 0) {
            const noFormats = document.createElement('p');
            noFormats.textContent = translations[currentLang].noFormatsVideo;
            elements.videoFormatsContainer.appendChild(noFormats);
        }
    }

    // 主函数用于获取视频信息
    async function fetchVideo(url) {
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        };

        // 重置 UI 为新请求
        elements.loadingIndicator.style.display = 'flex';
        elements.videoInfoDiv.style.display = 'none'; 
        elements.downloadFeedbackEl.style.display = 'none';
        elements.videoThumbnailEl.src = ''; // 清除之前的缩略图
        elements.thumbnailPreviewEl.src = ''; // 清除之前的缩略图预览
        
        // 重置选中的格式
        selectedAudioFormat = null;
        selectedVideoFormat = null;

        try {
            const response = await fetch('/get_video_info', fetchOptions);
            const data = await response.json();
            
            // 无论结果如何，都隐藏加载指示器
            elements.loadingIndicator.style.display = 'none';
            
            if (data.error) {
                displayError(data.error, data.details);
            } else {
                elements.videoInfoDiv.style.display = 'block'; // 显示信息部分
                displayVideoMetadata(data); // 数据包含标题、上传者等
                
                if (data.formats && Array.isArray(data.formats) && data.formats.length > 0) {
                    displayFormats(data.formats, url); // 传递格式数组和原始 URL
                } else {
                    // 没有找到特定格式，但我们可能有其他视频信息
                    elements.audioFormatsContainer.innerHTML = '<p>没有找到可下载的格式。URL 可能是不受支持的网站、非视频页面或视频没有单独的格式。</p>';
                    elements.videoFormatsContainer.innerHTML = '';
                }
            }

        } catch (error) {
            console.error('Error fetching video info:', error);
            elements.loadingIndicator.style.display = 'none';
            displayError('获取视频信息失败。请检查您的连接并重试。');
        }
    }

    // 添加粘贴按钮点击事件监听器
    elements.fetchButton.addEventListener('click', () => {
        navigator.clipboard.readText()
            .then(text => {
                if (text && text.trim()) {
                    elements.videoUrlInput.value = text.trim();
                }
            })
            .catch(err => {
                console.error('无法从剪贴板读取:', err);
            });
    });

    // 添加清除按钮点击事件监听器
    elements.clearButton.addEventListener('click', () => {
        elements.videoUrlInput.value = '';
        elements.videoUrlInput.focus();
    });

    // 添加转换按钮点击事件监听器
    elements.convertButton.addEventListener('click', () => {
        const url = elements.videoUrlInput.value.trim();
        
        // 基本的客户端URL验证
        if (!url) {
            displayError('请输入视频URL。');
            return;
        }
        
        if (!url.toLowerCase().startsWith('http') && !url.toLowerCase().startsWith('www.')) {
            displayError('请输入有效的URL（例如，以http://、https://或www.开头）。');
            return;
        }
        
        fetchVideo(url);
    });

    // 添加回车键提交功能
    elements.videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.convertButton.click();
        }
    });
    
    // 检查系统主题偏好
    function checkSystemThemePreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // 系统偏好暗色模式
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            updateThemeIcon('dark');
        }
    }
    
    // 如果没有设置过主题，则检查系统偏好
    if (!localStorage.getItem('theme')) {
        checkSystemThemePreference();
    }
    
    // 监听系统主题变化
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                updateThemeIcon(newTheme);
            }
        });
    }
});
