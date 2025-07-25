/**
 * ExportService - Handles comment export functionality
 * Uses fflate for reliable ZIP generation and iframe isolation for zero screen flashing
 */
class ExportService {
    constructor() {
        console.log('🚀 ExportService constructor called');
        this.isExporting = false;
        this.isCancelled = false;
        this.exportProgress = {
            current: 0,
            total: 0,
            status: 'Ready'
        };
        this.maxCommentsPerZip = 500; // Much larger with fflate
        this.iframeReady = false;
        
        // Create iframe-based rendering to completely eliminate screen flashing
        this.createIframeRenderer().then(() => {
            this.iframeReady = true;
            console.log('✅ Iframe renderer ready');
        }).catch(error => {
            console.error('❌ Failed to create iframe renderer:', error);
            this.iframeReady = false;
        });
        
        // Load fflate library
        this.initializeZipLibrary().catch(error => {
            console.error('❌ Failed to initialize ZIP library in constructor:', error);
        });
    }

    /**
     * Initialize fflate ZIP library
     */
    async initializeZipLibrary() {
        try {
            // Import fflate dynamically
            const fflate = await import('fflate');
            this.fflate = fflate;
            console.log('✅ fflate ZIP library loaded - large batch sizes available');
        } catch (error) {
            console.error('❌ Failed to load fflate library:', error);
            throw new Error('ZIP library unavailable - cannot export');
        }
    }

