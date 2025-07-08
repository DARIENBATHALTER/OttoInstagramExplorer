/**
 * Modal Comments Manager - Handles comments display within the analytics modal
 */
class ModalCommentsManager {
    constructor() {
        this.allComments = [];
        this.filteredComments = [];
        this.currentPage = 1;
        this.commentsPerPage = 20;
        this.searchTerm = '';
        this.sortBy = 'date-desc';
        this.activeFilter = null;
        
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for search, sort, pagination
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('modalCommentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.applyFiltersAndRender();
            });
        }
        
        // Sort functionality
        const sortSelect = document.getElementById('modalCommentSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.currentPage = 1;
                this.applyFiltersAndRender();
            });
        }
        
        // Clear filter functionality
        const clearFilterBtn = document.getElementById('modalClearFilter');
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                this.clearFilter();
            });
        }
    }
    
    /**
     * Load comments directly from the preindexed Instagram comments data
     */
    async loadComments(dataManager = null) {
        console.log('🔄 COMMENTS LOADING START');
        console.log('🔍 Data manager passed:', dataManager);
        
        this.allComments = [];
        
        try {
            // TODO: KNOWN ISSUE - Hardcoded path is problematic since data is uploaded by users 
            // each session via File System Access API. Should use user-uploaded data instead.
            // Load directly from the preindexed Instagram comments file
            const url = '../../../jonno_otto_ig_archive/jonno_otto_preindexed_data/instagram-comments.json';
            console.log('🔄 Fetching comments from:', url);
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(url, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            console.log('🔍 Comments fetch response:', {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load Instagram comments: ${response.status} ${response.statusText}`);
            }
            
            const commentsData = await response.json();
            console.log('🔍 Comments data structure:', {
                type: typeof commentsData,
                isArray: Array.isArray(commentsData),
                postCount: Object.keys(commentsData).length,
                firstFewPosts: Object.keys(commentsData).slice(0, 5)
            });
            
            let totalComments = 0;
            
            // Convert the object structure to flat array
            Object.entries(commentsData).forEach(([postId, comments], index) => {
                if (Array.isArray(comments)) {
                    console.log(`🔍 Post ${postId}: ${comments.length} comments`);
                    totalComments += comments.length;
                    
                    comments.forEach(comment => {
                        this.allComments.push({
                            ...comment,
                            video_id: postId,
                            video_title: '@jonno.otto Instagram Post',
                            // Normalize date field
                            published_at: comment.published_at || comment.commentAt,
                            // Normalize text field  
                            text: comment.text || comment.content,
                            // Normalize like count
                            like_count: comment.like_count || comment.reactionsCount || 0
                        });
                    });
                } else {
                    console.warn(`⚠️ Post ${postId} comments is not an array:`, comments);
                }
            });
            
            console.log(`📊 COMMENTS LOADED: ${this.allComments.length} total from ${Object.keys(commentsData).length} posts`);
            console.log('🔍 First few comments:', this.allComments.slice(0, 3));
            
            console.log('🔄 Applying filters and rendering...');
            this.applyFiltersAndRender();
            console.log('✅ COMMENTS LOADING COMPLETE');
            
        } catch (error) {
            console.error('❌ CRITICAL ERROR loading Instagram comments:', error);
            console.error('❌ Error stack:', error.stack);
            console.log('⚠️ Falling back to sample data');
            this.generateSampleComments();
            this.applyFiltersAndRender();
        }
    }
    
    /**
     * Generate sample comments for demonstration
     */
    generateSampleComments() {
        const sampleComments = [
            { text: "Thank you for sharing this amazing information! It really helped me understand urine therapy better.", author: "wellness_seeker", published_at: "2024-12-10T10:30:00Z", like_count: 45 },
            { text: "I've been practicing this for 3 months and my skin has never looked better. Truly life-changing!", author: "glowing_skin_jane", published_at: "2024-12-09T15:45:00Z", like_count: 78 },
            { text: "This seems dangerous and not scientifically proven. Please consult a doctor first.", author: "medical_mike", published_at: "2024-12-08T09:20:00Z", like_count: 23 },
            { text: "How long should I do this for? What time of day is best?", author: "curious_newcomer", published_at: "2024-12-07T12:15:00Z", like_count: 12 },
            { text: "lol I can't believe people actually do this 😂 but hey, to each their own!", author: "skeptical_sarah", published_at: "2024-12-06T18:30:00Z", like_count: 156 },
            { text: "This helped me heal my chronic skin condition when nothing else worked. Forever grateful! 🙏", author: "healed_warrior", published_at: "2024-12-05T07:45:00Z", like_count: 234 },
            { text: "Is this safe with my diabetes medication? Should I check with my doctor?", author: "diabetic_daniel", published_at: "2024-12-04T14:20:00Z", like_count: 67 },
            { text: "Please DM me more info about how to start this practice safely.", author: "interested_learner", published_at: "2024-12-03T11:10:00Z", like_count: 34 },
            { text: "My acne cleared up completely after just 2 weeks of morning urine therapy!", author: "clear_skin_tom", published_at: "2024-12-02T16:55:00Z", like_count: 89 },
            { text: "What are the potential side effects? Any scientific studies on this?", author: "research_rachel", published_at: "2024-12-01T13:40:00Z", like_count: 45 },
            { text: "This is the ultimate detox method. Better than any expensive cleanse!", author: "detox_queen", published_at: "2024-11-30T09:25:00Z", like_count: 123 },
            { text: "Can you message me the details? I want to learn more privately.", author: "private_learner", published_at: "2024-11-29T20:15:00Z", like_count: 56 },
            { text: "Is this really safe to do long-term? I'm worried about potential risks.", author: "safety_first", published_at: "2024-11-28T08:30:00Z", like_count: 78 },
            { text: "This helped with my chronic pain better than any medication. Amazing!", author: "pain_free_paul", published_at: "2024-11-27T15:20:00Z", like_count: 145 },
            { text: "How do I start this practice? Any beginner tips?", author: "newbie_nancy", published_at: "2024-11-26T12:05:00Z", like_count: 67 }
        ];
        
        // Generate more comments with variations
        const authors = ['health_guru', 'natural_healer', 'skeptic_steve', 'curious_cat', 'wellness_warrior', 'detox_dave', 'skin_care_sue'];
        const themes = [
            'skin improvement', 'detox benefits', 'safety concerns', 'how-to questions', 
            'testimonials', 'medical questions', 'skeptical comments', 'humorous reactions'
        ];
        
        for (let i = 0; i < 100; i++) {
            const randomAuthor = authors[Math.floor(Math.random() * authors.length)] + Math.floor(Math.random() * 1000);
            const randomDate = new Date(2024, 10, Math.floor(Math.random() * 30), Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
            const randomLikes = Math.floor(Math.random() * 200);
            
            const templates = [
                "This practice has been life-changing for my health journey!",
                "How often should I do this? Any specific timing recommendations?",
                "I'm not sure about this... seems risky without medical supervision.",
                "My skin condition improved dramatically after trying this!",
                "Can someone DM me more information about getting started?",
                "This is amazing! Thank you for sharing your knowledge 🙏",
                "What are the scientific studies backing this practice?",
                "Is this safe for people with autoimmune conditions?",
                "The detox benefits are incredible - feeling so much better!",
                "lol this is wild but I'm here for it 😂"
            ];
            
            this.allComments.push({
                text: templates[Math.floor(Math.random() * templates.length)],
                author: randomAuthor,
                published_at: randomDate.toISOString(),
                like_count: randomLikes,
                video_id: 'sample_post_' + Math.floor(i / 10),
                video_title: '@jonno.otto Instagram Post',
                comment_id: 'sample_' + i
            });
        }
        
        // Add the predefined sample comments
        this.allComments = [...this.allComments, ...sampleComments.map((comment, index) => ({
            ...comment,
            video_id: 'sample_post_featured',
            video_title: '@jonno.otto Instagram Post',
            comment_id: 'featured_' + index
        }))];
    }
    
    /**
     * Apply search, sort, and filter to comments
     */
    applyFiltersAndRender() {
        // Start with all comments
        let comments = [...this.allComments];
        
        // Apply search filter
        if (this.searchTerm) {
            comments = comments.filter(comment => 
                comment.text?.toLowerCase().includes(this.searchTerm) ||
                comment.author?.toLowerCase().includes(this.searchTerm)
            );
        }
        
        // Apply analytics filter
        if (this.activeFilter) {
            comments = comments.filter(comment => this.matchesFilter(comment));
        }
        
        // Apply sorting
        comments = this.sortComments(comments);
        
        this.filteredComments = comments;
        this.renderComments();
        this.renderPagination();
        this.updateCommentsInfo();
    }
    
    /**
     * Check if comment matches the active filter
     */
    matchesFilter(comment) {
        if (!this.activeFilter) return true;
        
        const text = (comment.text || '').toLowerCase();
        const author = (comment.author || '').toLowerCase();
        const { type, value } = this.activeFilter;
        
        switch (type) {
            case 'sentiment':
                return this.matchesSentiment(text, author, value);
            case 'engagement':
                return this.matchesEngagement(text, author, value);
            case 'health_topic':
                return this.matchesHealthTopic(text, author, value);
            default:
                return true;
        }
    }
    
    /**
     * Check sentiment patterns
     */
    matchesSentiment(text, author, sentimentType) {
        const patterns = {
            supportive: ['thank', 'help', 'work', 'amazing', 'great', 'love', 'best', 'grateful', 'bless', 'heal', 'cure', 'better', 'good', 'yes', 'absolutely', 'agree', 'support'],
            skeptical: ['fake', 'scam', 'dangerous', 'wrong', 'bad', 'disgusting', 'gross', 'sick', 'stupid', 'crazy', 'insane', 'wtf', 'no way', 'bullshit', 'lies'],
            curious: ['how', 'what', 'when', 'where', 'why', 'explain', 'question', 'tell me', 'curious', 'wonder', 'interested', 'learn', 'more info'],
            humorous: ['lol', 'haha', 'funny', 'joke', 'laugh', '😂', '🤣', '😄', '😆', 'omg', 'dead', 'can\'t', 'stop']
        };
        
        const sentimentPatterns = patterns[sentimentType] || [];
        return sentimentPatterns.some(pattern => text.includes(pattern));
    }
    
    /**
     * Check engagement patterns
     */
    matchesEngagement(text, author, engagementType) {
        const patterns = {
            testimonials: ['i tried', 'i did', 'i use', 'my experience', 'worked for me', 'i have been', 'i started', 'results', 'after'],
            medical_questions: ['doctor', 'medical', 'health', 'condition', 'disease', 'medication', 'symptoms', 'treatment', 'safe', 'risk'],
            howto_questions: ['how to', 'how do', 'how long', 'how much', 'how often', 'what time', 'when to', 'instructions', 'steps'],
            dm_requests: ['dm', 'message', 'private', 'contact', 'email', 'reach out', 'talk', 'discuss', 'more info']
        };
        
        const engagementPatterns = patterns[engagementType] || [];
        return engagementPatterns.some(pattern => text.includes(pattern));
    }
    
    /**
     * Check health topic patterns
     */
    matchesHealthTopic(text, author, topicType) {
        const patterns = {
            skin_beauty: ['skin', 'face', 'acne', 'wrinkles', 'beauty', 'hair', 'complexion', 'glow', 'clear', 'smooth'],
            detox_cleanse: ['detox', 'cleanse', 'toxins', 'flush', 'purify', 'clean', 'elimination', 'waste'],
            conditions: ['cancer', 'diabetes', 'arthritis', 'pain', 'disease', 'illness', 'condition', 'sick', 'heal'],
            safety: ['safe', 'danger', 'risk', 'harm', 'side effects', 'caution', 'warning', 'careful', 'concern']
        };
        
        const topicPatterns = patterns[topicType] || [];
        return topicPatterns.some(pattern => text.includes(pattern));
    }
    
    /**
     * Sort comments based on selected criteria
     */
    sortComments(comments) {
        switch (this.sortBy) {
            case 'date-desc':
                return comments.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
            case 'date-asc':
                return comments.sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0));
            case 'author':
                return comments.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
            case 'likes':
                return comments.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
            default:
                return comments;
        }
    }
    
    /**
     * Render comments for current page
     */
    renderComments() {
        const container = document.getElementById('modalCommentsList');
        if (!container) return;
        
        const startIndex = (this.currentPage - 1) * this.commentsPerPage;
        const endIndex = startIndex + this.commentsPerPage;
        const pageComments = this.filteredComments.slice(startIndex, endIndex);
        
        if (pageComments.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="bi bi-chat-square-text" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p class="mt-2 mb-0">No comments found</p>
                </div>
            `;
            return;
        }
        
        const html = pageComments.map(comment => this.createCommentHTML(comment)).join('');
        container.innerHTML = html;
    }
    
    /**
     * Create HTML for a single comment
     */
    createCommentHTML(comment) {
        const timeAgo = this.formatTimeAgo(comment.published_at);
        const likes = comment.like_count || 0;
        const likesText = likes > 0 ? `${likes} likes` : '';
        
        return `
            <div class="modal-comment-item border-bottom py-3">
                <div class="d-flex">
                    <div class="comment-avatar me-3">
                        <div class="avatar-circle">
                            ${comment.author?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <div class="comment-header mb-1">
                            <strong class="comment-author">${this.escapeHTML(comment.author || 'Unknown')}</strong>
                            <small class="text-muted ms-2">${timeAgo}</small>
                            ${comment.is_reply ? '<span class="badge bg-light text-dark ms-2">Reply</span>' : ''}
                        </div>
                        <div class="comment-text mb-2">
                            ${this.highlightSearchTerm(this.escapeHTML(comment.text || ''))}
                        </div>
                        <div class="comment-actions">
                            ${likesText ? `<small class="text-muted me-3"><i class="bi bi-heart me-1"></i>${likesText}</small>` : ''}
                            <small class="text-muted">
                                <i class="bi bi-image me-1"></i>${comment.video_title || 'Instagram Post'}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render pagination controls
     */
    renderPagination() {
        const container = document.getElementById('modalCommentsPagination');
        if (!container) return;
        
        const totalPages = Math.ceil(this.filteredComments.length / this.commentsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Previous</a>
            </li>
        `;
        
        // Page numbers (show max 5 pages around current)
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
            </li>
        `;
        
        container.innerHTML = html;
        
        // Add click handlers
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.renderComments();
                    this.renderPagination();
                    this.updateCommentsInfo();
                    
                    // Scroll to top of comments
                    const commentsContainer = document.querySelector('.comments-container');
                    if (commentsContainer) {
                        commentsContainer.scrollTop = 0;
                    }
                }
            });
        });
    }
    
    /**
     * Update comments info display
     */
    updateCommentsInfo() {
        const countElement = document.getElementById('modalCommentsCount');
        const infoElement = document.getElementById('modalCommentsInfo');
        
        if (countElement) {
            countElement.textContent = this.filteredComments.length;
        }
        
        if (infoElement) {
            const startIndex = (this.currentPage - 1) * this.commentsPerPage + 1;
            const endIndex = Math.min(this.currentPage * this.commentsPerPage, this.filteredComments.length);
            
            if (this.filteredComments.length === 0) {
                infoElement.textContent = 'No comments found';
            } else {
                infoElement.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredComments.length} comments`;
            }
        }
    }
    
    /**
     * Apply filter from analytics
     */
    applyFilter(filterType, filterValue) {
        this.activeFilter = { type: filterType, value: filterValue };
        this.currentPage = 1;
        
        // Show filter indicator
        const filterElement = document.getElementById('modalActiveFilter');
        const filterTextElement = document.getElementById('modalFilterText');
        
        if (filterElement && filterTextElement) {
            filterElement.classList.remove('d-none');
            filterTextElement.textContent = `Filtered by ${this.getFilterDisplayName(filterType, filterValue)} (${this.getFilteredCount()} comments)`;
        }
        
        this.applyFiltersAndRender();
    }
    
    /**
     * Clear active filter
     */
    clearFilter() {
        this.activeFilter = null;
        this.currentPage = 1;
        
        // Hide filter indicator
        const filterElement = document.getElementById('modalActiveFilter');
        if (filterElement) {
            filterElement.classList.add('d-none');
        }
        
        this.applyFiltersAndRender();
    }
    
    /**
     * Get count of comments that match current filter
     */
    getFilteredCount() {
        if (!this.activeFilter) return this.allComments.length;
        
        return this.allComments.filter(comment => this.matchesFilter(comment)).length;
    }
    
    /**
     * Get display name for filter
     */
    getFilterDisplayName(filterType, filterValue) {
        const displayNames = {
            sentiment: {
                supportive: 'Supportive Comments',
                skeptical: 'Skeptical Comments',
                curious: 'Curious Comments',
                humorous: 'Humorous Comments'
            },
            engagement: {
                testimonials: 'Testimonials',
                medical_questions: 'Medical Questions',
                howto_questions: 'How-To Questions',
                dm_requests: 'DM Requests'
            },
            health_topic: {
                skin_beauty: 'Skin & Beauty',
                detox_cleanse: 'Detox & Cleanse',
                conditions: 'Health Conditions',
                safety: 'Safety Concerns'
            }
        };
        
        return displayNames[filterType]?.[filterValue] || filterValue.replace('_', ' ');
    }
    
    /**
     * Utility functions
     */
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return 'Today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
    
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    highlightSearchTerm(text) {
        if (!this.searchTerm) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Export for use
window.ModalCommentsManager = ModalCommentsManager;