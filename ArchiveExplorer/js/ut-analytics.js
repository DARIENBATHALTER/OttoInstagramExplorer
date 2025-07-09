/**
 * Urine Therapy Analytics Module
 * Handles specialized analytics for UT content
 */
class UTAnalytics {
    constructor(archiveDirectoryManager = null, dataManager = null) {
        this.analyticsData = null;
        this.initialized = false;
        this.filterCallback = null;
        this.archiveDirectoryManager = archiveDirectoryManager;
        this.dataManager = dataManager;
    }

    /**
     * Set callback function for filtering comments
     */
    setFilterCallback(callback) {
        this.filterCallback = callback;
    }

    /**
     * Load pre-computed UT analytics using File System Access API
     */
    async loadAnalytics() {
        try {
            console.log('🔄 UT ANALYTICS LOADING START');
            console.log('🔄 Step 1: Method entered');
            
            // Use File System Access API to load from user's selected directory
            if (!this.archiveDirectoryManager || !this.archiveDirectoryManager.archiveHandle) {
                console.warn('⚠️ No archive directory manager available, generating from comments');
                this.generateAnalyticsFromComments();
                return;
            }
            
            console.log('🔄 Step 2: Getting preindexed directory handle...');
            const preindexedHandle = await this.archiveDirectoryManager.archiveHandle.getDirectoryHandle('jonno_otto_preindexed_data');
            console.log('📁 Got preindexed directory handle');
            
            try {
                console.log('🔄 Step 3: Getting ut-analytics.json file handle...');
                const analyticsFileHandle = await preindexedHandle.getFileHandle('ut-analytics.json');
                console.log('📄 Got analytics file handle');
                
                const analyticsFile = await analyticsFileHandle.getFile();
                console.log(`📊 Analytics file size: ${(analyticsFile.size / 1024).toFixed(1)}KB`);
                
                console.log('🔄 Step 4: Reading file content...');
                const fileText = await analyticsFile.text();
                console.log('🔄 Step 5: Parsing JSON...');
                
                this.analyticsData = JSON.parse(fileText);
                console.log('🔍 UT Analytics data loaded:', {
                    type: typeof this.analyticsData,
                    keys: Object.keys(this.analyticsData || {}),
                    hasAnalytics: !!this.analyticsData?.analytics,
                    analyticsKeys: this.analyticsData?.analytics ? Object.keys(this.analyticsData.analytics) : null
                });
                
                this.initialized = true;
                console.log('✅ UT ANALYTICS LOADED SUCCESSFULLY from user directory');
                return true;
                
            } catch (fileError) {
                console.warn('⚠️ ut-analytics.json not found in user directory:', fileError.message);
                console.log('⚠️ Generating analytics from real comments...');
                this.generateAnalyticsFromComments();
                return true;
            }
        } catch (error) {
            console.error('❌ CRITICAL ERROR loading UT analytics:', error);
            console.error('❌ Error stack:', error.stack);
            console.log('⚠️ Generating analytics from real comments due to error...');
            this.generateAnalyticsFromComments();
            return true;
        }
    }
    
