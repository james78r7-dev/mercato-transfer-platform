// Enhanced Browser Source - Auto Scroll Fix
// حل مشكلة التمرير التلقائي في OBS Browser Source

(function() {
    'use strict';
    
    console.log('[Enhanced Browser Source] Loading auto-scroll fixes...');
    
    // إصلاح setTimeout و setInterval للعمل في OBS
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalClearTimeout = window.clearTimeout;
    const originalClearInterval = window.clearInterval;
    
    // تتبع الـ timers النشطة
    const activeTimers = new Map();
    const activeIntervals = new Map();
    let timerIdCounter = 1;
    
    // إصلاح setTimeout
    window.setTimeout = function(callback, delay, ...args) {
        const timerId = timerIdCounter++;
        
        const wrappedCallback = function() {
            activeTimers.delete(timerId);
            try {
                if (typeof callback === 'function') {
                    callback.apply(this, args);
                } else if (typeof callback === 'string') {
                    eval(callback);
                }
            } catch (e) {
                console.error('[Enhanced Browser Source] Timer error:', e);
            }
        };
        
        const realTimerId = originalSetTimeout.call(window, wrappedCallback, delay);
        activeTimers.set(timerId, realTimerId);
        
        return timerId;
    };
    
    // إصلاح setInterval
    window.setInterval = function(callback, delay, ...args) {
        const intervalId = timerIdCounter++;
        
        const wrappedCallback = function() {
            try {
                if (typeof callback === 'function') {
                    callback.apply(this, args);
                } else if (typeof callback === 'string') {
                    eval(callback);
                }
            } catch (e) {
                console.error('[Enhanced Browser Source] Interval error:', e);
            }
        };
        
        const realIntervalId = originalSetInterval.call(window, wrappedCallback, delay);
        activeIntervals.set(intervalId, realIntervalId);
        
        return intervalId;
    };
    
    // إصلاح clearTimeout
    window.clearTimeout = function(timerId) {
        const realTimerId = activeTimers.get(timerId);
        if (realTimerId !== undefined) {
            activeTimers.delete(timerId);
            return originalClearTimeout.call(window, realTimerId);
        }
        return originalClearTimeout.call(window, timerId);
    };
    
    // إصلاح clearInterval
    window.clearInterval = function(intervalId) {
        const realIntervalId = activeIntervals.get(intervalId);
        if (realIntervalId !== undefined) {
            activeIntervals.delete(intervalId);
            return originalClearInterval.call(window, intervalId);
        }
        return originalClearInterval.call(window, intervalId);
    };
    
    // تحسين خاص للتمرير التلقائي
    function enhanceAutoScroll() {
        // البحث عن العناصر القابلة للتمرير
        const selectors = [
            '#support-bar',
            '[data-auto-scroll]',
            '.auto-scroll',
            '.scroll-container',
            '.scrollable'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element.dataset.enhanced) return; // تجنب التكرار
                element.dataset.enhanced = 'true';
                
                console.log('[Enhanced Browser Source] Enhancing auto-scroll for:', selector);
                
                // إضافة CSS للتمرير السلس
                element.style.scrollBehavior = 'smooth';
                element.style.overflowY = element.style.overflowY || 'auto';
                
                // تحسين الأداء
                element.style.willChange = 'scroll-position';
                element.style.transform = 'translateZ(0)';
                
                // مراقبة التمرير
                let isScrolling = false;
                element.addEventListener('scroll', function() {
                    if (!isScrolling) {
                        isScrolling = true;
                        element.style.pointerEvents = 'none';
                        
                        setTimeout(() => {
                            element.style.pointerEvents = '';
                            isScrolling = false;
                        }, 150);
                    }
                }, { passive: true });
            });
        });
    }
    
    // تحسين الأداء العام
    function optimizePerformance() {
        // تحسين العرض
        document.documentElement.style.transform = 'translateZ(0)';
        document.documentElement.style.backfaceVisibility = 'hidden';
        
        // تحسين الذاكرة
        if (window.gc && typeof window.gc === 'function') {
            setInterval(() => {
                try {
                    window.gc();
                } catch (e) {
                    // تجاهل الأخطاء
                }
            }, 30000);
        }
        
        // منع تجميد الصفحة
        let lastActivity = Date.now();
        const keepAlive = () => {
            lastActivity = Date.now();
        };
        
        ['scroll', 'mousemove', 'keypress', 'click', 'touchstart'].forEach(event => {
            document.addEventListener(event, keepAlive, { passive: true });
        });
        
        // إرسال إشارة حياة كل 10 ثوان
        setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > 5000) {
                // محاكاة نشاط للحفاظ على الصفحة نشطة
                document.dispatchEvent(new Event('obsKeepAlive'));
            }
        }, 10000);
    }
    
    // تشغيل التحسينات عند تحميل الصفحة
    function initialize() {
        enhanceAutoScroll();
        optimizePerformance();
        
        // إعادة تشغيل التحسينات عند تغيير DOM
        const observer = new MutationObserver(function(mutations) {
            let shouldRerun = false;
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldRerun = true;
                }
            });
            
            if (shouldRerun) {
                setTimeout(enhanceAutoScroll, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('[Enhanced Browser Source] Auto-scroll fixes loaded successfully!');
    }
    
    // تشغيل التحسينات
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // إشارة للتطبيقات الخارجية
    window.obsEnhancedScrolling = true;
    window.obsScrollFixLoaded = true;
    
    // إرسال إشعار مخصص
    document.dispatchEvent(new CustomEvent('obsEnhancedReady', {
        detail: { version: '1.0.0', features: ['auto-scroll-fix', 'timer-fix', 'performance-optimization'] }
    }));
    
})();