    /**
     * Create iframe-based renderer for ZERO screen interference
     */
    createIframeRenderer() {
        return new Promise((resolve, reject) => {
            console.log('🔧 createIframeRenderer called');
            
            // Remove any existing iframe
            const existing = document.getElementById('export-iframe');
            if (existing) {
                console.log('🔧 Removing existing iframe');
                existing.remove();
            }

            // Create completely isolated iframe
            this.iframe = document.createElement('iframe');
            this.iframe.id = 'export-iframe';
            this.iframe.style.cssText = `
                position: absolute;
                left: -9999px;
                top: -9999px;
                width: 800px;
                height: 600px;
                border: none;
                visibility: hidden;
                pointer-events: none;
                z-index: -9999;
            `;
            
            // Wait for iframe to load before trying to access its document
            this.iframe.onload = () => {
                console.log('🔧 Iframe loaded');
                try {
                    // Initialize iframe document
                    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
                    if (!doc) {
                        console.error('❌ Could not access iframe document after load');
                        reject(new Error('Could not access iframe document'));
                        return;
                    }
                    
                    doc.open();
                    doc.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
                            <style>
                                * {
                                    box-sizing: border-box;
                                }
                                body { 
                                    margin: 0; 
                                    padding: 0; 
                                    background: white; 
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    width: 100%;
                                    height: 100%;
                                }
                            </style>
                        </head>
                        <body></body>
                        </html>
                    `);
                    doc.close();
                    
                    console.log('🖼️ Created iframe-based renderer - ZERO screen interference guaranteed');
                    console.log('🖼️ Iframe check:', {
                        iframe: !!this.iframe,
                        contentDocument: !!doc,
                        body: !!doc.body
                    });
                    resolve();
                } catch (error) {
                    console.error('❌ Error initializing iframe document:', error);
                    reject(error);
                }
            };
            
            this.iframe.onerror = (error) => {
                console.error('❌ Iframe failed to load:', error);
                reject(error);
            };
            
            document.body.appendChild(this.iframe);
            console.log('🔧 Iframe appended to body');
        });
    }

    /**
     * Cancel the current export operation
     */
    cancelExport() {
        console.log('🛑 Export cancellation requested');
        this.isCancelled = true;
        this.isExporting = false;
        this.exportProgress = {
            current: 0,
            total: 0,
            status: 'Cancelled'
        };
    }

    /**
     * Export a single comment as PNG
     */
    async exportSingleComment(comment, videoTitle = '') {
        try {
            const html = this.generateCommentHTML(comment, videoTitle);
            const filename = this.generateFileName(videoTitle, comment.author, comment.text);
            
            await this.generatePNG(html, filename);
            console.log(`✅ Exported comment: ${filename}`);
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            throw error;
        }
    }

    /**
     * Export a single comment with specific format
     */
    async exportSingleCommentWithFormat(comment, format, videoTitle = '') {
        console.log(`📦 exportSingleCommentWithFormat called: format=${format}, author=${comment?.author}`);
        console.log(`📊 Comment object:`, comment);
        console.log(`🎬 Video title: ${videoTitle}`);
        
        try {
            let filename;
            
            switch (format) {
                case 'comment-only':
                    console.log(`📝 Using comment-only format`);
                    const commentTextForFilename = comment.text || comment.content || '';
                    filename = this.generateFileName(videoTitle, comment.author, commentTextForFilename);
                    console.log(`📁 Filename: ${filename}`);
                    console.log(`🎨 Calling generateCommentOnlyCanvas...`);
                    
                    // Use canvas-based approach like iPhone method
                    const blob = await this.generateCommentOnlyCanvas(comment, videoTitle);
                    this.downloadBlob(blob, `${filename}.png`);
                    console.log(`✅ PNG generated and downloaded`);
                    break;
                    
                case 'iphone-dark':
                case 'iphone-light':
                    console.log(`📱 Using iPhone composite format: ${format}`);
                    const commentTextForIPhone = comment.text || comment.content || '';
                    filename = this.generateiPhoneFileName(videoTitle, comment.author, commentTextForIPhone, format);
                    
                    // Use the new composite method
                    const iPhoneBlob = await this.generateiPhoneComposite(comment, format, videoTitle);
                    this.downloadBlob(iPhoneBlob, `${filename}.png`);
                    break;
                    
                default:
                    throw new Error(`Unknown export format: ${format}`);
            }
            
            console.log(`✅ Exported comment in ${format} format: ${filename}`);
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            console.error('❌ Error stack:', error.stack);
            // Add more context to the error
            const enhancedError = new Error(`Failed to export comment as ${format}: ${error.message}`);
            enhancedError.originalError = error;
            throw enhancedError;
        }
    }

    /**
     * Export comments for a specific video using fflate
     */
    async exportVideoComments(videoId, dataManager, progressCallback, format = 'comment-only') {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        this.isExporting = true;
        this.isCancelled = false;
        
        try {
            // Get video info and comments
            const video = await dataManager.getVideo(videoId);
            if (!video) {
                throw new Error('Video not found');
            }

            const commentsData = await dataManager.getAllComments(videoId, {});
            const comments = this.flattenComments(commentsData);

            if (comments.length === 0) {
                throw new Error('No comments found for this video');
            }

            // Initialize progress
            this.exportProgress = {
                current: 0,
                total: comments.length,
                status: 'Starting export...'
            };

            progressCallback?.(this.exportProgress);

            // Use fflate for reliable ZIP generation
            const zipFiles = await this.generateFflateZIPs(
                comments, 
                video.title, 
                this.maxCommentsPerZip,
                (progress) => {
                    this.exportProgress.current = progress.completed || 0;
                    this.exportProgress.status = progress.status;
                    progressCallback?.(this.exportProgress);
                },
                format
            );

            this.exportProgress.current = this.exportProgress.total;
            this.exportProgress.status = `✅ Export complete! Downloaded ${zipFiles.length} ZIP file(s)`;
            progressCallback?.(this.exportProgress);

            return zipFiles;

        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Export comments for all videos using fflate
     */
    async exportAllVideos(dataManager, progressCallback, format = 'comment-only') {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        this.isExporting = true;
        this.isCancelled = false;
        
        try {
            // Get all videos
            const allVideosResult = await dataManager.getVideos({}, { page: 1, limit: 10000 });
            const videos = allVideosResult.videos;

            if (videos.length === 0) {
                throw new Error('No videos found');
            }

            // Initialize progress for all videos
            this.exportProgress = {
                currentVideo: 0,
                totalVideos: videos.length,
                currentVideoComments: 0,
                totalVideoComments: 0,
                status: 'Starting export...'
            };

            progressCallback?.(this.exportProgress);

            const zipFiles = [];

            for (let videoIndex = 0; videoIndex < videos.length; videoIndex++) {
                // Check for cancellation at video level
                if (this.isCancelled) {
                    console.log('🛑 Export cancelled during video processing');
                    throw new Error('Export cancelled by user');
                }
                
                const video = videos[videoIndex];
                
                // Update progress for current video
                this.exportProgress.currentVideo = videoIndex + 1;
                this.exportProgress.currentVideoComments = 0;
                this.exportProgress.status = `Processing video ${videoIndex + 1}/${videos.length}: ${video.title}`;
                progressCallback?.(this.exportProgress);

                try {
                    // Get all comments for this video
                    const commentsData = await dataManager.getAllComments(video.video_id, {});
                    const comments = this.flattenComments(commentsData);

                    if (comments.length === 0) {
                        console.log(`⚠️ Skipping video "${video.title}" - no comments`);
                        continue;
                    }

                    this.exportProgress.totalVideoComments = comments.length;
                    
                    // Use fflate for reliable ZIP generation
                    const videoZipFiles = await this.generateFflateZIPs(
                        comments, 
                        video.title, 
                        this.maxCommentsPerZip,
                        (batchProgress) => {
                            this.exportProgress.currentVideoComments = batchProgress.completed || 0;
                            this.exportProgress.status = `Video ${videoIndex + 1}/${videos.length}: ${batchProgress.status}`;
                            progressCallback?.(this.exportProgress);
                        },
                        format
                    );

                    zipFiles.push(...videoZipFiles);
                    console.log(`✅ Successfully exported ${comments.length} comments from "${video.title}" in ${videoZipFiles.length} ZIP file(s)`);

                } catch (error) {
                    console.error(`❌ Failed to export video "${video.title}":`, error);
                }

                // Small delay between videos
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.exportProgress.status = `✅ Export complete! Downloaded ${zipFiles.length} video archive(s)`;
            progressCallback?.(this.exportProgress);

            return zipFiles;

        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Generate ZIP files using fflate - MUCH more reliable than JSZip
     */
    async generateFflateZIPs(comments, videoTitle, batchSize = 500, progressCallback, format = 'comment-only') {
        const zipFiles = [];
        const totalBatches = Math.ceil(comments.length / batchSize);
        
        console.log(`🚀 Generating ${totalBatches} fflate ZIP batches of ${batchSize} comments each`);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            // Check for cancellation at batch level
            if (this.isCancelled) {
                console.log('🛑 Export cancelled during batch processing');
                throw new Error('Export cancelled by user');
            }
            
            const startIndex = batchIndex * batchSize;
            const endIndex = Math.min(startIndex + batchSize, comments.length);
            const batchComments = comments.slice(startIndex, endIndex);
            
            const zipSuffix = totalBatches > 1 ? `_part${batchIndex + 1}` : '';
            const zipName = `${this.sanitizeFilename(videoTitle)}${zipSuffix}_comments.zip`;
            
            console.log(`⚡ Processing fflate batch ${batchIndex + 1}/${totalBatches}: ${batchComments.length} comments`);
            
            try {
                // Step 1: Generate all images for this batch
                const imageFiles = {};
                
                for (let i = 0; i < batchComments.length; i++) {
                    // Check for cancellation during comment processing
                    if (this.isCancelled) {
                        console.log('🛑 Export cancelled during comment processing');
                        throw new Error('Export cancelled by user');
                    }
                    
                    const comment = batchComments[i];
                    const globalIndex = startIndex + i;
                    
                    // Update progress
                    this.exportProgress.completed = globalIndex;
                    this.exportProgress.status = `Batch ${batchIndex + 1}/${totalBatches}: Generating image ${i + 1}/${batchComments.length}`;
                    progressCallback?.(this.exportProgress);

                    try {
                        let pngBlob;
                        let filename;
                        
                        // Handle different export formats
                        switch (format) {
                            case 'comment-only':
                                const html = this.generateCommentHTML(comment, videoTitle);
                                const commentTextForFilename = comment.text || comment.content || '';
                                filename = this.generateFileName(videoTitle, comment.author, commentTextForFilename);
                                pngBlob = await this.generatePNGBlobIframe(html);
                                break;
                                
                            case 'iphone-dark':
                            case 'iphone-light':
                                console.log(`📱 Generating iPhone composite for format: ${format}`);
                                const commentTextForIPhone = comment.text || comment.content || '';
                                filename = this.generateiPhoneFileName(videoTitle, comment.author, commentTextForIPhone, format);
                                pngBlob = await this.generateiPhoneComposite(comment, format, videoTitle);
                                break;
                                
                            default:
                                console.warn(`⚠️ Unknown format: ${format}, falling back to comment-only`);
                                const htmlFallback = this.generateCommentHTML(comment, videoTitle);
                                const commentTextForFallback = comment.text || comment.content || '';
                                filename = this.generateFileName(videoTitle, comment.author, commentTextForFallback);
                                pngBlob = await this.generatePNGBlobIframe(htmlFallback);
                        }
                        
                        if (pngBlob && pngBlob.size > 0) {
                            // Convert blob to Uint8Array for fflate
                            const arrayBuffer = await pngBlob.arrayBuffer();
                            imageFiles[`${filename}.png`] = new Uint8Array(arrayBuffer);
                            console.log(`✅ Generated ${format} image ${i + 1}/${batchComments.length}: ${filename}.png (${(pngBlob.size / 1024).toFixed(1)}KB)`);
                        } else {
                            console.warn(`⚠️ Invalid PNG blob for comment ${comment.comment_id}, skipping`);
                        }
                        
                        // Yield control periodically
                        if (i % 5 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }
                        
                    } catch (error) {
                        console.warn(`⚠️ Failed to generate PNG for comment ${comment.comment_id}:`, error);
                    }
                }

                // Step 2: Create ZIP using fflate
                if (Object.keys(imageFiles).length > 0) {
                    this.exportProgress.status = `Batch ${batchIndex + 1}/${totalBatches}: Creating ZIP with ${Object.keys(imageFiles).length} images...`;
                    progressCallback?.(this.exportProgress);

                    await this.createFflateZIP(zipName, imageFiles);
                    zipFiles.push(zipName);
                    
                    console.log(`✅ fflate ZIP generated successfully: ${zipName} with ${Object.keys(imageFiles).length} files`);
                    
                    // Update progress
                    this.exportProgress.status = `✅ Completed batch ${batchIndex + 1}/${totalBatches}`;
                    progressCallback?.(this.exportProgress);
                } else {
                    console.warn(`⚠️ No valid images generated for batch ${batchIndex + 1}, skipping ZIP creation`);
                }

                // Clear memory
                Object.keys(imageFiles).forEach(key => delete imageFiles[key]);
                
                // Small delay between batches
                if (batchIndex < totalBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

            } catch (error) {
                console.error(`❌ Failed to process batch ${batchIndex + 1}:`, error);
            }
        }

        console.log(`🎉 fflate export complete! Generated ${zipFiles.length} ZIP files`);
        return zipFiles;
    }

    /**
     * Create ZIP file using fflate - much more reliable than JSZip
     */
    async createFflateZIP(zipName, imageFiles) {
        return new Promise((resolve, reject) => {
            try {
                // Use fflate's zip function for reliable compression
                this.fflate.zip(imageFiles, {
                    level: 1, // Fast compression
                    mem: 8    // Memory level
                }, (err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Create blob and download
                    const blob = new Blob([data], { type: 'application/zip' });
                    this.downloadBlob(blob, zipName);
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate PNG using iframe rendering - ZERO screen interference
     */
    async generatePNGBlobIframe(html) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🖼️ Starting PNG generation...');
                console.log('🖼️ HTML length:', html.length);
                
                // Wait for iframe to be ready
                if (!this.iframeReady) {
                    console.log('⏳ Waiting for iframe to be ready...');
                    let attempts = 0;
                    while (!this.iframeReady && attempts < 20) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                    if (!this.iframeReady) {
                        throw new Error('Iframe not ready after 2 seconds');
                    }
                }
                
                // Get iframe document
                const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
                if (!doc) {
                    console.error('❌ Iframe document not available');
                    throw new Error('Iframe document not available');
                }
                
                doc.body.innerHTML = html;
                console.log('📄 HTML injected into iframe');
                console.log('📄 Body innerHTML length:', doc.body.innerHTML.length);

                // Wait a bit for styles to apply
                await new Promise(resolve => setTimeout(resolve, 50));

                // Find the comment element
                let commentElement = doc.querySelector('.comment-container');
                if (!commentElement) {
                    console.log('⚠️ .comment-container not found, trying .iphone-frame');
                    commentElement = doc.querySelector('.iphone-frame');
                }
                if (!commentElement) {
                    console.log('⚠️ .iphone-frame not found, trying body');
                    commentElement = doc.body;
                    console.log('📄 Using entire body as element');
                }
                if (!commentElement || !commentElement.children.length) {
                    console.error('❌ No renderable content found');
                    console.log('📄 Body children:', doc.body.children.length);
                    console.log('📄 Body HTML preview:', doc.body.innerHTML.substring(0, 200));
                    throw new Error('No renderable element found');
                }
                console.log('🎯 Found element to render:', commentElement.className);
                console.log('🎯 Element tag:', commentElement.tagName);

                // Wait for any images to load
                const images = commentElement.getElementsByTagName('img');
                console.log(`🖼️ Found ${images.length} images to load`);
                const imagePromises = [];
                for (let img of images) {
                    if (!img.complete) {
                        console.log(`⏳ Waiting for image: ${img.src}`);
                        imagePromises.push(new Promise(resolve => { 
                            img.onload = () => {
                                console.log(`✅ Image loaded: ${img.src}`);
                                resolve();
                            }; 
                            img.onerror = () => {
                                console.log(`❌ Image failed: ${img.src}`);
                                resolve();
                            }; 
                        }));
                    }
                }
                await Promise.all(imagePromises);

                // Short delay for rendering
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('📐 Element dimensions:', commentElement.offsetWidth, 'x', commentElement.offsetHeight);
                console.log('🔍 html2canvas available:', typeof window.html2canvas);

                // Generate canvas using iframe content (isolated from main window)
                // Use parent window's html2canvas since it's not loaded in iframe
                if (!window.html2canvas) {
                    console.error('❌ html2canvas library not available!');
                    throw new Error('html2canvas library not loaded');
                }
                
                console.log('📸 Calling html2canvas...');
                const canvas = await window.html2canvas(commentElement, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    scale: 2,
                    logging: false,
                    width: commentElement.offsetWidth || 600,
                    height: commentElement.offsetHeight || 800
                });

                console.log('🎨 Canvas generated:', canvas.width, 'x', canvas.height);

                // Convert to blob
                console.log('🔄 Converting canvas to blob...');
                canvas.toBlob(blob => {
                    console.log('📦 Blob callback fired, blob:', blob ? `${blob.size} bytes` : 'null');
                    if (blob && blob.size > 0) {
                        console.log('✅ Valid blob created, resolving promise');
                        resolve(blob);
                    } else {
                        console.error('❌ Invalid blob received');
                        reject(new Error('Failed to generate PNG - invalid blob'));
                    }
                }, 'image/png', 1.0);

            } catch (error) {
                console.error('PNG generation error:', error);
                reject(error);
            } finally {
                // Clear iframe content
                if (this.iframe?.contentDocument) {
                    this.iframe.contentDocument.body.innerHTML = '';
                }
            }
        });
    }

    /**
     * Generate PNG from HTML and download it
     */
    async generatePNG(html, filename) {
        console.log('🎯 generatePNG called with filename:', filename);
        try {
            const blob = await this.generatePNGBlobIframe(html);
            console.log('🎯 Got blob from generatePNGBlobIframe:', blob?.size || 'null');
            this.downloadBlob(blob, `${filename}.png`);
        } catch (error) {
            console.error('❌ generatePNG failed:', error);
            throw error;
        }
    }

    /**
     * Generate HTML for a comment in YouTube style
     */
    generateCommentHTML(comment, videoTitle = '') {
        console.log('🎨 generateCommentHTML called with comment:', comment);
        
        // Get random avatar for this user, or fall back to initials
        const randomAvatarUrl = window.avatarService.getAvatarForUser(comment.author);
        const avatarColor = window.avatarService.generateAvatarColor(comment.author);
        const firstLetter = comment.author[0]?.toUpperCase() || 'U';
        const timeAgo = this.formatTimeAgo(comment.published_at);
        const likeDisplay = this.formatLikes(comment.like_count);
        const heartIcon = comment.channel_owner_liked ? '❤️' : '';
        
        // Handle both .text and .content properties
        const commentTextRaw = comment.text || comment.content || '';
        console.log('🎨 Comment text raw:', commentTextRaw);
        
        // Escape HTML
        const commentText = this.escapeHTML(commentTextRaw);
        const authorName = this.escapeHTML(comment.author);
        const videoTitleEscaped = this.escapeHTML(videoTitle);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            width: 600px;
        }
        .comment-container {
            display: flex;
            align-items: flex-start;
            padding: 12px 16px;
            background-color: #ffffff;
        }
        .profile-avatar {
            width: 32px;
            height: 32px;
            margin-right: 12px;
            flex-shrink: 0;
        }
        .avatar-img {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
        }
        
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: ${avatarColor};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: 500;
        }
        .comment-content {
            flex: 1;
        }
        .comment-text {
            color: #262626;
            line-height: 18px;
            margin-bottom: 4px;
            font-size: 14px;
        }
        .comment-author {
            color: #262626;
            font-weight: 600;
            font-size: 14px;
            margin-right: 4px;
        }
        .comment-actions {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-top: 4px;
        }
        .comment-date {
            color: #8e8e8e;
            font-size: 12px;
            font-weight: 400;
        }
        .comment-likes {
            color: #262626;
            font-size: 12px;
            font-weight: 400;
        }
        .heart-icon {
            color: #ed4956;
            font-size: 12px;
        }
        .video-title {
            font-size: 11px;
            color: #8e8e8e;
            margin-bottom: 8px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="comment-container">
        <div class="profile-avatar">
            ${randomAvatarUrl ? 
                `<img src="${randomAvatarUrl}" alt="${authorName}" class="avatar-img" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" crossorigin="anonymous">
                 <div class="avatar" style="display: none; background-color: ${avatarColor};">${firstLetter}</div>` :
                `<div class="avatar" style="display: flex; background-color: ${avatarColor};">${firstLetter}</div>`
            }
        </div>
        <div class="comment-content">
            <div class="comment-text">
                <span class="comment-author">${authorName}</span>
                ${commentText}
            </div>
            <div class="comment-actions">
                <span class="comment-date">${timeAgo}</span>
                ${likeDisplay && likeDisplay !== '0' ? `<span class="comment-likes">${likeDisplay} likes</span>` : ''}
                ${heartIcon ? `<span class="heart-icon">${heartIcon}</span>` : ''}
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Flatten comments with replies into a single array
     */
    flattenComments(commentsWithReplies) {
        const flattened = [];
        
        for (const comment of commentsWithReplies) {
            flattened.push(comment);
            if (comment.replies && comment.replies.length > 0) {
                flattened.push(...comment.replies);
            }
        }
        
        return flattened;
    }

    /**
     * Split array into chunks
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Generate consistent avatar color for username
     */
    generateAvatarColor(username) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F39C12',
            '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71'
        ];
        const hash = this.hashString(username);
        return colors[hash % colors.length];
    }

    /**
     * Simple string hash function
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format date to show time ago (Instagram style)
     */
    formatTimeAgo(dateStr) {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        
        if (isNaN(date.getTime())) {
            return '1d';
        }
        
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffYears > 0) return diffYears + 'y';
        if (diffMonths > 0) return diffMonths + 'mo';
        if (diffWeeks > 0) return diffWeeks + 'w';
        if (diffDays > 0) return diffDays + 'd';
        if (diffHours > 0) return diffHours + 'h';
        if (diffMins > 0) return diffMins + 'm';
        return 'just now';
    }

    /**
     * Format like count (1000 -> 1K)
     */
    formatLikes(count) {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1).replace('.0', '')}K`;
        }
        return count.toString();
    }

    /**
     * Escape HTML characters
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate filename for export
     */
    generateFileName(videoTitle, username, commentText) {
        const cleanTitle = this.sanitizeFilename(videoTitle, 30);
        const cleanUsername = this.sanitizeFilename(username, 20);
        const cleanComment = this.sanitizeFilename(commentText, 40);
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        
        return `${cleanTitle}_${cleanUsername}_${cleanComment}_${timestamp}`;
    }

    /**
     * Generate filename for iPhone format exports
     */
    generateiPhoneFileName(videoTitle, username, commentText, format) {
        const cleanTitle = this.sanitizeFilename(videoTitle, 25);
        const cleanUsername = this.sanitizeFilename(username, 15);
        const cleanComment = this.sanitizeFilename(commentText, 30);
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        const modePrefix = format === 'iphone-dark' ? 'iPhone_Dark' : 'iPhone_Light';
        
        return `${modePrefix}_${cleanTitle}_${cleanUsername}_${cleanComment}_${timestamp}`;
    }

    /**
     * Generate comment-only canvas for export (no iPhone frame, just the comment)
     */
    async generateCommentOnlyCanvas(comment, videoTitle = '') {
        console.log('📝 generateCommentOnlyCanvas called');
        
        // Create a canvas sized for just the comment
        const canvas = document.createElement('canvas');
        canvas.width = 600;  // Fixed width for comment
        canvas.height = 200; // Will adjust based on content
        const ctx = canvas.getContext('2d');
        
        try {
            // Fill background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the comment
            const topPadding = 20;
            const bottomPadding = 10; // Reduced bottom padding
            const commentHeight = await this.drawCommentOnly(ctx, comment, topPadding, false); // Start at y=20, light mode
            
            // Resize canvas to fit content
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width;
            finalCanvas.height = commentHeight + bottomPadding; // Add less padding at bottom
            const finalCtx = finalCanvas.getContext('2d');
            
            // Fill final background
            finalCtx.fillStyle = '#ffffff';
            finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            // Copy the comment content
            finalCtx.drawImage(canvas, 0, 0);
            
            // Convert to blob
            return new Promise((resolve, reject) => {
                finalCanvas.toBlob(blob => {
                    if (blob && blob.size > 0) {
                        console.log('✅ Comment-only canvas generated successfully');
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate comment-only canvas'));
                    }
                }, 'image/png');
            });
            
        } catch (error) {
            console.error('Error creating comment-only canvas:', error);
            throw error;
        }
    }

    /**
     * Generate iPhone screenshot composite for export
     */
    async generateiPhoneComposite(comment, format, videoTitle = '') {
        const isDark = format === 'iphone-dark';
        
        // Get the current video/post ID to find its thumbnail
        const videoId = comment.video_id;
        
        // Create a canvas for compositing
        const canvas = document.createElement('canvas');
        canvas.width = 1179;  // iPhone screenshot width
        canvas.height = 2556; // iPhone screenshot height
        const ctx = canvas.getContext('2d');
        
        try {
            // 1. First fill the canvas with a background color
            ctx.fillStyle = isDark ? '#000000' : '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 2. Load and draw the post thumbnail as base layer
            const thumbnailPath = this.getThumbnailPath(videoId);
            if (thumbnailPath) {
                try {
                    const thumbnail = await this.loadImage(thumbnailPath);
                    console.log(`📐 Thumbnail dimensions: ${thumbnail.width} x ${thumbnail.height}`);
                    
                    // The Instagram post area in the iPhone template
                    // Based on typical iPhone Instagram layout:
                    // - Status bar: ~88px
                    // - Instagram header: ~98px
                    // - Post header: ~120px
                    // Total offset from top: ~306px
                    const contentX = 0;
                    const contentY = 306;
                    const contentWidth = 1179;
                    // For 9:16 aspect ratio: width * 16/9
                    const contentHeight = Math.round(contentWidth * 16 / 9); // 2096px
                    
                    // Calculate source rectangle to crop the thumbnail
                    // We want to fill the width and crop height as needed
                    let sourceX = 0;
                    let sourceY = 0;
                    let sourceWidth = thumbnail.width;
                    let sourceHeight = thumbnail.height;
                    
                    // Calculate the aspect ratios
                    const targetAspect = contentWidth / contentHeight; // 9:16
                    const sourceAspect = sourceWidth / sourceHeight;
                    
                    if (sourceAspect > targetAspect) {
                        // Source is wider - crop the width
                        sourceWidth = sourceHeight * targetAspect;
                        sourceX = (thumbnail.width - sourceWidth) / 2;
                    } else {
                        // Source is taller - crop the height (anchored at top)
                        sourceHeight = sourceWidth / targetAspect;
                        sourceY = 0; // Keep anchored at top
                    }
                    
                    // Draw the thumbnail scaled to fill 9:16 ratio
                    ctx.drawImage(thumbnail, 
                                 sourceX, sourceY, sourceWidth, sourceHeight,
                                 contentX, contentY, contentWidth, contentHeight);
                    console.log(`✅ Drew thumbnail at ${contentX}, ${contentY} with 9:16 aspect ratio`);
                } catch (error) {
                    console.warn(`⚠️ Could not load thumbnail: ${error.message}`);
                    // Draw a placeholder rectangle
                    ctx.fillStyle = isDark ? '#1c1c1e' : '#f8f8f8';
                    ctx.fillRect(0, 306, 1179, 1179);
                }
            } else {
                console.log(`📷 No thumbnail available, creating export without post image`);
                // Draw a placeholder rectangle
                ctx.fillStyle = isDark ? '#1c1c1e' : '#f8f8f8';
                ctx.fillRect(0, 306, 1179, 1179);
            }
            
            // 3. Load and draw the iPhone UI overlay
            // Use absolute paths based on the full path provided
            const basePath = '/Volumes/SSD/SocialProjectMasters/jonno.otto_ig_explorer/InstaArchiveExplorer/';
            const overlayPath = isDark ? 
                basePath + 'ArchiveExplorer/assets/blankdarkmode.png' : 
                basePath + 'ArchiveExplorer/assets/blanklightmode.png';
            console.log(`📱 Loading iPhone template: ${overlayPath} (format: ${format}, isDark: ${isDark})`);
            
            try {
                const overlay = await this.loadImage(overlayPath);
                console.log(`✅ Successfully loaded iPhone template: ${overlayPath}`);
                ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.error(`❌ Failed to load iPhone template: ${overlayPath}`, error);
                console.log(`🔄 Trying relative path...`);
                
                // Try relative path as fallback
                const relativeOverlayPath = isDark ? 
                    'ArchiveExplorer/assets/blankdarkmode.png' : 
                    'ArchiveExplorer/assets/blanklightmode.png';
                
                try {
                    const overlay = await this.loadImage(relativeOverlayPath);
                    console.log(`✅ Successfully loaded iPhone template with relative path: ${relativeOverlayPath}`);
                    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
                } catch (error2) {
                    console.error(`❌ Failed to load iPhone template with relative path: ${relativeOverlayPath}`, error2);
                    console.log(`🔄 Creating fallback iPhone frame...`);
                    
                    // Create a basic iPhone frame as fallback
                    this.drawFallbackiPhoneFrame(ctx, isDark);
                }
            }
            
            // 3. Draw the comment at 40% height  
            const commentY = canvas.height * 0.4;
            await this.drawComment(ctx, comment, commentY, isDark);
            
            // Convert canvas to blob
            return new Promise((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (blob && blob.size > 0) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate composite image'));
                    }
                }, 'image/png');
            });
            
        } catch (error) {
            console.error('Error creating iPhone composite:', error);
            throw error;
        }
    }
    
