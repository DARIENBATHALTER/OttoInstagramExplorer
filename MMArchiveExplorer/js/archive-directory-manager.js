/**
 * Archive Directory Manager - Handles the jonno.otto Instagram archive folder structure
 * Replaces the old DirectoryManager for the new organized archive format
 */
class ArchiveDirectoryManager {
    constructor() {
        this.archiveHandle = null;
        this.isSupported = this.checkSupport();
        this.mediaFiles = new Map();
        this.postsData = null;
        this.commentsData = null;
        this.commentLoader = null;
        
        console.log(`📁 ArchiveDirectoryManager initialized - API supported: ${this.isSupported}`);
    }

    /**
     * Check if File System Access API is supported
     */
    checkSupport() {
        return 'showDirectoryPicker' in window;
    }

/**
     * Request the jonno.otto Instagram archive directory from user
     */
    async requestArchiveDirectory() {
        if (!this.isSupported) {
            throw new Error('File System Access API not supported in this browser');
        }

        try {
            this.archiveHandle = await window.showDirectoryPicker({
                mode: 'read',
                startIn: 'documents'
            });
            
            console.log(`📁 Archive directory selected: ${this.archiveHandle.name}`);
            
            // Validate it's the correct archive structure
            const validation = await this.validateArchiveStructure();
            if (!validation.isValid) {
                throw new Error(`Invalid archive structure: ${validation.error}`);
            }
            
            return this.archiveHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Directory selection was cancelled');
            }
            throw error;
        }
    }

    /**
     * Validate the archive has the expected structure
     */
    async validateArchiveStructure() {
        try {
            // Check for required folders and files
            const requiredItems = [
                { name: 'jonno_otto_ig_media', type: 'directory' },
                { name: 'jonno_otto_preindexed_data', type: 'directory' }
            ];

            for (const item of requiredItems) {
                try {
                    if (item.type === 'directory') {
                        await this.archiveHandle.getDirectoryHandle(item.name);
                    } else {
                        await this.archiveHandle.getFileHandle(item.name);
                    }
                } catch (error) {
                    return {
                        isValid: false,
                        error: `Missing required ${item.type}: ${item.name}`
                    };
                }
            }

            // Check if preindexed data files exist
            try {
                const preindexedHandle = await this.archiveHandle.getDirectoryHandle('jonno_otto_preindexed_data');
                // Check for expected preindexed files
                const expectedFiles = ['instagram-posts.json', 'instagram-comments.json'];
                let foundFiles = 0;
                for (const fileName of expectedFiles) {
                    try {
                        await preindexedHandle.getFileHandle(fileName);
                        foundFiles++;
                    } catch (error) {
                        console.warn(`⚠️ Preindexed file ${fileName} not found`);
                    }
                }
                if (foundFiles > 0) {
                    console.log(`✅ Found preindexed data with ${foundFiles} files`);
                } else {
                    console.warn('⚠️ No preindexed data files found - data may need to be processed');
                }
            } catch (error) {
                console.warn('⚠️ Preindexed data directory not found - data may need to be processed');
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: `Archive validation failed: ${error.message}`
            };
        }
    }

    /**
     * Load all archive data
     */
    async loadArchiveData(progressCallback) {
        if (!this.archiveHandle) {
            throw new Error('No archive directory selected');
        }

        console.log('📁 Loading Instagram archive data...');
        
        try {
            // Load preindexed data
            progressCallback?.('Loading post metadata...', 20);
            await this.loadPreindexedData();
            
            // Scan media files
            progressCallback?.('Scanning media files...', 40);
            await this.scanMediaFiles();
            
            // Initialize comment loader
            progressCallback?.('Loading comment database...', 60);
            await this.loadCommentData();
            
            progressCallback?.('Archive loaded successfully', 100);
            
            console.log(`📊 Archive loaded: ${this.postsData?.length || 0} posts, ${this.mediaFiles.size} media files`);
            
            return {
                metadata: this.postsData,
                mediaFiles: this.mediaFiles,
                commentLoader: this.commentLoader,
                totalPosts: this.postsData?.length || 0,
                totalMedia: this.mediaFiles.size
            };
            
        } catch (error) {
            console.error('❌ Failed to load archive data:', error);
            throw error;
        }
    }

    /**
     * Load the preindexed data files
     */
    async loadPreindexedData() {
        try {
            const preindexedHandle = await this.archiveHandle.getDirectoryHandle('jonno_otto_preindexed_data');
            const postsFileHandle = await preindexedHandle.getFileHandle('instagram-posts.json');
            const postsFile = await postsFileHandle.getFile();
            this.postsData = JSON.parse(await postsFile.text());
            console.log(`📊 Loaded ${this.postsData.length} posts from preindexed data`);
        } catch (error) {
            console.error('❌ Failed to load preindexed data:', error);
            throw new Error('Could not load post metadata');
        }
    }

    /**
     * Scan the media files directory
     */
    async scanMediaFiles() {
        try {
            const mediaHandle = await this.archiveHandle.getDirectoryHandle('jonno_otto_ig_media');
            await this.scanDirectoryRecursive(mediaHandle, 'jonno_otto_ig_media');
            console.log(`📁 Found ${this.mediaFiles.size} media files`);
            
            // Debug: Show first few shortcodes found
            const shortcodes = Array.from(this.mediaFiles.keys()).slice(0, 5);
            console.log('🔍 Sample media shortcodes found:', shortcodes);
        } catch (error) {
            console.error('❌ Failed to scan media files:', error);
            throw new Error('Could not scan media files');
        }
    }

    /**
     * Parse large JSON without blocking the main thread
     */
    async parseJSONNonBlocking(jsonString) {
        return new Promise((resolve, reject) => {
            // Use setTimeout to yield control to the browser
            setTimeout(() => {
                try {
                    console.log('📝 Parsing JSON in timeout...');
                    const result = JSON.parse(jsonString);
                    console.log('✅ JSON parsing successful');
                    resolve(result);
                } catch (error) {
                    console.error('❌ JSON parsing failed:', error);
                    reject(error);
                }
            }, 10); // Small delay to yield control
        });
    }

    /**
     * Initialize the comment data loader
     */
    async loadCommentData() {
        try {
            console.log('💬 Starting comment data loading...');
            const preindexedHandle = await this.archiveHandle.getDirectoryHandle('jonno_otto_preindexed_data');
            console.log('📁 Got preindexed directory handle');
            
            const commentsFileHandle = await preindexedHandle.getFileHandle('instagram-comments.json');
            console.log('📄 Got comments file handle');
            
            const commentsFile = await commentsFileHandle.getFile();
            console.log(`📊 Comments file size: ${(commentsFile.size / (1024 * 1024)).toFixed(1)}MB`);
            
            console.log('📝 Getting file text...');
            const fileText = await commentsFile.text();
            console.log('📝 File text loaded, parsing JSON without blocking...');
            
            // Parse JSON without blocking the main thread using setTimeout chunks
            this.commentsData = await this.parseJSONNonBlocking(fileText);
            console.log('✅ JSON parsing complete!');
            
            // Create a simple comment loader interface for compatibility
            this.commentLoader = {
                getCommentsForPost: (shortcode, page = 1, limit = 50) => {
                    const postComments = this.commentsData[shortcode] || [];
                    const start = (page - 1) * limit;
                    const end = start + limit;
                    const comments = postComments.slice(start, end);
                    
                    return {
                        comments: comments,
                        total: postComments.length,
                        hasMore: end < postComments.length
                    };
                },
                getPostCommentCount: (shortcode) => {
                    return (this.commentsData[shortcode] || []).length;
                }
            };
            
            const totalComments = Object.values(this.commentsData).reduce((sum, comments) => sum + comments.length, 0);
            const totalPosts = Object.keys(this.commentsData).length;
            console.log(`💬 Comment data ready: ${totalComments.toLocaleString()} comments across ${totalPosts} posts`);
        } catch (error) {
            console.warn('⚠️ Failed to load comment data:', error);
            this.commentLoader = null;
            this.commentsData = {};
        }
    }

    /**
     * Recursively scan directory for media files
     */
    async scanDirectoryRecursive(dirHandle, path) {
        for await (const [name, handle] of dirHandle.entries()) {
            const fullPath = `${path}/${name}`;
            
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                
                // Check if it's a media file
                if (this.isMediaFile(name)) {
                    // Extract shortcode from filename (assuming format like shortcode.mp4)
                    const shortcode = this.extractShortcodeFromFilename(name);
                    if (shortcode) {
                        this.mediaFiles.set(shortcode, {
                            file,
                            handle,
                            path: fullPath,
                            name,
                            size: file.size,
                            type: file.type
                        });
                    }
                }
            } else if (handle.kind === 'directory') {
                await this.scanDirectoryRecursive(handle, fullPath);
            }
        }
    }

    /**
     * Check if file is a media file
     */
    isMediaFile(filename) {
        const mediaExtensions = ['.mp4', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return mediaExtensions.includes(ext);
    }

    /**
     * Extract shortcode from filename
     */
    extractShortcodeFromFilename(filename) {
        // Remove extension
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        
        // Handle different filename formats:
        // Format 1: Standard shortcode (11 chars): BmnmJZMhgFC.mp4
        // Format 2: With timestamp: -1VZ0EyJxy_2015_12_03__09_40_14.jpg
        
        // Try format 2 first (with timestamp)
        const timestampPattern = /^([A-Za-z0-9_-]+)_\d{4}_\d{2}_\d{2}__\d{2}_\d{2}_\d{2}$/;
        let match = nameWithoutExt.match(timestampPattern);
        if (match) {
            return match[1]; // Return the shortcode part before the timestamp
        }
        
        // Try format 1 (standard shortcode)
        const shortcodePattern = /^([A-Za-z0-9_-]{11})$/;
        match = nameWithoutExt.match(shortcodePattern);
        if (match) {
            return match[1];
        }
        
        // Fallback: use the first part before any underscore or the whole name
        const parts = nameWithoutExt.split('_');
        return parts[0] || nameWithoutExt;
    }


    /**
     * Get file URL for a media file
     */
    async getFileURL(shortcode) {
        const mediaInfo = this.mediaFiles.get(shortcode);
        if (!mediaInfo) return null;
        
        return URL.createObjectURL(mediaInfo.file);
    }

    /**
     * Get comments for a post
     */
    async getCommentsForPost(shortcode, page = 1, limit = 50) {
        if (!this.commentLoader) {
            return { comments: [], total: 0, hasMore: false };
        }
        
        return await this.commentLoader.getCommentsForPost(shortcode, page, limit);
    }

    /**
     * Get comment count for a post
     */
    getPostCommentCount(shortcode) {
        if (!this.commentLoader) return 0;
        return this.commentLoader.getPostCommentCount(shortcode);
    }

    /**
     * Get the name of the selected directory
     */
    getDirectoryName() {
        return this.archiveHandle?.name || 'Unknown Directory';
    }

    /**
     * Get posts data for DataManager compatibility
     */
    getPostsData() {
        return this.postsData || [];
    }

    /**
     * Get media files map for DataManager compatibility
     */
    getMediaFiles() {
        return this.mediaFiles;
    }
}

// Export for use in other modules
window.ArchiveDirectoryManager = ArchiveDirectoryManager;