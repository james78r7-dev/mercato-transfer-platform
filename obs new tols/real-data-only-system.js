/**
 * 🎯 نظام البيانات الحقيقية فقط
 * يضمن استخدام البيانات الحقيقية من transfermarkt-real-data.html حصرياً
 */

class RealDataOnlySystem {
    constructor() {
        this.isInitialized = false;
        this.monitoringInterval = null;
        this.lastDataCheck = null;
        
        console.log('🎯 تهيئة نظام البيانات الحقيقية فقط...');
    }

    /**
     * تهيئة النظام
     */
    async init() {
        if (this.isInitialized) {
            console.log('✅ نظام البيانات الحقيقية متهيأ بالفعل');
            return;
        }

        try {
            console.log('🚀 بدء تهيئة نظام البيانات الحقيقية...');

            // 1. فحص وجود البيانات الحقيقية
            await this.checkRealDataAvailability();

            // 2. إعداد مراقبة البيانات الحقيقية
            this.setupRealDataMonitoring();

            // 3. إعداد معالجة التحديثات
            this.setupUpdateHandlers();

            this.isInitialized = true;
            console.log('✅ تم تهيئة نظام البيانات الحقيقية بنجاح');

        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام البيانات الحقيقية:', error);
            throw error;
        }
    }

    /**
     * فحص توفر البيانات الحقيقية
     */
    async checkRealDataAvailability() {
        console.log('🔍 فحص توفر البيانات الحقيقية...');

        const realData = localStorage.getItem('transfermarktRealData');
        const oldData = localStorage.getItem('transfermarktData');

        let hasRealData = false;
        let dataCount = 0;

        // فحص transfermarktRealData
        if (realData) {
            try {
                const data = JSON.parse(realData);
                if (data.clubs && Array.isArray(data.clubs) && data.clubs.length > 0) {
                    hasRealData = true;
                    dataCount = data.clubs.length;
                    console.log(`✅ تم العثور على ${dataCount} نادي في transfermarktRealData`);
                }
            } catch (e) {
                console.warn('⚠️ بيانات transfermarktRealData تالفة');
            }
        }

        // فحص transfermarktData كاحتياطي
        if (!hasRealData && oldData) {
            try {
                const data = JSON.parse(oldData);
                if (Array.isArray(data) && data.length > 0) {
                    hasRealData = true;
                    dataCount = data.length;
                    console.log(`✅ تم العثور على ${dataCount} نادي في transfermarktData`);
                }
            } catch (e) {
                console.warn('⚠️ بيانات transfermarktData تالفة');
            }
        }

        if (!hasRealData) {
            console.error('❌ لا توجد بيانات حقيقية متاحة!');
            this.showNoDataError();
            throw new Error('لا توجد بيانات حقيقية متاحة');
        }

        console.log(`✅ تم التأكد من وجود ${dataCount} نادي من البيانات الحقيقية`);
        return { hasRealData, dataCount };
    }

    /**
     * إعداد مراقبة البيانات الحقيقية
     */
    setupRealDataMonitoring() {
        console.log('🔍 إعداد مراقبة البيانات الحقيقية...');

        // مراقبة دورية كل 5 ثوانٍ
        this.monitoringInterval = setInterval(() => {
            this.checkForRealDataUpdates();
        }, 5000);

        // مراقبة تغييرات localStorage
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            originalSetItem.call(localStorage, key, value);
            
            if (key === 'transfermarktRealData' || key === 'transfermarktData') {
                console.log('🔄 تم اكتشاف تحديث في البيانات الحقيقية:', key);
                this.handleRealDataUpdate(key, value);
            }
        };