    /**
     * Get thumbnail path for a video/post
     */
    getThumbnailPath(videoId) {
        console.log(`🔍 Looking for thumbnail for video ID: ${videoId}`);
        
        // Try to get from data manager
        if (window.app && window.app.dataManager) {
            const mediaFiles = window.app.dataManager.getInstagramMediaFiles(videoId);
            console.log(`📁 Media files found:`, mediaFiles);
            
            if (mediaFiles && mediaFiles.length > 0) {
                const thumbnailPath = mediaFiles[0].thumbnailPath || mediaFiles[0].path;
                console.log(`✅ Using thumbnail path: ${thumbnailPath}`);
                return thumbnailPath;
            }
        }
        
        // For grid view, thumbnails are in instagram-grid-item
        const gridItem = document.querySelector(`.instagram-grid-item[data-video-id="${videoId}"] img`);
        if (gridItem && gridItem.src && !gridItem.src.includes('data:image/svg')) {
            console.log(`🖼️ Found grid thumbnail: ${gridItem.src}`);
            return gridItem.src;
        }
        
        // Also check for video elements
        const videoItem = document.querySelector(`.instagram-grid-item[data-video-id="${videoId}"] video`);
        if (videoItem && videoItem.poster) {
            console.log(`🎬 Found video poster: ${videoItem.poster}`);
            return videoItem.poster;
        }
        
        console.warn(`⚠️ No thumbnail found for ${videoId}`);
        return null;
    }
    
