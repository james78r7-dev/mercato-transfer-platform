/**
 * 🔧 حل شامل لمشكلة التخزين المؤقت في OBS
 * يحل مشكلة عرض البيانات القديمة في OBS Studio
 */

class OBSCacheFix {
    constructor() {
        this.isInitialized = false;
        this.forceRefreshInterval = null;
        this.dataCheckInterval = null;
        this.lastDataHash = null;
        
        console.log('🔧 تهيئة نظام حل مشكلة التخزين المؤقت في OBS...');
    }

    /**
     * تهيئة النظام
     */
    async init() {
        if (this.isInitialized) {
            console.log('✅ نظام حل مشكلة OBS متهيأ بالفعل');
            return;
        }

        try {
            // 1. إعداد منع التخزين المؤقت للصفحة
            this.setupPageCachePrevention();
            
            // 2. إعداد منع التخزين المؤقت للصور
            this.setupImageCachePrevention();
            
            // 3. إعداد مراقبة البيانات المحسنة
            this.setupEnhancedDataMonitoring();
            
            // 4. إعداد التحديث الدوري الإجباري
            this.setupForceRefreshInterval();
            
            // 5. إعداد معالجة أحداث OBS
            this.setupOBSEventHandlers();

            this.isInitialized = true;
            console.log('✅ تم تهيئة نظام حل مشكلة التخزين المؤقت في OBS');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام حل مشكلة OBS:', error);
            throw error;
        }
    }

    /**
     * إعداد منع التخزين المؤقت للصفحة
     */
    setupPageCachePrevention() {
        // إضافة headers لمنع التخزين المؤقت
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Cache-Control';
        meta.content = 'no-cache, no-store, must-revalidate';
        document.head.appendChild(meta);

        const meta2 = document.createElement('meta');
        meta2.httpEquiv = 'Pragma';
        meta2.content = 'no-cache';
        document.head.appendChild(meta2);

        const meta3 = document.createElement('meta');
        meta3.httpEquiv = 'Expires';
        meta3.content = '0';
        document.head.appendChild(meta3);

        // إضافة معلمة فريدة لـ URL
        if (!window.location.search.includes('obs-cache-fix')) {
            const separator = window.location.search ? '&' : '?';
            const newUrl = window.location.href + separator + 'obs-cache-fix=' + Date.now();
            window.history.replaceState({}, '', newUrl);
        }

        console.log('🔧 تم إعداد منع التخزين المؤقت للصفحة');
    }

    /**
     * إعداد منع التخزين المؤقت للصور
     */
    setupImageCachePrevention() {
        // معالجة الصور الموجودة
        const existingImages = document.querySelectorAll('img');
        existingImages.forEach(img => this.addCacheBusterToImage(img));

        // مراقبة الصور الجديدة
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'IMG') {
                            this.addCacheBusterToImage(node);
                        } else {
                            // البحث عن صور داخل العنصر الجديد
                            const images = node.querySelectorAll && node.querySelectorAll('img');
                            if (images) {
                                images.forEach(img => this.addCacheBusterToImage(img));
                            }
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('🔧 تم إعداد منع التخزين المؤقت للصور');
    }

    /**
     * إضافة معلمة منع التخزين المؤقت للصورة
     */
    addCacheBusterToImage(img) {
        if (!img.src || img.src.includes('cache=') || img.src.includes('data:')) {
            return;
        }

        const separator = img.src.includes('?') ? '&' : '?';
        img.src = img.src + separator + 'cache=' + Date.now() + '&obs-fix=1';
    }

    /**
     * إعداد مراقبة البيانات المحسنة
     */
    setupEnhancedDataMonitoring() {
        // مراقبة تغييرات localStorage
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            originalSetItem.call(localStorage, key, value);
            
            if (key === 'transfermarktRealData' || key === 'transfermarktData') {
                console.log('🔄 تم اكتشاف تحديث في البيانات:', key);
                this.handleDataUpdate(key, value);
            }
        };

        // مراقبة دورية للبيانات
        this.dataCheckInterval = setInterval(() => {
            this.checkForDataChanges();
        }, 2000); // فحص كل ثانيتين

