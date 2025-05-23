document.addEventListener('DOMContentLoaded', () => {
    // 主题切换功能
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // 检查本地存储中的主题设置
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
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
    
    // 更新主题图标
    function updateThemeIcon(theme) {
        themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
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
        elements.videoTitleEl.textContent = '错误';
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
            helpDiv.innerHTML = `
                <h4><i class="fas fa-info-circle"></i> 如何解决此问题:</h4>
                <ol>
                    <li>在应用程序文件夹中创建cookies.txt文件</li>
                    <li>使用浏览器扩展（如"Get cookies.txt"）将您的YouTube cookies添加到此文件</li>
                    <li>重新启动应用程序</li>
                </ol>
                <p>有关更多信息，请参阅README文件。</p>
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
            formatLabel.innerHTML = `<strong>格式: ${format.ext.toUpperCase()}</strong>${format.bitrate ? ` (${format.bitrate})` : ''}`;
            formatInfo.appendChild(formatLabel);
            
            if (format.size) {
                const formatSize = document.createElement('div');
                formatSize.className = 'format-size';
                formatSize.innerHTML = `<i class="fas fa-file"></i> ${format.size}`;
                formatInfo.appendChild(formatSize);
            }
            
            formatItem.appendChild(formatInfo);
            
            const downloadBtn = document.createElement('a');
            downloadBtn.className = 'download-button';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
            downloadBtn.href = `/download_video?url=${encodeURIComponent(originalUrl)}&format_id=${encodeURIComponent(format.id)}&audioOnly=true`;
            downloadBtn.target = '_blank';
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
            formatLabel.innerHTML = `<strong>分辨率: ${format.resolution}</strong> (${format.ext.toUpperCase()})`;
            formatInfo.appendChild(formatLabel);
            
            if (format.size) {
                const formatSize = document.createElement('div');
                formatSize.className = 'format-size';
                formatSize.innerHTML = `<i class="fas fa-file"></i> ${format.size}`;
                formatInfo.appendChild(formatSize);
            }
            
            formatItem.appendChild(formatInfo);
            
            const downloadBtn = document.createElement('a');
            downloadBtn.className = 'download-button';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
            downloadBtn.href = `/download_video?url=${encodeURIComponent(originalUrl)}&format_id=${encodeURIComponent(format.id)}&audioOnly=false`;
            downloadBtn.target = '_blank';
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
            noFormats.textContent = '没有可用的音频格式';
            elements.audioFormatsContainer.appendChild(noFormats);
        }

        // 如果没有视频格式，显示提示
        if (videoFormats.length === 0) {
            const noFormats = document.createElement('p');
            noFormats.textContent = '没有可用的视频格式';
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