        console.log('✅ تم إعداد مراقبة البيانات الحقيقية');
    }

    /**
     * إعداد معالجة التحديثات
     */
    setupUpdateHandlers() {
        console.log('🔄 إعداد معالجة التحديثات...');

        // معالجة أحداث النافذة
        window.addEventListener('focus', () => {
            console.log('🔄 تم تركيز النافذة، فحص البيانات الحقيقية...');
            setTimeout(() => {
                this.checkForRealDataUpdates();
            }, 1000);
        });

        // معالجة أحداث الرؤية
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔄 تم إظهار الصفحة، فحص البيانات الحقيقية...');
                setTimeout(() => {
                    this.checkForRealDataUpdates();
                }, 1000);
            }
        });

        console.log('✅ تم إعداد معالجة التحديثات');
    }

    /**
     * فحص تحديثات البيانات الحقيقية
     */
    checkForRealDataUpdates() {
        try {
            const realData = localStorage.getItem('transfermarktRealData');
            const oldData = localStorage.getItem('transfermarktData');

            // فحص البيانات الحالية
            let currentDataHash = null;
            if (realData) {
                currentDataHash = this.generateDataHash(realData);
            } else if (oldData) {
                currentDataHash = this.generateDataHash(oldData);
            }

            // مقارنة مع آخر فحص
            if (currentDataHash && currentDataHash !== this.lastDataCheck) {
                console.log('🔄 تم اكتشاف تحديث في البيانات الحقيقية');
                this.lastDataCheck = currentDataHash;
                this.notifyDataUpdate();
            }

        } catch (error) {
            console.warn('⚠️ خطأ في فحص تحديثات البيانات:', error);
        }
    }

    /**
     * معالجة تحديث البيانات الحقيقية
     */
    handleRealDataUpdate(key, value) {
        try {
            console.log(`🔄 معالجة تحديث البيانات: ${key}`);

            // التأكد من أن البيانات حقيقية وليست وهمية
            let data;
            if (key === 'transfermarktRealData') {
                data = JSON.parse(value);
                if (!data.clubs || !Array.isArray(data.clubs) || data.clubs.length === 0) {
                    console.warn('⚠️ البيانات الجديدة فارغة أو تالفة');
                    return;
                }
            } else if (key === 'transfermarktData') {
                data = JSON.parse(value);
                if (!Array.isArray(data) || data.length === 0) {
                    console.warn('⚠️ البيانات الجديدة فارغة أو تالفة');
                    return;
                }
            }

            // إشعار النظام بالتحديث
            setTimeout(() => {
                this.notifyDataUpdate();
            }, 1000);

        } catch (error) {
            console.warn('⚠️ خطأ في معالجة تحديث البيانات:', error);
        }
    }

    /**
     * إشعار النظام بتحديث البيانات
     */
    notifyDataUpdate() {
        console.log('📢 إشعار النظام بتحديث البيانات الحقيقية...');

        // إعادة تحميل البيانات في النظام الرئيسي
        if (typeof loadData === 'function') {
            loadData(true);
        } else if (typeof window.loadData === 'function') {
            window.loadData(true);
        }

        // إرسال حدث مخصص
        const event = new CustomEvent('realDataUpdate', {
            detail: {
                timestamp: new Date().toISOString(),
                source: 'real-data-only-system'
            }
        });
        window.dispatchEvent(event);

        // إرسال عبر BroadcastChannel
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('transfermarkt-updates');
                channel.postMessage({
                    type: 'real-data-update',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.warn('⚠️ لا يمكن إرسال BroadcastChannel:', error);
        }
    }

    /**
     * الحصول على البيانات الحقيقية
     */
    getRealData() {
        // محاولة تحميل من transfermarktRealData أولاً
        const realData = localStorage.getItem('transfermarktRealData');
        if (realData) {
            try {
                const data = JSON.parse(realData);
                if (data.clubs && Array.isArray(data.clubs) && data.clubs.length > 0) {
                    return data.clubs;
                }
            } catch (e) {
                console.warn('⚠️ خطأ في تحليل transfermarktRealData');
            }
        }

        // محاولة تحميل من transfermarktData
        const oldData = localStorage.getItem('transfermarktData');
        if (oldData) {
            try {
                const data = JSON.parse(oldData);
                if (Array.isArray(data) && data.length > 0) {
                    return data;
                }
            } catch (e) {
                console.warn('⚠️ خطأ في تحليل transfermarktData');
            }
        }

        return null;
    }

    /**
     * فحص حالة البيانات الحقيقية
     */
    getDataStatus() {
        const realData = localStorage.getItem('transfermarktRealData');
        const oldData = localStorage.getItem('transfermarktData');
        const lastUpdate = localStorage.getItem('transfermarktLastUpdate');

        let realDataCount = 0;
        let oldDataCount = 0;
        let lastUpdateTime = null;

        if (realData) {
            try {
                const data = JSON.parse(realData);
                realDataCount = data.clubs ? data.clubs.length : 0;
            } catch (e) {
                realDataCount = -1; // تالف
            }
        }

        if (oldData) {
            try {
                const data = JSON.parse(oldData);
                oldDataCount = Array.isArray(data) ? data.length : 0;
            } catch (e) {
                oldDataCount = -1; // تالف
            }
        }

        if (lastUpdate) {
            try {
                lastUpdateTime = new Date(lastUpdate);
            } catch (e) {
                lastUpdateTime = null;
            }
        }

        return {
            realDataCount,
            oldDataCount,
            lastUpdateTime,
            hasValidData: realDataCount > 0 || oldDataCount > 0,
            isInitialized: this.isInitialized
        };
    }

    /**
     * عرض رسالة خطأ عدم وجود بيانات
     */
    showNoDataError() {
        const errorMessage = `
❌ لا توجد بيانات حقيقية!

هذه الصفحة تعرض البيانات الحقيقية فقط من transfermarkt-real-data.html

يرجى اتباع الخطوات التالية:

1. افتح صفحة استخراج البيانات:
   http://localhost:8201/obs-new-tols/transfermarkt-real-data.html

2. اضغط "تحديث البيانات الآن"

3. انتظر حتى اكتمال الاستخراج

4. عد إلى هذه الصفحة وأعد تحميلها

ملاحظة: لن تظهر أي بيانات وهمية أو افتراضية
        `;

        console.error(errorMessage);

        // عرض الرسالة في الواجهة إذا كانت متاحة
        if (typeof showError === 'function') {
            showError(errorMessage);
        }
    }

    /**
     * إنشاء hash للبيانات
     */
    generateDataHash(data) {
        if (!data) return null;
        
        let hash = 0;
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString();
    }

    /**
     * تنظيف الموارد
     */
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isInitialized = false;
        console.log('🧹 تم تنظيف موارد نظام البيانات الحقيقية');
    }

    /**
     * إجبار تحديث البيانات
     */
    forceUpdate() {
        console.log('🔄 إجبار تحديث البيانات الحقيقية...');
        this.checkForRealDataUpdates();
        this.notifyDataUpdate();
    }
}

// إنشاء مثيل عام
window.realDataOnlySystem = new RealDataOnlySystem();

// تهيئة تلقائية عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.realDataOnlySystem.init().catch(console.error);
    });
} else {
    window.realDataOnlySystem.init().catch(console.error);
}

console.log('✅ تم تحميل نظام البيانات الحقيقية فقط');