    /**
     * Load an image and return a promise
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log(`✅ Successfully loaded image: ${src}`);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`❌ Failed to load image: ${src}`);
                console.log(`🔍 Current URL: ${window.location.href}`);
                console.log(`🔍 Attempting to load from: ${new URL(src, window.location.href).href}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            img.src = src;
        });
    }

    /**
     * Draw a fallback iPhone frame when template images fail to load
     */
    drawFallbackiPhoneFrame(ctx, isDark) {
        const canvas = ctx.canvas;
        
        // Basic iPhone-style frame
        const bgColor = isDark ? '#000000' : '#ffffff';
        const statusBarColor = isDark ? '#000000' : '#ffffff';
        const headerColor = isDark ? '#1c1c1e' : '#f8f8f8';
        const textColor = isDark ? '#ffffff' : '#000000';
        
        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Status bar (top 88px)
        ctx.fillStyle = statusBarColor;
        ctx.fillRect(0, 0, canvas.width, 88);
        
        // Status bar elements
        ctx.fillStyle = textColor;
        ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('9:41', 60, 50);
        ctx.fillText('100%', canvas.width - 100, 50);
        
        // Instagram header (88px to 186px)
        ctx.fillStyle = headerColor;
        ctx.fillRect(0, 88, canvas.width, 98);
        
        // Instagram logo area
        ctx.fillStyle = textColor;
        ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('Instagram', 60, 140);
        
        // Post header (186px to 306px)
        ctx.fillStyle = headerColor;
        ctx.fillRect(0, 186, canvas.width, 120);
        
        // Username and dots
        ctx.fillStyle = textColor;
        ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('@medicalmedium', 60, 230);
        ctx.fillText('•••', canvas.width - 80, 230);
        
        // Bottom area for engagement buttons (below post)
        const bottomY = 306 + 1179; // After the square post area
        ctx.fillStyle = headerColor;
        ctx.fillRect(0, bottomY, canvas.width, canvas.height - bottomY);
        
        console.log('✅ Created fallback iPhone frame');
    }
    