        console.log('🔧 تم إعداد مراقبة البيانات المحسنة');
    }

    /**
     * معالجة تحديث البيانات
     */
    handleDataUpdate(key, value) {
        try {
            const dataHash = this.generateDataHash(value);
            
            if (dataHash !== this.lastDataHash) {
                this.lastDataHash = dataHash;
                console.log('🔄 تم اكتشاف تغيير في البيانات، إعادة تحميل...');
                
                // تأخير قصير للتأكد من اكتمال الحفظ
                setTimeout(() => {
                    if (typeof loadData === 'function') {
                        loadData(true);
                    } else if (typeof window.loadData === 'function') {
                        window.loadData(true);
                    } else {
                        // إعادة تحميل الصفحة كحل أخير
                        window.location.reload(true);
                    }
                }, 1000);
            }
        } catch (error) {
            console.warn('⚠️ خطأ في معالجة تحديث البيانات:', error);
        }
    }

    /**
     * فحص تغييرات البيانات
     */
    checkForDataChanges() {
        try {
            const realData = localStorage.getItem('transfermarktRealData');
            const oldData = localStorage.getItem('transfermarktData');
            
            const currentData = realData || oldData;
            if (currentData) {
                const currentHash = this.generateDataHash(currentData);
                
                if (this.lastDataHash && currentHash !== this.lastDataHash) {
                    console.log('🔄 تم اكتشاف تغيير في البيانات عبر المراقبة الدورية');
                    this.handleDataUpdate('periodic-check', currentData);
                }
                
                this.lastDataHash = currentHash;
            }
        } catch (error) {
            console.warn('⚠️ خطأ في فحص تغييرات البيانات:', error);
        }
    }

    /**
     * إنشاء hash للبيانات
     */
    generateDataHash(data) {
        if (!data) return null;
        
        // إنشاء hash بسيط للبيانات
        let hash = 0;
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // تحويل إلى 32bit integer
        }
        
        return hash.toString();
    }

    /**
     * إعداد التحديث الدوري الإجباري
     */
    setupForceRefreshInterval() {
        // تحديث إجباري كل 5 دقائق
        this.forceRefreshInterval = setInterval(() => {
            console.log('🔄 تحديث إجباري دوري للبيانات...');
            
            if (typeof loadData === 'function') {
                loadData(true);
            } else if (typeof window.loadData === 'function') {
                window.loadData(true);
            }
        }, 5 * 60 * 1000); // كل 5 دقائق

        console.log('🔧 تم إعداد التحديث الدوري الإجباري');
    }

    /**
     * إعداد معالجة أحداث OBS
     */
    setupOBSEventHandlers() {
        // معالجة حدث إظهار/إخفاء المصدر في OBS
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 تم إظهار المصدر في OBS، تحديث البيانات...');
                setTimeout(() => {
                    if (typeof loadData === 'function') {
                        loadData(true);
                    }
                }, 500);
            }
        });

        // معالجة حدث تركيز النافذة
        window.addEventListener('focus', () => {
            console.log('🔄 تم تركيز النافذة، تحديث البيانات...');
            setTimeout(() => {
                if (typeof loadData === 'function') {
                    loadData(true);
                }
            }, 500);
        });

        console.log('🔧 تم إعداد معالجة أحداث OBS');
    }

    /**
     * تنظيف الموارد
     */
    cleanup() {
        if (this.forceRefreshInterval) {
            clearInterval(this.forceRefreshInterval);
            this.forceRefreshInterval = null;
        }

        if (this.dataCheckInterval) {
            clearInterval(this.dataCheckInterval);
            this.dataCheckInterval = null;
        }

        this.isInitialized = false;
        console.log('🧹 تم تنظيف موارد نظام حل مشكلة OBS');
    }

    /**
     * إجبار تحديث فوري
     */
    forceRefresh() {
        console.log('🔄 إجبار تحديث فوري للبيانات...');
        
        // مسح التخزين المؤقت
        this.clearBrowserCache();
        
        // تحديث البيانات
        if (typeof loadData === 'function') {
            loadData(true);
        } else if (typeof window.loadData === 'function') {
            window.loadData(true);
        } else {
            window.location.reload(true);
        }
    }

    /**
     * مسح التخزين المؤقت للمتصفح
     */
    async clearBrowserCache() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                console.log('🧹 تم مسح التخزين المؤقت للمتصفح');
            }
        } catch (error) {
            console.warn('⚠️ لا يمكن مسح التخزين المؤقت:', error);
        }
    }
}

// إنشاء مثيل عام
window.obsCacheFix = new OBSCacheFix();

// تهيئة تلقائية عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.obsCacheFix.init().catch(console.error);
    });
} else {
    window.obsCacheFix.init().catch(console.error);
}

console.log('✅ تم تحميل نظام حل مشكلة التخزين المؤقت في OBS');
