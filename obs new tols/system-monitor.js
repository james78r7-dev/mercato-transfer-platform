/**
 * نظام مراقبة وتشخيص شامل لنظام Transfermarkt
 * يراقب حالة البيانات والأخطاء ويقدم تقارير مفصلة
 */

class TransfermarktSystemMonitor {
    constructor() {
        this.logs = [];
        this.errors = [];
        this.warnings = [];
        this.dataHistory = [];
        this.performanceMetrics = {};
        this.isMonitoring = false;
        
        this.init();
    }
    
    init() {
        console.log('🔍 تم تهيئة نظام المراقبة والتشخيص');
        this.setupErrorHandling();
        this.setupPerformanceMonitoring();
        this.startMonitoring();
    }
    
    // إعداد معالجة الأخطاء
    setupErrorHandling() {
        // معالجة الأخطاء العامة
        window.addEventListener('error', (event) => {
            this.logError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        // معالجة الأخطاء غير المعالجة في Promise
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
    }
    
    // إعداد مراقبة الأداء
    setupPerformanceMonitoring() {
        if ('performance' in window) {
            this.performanceMetrics.navigationStart = performance.timing.navigationStart;
            this.performanceMetrics.loadStart = performance.timing.loadEventStart;
        }
    }
    
    // بدء المراقبة
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // مراقبة localStorage
        this.monitorLocalStorage();
        
        // مراقبة الشبكة
        this.monitorNetworkRequests();
        
        // مراقبة دورية
        setInterval(() => {
            this.performPeriodicCheck();
        }, 30000); // كل 30 ثانية
        
        console.log('✅ تم بدء المراقبة النشطة');
    }
    
    // مراقبة localStorage
    monitorLocalStorage() {
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;
        const originalRemoveItem = localStorage.removeItem;
        
        localStorage.setItem = (key, value) => {
            if (key.includes('transfermarkt')) {
                this.log('localStorage Set', { key, size: value.length });
            }
            return originalSetItem.call(localStorage, key, value);
        };
        
        localStorage.getItem = (key) => {
            const result = originalGetItem.call(localStorage, key);
            if (key.includes('transfermarkt')) {
                this.log('localStorage Get', { key, found: !!result });
            }
            return result;
        };
        
        localStorage.removeItem = (key) => {
            if (key.includes('transfermarkt')) {
                this.log('localStorage Remove', { key });
            }
            return originalRemoveItem.call(localStorage, key);
        };
    }
    
    // مراقبة طلبات الشبكة
    monitorNetworkRequests() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = args[0];
            
            try {
                const response = await originalFetch.apply(window, args);
                const endTime = Date.now();
                
                this.log('Network Request', {
                    url,
                    status: response.status,
                    duration: endTime - startTime,
                    success: response.ok
                });
                
                return response;
            } catch (error) {
                const endTime = Date.now();
                
                this.logError('Network Request Failed', {
                    url,
                    duration: endTime - startTime,
                    error: error.message
                });
                
                throw error;
            }
        };
    }
    
    // فحص دوري
    performPeriodicCheck() {
        const status = this.getSystemStatus();
        
        if (status.criticalIssues.length > 0) {
            this.logWarning('Critical Issues Detected', status.criticalIssues);
        }
        
        // تنظيف السجلات القديمة
        this.cleanupOldLogs();
    }
    
    // تسجيل حدث عادي
    log(type, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            data,
            level: 'info'
        };
        
        this.logs.push(logEntry);
        console.log(`📊 [${type}]`, data);
    }
    
    // تسجيل تحذير
    logWarning(type, data) {
        const warningEntry = {
            timestamp: new Date().toISOString(),
            type,
            data,
            level: 'warning'
        };
        
        this.warnings.push(warningEntry);
        this.logs.push(warningEntry);
        console.warn(`⚠️ [${type}]`, data);
    }
    
    // تسجيل خطأ
    logError(type, data) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            type,
            data,
            level: 'error'
        };
        
        this.errors.push(errorEntry);
        this.logs.push(errorEntry);
        console.error(`❌ [${type}]`, data);
    }
    
    // الحصول على حالة النظام
    getSystemStatus() {
        const status = {
            timestamp: new Date().toISOString(),
            healthy: true,
            criticalIssues: [],
            warnings: [],
            info: {}
        };
        
        // فحص localStorage
        const transfermarktData = localStorage.getItem('transfermarktData');
        if (!transfermarktData) {
            status.criticalIssues.push('لا توجد بيانات في localStorage');
            status.healthy = false;
        } else {
            try {
                const data = JSON.parse(transfermarktData);
                if (!Array.isArray(data) || data.length === 0) {
                    status.criticalIssues.push('البيانات في localStorage فارغة أو تالفة');
                    status.healthy = false;
                } else {
                    status.info.dataCount = data.length;
                }
            } catch (e) {
                status.criticalIssues.push('البيانات في localStorage تالفة');
                status.healthy = false;
            }
        }
        
        // فحص آخر تحديث
        const lastUpdate = localStorage.getItem('transfermarktLastUpdate');
        if (lastUpdate) {
            const updateTime = new Date(lastUpdate);
            const now = new Date();
            const hoursSinceUpdate = (now - updateTime) / (1000 * 60 * 60);
            
            status.info.lastUpdateHours = hoursSinceUpdate.toFixed(1);
            
            if (hoursSinceUpdate > 24) {
                status.warnings.push('البيانات قديمة (أكثر من 24 ساعة)');
            }
        } else {
            status.warnings.push('لا يوجد طابع زمني للتحديث');
        }
        
        // فحص الأخطاء الحديثة
        const recentErrors = this.errors.filter(error => {
            const errorTime = new Date(error.timestamp);
            const now = new Date();
            return (now - errorTime) < (1000 * 60 * 10); // آخر 10 دقائق
        });
        
        if (recentErrors.length > 0) {
            status.warnings.push(`${recentErrors.length} أخطاء في آخر 10 دقائق`);
        }
        
        status.info.totalLogs = this.logs.length;
        status.info.totalErrors = this.errors.length;
        status.info.totalWarnings = this.warnings.length;
        
        return status;
    }
    
    // تنظيف السجلات القديمة
    cleanupOldLogs() {
        const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
        const now = Date.now();
        
        this.logs = this.logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return (now - logTime) < maxAge;
        });
        
        this.errors = this.errors.filter(error => {
            const errorTime = new Date(error.timestamp).getTime();
            return (now - errorTime) < maxAge;
        });
        
        this.warnings = this.warnings.filter(warning => {
            const warningTime = new Date(warning.timestamp).getTime();
            return (now - warningTime) < maxAge;
        });
    }
    
    // تصدير تقرير شامل
    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            systemStatus: this.getSystemStatus(),
            recentLogs: this.logs.slice(-50), // آخر 50 سجل
            recentErrors: this.errors.slice(-10), // آخر 10 أخطاء
            recentWarnings: this.warnings.slice(-10), // آخر 10 تحذيرات
            performanceMetrics: this.performanceMetrics,
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            }
        };
        
        return report;
    }
    
    // عرض تقرير في وحدة التحكم
    showReport() {
        const report = this.exportReport();
        console.group('📊 تقرير حالة النظام');
        console.log('الحالة العامة:', report.systemStatus.healthy ? '✅ سليم' : '❌ يحتاج إصلاح');
        console.log('المشاكل الحرجة:', report.systemStatus.criticalIssues);
        console.log('التحذيرات:', report.systemStatus.warnings);
        console.log('معلومات إضافية:', report.systemStatus.info);
        console.log('الأخطاء الحديثة:', report.recentErrors.length);
        console.log('التحذيرات الحديثة:', report.recentWarnings.length);
        console.groupEnd();
        
        return report;
    }
}

// إنشاء مثيل عام للمراقب
window.SystemMonitor = new TransfermarktSystemMonitor();

// تصدير للاستخدام في Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransfermarktSystemMonitor;
}