    /**
     * Draw comment for comment-only export (simplified, no background overlay)
     */
    async drawCommentOnly(ctx, comment, yPosition, isDark) {
        const avatarColor = window.avatarService.generateAvatarColor(comment.author);
        const firstLetter = comment.author[0]?.toUpperCase() || 'U';
        const timeAgo = this.formatTimeAgo(comment.published_at);
        const authorName = comment.author;
        const commentText = comment.text || comment.content || '';
        
        // Comment positioning (simplified for comment-only)
        const leftMargin = 20;
        const rightMargin = 20;
        const avatarSize = 40;
        const avatarMargin = 16;
        
        // Calculate text width
        const textStartX = leftMargin + avatarSize + avatarMargin;
        const maxTextWidth = ctx.canvas.width - textStartX - rightMargin;
        
        // Colors for light mode (since this is comment-only)
        const textColor = '#000000';
        const metaColor = '#8e8e8e';
        
        // Set up text for measuring
        ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
        
        // Wrap text
        const commentLines = this.wrapText(ctx, `${authorName} ${commentText}`, maxTextWidth);
        const lineHeight = 20;
        
        // Draw avatar 
        const avatarCenterX = leftMargin + avatarSize / 2;
        const avatarCenterY = yPosition + avatarSize / 2;
        
        // Try to load and draw the actual avatar image
        const randomAvatarUrl = window.avatarService.getAvatarForUser(comment.author);
        let avatarDrawn = false;
        
        if (randomAvatarUrl) {
            try {
                const avatarImg = await this.loadImage(randomAvatarUrl);
                
                // Create circular clip path
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
                ctx.clip();
                
                // Draw the avatar image
                ctx.drawImage(avatarImg, 
                    avatarCenterX - avatarSize / 2, 
                    avatarCenterY - avatarSize / 2, 
                    avatarSize, 
                    avatarSize);
                
                ctx.restore();
                avatarDrawn = true;
            } catch (error) {
                console.log(`⚠️ Failed to load avatar image for ${comment.author}, using fallback`);
            }
        }
        
        // Draw fallback avatar if image failed to load
        if (!avatarDrawn) {
            ctx.fillStyle = avatarColor;
            ctx.beginPath();
            ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw avatar letter
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(firstLetter, avatarCenterX, avatarCenterY);
        }
        
        // Draw comment text with author name
        ctx.fillStyle = textColor;
        ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        let currentY = yPosition + 20;
        let isFirstLine = true;
        
        commentLines.forEach((line, index) => {
            if (isFirstLine) {
                // First line contains author name - make it bold
                const authorEndIndex = line.indexOf(' ');
                if (authorEndIndex > 0) {
                    const author = line.substring(0, authorEndIndex);
                    const restOfLine = line.substring(authorEndIndex);
                    
                    // Draw author name in bold
                    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.fillText(author, textStartX, currentY);
                    
                    // Measure author width
                    const authorWidth = ctx.measureText(author).width;
                    
                    // Draw rest of line in regular
                    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.fillText(restOfLine, textStartX + authorWidth, currentY);
                } else {
                    ctx.fillText(line, textStartX, currentY);
                }
                isFirstLine = false;
            } else {
                ctx.fillText(line, textStartX, currentY);
            }
            currentY += lineHeight;
        });
        
        // Draw time and likes
        ctx.fillStyle = metaColor;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(timeAgo, textStartX, currentY + 8);
        
        // Add likes if any
        const likeCount = comment.like_count || 0;
        if (likeCount > 0) {
            const timeWidth = ctx.measureText(timeAgo).width;
            const likesText = `${this.formatLikes(likeCount)} likes`;
            ctx.fillText(likesText, textStartX + timeWidth + 20, currentY + 8);
        }
        
        // Return the total height used
        return currentY + 20;
    }