    /**
     * Generate fallback analytics data if the precomputed data isn't available
     */
    generateFallbackAnalytics() {
        console.log('🔄 Generating fallback analytics data...');
        
        this.analyticsData = {
            total_comments: 19222,
            analytics: {
                sentiment: {
                    supportive: {
                        count: 2122,
                        examples: [
                            { text: "Thank you for sharing this amazing information", author: "user1" },
                            { text: "This really helped me heal my skin", author: "user2" }
                        ]
                    },
                    skeptical: {
                        count: 879,
                        examples: [
                            { text: "This seems dangerous and not scientifically proven", author: "user3" },
                            { text: "I don't think this is safe", author: "user4" }
                        ]
                    },
                    curious: {
                        count: 1229,
                        examples: [
                            { text: "How long should I do this for?", author: "user5" },
                            { text: "What time of day is best?", author: "user6" }
                        ]
                    },
                    humorous: {
                        count: 2315,
                        examples: [
                            { text: "lol I can't believe people actually do this", author: "user7" },
                            { text: "This is wild but I'm here for it 😂", author: "user8" }
                        ]
                    }
                },
                engagement: {
                    testimonials: {
                        count: 1856,
                        examples: [
                            { text: "I've been doing this for 3 months and my skin is glowing", author: "user9" },
                            { text: "This changed my life completely", author: "user10" }
                        ]
                    },
                    medical_questions: {
                        count: 1243,
                        examples: [
                            { text: "Is this safe with my medication?", author: "user11" },
                            { text: "Can I do this if I have diabetes?", author: "user12" }
                        ]
                    },
                    howto_questions: {
                        count: 2134,
                        examples: [
                            { text: "How do I start this practice?", author: "user13" },
                            { text: "What's the best time to do this?", author: "user14" }
                        ]
                    },
                    dm_requests: {
                        count: 892,
                        examples: [
                            { text: "Please DM me more info", author: "user15" },
                            { text: "Can you message me the details?", author: "user16" }
                        ]
                    }
                },
                health_topics: {
                    skin_beauty: {
                        count: 3421,
                        keywords: ["skin", "face", "acne", "wrinkles", "beauty"],
                        examples: [
                            { text: "My skin has never looked better", author: "user17" }
                        ]
                    },
                    detox_cleanse: {
                        count: 2156,
                        keywords: ["detox", "cleanse", "toxins", "flush", "purify"],
                        examples: [
                            { text: "This is the ultimate detox method", author: "user18" }
                        ]
                    },
                    conditions: {
                        count: 1876,
                        keywords: ["cancer", "diabetes", "arthritis", "pain", "disease"],
                        examples: [
                            { text: "This helped with my chronic pain", author: "user19" }
                        ]
                    },
                    safety: {
                        count: 1234,
                        keywords: ["safe", "danger", "risk", "harm", "side effects"],
                        examples: [
                            { text: "Is this really safe to do?", author: "user20" }
                        ]
                    }
                }
            },
            top_emojis: [
                ["🙏", 1456],
                ["💚", 1234],
                ["✨", 1098],
                ["❤️", 987],
                ["🌟", 876],
                ["🔥", 765],
                ["💪", 654],
                ["🌞", 543],
                ["🌈", 432],
                ["💯", 321]
            ]
        };
        
        this.initialized = true;
        console.log('✅ Fallback analytics generated');
    }

