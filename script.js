document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const elements = {
        videoUrlInput: document.getElementById('videoUrl'),
        fetchButton: document.getElementById('fetchButton'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        videoInfoDiv: document.getElementById('videoInfo'),
        videoTitleEl: document.getElementById('videoTitle'),
        videoThumbnailEl: document.getElementById('videoThumbnail'),
        videoUploaderEl: document.getElementById('videoUploader'),
        videoDurationEl: document.getElementById('videoDuration'),
        videoDescriptionEl: document.getElementById('videoDescription'),
        formatsListEl: document.getElementById('formatsList'),
        downloadFeedbackEl: document.getElementById('downloadFeedback'),
        // Download Options Elements
        audioOnlyCheckbox: document.getElementById('audioOnly'),
        audioFormatContainer: document.getElementById('audioFormatContainer'),
        audioFormatSelect: document.getElementById('audioFormat'),
        videoQualitySelect: document.getElementById('videoQuality'),
        embedSubsCheckbox: document.getElementById('embedSubs'),
    };

    // Event listener for audioOnly checkbox
    elements.audioOnlyCheckbox.addEventListener('change', () => {
        elements.audioFormatContainer.style.display = elements.audioOnlyCheckbox.checked ? 'block' : 'none';
        elements.videoQualitySelect.disabled = elements.audioOnlyCheckbox.checked;
        // if (elements.audioOnlyCheckbox.checked) {
            // Optionally reset video quality if audio only is selected
            // elements.videoQualitySelect.value = 'best'; 
        // }
    });

    // Function to display error messages
    function displayError(message) {
        elements.loadingIndicator.style.display = 'none';
        elements.videoInfoDiv.style.display = 'block'; // Show the info section to display the error
        
        // Clear previous content
        elements.videoTitleEl.textContent = 'Error';
        elements.videoThumbnailEl.src = '';
        elements.videoThumbnailEl.style.display = 'none';
        elements.videoUploaderEl.textContent = '';
        elements.videoDurationEl.textContent = '';
        elements.formatsListEl.innerHTML = ''; // Clear formats list
        
        // Display error message in description area, styled
        elements.videoDescriptionEl.innerHTML = `<p class="error-message">${message}</p>`;
    }

    elements.fetchButton.addEventListener('click', async () => {
        const url = elements.videoUrlInput.value.trim();
        
        // Basic client-side URL validation
        if (!url) {
            displayError('Please enter a video URL.'); 
            return;
        }
        if (!url.toLowerCase().startsWith('http') && !url.toLowerCase().startsWith('www.')) {
            displayError('Please enter a valid URL (e.g., starting with http://, https://, or www.).');
            return;
        }

        // Collect download options
        const options = {
            audioOnly: elements.audioOnlyCheckbox.checked,
            audioFormat: elements.audioFormatSelect.value,
            videoQuality: elements.videoQualitySelect.value,
            embedSubs: elements.embedSubsCheckbox.checked,
        };

        // Reset UI for new request
        elements.loadingIndicator.style.display = 'block';
        elements.videoInfoDiv.style.display = 'none'; 
        elements.formatsListEl.innerHTML = ''; 
        elements.downloadFeedbackEl.style.display = 'none';
        elements.videoThumbnailEl.src = ''; // Clear previous thumbnail
        elements.videoThumbnailEl.style.display = 'none';
        elements.videoDescriptionEl.innerHTML = ''; // Clear previous description/error

        try {
            const response = await fetch('/get_video_info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url, options: options }), 
            });

            elements.loadingIndicator.style.display = 'none'; // Hide loading indicator once response is received

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    // Could not parse JSON error, stick with HTTP status
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            if (data.error) {
                displayError(data.error);
            } else {
                elements.videoInfoDiv.style.display = 'block'; // Show info section for results
                displayVideoMetadata(data); // data contains title, uploader etc.
                
                if (data.formats && Array.isArray(data.formats) && data.formats.length > 0) {
                    const currentOptions = { // These are the options active at the moment of fetching
                        audioOnly: elements.audioOnlyCheckbox.checked,
                        audioFormat: elements.audioFormatSelect.value,
                        videoQuality: elements.videoQualitySelect.value,
                        embedSubs: elements.embedSubsCheckbox.checked,
                    };
                    displayFormats(data.formats, url, currentOptions); // Pass formats array and original URL
                } else {
                    // No specific formats found, but we might have other video info.
                    elements.formatsListEl.innerHTML = '<li>No downloadable formats found. The URL might be for an unsupported site, a non-video page, or the video has no separate formats.</li>';
                }
            }

        } catch (error) {
            console.error('Fetch error:', error);
            displayError(`Failed to fetch video information: ${error.message}`);
        }
    });

    function displayVideoMetadata(data) {
        elements.videoTitleEl.textContent = data.title || 'Video Title Not Available';
        
        if (data.thumbnail) {
            elements.videoThumbnailEl.src = data.thumbnail;
            elements.videoThumbnailEl.style.display = 'block';
        } else {
            elements.videoThumbnailEl.style.display = 'none'; // Ensure it's hidden if no thumbnail
        }
        
        elements.videoUploaderEl.textContent = data.uploader || 'N/A';
        elements.videoDurationEl.textContent = data.duration_string || 'N/A';
        // Clear previous error styling if any, then set description
        elements.videoDescriptionEl.className = 'video-description'; // Reset class
        elements.videoDescriptionEl.textContent = data.description || 'No description available.';
    }

    // Function to display available formats
    function displayFormats(formats, originalUrl, downloadOptions) { 
        elements.formatsListEl.innerHTML = ''; // Clear previous list

        formats.forEach(format => {
            const listItem = document.createElement('li');
            listItem.className = 'format-item';

            // Defensive access to format properties
            const formatId = format.format_id || 'N/A';
            const ext = format.ext || 'N/A';
            const resolution = format.resolution || 'N/A';
            const formatNote = format.format_note || ''; // Specific notes about the format
            const vcodec = format.vcodec || 'N/A';
            const acodec = format.acodec || 'N/A';
            const fps = format.fps || ''; // Frames per second
            const lang = format.language || ''; // Language of the stream
            const proto = format.protocol || ''; // Protocol (e.g., https, m3u8)

            // Construct details string
            let formatDetails = `<strong>Format: ${formatId} (${ext})</strong>`;
            formatDetails += ` | Resolution: ${resolution}`;
            if (formatNote) formatDetails += ` (${formatNote})`;
            
            formatDetails += `<br>Codecs: Video - ${vcodec}, Audio - ${acodec}`;
            if (fps) formatDetails += ` | FPS: ${fps}`;
            
            let bitrates = [];
            if (format.vbr) bitrates.push(`Video: ${Number(format.vbr).toFixed(2)} kbps`);
            if (format.abr) bitrates.push(`Audio: ${Number(format.abr).toFixed(2)} kbps`);
            if (bitrates.length > 0) formatDetails += ` | Bitrates: ${bitrates.join(', ')}`;

            let fileSize = '';
            if (format.filesize) {
                fileSize = `(${(Number(format.filesize) / 1024 / 1024).toFixed(2)} MB)`;
            } else if (format.filesize_approx) {
                fileSize = `(~${(Number(format.filesize_approx) / 1024 / 1024).toFixed(2)} MB)`;
            }
            if (fileSize) formatDetails += ` | Size: ${fileSize}`;

            if (lang) formatDetails += ` | Language: ${lang}`;
            if (proto) formatDetails += ` | Protocol: ${proto}`;


            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'format-details';
            detailsDiv.innerHTML = formatDetails;

            const downloadButton = document.createElement('a');
            // Use format.url if available and protocol is http/https, otherwise use backend downloader
            let downloadUrl = '';
            // Check format.url, format.protocol, downloadOptions.audioOnly, downloadOptions.embedSubs
            if (format.url && 
                (proto === 'http' || proto === 'https') && // Use safe 'proto'
                !downloadOptions.audioOnly && 
                !downloadOptions.embedSubs) {
                 downloadButton.href = format.url; 
                 downloadButton.textContent = 'Download (Direct)';
            } else {
                // Construct URL with options for server-side download
                downloadUrl = `/download_video?url=${encodeURIComponent(originalUrl)}&format_id=${encodeURIComponent(formatId)}`;
                downloadUrl += `&audioOnly=${downloadOptions.audioOnly}`;
                if (downloadOptions.audioOnly) { 
                    downloadUrl += `&audioFormat=${encodeURIComponent(downloadOptions.audioFormat)}`;
                }
                if (!downloadOptions.audioOnly) {
                    downloadUrl += `&videoQuality=${encodeURIComponent(downloadOptions.videoQuality)}`;
                }
                downloadUrl += `&embedSubs=${downloadOptions.embedSubs}`;
                
                downloadButton.href = downloadUrl;
                downloadButton.textContent = 'Download (via Server)';
            }
            downloadButton.className = 'download-button';
            downloadButton.target = '_blank'; // Open in new tab to not interrupt current page

            downloadButton.addEventListener('click', () => {
                elements.downloadFeedbackEl.textContent = `Download initiated for format ${formatId || ext}...`; // Use safe formatId or ext
                elements.downloadFeedbackEl.style.display = 'block';
                // Hide feedback after a few seconds
                setTimeout(() => {
                    elements.downloadFeedbackEl.style.display = 'none';
                }, 5000);
            });

            listItem.appendChild(detailsDiv);
            listItem.appendChild(downloadButton);
            elements.formatsListEl.appendChild(listItem);
        });
    }
});
