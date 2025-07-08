/**
 * DataManager - Handles all data operations for the @jonno.otto Instagram Archive Explorer
 * Manages JSON loading, IndexedDB storage, and data querying
 * Now supports both YouTube and Instagram data
 */
class DataManager {
    constructor() {
        this.db = null;
        this.videos = [];
        this.posts = []; // Instagram posts
        this.comments = [];
        this.videoMapping = {};
        this.mediaMapping = {}; // Instagram media mapping
        this.isInitialized = false;
        this.dbName = 'JonnoOttoInstagramArchiveDB';
        this.dbVersion = 1;
        this.usingPreIndexedData = false;
        this.dataSource = 'instagram'; // Default to Instagram
        
        // Pre-indexed data stores
        this.videoCommentsIndex = null;
        this.searchIndex = null;
        this.wordFreqIndex = null;
    }

    /**
     * Initialize the data manager by loading JSON data and setting up IndexedDB
     */
    async initialize(progressCallback) {
        try {
            if (this.dataSource === 'instagram') {
                progressCallback?.('Loading Instagram posts...', 5);
                await this.loadInstagramData();
                progressCallback?.('Instagram data loaded', 15);

                progressCallback?.('Loading Instagram comments...', 20);
                await this.loadInstagramComments();
                progressCallback?.('Instagram comments loaded', 45);

                progressCallback?.('Loading media mapping...', 50);
                await this.loadInstagramMediaMapping();
                progressCallback?.('Media mapping loaded', 55);
            } else {
                progressCallback?.('Loading video data...', 5);
                await this.loadVideoData();
                progressCallback?.('Video data loaded', 15);

                progressCallback?.('Loading comment data...', 20);
                await this.loadCommentData();
                if (this.usingPreIndexedData) {
                    progressCallback?.('Pre-indexed data loaded ⚡', 45);
                } else {
                    progressCallback?.('Comment data loaded', 45);
                }

                progressCallback?.('Loading video mapping...', 50);
                await this.loadVideoMapping();
                progressCallback?.('Video mapping loaded', 55);
            }

            // Skip IndexedDB setup if we have pre-indexed data
            if (this.videoCommentsIndex && this.searchIndex && this.wordFreqIndex) {
                progressCallback?.('Using pre-indexed data - skipping database setup...', 90);
                console.log('✅ Using pre-indexed data, skipping IndexedDB population');
            } else {
                progressCallback?.('Setting up database...', 60);
                await this.initIndexedDB();
                progressCallback?.('Database ready', 70);

                progressCallback?.('Indexing data...', 75);
                await this.populateDatabase(progressCallback);
            }

            progressCallback?.('Ready!', 100);
            this.isInitialized = true;
            
            console.log('✅ DataManager initialized successfully');
            if (this.dataSource === 'instagram') {
                console.log(`📊 ${this.posts.length} posts, ${this.comments.length} comments`);
            } else {
                console.log(`📊 ${this.videos.length} videos, ${this.comments.length} comments`);
            }
            
        } catch (error) {
            console.error('❌ DataManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize from Instagram Archive DirectoryManager
     */
    async initializeFromInstagramArchive(directoryManager, progressCallback) {
        try {
            this.dataSource = 'instagram';
            progressCallback?.('Loading Instagram archive data...', 10);
            
            console.log('📊 DataManager: Initializing from Instagram archive...');
            
            // Get posts data from directory manager
            const postsData = directoryManager.getPostsData();
            console.log(`📷 Found ${postsData.length} Instagram posts`);
            
            // Debug: Show first few post shortcodes
            const postShortcodes = postsData.slice(0, 5).map(p => p.shortcode || p.video_id);
            console.log('🔍 Sample post shortcodes:', postShortcodes);
            
            // Convert to video format for compatibility with existing UI
            this.videos = postsData.map(post => {
                // The new preindexed data already has the correct shortcode field
                const shortcode = post.shortcode || post.video_id;
                const hasMedia = directoryManager.mediaFiles.has(shortcode);
                const mediaInfo = directoryManager.mediaFiles.get(shortcode);
                
                // Debug media matching
                if (!hasMedia && shortcode) {
                    console.log(`🔍 No media found for shortcode: ${shortcode}`);
                }
                
                return {
                    video_id: shortcode,
                    title: post.title || post.description?.substring(0, 100) || '@jonno.otto Instagram Post',
                    description: post.description || post.caption || '',
                    published_at: new Date(post.published_at),
                    view_count: parseInt(post.view_count) || 0,
                    comment_count: parseInt(post.comment_count) || 0,
                    like_count: parseInt(post.like_count) || 0,
                    url: post.url || '',
                    shortcode: shortcode,
                    hasMedia: hasMedia,
                    mediaType: mediaInfo?.type.startsWith('video/') ? 'video' : 'image',
                    mediaFilename: mediaInfo?.name
                };
            });
            
            this.posts = this.videos; // Keep reference for Instagram compatibility
            
            progressCallback?.('Processing media files...', 30);
            
            // Store media mapping from directory manager
            this.mediaMapping = directoryManager.mediaFiles;
            this.videoMapping = this.mediaMapping; // For compatibility
            
            progressCallback?.('Setting up data structures...', 50);
            
            // Load comments from SQLite database if available
            await this.loadInstagramArchiveComments(directoryManager, progressCallback);
            
            // Set up basic indexing
            this.buildVideoCommentsIndex();
            
            // Update comment counts in video objects based on actual loaded comments
            this.updateVideoCommentCounts();
            
            progressCallback?.('Instagram archive ready!', 100);
            this.isInitialized = true;
            
            console.log(`✅ DataManager initialized from @jonno.otto Instagram archive with ${this.videos.length} posts`);
            
        } catch (error) {
            console.error('❌ DataManager Instagram archive initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize from pre-loaded mapping data (for File System Access API mode)
     */
    async initializeFromMapping(videoMappingData) {
        try {
            console.log('📊 DataManager: Initializing from mapping data...');
            
            // Store the video mapping data directly
            this.videoMapping = videoMappingData;
            
            // Extract videos array if the mapping contains it
            if (videoMappingData.videos) {
                this.videos = videoMappingData.videos;
            } else {
                // If it's just a mapping object, convert to videos array
                this.videos = Object.values(videoMappingData).map(video => ({
                    ...video,
                    published_at: new Date(video.published_at || video.upload_date),
                    view_count: parseInt(video.view_count) || 0,
                    comment_count: parseInt(video.comment_count) || 0
                }));
            }
            
            // Extract comments if available
            if (videoMappingData.comments) {
                this.comments = videoMappingData.comments.map(comment => ({
                    ...comment,
                    published_at: new Date(comment.published_at),
                    like_count: parseInt(comment.like_count) || 0,
                    is_reply: Boolean(comment.is_reply)
                }));
            } else {
                this.comments = [];
            }
            
            // Set up basic indexing
            this.buildVideoCommentsIndex();
            
            this.isInitialized = true;
            
            console.log(`✅ DataManager initialized from mapping with ${this.videos.length} videos, ${this.comments.length} comments`);
            
        } catch (error) {
            console.error('❌ DataManager initialization from mapping failed:', error);
            throw error;
        }
    }

    /**
     * Initialize for hosted mode - metadata from server, videos from local directory
     */
    async initializeFromHostedMapping(videoMappingData) {
        try {
            console.log('📊 DataManager: Initializing for hosted mode...');
            
            // Load videos and comments from the hosted data files
            await this.loadVideoData();
            await this.loadCommentData();
            
            // Store the video mapping (which contains file paths)
            this.videoMapping = videoMappingData;
            
            // Set up basic indexing
            this.buildVideoCommentsIndex();
            
            this.isInitialized = true;
            
            console.log(`✅ DataManager initialized for hosted mode with ${this.videos.length} videos, ${this.comments.length} comments`);
            
        } catch (error) {
            console.error('❌ DataManager hosted mode initialization failed:', error);
            throw error;
        }
    }

    /**
     * Build video-comments index for faster lookups
     */
    buildVideoCommentsIndex() {
        if (!this.videoCommentsIndex) {
            this.videoCommentsIndex = {};
            this.comments.forEach(comment => {
                if (!this.videoCommentsIndex[comment.video_id]) {
                    this.videoCommentsIndex[comment.video_id] = [];
                }
                this.videoCommentsIndex[comment.video_id].push(comment);
            });
        }
    }

    /**
     * Update video comment counts based on actual loaded comments
     */
    updateVideoCommentCounts() {
        if (!this.videoCommentsIndex) {
            return;
        }

        // Update comment count for each video based on actual loaded comments
        this.videos.forEach(video => {
            const videoComments = this.videoCommentsIndex[video.video_id] || [];
            const actualCommentCount = videoComments.length;
            
            // Update the comment count
            video.comment_count = actualCommentCount;
            
            // Comment count updated (removed excessive logging for performance)
        });

        // Also update posts array if it exists
        if (this.posts && this.posts !== this.videos) {
            this.posts.forEach(post => {
                const postComments = this.videoCommentsIndex[post.video_id] || [];
                post.comment_count = postComments.length;
            });
        }

        console.log(`✅ Updated comment counts for ${this.videos.length} posts`);
    }

    /**
     * Load video data from JSON file
     */
    async loadVideoData() {
        try {
            const response = await fetch('data/videos.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            this.videos = await response.json();
            console.log(`📹 Loaded ${this.videos.length} videos`);
            
            // Process dates and ensure numeric fields
            this.videos = this.videos.map(video => ({
                ...video,
                published_at: new Date(video.published_at),
                view_count: parseInt(video.view_count) || 0,
                comment_count: parseInt(video.comment_count) || 0
            }));
            
        } catch (error) {
            console.error('❌ Failed to load video data:', error);
            throw new Error('Failed to load video data. Please ensure videos.json exists.');
        }
    }

    /**
     * Load comment data from pre-indexed files for faster loading
     */
    async loadCommentData() {
        try {
            console.log('📄 Attempting to load pre-indexed data...');
            
            // Try to load pre-indexed data files first
            try {
                const [videoCommentsResponse, searchIndexResponse, wordFreqResponse] = await Promise.all([
                    fetch('data/video_comments_index.json'),
                    fetch('data/search_index.json'),
                    fetch('data/word_freq_index.json')
                ]);
                
                console.log('📡 Pre-index files response status:', {
                    videoComments: videoCommentsResponse.status,
                    searchIndex: searchIndexResponse.status, 
                    wordFreq: wordFreqResponse.status
                });
                
                if (videoCommentsResponse.ok && searchIndexResponse.ok && wordFreqResponse.ok) {
                    this.videoCommentsIndex = await videoCommentsResponse.json();
                    this.searchIndex = await searchIndexResponse.json();
                    this.wordFreqIndex = await wordFreqResponse.json();
                    
                    console.log('✅ Loaded pre-indexed data');
                    console.log(`📊 Indexed ${Object.keys(this.videoCommentsIndex).length} videos`);
                    console.log(`🔍 Search index contains ${Object.keys(this.searchIndex).length} comments`);
                    
                    // For backward compatibility, reconstruct the comments array from pre-indexed data
                    this.comments = [];
                    Object.values(this.videoCommentsIndex).forEach(videoComments => {
                        // Pre-indexed data already has processed dates and numeric fields
                        videoComments.forEach(comment => {
                            // Convert date strings back to Date objects if needed
                            if (typeof comment.published_at === 'string') {
                                comment.published_at = new Date(comment.published_at);
                            }
                            this.comments.push(comment);
                        });
                    });
                    
                    console.log(`💬 Reconstructed ${this.comments.length} comments from pre-indexed data`);
                    this.usingPreIndexedData = true;
                    return;
                }
            } catch (preIndexError) {
                console.warn('⚠️ Pre-indexed files not available, falling back to original method:', preIndexError.message);
            }
            
            // Fallback to original loading method
            const response = await fetch('data/comments.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            this.comments = await response.json();
            console.log(`💬 Loaded ${this.comments.length} comments`);
            
            // Process dates and ensure numeric fields
            this.comments = this.comments.map(comment => ({
                ...comment,
                published_at: new Date(comment.published_at),
                like_count: parseInt(comment.like_count) || 0,
                is_reply: Boolean(comment.is_reply)
            }));
            
        } catch (error) {
            console.error('❌ Failed to load comment data:', error);
            throw new Error('Failed to load comment data. Please ensure comments.json exists.');
        }
    }

    /**
     * Load video file mapping
     */
    async loadVideoMapping() {
        try {
            const response = await fetch('data/video-mapping.json');
            if (!response.ok) {
                console.warn('⚠️ video-mapping.json not found, videos will fallback to YouTube links');
                return;
            }
            
            this.videoMapping = await response.json();
            console.log(`🗂️ Loaded video mapping for ${Object.keys(this.videoMapping).length} videos`);
            
            // Debug: Show first few mappings
            const firstKeys = Object.keys(this.videoMapping).slice(0, 3);
            console.log('🔍 First few video mappings:', firstKeys.map(key => ({
                id: key,
                title: this.videoMapping[key].title,
                path: this.videoMapping[key].file_path
            })));
            
        } catch (error) {
            console.warn('⚠️ Failed to load video mapping:', error);
            this.videoMapping = {};
        }
    }

    /**
     * Load Instagram posts data
     */
    async loadInstagramData() {
        try {
            const response = await fetch('data/instagram-posts.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            this.videos = await response.json();
            this.posts = this.videos; // Use same array for compatibility
            console.log(`📷 Loaded ${this.posts.length} @jonno.otto Instagram posts`);
            
            // Process dates and ensure numeric fields
            this.videos = this.videos.map(post => ({
                ...post,
                published_at: new Date(post.published_at),
                view_count: parseInt(post.view_count) || 0,
                comment_count: parseInt(post.comment_count) || 0
            }));
            
        } catch (error) {
            console.error('❌ Failed to load @jonno.otto Instagram data:', error);
            throw new Error('Failed to load @jonno.otto Instagram data. Please ensure instagram-posts.json exists.');
        }
    }

    /**
     * Load Instagram comments
     */
    async loadInstagramComments() {
        try {
            const response = await fetch('data/instagram-comments.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const commentsObj = await response.json();
            this.comments = [];
            
            // Convert object structure to flat array
            Object.entries(commentsObj).forEach(([postId, postComments]) => {
                postComments.forEach(comment => {
                    // Find the corresponding post to get its title
                    const post = this.getVideo(postId);
                    const postTitle = post?.title || post?.description?.substring(0, 100) || '@jonno.otto Instagram Post';
                    
                    this.comments.push({
                        ...comment,
                        video_id: postId,
                        comment_id: comment.id,
                        text: comment.content,
                        like_count: comment.reactionsCount,
                        published_at: new Date(comment.commentAt),
                        parent_comment_id: comment.depth > 0 ? 'parent' : null,
                        is_reply: comment.depth > 0,
                        video_title: postTitle
                    });
                });
            });
            
            console.log(`💬 Loaded ${this.comments.length} @jonno.otto Instagram comments`);
            
            // Build video comments index
            this.buildVideoCommentsIndex();
            
        } catch (error) {
            console.error('❌ Failed to load @jonno.otto Instagram comments:', error);
            // Don't throw - comments are optional
            this.comments = [];
        }
    }

    /**
     * Load comments from Instagram archive SQLite database
     */
    async loadInstagramArchiveComments(directoryManager, progressCallback) {
        this.comments = [];
        
        // Try organized comment database first
        if (directoryManager.commentLoader) {
            console.log('📝 Loading comments from organized comment database...');
            
            try {
                progressCallback?.('Loading comments...', 60);
                
                // Get all unique shortcodes from our posts
                const shortcodes = this.videos
                    .filter(video => video.shortcode)
                    .map(video => video.shortcode);
                
                console.log(`📝 Loading comments for ${shortcodes.length} posts from organized database`);
                
                let totalComments = 0;
                for (const shortcode of shortcodes) {
                    const commentData = await directoryManager.commentLoader.getCommentsForPost(shortcode, 1, 50000);
                    if (commentData.comments && commentData.comments.length > 0) {
                        // Comments are now full comment objects, not just IDs
                        commentData.comments.forEach(comment => {
                            // Find the corresponding post to get its title
                            const post = this.getVideo(shortcode);
                            const postTitle = post?.title || post?.description?.substring(0, 100) || '@jonno.otto Instagram Post';
                            
                            this.comments.push({
                                ...comment,
                                video_id: shortcode,
                                video_title: postTitle
                            });
                        });
                        totalComments += commentData.comments.length;
                    }
                }
                
                console.log(`💬 Loaded ${totalComments} comments from organized database`);
                return;
                
            } catch (error) {
                console.warn('⚠️ Failed to load from organized comment database:', error);
            }
        }
        
        // Fallback to SQLite if available
        if (!directoryManager.sqliteDb) {
            console.log('📝 No comment database available, comments will be empty');
            return;
        }
        
        try {
            progressCallback?.('Loading comments from database...', 60);
            
            // Get all unique shortcodes from our posts
            const shortcodes = this.videos
                .filter(video => video.shortcode)
                .map(video => video.shortcode);
            
            console.log(`📝 Loading comments for ${shortcodes.length} posts from SQLite database`);
            
            let totalComments = 0;
            const batchSize = 100; // Process in batches for better performance
            
            for (let i = 0; i < shortcodes.length; i += batchSize) {
                const batch = shortcodes.slice(i, i + batchSize);
                
                for (const shortcode of batch) {
                    const postComments = directoryManager.getCommentsForShortcode(shortcode);
                    
                    // Convert to our format and add video_id
                    postComments.forEach(comment => {
                        this.comments.push({
                            ...comment,
                            video_id: shortcode,
                            comment_id: comment.id
                        });
                    });
                    
                    totalComments += postComments.length;
                }
                
                // Update progress
                const progress = 60 + Math.floor((i / shortcodes.length) * 20); // 60% to 80%
                progressCallback?.(`Loading comments... ${totalComments.toLocaleString()} loaded`, progress);
            }
            
            console.log(`💬 Loaded ${totalComments.toLocaleString()} comments from SQLite database`);
            progressCallback?.('Comments loaded from database', 80);
            
        } catch (error) {
            console.error('❌ Failed to load @jonno.otto Instagram archive comments:', error);
            this.comments = [];
        }
    }

    /**
     * Load Instagram media mapping
     */
    async loadInstagramMediaMapping() {
        try {
            const response = await fetch('data/instagram-media-mapping.json');
            if (!response.ok) {
                console.warn('⚠️ instagram-media-mapping.json not found');
                return;
            }
            
            this.mediaMapping = await response.json();
            this.videoMapping = this.mediaMapping; // Use same object for compatibility
            console.log(`🗂️ Loaded media mapping for ${Object.keys(this.mediaMapping).length} posts`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load media mapping:', error);
            this.mediaMapping = {};
        }
    }

    /**
     * Initialize IndexedDB for efficient querying
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.warn('⚠️ IndexedDB not available, falling back to in-memory arrays');
                resolve(); // Don't fail if IndexedDB isn't available
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create videos store
                if (!db.objectStoreNames.contains('videos')) {
                    const videoStore = db.createObjectStore('videos', { keyPath: 'video_id' });
                    videoStore.createIndex('published_at', 'published_at');
                    videoStore.createIndex('view_count', 'view_count');
                    videoStore.createIndex('comment_count', 'comment_count');
                    videoStore.createIndex('title', 'title');
                }

                // Create comments store
                if (!db.objectStoreNames.contains('comments')) {
                    const commentStore = db.createObjectStore('comments', { keyPath: 'comment_id' });
                    commentStore.createIndex('video_id', 'video_id');
                    commentStore.createIndex('author', 'author');
                    commentStore.createIndex('published_at', 'published_at');
                    commentStore.createIndex('like_count', 'like_count');
                    commentStore.createIndex('is_reply', 'is_reply');
                    commentStore.createIndex('parent_comment_id', 'parent_comment_id');
                }
            };
        });
    }

    /**
     * Populate IndexedDB with loaded data
     */
    async populateDatabase(progressCallback) {
        if (!this.db) {
            // IndexedDB not available, just simulate progress for user feedback
            progressCallback?.('Using in-memory storage...', 90);
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for user feedback
            return;
        }

        try {
            // Clear existing data
            progressCallback?.('Clearing existing data...', 82);
            await this.clearStore('videos');
            await this.clearStore('comments');

            // Add videos
            progressCallback?.('Indexing videos...', 85);
            await this.addToStore('videos', this.videos);

            // Add comments (this is the slow part)
            progressCallback?.('Indexing comments...', 88);
            await this.addToStore('comments', this.comments, progressCallback);

            progressCallback?.('Finalizing database...', 95);
            console.log('✅ IndexedDB populated with data');
        } catch (error) {
            console.warn('⚠️ Failed to populate IndexedDB, using in-memory fallback:', error);
            progressCallback?.('Using in-memory storage...', 90);
        }
    }

    /**
     * Clear an IndexedDB store
     */
    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add data to an IndexedDB store
     */
    async addToStore(storeName, data, progressCallback) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let completed = 0;
            const total = data.length;
            const isComments = storeName === 'comments';
            
            data.forEach((item, index) => {
                const request = store.add(item);
                request.onsuccess = () => {
                    completed++;
                    
                    // Update progress for comments (the slow operation)
                    if (isComments && progressCallback && completed % 1000 === 0) {
                        const progress = 88 + Math.floor((completed / total) * 7); // 88% to 95%
                        progressCallback(`Indexing comments... ${completed.toLocaleString()}/${total.toLocaleString()}`, progress);
                    }
                    
                    if (completed === total) resolve();
                };
                request.onerror = () => reject(request.error);
            });
            
            if (total === 0) resolve();
        });
    }

    /**
     * Get videos with filtering and pagination
     */
    async getVideos(filters = {}, pagination = { page: 1, limit: 24 }) {
        let filteredVideos = [...this.videos];

        // Apply filters
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredVideos = filteredVideos.filter(video => 
                video.title.toLowerCase().includes(searchLower) ||
                video.description?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.dateFrom) {
            filteredVideos = filteredVideos.filter(video => 
                video.published_at >= new Date(filters.dateFrom)
            );
        }

        if (filters.dateTo) {
            filteredVideos = filteredVideos.filter(video => 
                video.published_at <= new Date(filters.dateTo)
            );
        }

        if (filters.minViews) {
            filteredVideos = filteredVideos.filter(video => 
                video.view_count >= parseInt(filters.minViews)
            );
        }

        if (filters.minComments) {
            filteredVideos = filteredVideos.filter(video => 
                video.comment_count >= parseInt(filters.minComments)
            );
        }

        // Apply sorting
        const sortBy = filters.sortBy || 'date-desc';
        filteredVideos.sort((a, b) => {
            switch (sortBy) {
                case 'date-asc':
                    return a.published_at - b.published_at;
                case 'date-desc':
                    return b.published_at - a.published_at;
                case 'views-desc':
                    return b.view_count - a.view_count;
                case 'views-asc':
                    return a.view_count - b.view_count;
                case 'comments-desc':
                    return b.comment_count - a.comment_count;
                case 'comments-asc':
                    return a.comment_count - b.comment_count;
                default:
                    return b.published_at - a.published_at;
            }
        });

        // Apply pagination
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

        return {
            videos: paginatedVideos,
            total: filteredVideos.length,
            page: pagination.page,
            totalPages: Math.ceil(filteredVideos.length / pagination.limit),
            hasNext: endIndex < filteredVideos.length,
            hasPrev: pagination.page > 1
        };
    }

    /**
     * Get a single video by ID
     */
    getVideo(videoId) {
        return this.videos.find(video => video.video_id === videoId);
    }

    /**
     * Get comments for a video with filtering and pagination
     */
    async getComments(videoId, filters = {}, pagination = { page: 1, limit: 50 }) {
        // Use pre-indexed data if available for faster access
        let videoComments = [];
        if (this.videoCommentsIndex && this.videoCommentsIndex[videoId]) {
            videoComments = [...this.videoCommentsIndex[videoId]];
        } else {
            videoComments = this.comments.filter(comment => comment.video_id === videoId);
        }

        // Apply filters
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            videoComments = videoComments.filter(comment => 
                comment.text.toLowerCase().includes(searchLower) ||
                comment.author.toLowerCase().includes(searchLower)
            );
        }

        if (filters.repliesOnly) {
            videoComments = videoComments.filter(comment => comment.is_reply);
        }

        // Apply sorting
        const sortBy = filters.sortBy || 'likes-desc';
        videoComments.sort((a, b) => {
            switch (sortBy) {
                case 'likes-desc':
                    return b.like_count - a.like_count;
                case 'likes-asc':
                    return a.like_count - b.like_count;
                case 'date-desc':
                    return b.published_at - a.published_at;
                case 'date-asc':
                    return a.published_at - b.published_at;
                default:
                    return b.like_count - a.like_count;
            }
        });

        // Group comments with their replies
        const topLevelComments = videoComments.filter(comment => !comment.is_reply);
        const replies = videoComments.filter(comment => comment.is_reply);

        const commentsWithReplies = topLevelComments.map(comment => ({
            ...comment,
            replies: replies.filter(reply => reply.parent_comment_id === comment.comment_id)
        }));

        // Apply pagination
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedComments = commentsWithReplies.slice(startIndex, endIndex);

        return {
            comments: paginatedComments,
            total: commentsWithReplies.length,
            page: pagination.page,
            totalPages: Math.ceil(commentsWithReplies.length / pagination.limit),
            hasNext: endIndex < commentsWithReplies.length,
            hasPrev: pagination.page > 1
        };
    }

    /**
     * Get ALL comments for a video without pagination (for export)
     */
    async getAllComments(videoId, filters = {}) {
        let videoComments = [];
        
        // Use pre-indexed data if available for faster access
        if (this.videoCommentsIndex && this.videoCommentsIndex[videoId]) {
            videoComments = [...this.videoCommentsIndex[videoId]];
        } else {
            // Fallback to original method
            videoComments = this.comments.filter(comment => comment.video_id === videoId);
        }

        // Apply filters (same as getComments but no pagination)
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            videoComments = videoComments.filter(comment => 
                comment.text.toLowerCase().includes(searchLower) ||
                comment.author.toLowerCase().includes(searchLower)
            );
        }

        if (filters.repliesOnly) {
            videoComments = videoComments.filter(comment => comment.is_reply);
        }

        // Apply sorting
        const sortBy = filters.sortBy || 'likes-desc';
        videoComments.sort((a, b) => {
            switch (sortBy) {
                case 'likes-desc':
                    return b.like_count - a.like_count;
                case 'likes-asc':
                    return a.like_count - b.like_count;
                case 'date-desc':
                    return b.published_at - a.published_at;
                case 'date-asc':
                    return a.published_at - b.published_at;
                default:
                    return b.like_count - a.like_count;
            }
        });

        // Group comments with their replies (same as getComments)
        const topLevelComments = videoComments.filter(comment => !comment.is_reply);
        const replies = videoComments.filter(comment => comment.is_reply);

        const commentsWithReplies = topLevelComments.map(comment => ({
            ...comment,
            replies: replies.filter(reply => reply.parent_comment_id === comment.comment_id)
        }));

        return commentsWithReplies;
    }

    /**
     * Get media file info for Instagram post or video file path
     */
    getVideoFilePath(videoId) {
        if (this.dataSource === 'instagram') {
            // For Instagram, videoId is the shortcode
            const mediaFile = this.mediaMapping.get ? this.mediaMapping.get(videoId) : this.mediaMapping[videoId];
            if (mediaFile) {
                return {
                    shortcode: videoId,
                    filename: mediaFile.filename || mediaFile.path,
                    type: mediaFile.type,
                    hasLocalFile: true
                };
            }
        } else {
            const mapping = this.videoMapping[videoId];
            if (mapping && mapping.file_path) {
                return mapping.file_path;
            }
        }
        return null;
    }

    /**
     * Get Instagram media files for a post
     */
    getInstagramMediaFiles(postId) {
        const mediaFiles = this.mediaMapping[postId];
        if (mediaFiles && mediaFiles.length > 0) {
            return mediaFiles.map(media => ({
                ...media,
                path: `instadata/posts/${media.filename}`,
                thumbnailPath: media.thumbnail ? `instadata/posts/${media.thumbnail}` : null
            }));
        }
        return [];
    }

    /**
     * Get YouTube URL for a video
     */
    getYouTubeUrl(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    /**
     * Search across all comments
     */
    async searchComments(query, videoId = null) {
        const searchLower = query.toLowerCase();
        let searchComments = videoId 
            ? this.comments.filter(comment => comment.video_id === videoId)
            : this.comments;

        const results = searchComments.filter(comment => 
            comment.text.toLowerCase().includes(searchLower) ||
            comment.author.toLowerCase().includes(searchLower)
        );

        // Sort by relevance (like count * relevance score)
        results.sort((a, b) => {
            const aRelevance = this.calculateRelevance(a, query);
            const bRelevance = this.calculateRelevance(b, query);
            return bRelevance - aRelevance;
        });

        return results;
    }

    /**
     * Calculate search relevance score
     */
    calculateRelevance(comment, query) {
        const text = comment.text.toLowerCase();
        const author = comment.author.toLowerCase();
        const queryLower = query.toLowerCase();
        
        let score = 0;
        
        // Exact match in text
        if (text.includes(queryLower)) score += 10;
        
        // Exact match in author
        if (author.includes(queryLower)) score += 5;
        
        // Like count boost
        score += Math.log(comment.like_count + 1);
        
        return score;
    }

    /**
     * Get pre-computed word frequencies for a video
     */
    getWordFrequencies(videoId) {
        if (this.wordFreqIndex && this.wordFreqIndex[videoId]) {
            return this.wordFreqIndex[videoId];
        }
        return { word_cloud: [], liked_words: [] };
    }

    /**
     * Get statistics about the data
     */
    getStats() {
        const totalComments = this.comments.length;
        const totalReplies = this.comments.filter(c => c.is_reply).length;
        const totalVideos = this.videos.length;
        const totalViews = this.videos.reduce((sum, v) => sum + v.view_count, 0);
        
        return {
            totalVideos,
            totalComments,
            totalReplies,
            totalViews,
            averageCommentsPerVideo: Math.round(totalComments / totalVideos),
            videosWithMapping: Object.keys(this.videoMapping).length
        };
    }
}

// Export for use in other modules
window.DataManager = DataManager; 