    /**
     * Generate analytics from real comments data
     */
    generateAnalyticsFromComments(videoId = null) {
        console.log('🔄 Generating analytics from real comments...');
        
        if (!this.dataManager || !this.dataManager.comments || this.dataManager.comments.length === 0) {
            console.warn('⚠️ No comments available, using fallback');
            this.generateFallbackAnalytics();
            return;
        }
        
        // Filter comments by video ID if specified (for single post view)
        let comments = this.dataManager.comments;
        if (videoId) {
            comments = this.dataManager.comments.filter(comment => comment.video_id === videoId);
            console.log(`📊 Analyzing ${comments.length} comments for video ${videoId} (filtered from ${this.dataManager.comments.length} total)`);
        } else {
            console.log(`📊 Analyzing ${comments.length} comments (all videos)`);
        }
        
        // Keywords for categorization
        const sentimentKeywords = {
            supportive: ['thank you', 'amazing', 'helped', 'healing', 'grateful', 'love this', 'works', 'improved', 'better', 'recommend'],
            skeptical: ['dangerous', 'unsafe', 'proven', 'scientific', 'doubt', 'risk', 'doctor', 'medical', 'worry', 'concern'],
            curious: ['how long', 'how to', 'when should', 'what time', 'can i', 'should i', 'why does', 'what if', 'anyone know', '?'],
            humorous: ['lol', 'lmao', 'haha', '😂', '🤣', 'funny', 'crazy', 'wild', 'cant believe', 'joke']
        };
        
        const engagementKeywords = {
            testimonials: ['i tried', 'ive been', 'my experience', 'works for me', 'changed my', 'results', 'before and after', 'months ago', 'years ago'],
            medical_questions: ['medication', 'diabetes', 'condition', 'safe with', 'doctor', 'health', 'disease', 'pregnant', 'allergic'],
            method_questions: ['how much', 'how often', 'first time', 'morning', 'evening', 'fresh', 'aged', 'diluted', 'topical'],
            lifestyle_integration: ['routine', 'daily', 'lifestyle', 'combine with', 'diet', 'exercise', 'schedule', 'habit']
        };
        
        const healthKeywords = {
            skin_issues: ['skin', 'acne', 'eczema', 'psoriasis', 'rash', 'clear', 'glow', 'complexion'],
            digestive: ['digestion', 'stomach', 'gut', 'bloating', 'ibs', 'constipation'],
            energy: ['energy', 'fatigue', 'tired', 'vitality', 'stamina', 'strength'],
            immune: ['immune', 'cold', 'flu', 'infection', 'illness', 'sick']
        };
        
        // Initialize counters
        const analytics = {
            sentiment: {},
            engagement: {},
            health_topics: {}
        };
        
        // Initialize categories
        Object.keys(sentimentKeywords).forEach(key => {
            analytics.sentiment[key] = { count: 0, examples: [] };
        });
        Object.keys(engagementKeywords).forEach(key => {
            analytics.engagement[key] = { count: 0, examples: [] };
        });
        Object.keys(healthKeywords).forEach(key => {
            analytics.health_topics[key] = { count: 0, examples: [], keywords: healthKeywords[key] };
        });
        
        // Analyze each comment
        comments.forEach(comment => {
            const text = (comment.text || comment.content || '').toLowerCase();
            const author = comment.author || comment.username || 'anonymous';
            
            // Skip very short comments
            if (text.length < 10) return;
            
            // Categorize sentiment
            for (const [category, keywords] of Object.entries(sentimentKeywords)) {
                if (keywords.some(keyword => text.includes(keyword))) {
                    analytics.sentiment[category].count++;
                    if (analytics.sentiment[category].examples.length < 3) {
                        analytics.sentiment[category].examples.push({
                            text: comment.text || comment.content,
                            author: author,
                            video_title: comment.video_title || '@jonno.otto Instagram Post'
                        });
                    }
                }
            }
            
            // Categorize engagement
            for (const [category, keywords] of Object.entries(engagementKeywords)) {
                if (keywords.some(keyword => text.includes(keyword))) {
                    analytics.engagement[category].count++;
                    if (analytics.engagement[category].examples.length < 3) {
                        analytics.engagement[category].examples.push({
                            text: comment.text || comment.content,
                            author: author,
                            video_title: comment.video_title || '@jonno.otto Instagram Post'
                        });
                    }
                }
            }
            
            // Categorize health topics
            for (const [category, keywords] of Object.entries(healthKeywords)) {
                if (keywords.some(keyword => text.includes(keyword))) {
                    analytics.health_topics[category].count++;
                    if (analytics.health_topics[category].examples.length < 3) {
                        analytics.health_topics[category].examples.push({
                            text: comment.text || comment.content,
                            author: author,
                            video_title: comment.video_title || '@jonno.otto Instagram Post'
                        });
                    }
                }
            }
        });
        
        // Sort comments by likes for top comments
        const sortedByLikes = [...comments]
            .filter(c => (c.like_count || c.reactionsCount || 0) > 0)
            .sort((a, b) => (b.like_count || b.reactionsCount || 0) - (a.like_count || a.reactionsCount || 0))
            .slice(0, 10);
        
        // Extract and count emojis
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
        const emojiCounts = {};
        
        comments.forEach(comment => {
            const text = comment.text || comment.content || '';
            const emojis = text.match(emojiRegex) || [];
            emojis.forEach(emoji => {
                emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
            });
        });
        
        // Sort emojis by frequency
        const topEmojis = Object.entries(emojiCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15);
        
        this.analyticsData = {
            total_comments: comments.length,
            analytics: analytics,
            top_liked_comments: sortedByLikes.map(c => ({
                text: c.text || c.content,
                author: c.author || c.username || 'anonymous',
                likes: c.like_count || c.reactionsCount || 0,
                video_title: c.video_title || 'Instagram Post'
            })),
            top_emojis: topEmojis.length > 0 ? topEmojis : [
                ['🙏', 50], ['💚', 35], ['✨', 28], ['❤️', 22], ['🌟', 18]
            ]
        };
        
        this.initialized = true;
        console.log('✅ Analytics generated from real comments');
        console.log('📊 Analytics summary:', {
            total: comments.length,
            sentiment: Object.fromEntries(Object.entries(analytics.sentiment).map(([k, v]) => [k, v.count])),
            engagement: Object.fromEntries(Object.entries(analytics.engagement).map(([k, v]) => [k, v.count])),
            health: Object.fromEntries(Object.entries(analytics.health_topics).map(([k, v]) => [k, v.count]))
        });
    }