    /**
     * Draw comment on canvas
     */
    async drawComment(ctx, comment, yPosition, isDark) {
        const avatarColor = window.avatarService.generateAvatarColor(comment.author);
        const firstLetter = comment.author[0]?.toUpperCase() || 'U';
        const timeAgo = this.formatTimeAgo(comment.published_at);
        const authorName = comment.author;
        const commentText = comment.text || comment.content || '';
        
        // Instagram-style comment positioning
        const leftMargin = 60;
        const rightMargin = 60;
        const avatarSize = 64;
        const avatarMargin = 24;
        
        // Calculate text width
        const textStartX = leftMargin + avatarSize + avatarMargin;
        const maxTextWidth = ctx.canvas.width - textStartX - rightMargin;
        
        // Background for comment overlay - matching the UI templates
        const bgColor = isDark ? '#25282d' : '#efefef';
        const textColor = isDark ? '#ffffff' : '#000000';
        const metaColor = isDark ? '#a8a8a8' : '#8e8e8e';
        
        // Set up text for measuring - increased font size
        ctx.font = '42px -apple-system, BlinkMacSystemFont, sans-serif';
        
        // Wrap text
        const commentLines = this.wrapText(ctx, `${authorName} ${commentText}`, maxTextWidth);
        const lineHeight = 56;
        const bgHeight = (commentLines.length * lineHeight) + 120; // Extra padding
        
        // Draw semi-transparent background
        ctx.fillStyle = bgColor;
        const bgY = yPosition - 60;
        ctx.fillRect(0, bgY, ctx.canvas.width, bgHeight);
        
        // Draw avatar 
        const avatarCenterX = leftMargin + avatarSize / 2;
        const avatarCenterY = yPosition;
        
        // Try to load and draw the actual avatar image
        const randomAvatarUrl = window.avatarService.getAvatarForUser(comment.author);
        let avatarDrawn = false;
        
        if (randomAvatarUrl) {
            try {
                const avatarImg = await this.loadImage(randomAvatarUrl);
                
                // Create circular clip path
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
                ctx.clip();
                
                // Draw the avatar image
                ctx.drawImage(avatarImg, 
                    avatarCenterX - avatarSize / 2, 
                    avatarCenterY - avatarSize / 2, 
                    avatarSize, 
                    avatarSize);
                
                ctx.restore();
                avatarDrawn = true;
            } catch (error) {
                console.log(`⚠️ Failed to load avatar image for ${comment.author}, using fallback`);
            }
        }
        
        // Draw fallback avatar if image failed to load
        if (!avatarDrawn) {
            ctx.fillStyle = avatarColor;
            ctx.beginPath();
            ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw avatar letter
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(firstLetter, avatarCenterX, avatarCenterY);
        }
        
        // Draw comment text with author name
        ctx.fillStyle = textColor;
        ctx.font = '42px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        let currentY = yPosition + 12;
        let isFirstLine = true;
        
        commentLines.forEach((line, index) => {
            if (isFirstLine) {
                // First line contains author name - make it bold
                const authorEndIndex = line.indexOf(' ');
                if (authorEndIndex > 0) {
                    const author = line.substring(0, authorEndIndex);
                    const restOfLine = line.substring(authorEndIndex);
                    
                    // Draw author name in bold
                    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.fillText(author, textStartX, currentY);
                    
                    // Measure author width
                    const authorWidth = ctx.measureText(author).width;
                    
                    // Draw rest of line in regular
                    ctx.font = '42px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.fillText(restOfLine, textStartX + authorWidth, currentY);
                } else {
                    ctx.fillText(line, textStartX, currentY);
                }
                isFirstLine = false;
            } else {
                ctx.fillText(line, textStartX, currentY);
            }
            currentY += lineHeight;
        });
        
        // Draw time and likes
        ctx.fillStyle = metaColor;
        ctx.font = '34px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(timeAgo, textStartX, currentY + 24);
        
        // Add likes if any
        const likeCount = comment.like_count || 0;
        if (likeCount > 0) {
            const timeWidth = ctx.measureText(timeAgo).width;
            const likesText = `${this.formatLikes(likeCount)} likes`;
            ctx.fillText(likesText, textStartX + timeWidth + 40, currentY + 24);
        }
    }
    
    /**
     * Wrap text to fit within a maximum width
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Generate iPhone screenshot simulation HTML (old method - kept for compatibility)
     */
    generateiPhoneHTML(comment, format, videoTitle = '') {
        // For now, return a simple placeholder that will be replaced by the composite method
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 0;
            width: 1179px;
            height: 2556px;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
    </style>
</head>
<body>
    <div>Generating iPhone composite...</div>
</body>
</html>`;
    }

    /**
     * Sanitize filename by removing invalid characters
     */
    sanitizeFilename(text, maxLength = 50) {
        return text
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, maxLength) // Limit length
            .replace(/_+$/, ''); // Remove trailing underscores
    }

    /**
     * Download blob as file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Get export progress
     */
    getProgress() {
        return { ...this.exportProgress };
    }

    /**
     * Check if export is in progress
     */
    isExportInProgress() {
        return this.isExporting;
    }

    /**
     * Cancel current export
     */
    cancelExport() {
        this.isExporting = false;
        this.exportProgress = {
            current: 0,
            total: 0,
            status: 'Export cancelled'
        };
    }
}

// Export for use in other modules
window.ExportService = ExportService; 