/**
 * Enhanced Scroll Engine - مكتبة التمرير المحسن
 * نظام شامل للتمرير التلقائي المخصص في OBS وأدوات البث
 * 
 * @version 1.0.0
 * @author Enhanced Browser Source Team
 * @license MIT
 */

(function(window) {
    'use strict';
    
    /**
     * Enhanced Scroll Engine - الفئة الرئيسية
     */
    class EnhancedScrollEngine {
        constructor(options = {}) {
            // الإعدادات الافتراضية
            this.defaults = {
                container: '#support-bar',
                scrollDownDuration: 15000,
                scrollUpDuration: 15000,
                transitionSpeed: 3000,
                scrollType: 'smooth',
                playMode: 'continuous',
                autoStart: false,
                enableControls: true,
                enableIndicators: true,
                enableProgressBar: true,
                onScrollStart: null,
                onScrollEnd: null,
                onDirectionChange: null,
                onComplete: null
            };
            
            // دمج الإعدادات
            this.settings = Object.assign({}, this.defaults, options);
            
            // متغيرات الحالة
            this.isRunning = false;
            this.currentDirection = 0; // 0 = stopped, 1 = down, -1 = up
            this.timeRemaining = 0;
            this.scrollTimer = null;
            this.progressTimer = null;
            this.container = null;
            
            // تهيئة المحرك
            this.init();
        }
        
        /**
         * تهيئة المحرك
         */
        init() {
            // العثور على الحاوية
            this.container = typeof this.settings.container === 'string' 
                ? document.querySelector(this.settings.container)
                : this.settings.container;
                
            if (!this.container) {
                console.error('Enhanced Scroll Engine: Container not found');
                return;
            }
            
            // تطبيق تحسينات الأداء
            this.optimizeContainer();
            
            // إعداد مراقبي الأحداث
            this.setupEventListeners();
            
            // بدء تلقائي إذا كان مطلوباً
            if (this.settings.autoStart) {
                setTimeout(() => this.start(), 1000);
            }
            
            console.log('Enhanced Scroll Engine: Initialized successfully');
        }
        
        /**
         * تحسين الحاوية للأداء الأمثل
         */
        optimizeContainer() {
            const styles = {
                'scroll-behavior': this.settings.scrollType,
                'will-change': 'scroll-position',
                'transform': 'translateZ(0)',
                'backface-visibility': 'hidden'
            };
            
            Object.assign(this.container.style, styles);
        }
        
        /**
         * إعداد مراقبي الأحداث
         */
        setupEventListeners() {
            // مراقبة التمرير اليدوي
            this.container.addEventListener('scroll', () => {
                this.updateIndicators();
            }, { passive: true });
            
            // اختصارات لوحة المفاتيح
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey) {
                    switch(e.key) {
                        case ' ':
                            e.preventDefault();
                            this.toggle();
                            break;
                        case 'r':
                            e.preventDefault();
                            this.reset();
                            break;
                    }
                }
            });
        }
        
        /**
         * بدء التمرير
         */
        start() {
            if (this.isRunning) return this;
            
            this.isRunning = true;
            this.currentDirection = 1; // بدء بالتمرير للأسفل
            
            // استدعاء callback
            if (this.settings.onScrollStart) {
                this.settings.onScrollStart(this);
            }
            
            this.performScroll();
            return this;
        }
        
        /**
         * إيقاف التمرير
         */
        stop() {
            this.isRunning = false;
            this.currentDirection = 0;
            
            this.clearTimers();
            
            // استدعاء callback
            if (this.settings.onScrollEnd) {
                this.settings.onScrollEnd(this);
            }
            
            return this;
        }
        
        /**
         * تبديل حالة التمرير
         */
        toggle() {
            return this.isRunning ? this.stop() : this.start();
        }
        
        /**
         * إعادة تعيين التمرير
         */
        reset() {
            this.stop();
            
            this.container.scrollTo({
                top: 0,
                behavior: this.settings.scrollType
            });
            
            return this;
        }
        
        /**
         * تنفيذ التمرير
         */
        performScroll() {
            if (!this.isRunning) return;
            
            const maxScroll = this.container.scrollHeight - this.container.clientHeight;
            let targetScroll, duration;
            
            if (this.currentDirection === 1) {
                // التمرير للأسفل
                targetScroll = maxScroll;
                duration = this.settings.scrollDownDuration;
            } else {
                // التمرير للأعلى
                targetScroll = 0;
                duration = this.settings.scrollUpDuration;
            }
            
            // تنفيذ التمرير السلس
            this.smoothScrollTo(targetScroll, this.settings.transitionSpeed);
            
            // بدء شريط التقدم
            this.startProgressTracking(duration);
            
            // جدولة التمرير التالي
            this.scrollTimer = setTimeout(() => {
                if (this.settings.playMode === 'continuous') {
                    this.changeDirection();
                    this.performScroll();
                } else if (this.settings.playMode === 'once') {
                    if (this.currentDirection === -1) {
                        this.complete();
                    } else {
                        this.changeDirection();
                        this.performScroll();
                    }
                }
            }, duration);
        }
        
        /**
         * تغيير اتجاه التمرير
         */
        changeDirection() {
            this.currentDirection *= -1;
            
            // استدعاء callback
            if (this.settings.onDirectionChange) {
                this.settings.onDirectionChange(this.currentDirection, this);
            }
        }
        
        /**
         * إكمال دورة التمرير
         */
        complete() {
            this.stop();
            
            // استدعاء callback
            if (this.settings.onComplete) {
                this.settings.onComplete(this);
            }
        }
        
        /**
         * تمرير سلس مخصص
         */
        smoothScrollTo(targetPosition, duration) {
            const startPosition = this.container.scrollTop;
            const distance = targetPosition - startPosition;
            const startTime = performance.now();
            
            const animation = (currentTime) => {
                const timeElapsed = currentTime - startTime;
                const progress = Math.min(timeElapsed / duration, 1);
                
                // منحنى تسارع سلس (easeInOutCubic)
                const easeInOutCubic = progress < 0.5 
                    ? 4 * progress * progress * progress 
                    : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
                
                this.container.scrollTop = startPosition + distance * easeInOutCubic;
                
                // تحديث المؤشرات
                this.updateIndicators();
                
                if (progress < 1) {
                    requestAnimationFrame(animation);
                }
            };
            
            requestAnimationFrame(animation);
        }
        
        /**
         * تتبع التقدم
         */
        startProgressTracking(duration) {
            const startTime = Date.now();
            
            this.clearProgressTimer();
            
            this.progressTimer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.timeRemaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
                
                // تحديث شريط التقدم
                this.updateProgressBar(progress * 100);
                
                if (progress >= 1) {
                    this.clearProgressTimer();
                }
            }, 100);
        }
        
        /**
         * تحديث المؤشرات البصرية
         */
        updateIndicators() {
            if (!this.settings.enableIndicators) return;
            
            // تحديث مؤشر التمرير
            const scrollProgress = document.getElementById('scrollProgress');
            if (scrollProgress) {
                const maxScroll = this.container.scrollHeight - this.container.clientHeight;
                const currentScroll = this.container.scrollTop;
                const progress = maxScroll > 0 ? (currentScroll / maxScroll) * 100 : 0;
                
                scrollProgress.style.height = progress + '%';
            }
        }
        
        /**
         * تحديث شريط التقدم
         */
        updateProgressBar(progress) {
            if (!this.settings.enableProgressBar) return;
            
            const progressFill = document.getElementById('progressFill');
            if (progressFill) {
                progressFill.style.width = progress + '%';
            }
        }
        
        /**
         * مسح المؤقتات
         */
        clearTimers() {
            if (this.scrollTimer) {
                clearTimeout(this.scrollTimer);
                this.scrollTimer = null;
            }
            
            this.clearProgressTimer();
        }
        
        /**
         * مسح مؤقت التقدم
         */
        clearProgressTimer() {
            if (this.progressTimer) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }
        }
        
        /**
         * تحديث الإعدادات
         */
        updateSettings(newSettings) {
            this.settings = Object.assign(this.settings, newSettings);
            this.optimizeContainer();
            return this;
        }
        
        /**
         * الحصول على الحالة الحالية
         */
        getStatus() {
            return {
                isRunning: this.isRunning,
                currentDirection: this.currentDirection,
                timeRemaining: this.timeRemaining,
                scrollPosition: this.container.scrollTop,
                maxScroll: this.container.scrollHeight - this.container.clientHeight
            };
        }
        
        /**
         * تدمير المحرك
         */
        destroy() {
            this.stop();
            this.clearTimers();
            
            // إزالة مراقبي الأحداث
            // (يمكن إضافة المزيد حسب الحاجة)
            
            console.log('Enhanced Scroll Engine: Destroyed');
        }
    }
    
    /**
     * وظائف مساعدة عامة
     */
    const ScrollUtils = {
        /**
         * إنشاء عنصر تحكم
         */
        createControl(type, options = {}) {
            const element = document.createElement(type);
            Object.assign(element, options);
            return element;
        },
        
        /**
         * تطبيق أنماط CSS
         */
        applyStyles(element, styles) {
            Object.assign(element.style, styles);
        },
        
        /**
         * تحسين الأداء للعنصر
         */
        optimizeElement(element) {
            this.applyStyles(element, {
                'will-change': 'transform',
                'transform': 'translateZ(0)',
                'backface-visibility': 'hidden'
            });
        },
        
        /**
         * إنشاء مؤشر تمرير
         */
        createScrollIndicator(container) {
            const indicator = this.createControl('div', {
                className: 'scroll-indicator'
            });
            
            const progress = this.createControl('div', {
                className: 'scroll-progress',
                id: 'scrollProgress'
            });
            
            indicator.appendChild(progress);
            container.appendChild(indicator);
            
            return { indicator, progress };
        },
        
        /**
         * إنشاء شريط تقدم
         */
        createProgressBar(container) {
            const progressBar = this.createControl('div', {
                className: 'progress-bar'
            });
            
            const progressFill = this.createControl('div', {
                className: 'progress-fill',
                id: 'progressFill'
            });
            
            progressBar.appendChild(progressFill);
            container.appendChild(progressBar);
            
            return { progressBar, progressFill };
        }
    };
    
    /**
     * إعدادات مسبقة للاستخدام السريع
     */
    const ScrollPresets = {
        // إعداد سريع للبث المباشر
        streaming: {
            scrollDownDuration: 15000,
            scrollUpDuration: 15000,
            transitionSpeed: 3000,
            scrollType: 'smooth',
            playMode: 'continuous',
            autoStart: true
        },
        
        // إعداد للعروض التقديمية
        presentation: {
            scrollDownDuration: 10000,
            scrollUpDuration: 5000,
            transitionSpeed: 2000,
            scrollType: 'smooth',
            playMode: 'once',
            autoStart: false
        },
        
        // إعداد سريع
        fast: {
            scrollDownDuration: 8000,
            scrollUpDuration: 8000,
            transitionSpeed: 1500,
            scrollType: 'smooth',
            playMode: 'continuous',
            autoStart: true
        },
        
        // إعداد بطيء
        slow: {
            scrollDownDuration: 25000,
            scrollUpDuration: 25000,
            transitionSpeed: 5000,
            scrollType: 'smooth',
            playMode: 'continuous',
            autoStart: true
        }
    };
    
    // تصدير إلى النطاق العام
    window.EnhancedScrollEngine = EnhancedScrollEngine;
    window.ScrollUtils = ScrollUtils;
    window.ScrollPresets = ScrollPresets;
    
    // إشارة جاهزية المكتبة
    window.dispatchEvent(new CustomEvent('enhancedScrollEngineReady', {
        detail: { 
            version: '1.0.0',
            features: ['smooth-scrolling', 'custom-timing', 'visual-indicators', 'presets']
        }
    }));
    
    console.log('Enhanced Scroll Engine Library: Loaded successfully');
    
})(window);