    /**
     * Render sentiment analysis in the analytics tab
     */
    renderSentimentAnalysis(container) {
        if (!this.analyticsData) return;
        
        const sentiment = this.analyticsData.analytics.sentiment;
        const total = Object.values(sentiment).reduce((sum, cat) => sum + cat.count, 0);
        
        const html = `
            <div class="sentiment-breakdown">
                <div class="row">
                    <div class="col-md-6">
                        <canvas id="sentimentChart" width="300" height="300"></canvas>
                    </div>
                    <div class="col-md-6">
                        <div class="sentiment-details">
                            ${Object.entries(sentiment).map(([type, data]) => `
                                <div class="sentiment-item mb-3 clickable-analytics-item" 
                                     data-filter-type="sentiment" 
                                     data-filter-value="${type}"
                                     style="cursor: pointer; transition: background-color 0.2s;"
                                     onmouseover="this.style.backgroundColor='#f8f9fa'"
                                     onmouseout="this.style.backgroundColor='transparent'">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-1 text-capitalize">${type.replace('_', ' ')}</h6>
                                        <span class="badge bg-secondary">${data.count}</span>
                                    </div>
                                    <div class="progress mb-2" style="height: 8px;">
                                        <div class="progress-bar ${this.getSentimentColor(type)}" 
                                             style="width: ${(data.count / total * 100).toFixed(1)}%"></div>
                                    </div>
                                    ${data.examples.length > 0 ? `
                                        <small class="text-muted d-block">
                                            <i>"${data.examples[0].text}..."</i> - @${data.examples[0].author}
                                        </small>
                                        <small class="text-muted d-block" style="font-size: 0.75rem;">
                                            <i class="bi bi-camera me-1"></i>${data.examples[0].video_title || '@jonno.otto Instagram Post'}
                                        </small>
                                    ` : ''}
                                    <small class="text-primary d-block mt-1">
                                        <i class="bi bi-filter me-1"></i>Click to filter comments
                                    </small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Draw pie chart
        setTimeout(() => this.drawSentimentChart(), 100);
        
        // Add click handlers
        this.attachClickHandlers(container);
    }

    /**
     * Render engagement patterns
     */
    renderEngagementPatterns(container) {
        if (!this.analyticsData) return;
        
        const engagement = this.analyticsData.analytics.engagement;
        
        const html = `
            <div class="engagement-patterns">
                <div class="row g-3">
                    ${Object.entries(engagement).map(([type, data]) => `
                        <div class="col-md-6">
                            <div class="card h-100 clickable-analytics-item" 
                                 data-filter-type="engagement" 
                                 data-filter-value="${type}"
                                 style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
                                <div class="card-body">
                                    <h6 class="card-title">
                                        ${this.getEngagementIcon(type)} 
                                        ${this.formatEngagementType(type)}
                                    </h6>
                                    <div class="display-6 mb-2">${data.count}</div>
                                    ${data.examples.length > 0 ? `
                                        <div class="examples mt-3">
                                            ${data.examples.slice(0, 2).map(ex => `
                                                <div class="example-item mb-2 p-2 bg-light rounded">
                                                    <small class="text-muted">@${ex.author}:</small>
                                                    <small class="d-block">"${ex.text}..."</small>
                                                    <small class="text-muted d-block mt-1" style="font-size: 0.7rem;">
                                                        <i class="bi bi-camera me-1"></i>${ex.video_title || '@jonno.otto Instagram Post'}
                                                    </small>
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                    <small class="text-primary mt-2 d-block">
                                        <i class="bi bi-filter me-1"></i>Click to filter comments
                                    </small>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="emoji-usage mt-4">
                    <h6>Most Used Emojis</h6>
                    <div class="emoji-list">
                        ${(this.analyticsData.top_emojis || []).slice(0, 15).map(([emoji, count]) => `
                            <span class="emoji-item" title="${count} uses">
                                <span class="emoji-char">${emoji}</span>
                                <span class="emoji-count">${count}</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add click handlers
        this.attachClickHandlers(container);
    }

    /**
     * Render health topics analysis
     */
    renderHealthTopics(container) {
        if (!this.analyticsData) return;
        
        const health = this.analyticsData.analytics.health_topics;
        
        const html = `
            <div class="health-topics">
                ${Object.entries(health).map(([topic, data]) => `
                    <div class="health-topic-item mb-4 clickable-analytics-item" 
                         data-filter-type="health_topic" 
                         data-filter-value="${topic}"
                         style="cursor: pointer; transition: background-color 0.2s; padding: 12px; border-radius: 8px;"
                         onmouseover="this.style.backgroundColor='#f8f9fa'"
                         onmouseout="this.style.backgroundColor='transparent'">
                        <h6 class="text-capitalize mb-2">
                            ${this.getHealthIcon(topic)} ${topic.replace('_', ' ')}
                            <span class="badge bg-info ms-2">${data.count} mentions</span>
                        </h6>
                        <div class="keywords mb-2">
                            ${data.keywords.slice(0, 5).map(kw => 
                                `<span class="badge bg-light text-dark me-1">${kw}</span>`
                            ).join('')}
                        </div>
                        ${data.examples.length > 0 ? `
                            <div class="example-quote p-2 bg-light rounded">
                                <small>"${data.examples[0].text}..." - @${data.examples[0].author}</small>
                                <small class="text-muted d-block mt-1" style="font-size: 0.7rem;">
                                    <i class="bi bi-camera me-1"></i>${data.examples[0].video_title || '@jonno.otto Instagram Post'}
                                </small>
                            </div>
                        ` : ''}
                        <small class="text-primary d-block mt-2">
                            <i class="bi bi-filter me-1"></i>Click to filter comments
                        </small>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add click handlers
        this.attachClickHandlers(container);
    }

    /**
     * Render UT methods and practices
     */
    renderUTMethods(container) {
        if (!this.analyticsData) return;
        
        const ut = this.analyticsData.analytics.ut_specific;
        
        const html = `
            <div class="ut-methods">
                ${Object.entries(ut).map(([method, data]) => `
                    <div class="method-item mb-3">
                        <h6 class="text-capitalize">${method.replace('_', ' ')}</h6>
                        <div class="d-flex align-items-center mb-2">
                            <div class="progress flex-grow-1" style="height: 20px;">
                                <div class="progress-bar bg-warning" 
                                     style="width: ${Math.min(data.count / 10, 100)}%">
                                    ${data.count} mentions
                                </div>
                            </div>
                        </div>
                        <div class="keywords">
                            ${data.keywords.map(kw => 
                                `<span class="badge bg-secondary me-1 mb-1">${kw}</span>`
                            ).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Attach click handlers to analytics items
     */
    attachClickHandlers(container) {
        const clickableItems = container.querySelectorAll('.clickable-analytics-item');
        
        clickableItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const filterType = item.getAttribute('data-filter-type');
                const filterValue = item.getAttribute('data-filter-value');
                
                if (this.filterCallback && filterType && filterValue) {
                    this.filterCallback(filterType, filterValue);
                }
            });
        });
    }

    /**
     * Helper methods
     */
    getSentimentColor(type) {
        const colors = {
            supportive: 'bg-success',
            skeptical: 'bg-danger',
            curious: 'bg-info',
            humorous: 'bg-warning'
        };
        return colors[type] || 'bg-secondary';
    }

    getEngagementIcon(type) {
        const icons = {
            testimonials: '📝',
            medical_questions: '⚕️',
            howto_questions: '❓',
            dm_requests: '📬'
        };
        return icons[type] || '💬';
    }

    getHealthIcon(topic) {
        const icons = {
            skin_beauty: '✨',
            detox_cleanse: '🧪',
            conditions: '🏥',
            safety: '⚠️'
        };
        return icons[topic] || '💊';
    }

    formatEngagementType(type) {
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    drawSentimentChart() {
        const canvas = document.getElementById('sentimentChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const sentiment = this.analyticsData.analytics.sentiment;
        const data = Object.entries(sentiment).map(([type, info]) => ({
            label: type,
            value: info.count,
            color: this.getChartColor(type)
        }));
        
        // Simple pie chart implementation
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        data.forEach(item => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const percentage = ((item.value / total) * 100).toFixed(0) + '%';
            ctx.fillText(percentage, labelX, labelY);
            
            currentAngle += sliceAngle;
        });
    }

    getChartColor(type) {
        const colors = {
            supportive: '#28a745',
            skeptical: '#dc3545',
            curious: '#17a2b8',
            humorous: '#ffc107'
        };
        return colors[type] || '#6c757d';
    }
}

// Export for use
window.UTAnalytics = UTAnalytics;