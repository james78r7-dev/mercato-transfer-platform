// ملف البيانات المشترك لأداتي برشلونة
// يتم تحميل هذا الملف في كلا الأداتين لضمان التناسق 100%

// نظام إدارة البيانات المحلي المتقدم
class BarcelonaDataManager {
    constructor() {
        this.storageKey = 'barcelona_shared_data';
        this.backupKey = 'barcelona_backup_data';
        this.settingsKey = 'barcelona_settings';
        this.historyKey = 'barcelona_history';
        this.listeners = [];
        this.lastUpdate = null;
        this.autoSaveInterval = null;
        this.backupInterval = null;
        this.maxHistoryEntries = 50;
        this.compressionEnabled = true;
        this.encryptionEnabled = false;
        this.init();
    }

    init() {
        // تحقق من دعم localStorage
        if (!this.isStorageSupported()) {
            console.warn('⚠️ localStorage غير مدعوم، سيتم استخدام الذاكرة المؤقتة');
            this.fallbackToMemory();
            return;
        }

        // تحميل البيانات من localStorage أولاً
        this.loadFromStorage();

        // تحميل الإعدادات
        this.loadSettings();

        // بدء أنظمة الحفظ والنسخ الاحتياطي
        this.startAutoSave();
        this.startAutoBackup();

        // تنظيف البيانات القديمة
        this.cleanupOldData();

        // مراقبة تغييرات التخزين المحلي
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.loadFromStorage();
                this.notifyListeners();
            }
        });

        // مراقبة إغلاق النافذة للحفظ الطارئ
        window.addEventListener('beforeunload', () => {
            this.emergencySave();
        });

        console.log('✅ تم تهيئة نظام إدارة البيانات المحلي بنجاح');
    }

    // تحقق من دعم localStorage
    isStorageSupported() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // الرجوع للذاكرة المؤقتة
    fallbackToMemory() {
        this.memoryStorage = new Map();
        this.saveToStorage = this.saveToMemory;
        this.loadFromStorage = this.loadFromMemory;
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                let data;
                if (this.compressionEnabled) {
                    data = this.decompress(stored);
                } else {
                    data = JSON.parse(stored);
                }

                // التحقق من صحة البيانات
                if (this.validateData(data)) {
                    window.BARCELONA_SHARED_DATA = data;
                    this.lastUpdate = new Date();
                    console.log('✅ تم تحميل البيانات من التخزين المحلي');
                } else {
                    console.warn('⚠️ البيانات المحملة غير صالحة، سيتم استخدام البيانات الافتراضية');
                    this.loadDefaultData();
                }
            } else {
                this.loadDefaultData();
            }
        } catch (error) {
            console.warn('⚠️ فشل في تحميل البيانات من التخزين المحلي:', error);
            this.loadDefaultData();
        }
    }

    // تحميل البيانات من الذاكرة المؤقتة
    loadFromMemory() {
        const data = this.memoryStorage.get(this.storageKey);
        if (data) {
            window.BARCELONA_SHARED_DATA = data;
            this.lastUpdate = new Date();
        } else {
            this.loadDefaultData();
        }
    }

    // تحميل البيانات الافتراضية
    loadDefaultData() {
        // التأكد من وجود البيانات الافتراضية
        if (!window.BARCELONA_SHARED_DATA) {
            window.BARCELONA_SHARED_DATA = {
                players: [],
                statusConfig: {},
                settings: {}
            };
        }
        
        if (!window.BARCELONA_SHARED_DATA.players || window.BARCELONA_SHARED_DATA.players.length === 0) {
            // تحميل البيانات الافتراضية من نهاية الملف
            console.log('📦 تم تحميل البيانات الافتراضية');
        }
    }

    // التحقق من صحة البيانات
    validateData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.players)) return false;

        // التحقق من صحة بيانات اللاعبين
        return data.players.every(player =>
            player.id &&
            player.name &&
            typeof player.probability === 'number' &&
            player.probability >= 0 &&
            player.probability <= 100
        );
    }

    saveToStorage() {
        try {
            const dataToSave = {
                ...window.BARCELONA_SHARED_DATA,
                lastUpdate: new Date().toISOString(),
                version: '2.0',
                checksum: this.generateChecksum(window.BARCELONA_SHARED_DATA)
            };

            // حفظ في التاريخ
            this.saveToHistory(dataToSave);

            let serializedData;
            if (this.compressionEnabled) {
                serializedData = this.compress(dataToSave);
            } else {
                serializedData = JSON.stringify(dataToSave);
            }

            localStorage.setItem(this.storageKey, serializedData);
            this.lastUpdate = new Date();
            console.log('✅ تم حفظ البيانات في التخزين المحلي');
            this.notifyListeners();
            
            // إرسال حدث تحديث البيانات
            this.dispatchUpdateEvent();
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ مساحة التخزين ممتلئة، سيتم تنظيف البيانات القديمة');
                this.cleanupStorage();
                this.saveToStorage(); // إعادة المحاولة
            } else {
                console.error('❌ فشل في حفظ البيانات:', error);
            }
        }
    }

    // حفظ في الذاكرة المؤقتة
    saveToMemory() {
        const dataToSave = {
            ...window.BARCELONA_SHARED_DATA,
            lastUpdate: new Date().toISOString(),
            version: '2.0'
        };
        this.memoryStorage.set(this.storageKey, dataToSave);
        this.lastUpdate = new Date();
        this.notifyListeners();
        this.dispatchUpdateEvent();
    }

    // إرسال حدث تحديث البيانات
    dispatchUpdateEvent() {
        // إرسال حدث مخصص
        window.dispatchEvent(new CustomEvent('barcelonaDataUpdated', {
            detail: {
                players: window.BARCELONA_SHARED_DATA.players,
                timestamp: new Date().toISOString()
            }
        }));

        // إرسال رسالة لجميع النوافذ
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'BARCELONA_DATA_UPDATED',
                data: window.BARCELONA_SHARED_DATA
            }, '*');
        }

        // إرسال رسالة لجميع الـ iframes
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                iframe.contentWindow.postMessage({
                    type: 'BARCELONA_DATA_UPDATED',
                    data: window.BARCELONA_SHARED_DATA
                }, '*');
            } catch (error) {
                // تجاهل أخطاء CORS
            }
        });
    }

    // ضغط البيانات
    compress(data) {
        const jsonString = JSON.stringify(data);
        // ضغط بسيط باستخدام تقليل المسافات والتكرار
        return btoa(jsonString);
    }

    // إلغاء ضغط البيانات
    decompress(compressedData) {
        try {
            const jsonString = atob(compressedData);
            return JSON.parse(jsonString);
        } catch (error) {
            // إذا فشل إلغاء الضغط، جرب التحليل المباشر
            return JSON.parse(compressedData);
        }
    }

    // إنشاء checksum للبيانات
    generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // تحويل إلى 32-bit integer
        }
        return hash.toString();
    }

    // حفظ في التاريخ
    saveToHistory(data) {
        try {
            const history = this.getHistory();
            history.unshift({
                data: data,
                timestamp: new Date().toISOString(),
                playersCount: data.players ? data.players.length : 0
            });

            // الاحتفاظ بعدد محدود من الإدخالات
            if (history.length > this.maxHistoryEntries) {
                history.splice(this.maxHistoryEntries);
            }

            localStorage.setItem(this.historyKey, JSON.stringify(history));
        } catch (error) {
            console.warn('⚠️ فشل في حفظ التاريخ:', error);
        }
    }

    // تنظيف التخزين
    cleanupStorage() {
        try {
            const keys = Object.keys(localStorage);
            const barcelonaKeys = keys.filter(key => key.startsWith('barcelona_'));
            
            // حذف النسخ الاحتياطية القديمة أولاً
            barcelonaKeys.forEach(key => {
                if (key.includes('backup') && key !== this.backupKey) {
                    localStorage.removeItem(key);
                }
            });

            // حذف التاريخ القديم
            const history = this.getHistory();
            if (history.length > 20) {
                localStorage.setItem(this.historyKey, JSON.stringify(history.slice(0, 20)));
            }
        } catch (error) {
            console.warn('⚠️ فشل في تنظيف التخزين:', error);
        }
    }

    // بدء الحفظ التلقائي
    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = setInterval(() => {
            this.saveToStorage();
        }, 30000); // كل 30 ثانية
    }

    // بدء النسخ الاحتياطي التلقائي
    startAutoBackup() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        this.backupInterval = setInterval(() => {
            this.createBackup();
        }, 300000); // كل 5 دقائق
    }

    // إنشاء نسخة احتياطية
    createBackup() {
        try {
            const backupData = {
                ...window.BARCELONA_SHARED_DATA,
                backupDate: new Date().toISOString(),
                backupType: 'auto'
            };

            const backupKey = `${this.backupKey}_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(backupData));

            // تنظيف النسخ الاحتياطية القديمة
            this.cleanupOldBackups();

            console.log('💾 تم إنشاء نسخة احتياطية تلقائية');
        } catch (error) {
            console.warn('⚠️ فشل في إنشاء النسخة الاحتياطية:', error);
        }
    }

    // تنظيف النسخ الاحتياطية القديمة
    cleanupOldBackups() {
        try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(key => key.startsWith(this.backupKey + '_'));
            
            if (backupKeys.length > 10) {
                // الاحتفاظ بـ 10 نسخ احتياطية فقط
                backupKeys.sort().slice(0, -10).forEach(key => {
                    localStorage.removeItem(key);
                });
            }
        } catch (error) {
            console.warn('⚠️ فشل في تنظيف النسخ الاحتياطية:', error);
        }
    }

    // تنظيف البيانات القديمة
    cleanupOldData() {
        try {
            // تنظيف التاريخ القديم
            const history = this.getHistory();
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const filteredHistory = history.filter(entry => {
                return new Date(entry.timestamp) > oneWeekAgo;
            });

            if (filteredHistory.length !== history.length) {
                localStorage.setItem(this.historyKey, JSON.stringify(filteredHistory));
                console.log('🧹 تم تنظيف التاريخ القديم');
            }
        } catch (error) {
            console.warn('⚠️ فشل في تنظيف البيانات القديمة:', error);
        }
    }

    // الحفظ الطارئ
    emergencySave() {
        try {
            this.saveToStorage();
            console.log('🚨 تم الحفظ الطارئ');
        } catch (error) {
            console.error('❌ فشل في الحفظ الطارئ:', error);
        }
    }

    // تحميل الإعدادات
    loadSettings() {
        try {
            const saved = localStorage.getItem(this.settingsKey);
            if (saved) {
                const settings = JSON.parse(saved);
                if (window.BARCELONA_SHARED_DATA) {
                    window.BARCELONA_SHARED_DATA.settings = {
                        ...window.BARCELONA_SHARED_DATA.settings,
                        ...settings
                    };
                }
            }
        } catch (error) {
            console.warn('⚠️ فشل في تحميل الإعدادات:', error);
        }
    }

    // حفظ الإعدادات
    saveSettings() {
        try {
            if (window.BARCELONA_SHARED_DATA && window.BARCELONA_SHARED_DATA.settings) {
                localStorage.setItem(this.settingsKey, JSON.stringify(window.BARCELONA_SHARED_DATA.settings));
            }
        } catch (error) {
            console.warn('⚠️ فشل في حفظ الإعدادات:', error);
        }
    }

    // إيقاف الحفظ التلقائي
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
        }
    }

    // إضافة مستمع
    addListener(callback) {
        this.listeners.push(callback);
    }

    // إزالة مستمع
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    // إخطار المستمعين
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(window.BARCELONA_SHARED_DATA);
            } catch (error) {
                console.error('خطأ في استدعاء مستمع البيانات:', error);
            }
        });
    }

    updatePlayers(players) {
        if (!window.BARCELONA_SHARED_DATA) {
            window.BARCELONA_SHARED_DATA = {
                players: [],
                statusConfig: {},
                settings: {}
            };
        }
        window.BARCELONA_SHARED_DATA.players = players;
        this.saveToStorage();
        console.log(`✅ تم تحديث ${players.length} لاعب في النظام`);
    }

    getPlayers() {
        return window.BARCELONA_SHARED_DATA.players || [];
    }

    addPlayer(player) {
        if (!window.BARCELONA_SHARED_DATA.players) {
            window.BARCELONA_SHARED_DATA.players = [];
        }
        window.BARCELONA_SHARED_DATA.players.push(player);
        this.saveToStorage();
    }

    updatePlayer(index, player) {
        if (window.BARCELONA_SHARED_DATA.players && window.BARCELONA_SHARED_DATA.players[index]) {
            window.BARCELONA_SHARED_DATA.players[index] = player;
            this.saveToStorage();
        }
    }

    removePlayer(index) {
        if (window.BARCELONA_SHARED_DATA.players && window.BARCELONA_SHARED_DATA.players[index]) {
            window.BARCELONA_SHARED_DATA.players.splice(index, 1);
            this.saveToStorage();
        }
    }

    // الحصول على معلومات التخزين
    getStorageInfo() {
        try {
            const used = new Blob(Object.values(localStorage)).size;
            const quota = 5 * 1024 * 1024; // 5MB تقريباً

            return {
                used: used,
                quota: quota,
                available: quota - used,
                usedPercentage: Math.round((used / quota) * 100),
                itemsCount: Object.keys(localStorage).length,
                playersCount: window.BARCELONA_SHARED_DATA.players ? window.BARCELONA_SHARED_DATA.players.length : 0
            };
        } catch (error) {
            return {
                error: 'فشل في الحصول على معلومات التخزين',
                details: error.message
            };
        }
    }

    // الحصول على التاريخ
    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.historyKey) || '[]');
        } catch (error) {
            console.warn('⚠️ فشل في تحميل التاريخ:', error);
            return [];
        }
    }

    // استعادة من التاريخ
    restoreFromHistory(index) {
        try {
            const history = this.getHistory();
            if (history[index]) {
                window.BARCELONA_SHARED_DATA = history[index].data;
                this.saveToStorage();
                console.log('🔄 تم استعادة البيانات من التاريخ');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ فشل في استعادة البيانات من التاريخ:', error);
            return false;
        }
    }

    // الحصول على النسخ الاحتياطية
    getBackups() {
        try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(key => key.startsWith(this.backupKey + '_'));

            return backupKeys.map(key => {
                const data = JSON.parse(localStorage.getItem(key));
                return {
                    key: key,
                    date: data.backupDate,
                    playersCount: data.players ? data.players.length : 0,
                    size: localStorage.getItem(key).length
                };
            }).sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.warn('⚠️ فشل في تحميل النسخ الاحتياطية:', error);
            return [];
        }
    }

    // استعادة من النسخة الاحتياطية
    restoreFromBackup(backupKey) {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (backupData) {
                const data = JSON.parse(backupData);
                window.BARCELONA_SHARED_DATA = data;
                this.saveToStorage();
                console.log('🔄 تم استعادة البيانات من النسخة الاحتياطية');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ فشل في استعادة البيانات من النسخة الاحتياطية:', error);
            return false;
        }
    }

    // تصدير جميع البيانات
    exportAllData() {
        try {
            const exportData = {
                mainData: window.BARCELONA_SHARED_DATA,
                history: this.getHistory(),
                backups: this.getBackups(),
                settings: JSON.parse(localStorage.getItem(this.settingsKey) || '{}'),
                storageInfo: this.getStorageInfo(),
                exportDate: new Date().toISOString(),
                version: '2.0'
            };
            return exportData;
        } catch (error) {
            console.error('❌ فشل في تصدير البيانات:', error);
            return null;
        }
    }

    // استيراد جميع البيانات
    importAllData(importData) {
        try {
            if (importData.mainData) {
                window.BARCELONA_SHARED_DATA = importData.mainData;
                this.saveToStorage();
            }

            if (importData.history) {
                localStorage.setItem(this.historyKey, JSON.stringify(importData.history));
            }

            if (importData.settings) {
                localStorage.setItem(this.settingsKey, JSON.stringify(importData.settings));
                this.loadSettings();
            }

            console.log('📥 تم استيراد جميع البيانات بنجاح');
            return true;
        } catch (error) {
            console.error('❌ فشل في استيراد البيانات:', error);
            return false;
        }
    }

    // مسح جميع البيانات
    clearAllData() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('barcelona_')) {
                    localStorage.removeItem(key);
                }
            });

            // إعادة تحميل البيانات الافتراضية
            this.loadDefaultData();
            console.log('🗑️ تم مسح جميع البيانات');
            return true;
        } catch (error) {
            console.error('❌ فشل في مسح البيانات:', error);
            return false;
        }
    }
}

// إنشاء مدير البيانات العام
window.barcelonaDataManager = new BarcelonaDataManager();

// وظائف مساعدة للتوافق مع الكود القديم
window.saveSharedData = function(data) {
    if (data.players) {
        window.barcelonaDataManager.updatePlayers(data.players);
    }
};

// تهيئة فورية للبيانات
window.addEventListener('DOMContentLoaded', function() {
    // التأكد من تحميل البيانات
    if (!window.BARCELONA_SHARED_DATA || !window.BARCELONA_SHARED_DATA.players) {
        console.log('🔄 إعادة تحميل البيانات الافتراضية...');
        // إعادة تحميل البيانات الافتراضية
        window.barcelonaDataManager.loadDefaultData();
    }
    
    // حفظ البيانات الأولية
    if (window.barcelonaDataManager) {
        window.barcelonaDataManager.saveToStorage();
    }
    
    console.log('✅ تم تهيئة نظام البيانات المشترك');
});

// تهيئة فورية أيضاً
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.barcelonaDataManager) {
            window.barcelonaDataManager.saveToStorage();
        }
    });
} else {
    // الصفحة محملة بالفعل
    if (window.barcelonaDataManager) {
        window.barcelonaDataManager.saveToStorage();
    }
}

window.getSharedData = function() {
    return window.BARCELONA_SHARED_DATA;
};

// البيانات الافتراضية
window.BARCELONA_SHARED_DATA = {
    players: [
        {
            "name": "خوان غارسيا",
            "position": "حارس مرمى",
            "currentClub": "برشلونة",
            "probability": 100,
            "expectedFee": "25",
            "image": "https://cdnuploads.aa.com.tr/uploads/Contents/2025/06/18/thumbs_b_c_d0e8caad6f6844899d6b50facc99cf9d.jpg?v=165814",
            "status": "official",
            "id": "1751335564681gtwx6oyrp",
            "createdAt": "2025-07-01T02:06:04.681Z",
            "lastUpdate": "2025-07-01T02:06:04.681Z",
            "club": "برشلونة",
            "dealValue": "25",
            "age": 25,
            "nationality": "إسبانيا",
            "transferFee": "€25M",
            "contractUntil": "2029"
        },
        {
            "id": "1751335564681bhuu6f4qi",
            "name": "Nico Williams",
            "position": "جناح أيسر",
            "currentClub": "Athletic Bilbao",
            "age": 22,
            "nationality": "إسبانيا",
            "image": "https://img.a.transfermarkt.technology/portrait/big/681676-1668509314.jpg?lm=1",
            "probability": 90,
            "status": "official",
            "transferFee": "€60M",
            "contractUntil": "2029",
            "lastUpdate": "2025-07-18T12:00:00Z",
            "club": "Athletic Bilbao",
            "dealValue": "60 مليون يورو",
            "createdAt": "2025-07-01T02:06:04.681Z"
        },
        {
            "id": "player_1",
            "name": "Erling Haaland",
            "position": "مهاجم",
            "currentClub": "Manchester City",
            "age": 23,
            "nationality": "النرويج",
            "image": "https://img.a.transfermarkt.technology/portrait/big/418560-1667830243.jpg?lm=1",
            "probability": 85,
            "status": "close",
            "transferFee": "€150M",
            "contractUntil": "2027",
            "lastUpdate": "2025-07-18T10:30:00Z",
            "club": "Manchester City",
            "dealValue": "150",
            "createdAt": "2025-07-18T10:30:00Z"
        },
        {
            "id": "player_2",
            "name": "Kylian Mbappé",
            "position": "جناح أيسر",
            "currentClub": "Real Madrid",
            "age": 25,
            "nationality": "فرنسا",
            "image": "https://img.a.transfermarkt.technology/portrait/big/342229-1682683695.jpg?lm=1",
            "probability": 25,
            "status": "rumor",
            "transferFee": "€200M",
            "contractUntil": "2025",
            "lastUpdate": "2025-07-18T09:15:00Z",
            "club": "Real Madrid",
            "dealValue": "200",
            "createdAt": "2025-07-18T09:15:00Z"
        },
        {
            "id": "player_3",
            "name": "Joshua Kimmich",
            "position": "وسط دفاعي",
            "currentClub": "Bayern Munich",
            "age": 29,
            "nationality": "ألمانيا",
            "image": "https://img.a.transfermarkt.technology/portrait/big/161056-1668509314.jpg?lm=1",
            "probability": 70,
            "status": "negotiating",
            "transferFee": "€80M",
            "contractUntil": "2025",
            "lastUpdate": "2025-07-18T11:45:00Z",
            "club": "Bayern Munich",
            "dealValue": "80",
            "createdAt": "2025-07-18T09:15:00Z"
        },
        {
            "id": "player_5",
            "name": "Alphonso Davies",
            "position": "ظهير أيسر",
            "currentClub": "Bayern Munich",
            "age": 24,
            "nationality": "كندا",
            "image": "https://img.a.transfermarkt.technology/portrait/big/424204-1668509314.jpg?lm=1",
            "probability": 60,
            "status": "close",
            "transferFee": "€70M",
            "contractUntil": "2025",
            "lastUpdate": "2025-07-18T08:30:00Z",
            "club": "Bayern Munich",
            "dealValue": "70",
            "createdAt": "2025-07-18T08:30:00Z"
        },
        {
            "id": "player_6",
            "name": "Martin Zubimendi",
            "position": "وسط دفاعي",
            "currentClub": "Real Sociedad",
            "age": 25,
            "nationality": "إسبانيا",
            "image": "https://img.a.transfermarkt.technology/portrait/big/348795-1668509314.jpg?lm=1",
            "probability": 75,
            "status": "negotiating",
            "transferFee": "€65M",
            "contractUntil": "2027",
            "lastUpdate": "2025-07-18T07:20:00Z",
            "club": "Real Sociedad",
            "dealValue": "65",
            "createdAt": "2025-07-18T07:20:00Z"
        },
        {
            "id": "player_7",
            "name": "Jamal Musiala",
            "position": "وسط مهاجم",
            "currentClub": "Bayern Munich",
            "age": 21,
            "nationality": "ألمانيا",
            "image": "https://img.a.transfermarkt.technology/portrait/big/580195-1668509314.jpg?lm=1",
            "probability": 55,
            "status": "rumor",
            "transferFee": "€90M",
            "contractUntil": "2026",
            "lastUpdate": "2025-07-18T06:45:00Z",
            "club": "Bayern Munich",
            "dealValue": "90",
            "createdAt": "2025-07-18T06:45:00Z"
        },
        {
            "id": "player_8",
            "name": "Florian Wirtz",
            "position": "وسط مهاجم",
            "currentClub": "Bayer Leverkusen",
            "age": 21,
            "nationality": "ألمانيا",
            "image": "https://img.a.transfermarkt.technology/portrait/big/618394-1668509314.jpg?lm=1",
            "probability": 40,
            "status": "rumor",
            "transferFee": "€100M",
            "contractUntil": "2027",
            "lastUpdate": "2025-07-18T05:30:00Z",
            "club": "Bayer Leverkusen",
            "dealValue": "100",
            "createdAt": "2025-07-18T05:30:00Z"
        },
        {
            "name": "لويس دياز",
            "position": "جناح أيسر",
            "currentClub": "ليفبرول",
            "probability": 20,
            "expectedFee": "80",
            "image": "https://store.liverpoolfc.ae/cdn/shop/collections/LDiaz2024.webp?v=1731655893",
            "status": "rumor",
            "id": "1751662443306d2rauzho4",
            "createdAt": "2025-07-04T20:54:03.306Z",
            "lastUpdate": "2025-07-04T20:54:03.306Z",
            "club": "ليفبرول",
            "dealValue": "80",
            "age": 27,
            "nationality": "كولومبيا",
            "transferFee": "€80M",
            "contractUntil": "2027"
        },
        {
            "name": "فاندرسون",
            "position": "ظهير أيمن",
            "currentClub": "موناكو",
            "probability": 25,
            "expectedFee": "25",
            "image": "https://arabic.sport360.com/wp-content/uploads/2022/09/GettyImages-1411298049-1.jpg",
            "status": "negotiating",
            "id": "1751335564681yyyofpltt",
            "createdAt": "2025-07-01T02:06:04.681Z",
            "lastUpdate": "2025-07-01T02:06:04.681Z",
            "club": "موناكو",
            "dealValue": "25",
            "age": 25,
            "nationality": "البرازيل",
            "transferFee": "€25M",
            "contractUntil": "2026"
        },
        {
            "name": "راشفورد",
            "position": "مهاجم",
            "currentClub": "يونايتد",
            "probability": 85,
            "expectedFee": "5",
            "image": "https://www.aljadeed.tv/uploadImages/DocumentImages/Doc-P-521956-638730349325768799.jpg",
            "status": "negotiating",
            "id": "1751335564681j9lwaicdh",
            "createdAt": "2025-07-01T02:06:04.681Z",
            "lastUpdate": "2025-07-01T02:06:04.681Z",
            "club": "يونايتد",
            "dealValue": "5",
            "age": 27,
            "nationality": "إنجلترا",
            "transferFee": "€5M",
            "contractUntil": "2028"
        }
    ],
    
    statusConfig: {
        "official": {
            "icon": "✅",
            "color": "#00ff88",
            "bgColor": "rgba(0, 255, 136, 0.2)",
            "label": "رسمية"
        },
        "close": {
            "icon": "⏳",
            "color": "#ffaa00",
            "bgColor": "rgba(255, 170, 0, 0.2)",
            "label": "قريبة"
        },
        "negotiating": {
            "icon": "🤝",
            "color": "#00aaff",
            "bgColor": "rgba(0, 170, 255, 0.2)",
            "label": "تفاوض"
        },
        "rumor": {
            "icon": "🔮",
            "color": "#aa00ff",
            "bgColor": "rgba(170, 0, 255, 0.2)",
            "label": "متوقعة"
        },
        "failed": {
            "icon": "❌",
            "color": "#ff4444",
            "bgColor": "rgba(255, 68, 68, 0.2)",
            "label": "فاشلة"
        }
    },
    
    settings: {
        "displayCount": 12,
        "autoRefresh": false,
        "refreshInterval": 30000,
        "theme": "barcelona_classic",
        "animationEnabled": true,
        "showProbabilityBar": true,
        "showTransferFee": true,
        "showPlayerImages": true,
        "showStatusIcons": true
    }
};

// دالة مساعدة لتحميل البيانات
window.loadSharedData = function() {
    console.log(`✅ تم تحميل ${window.BARCELONA_SHARED_DATA.players.length} لاعب من الملف المشترك`);
    return window.BARCELONA_SHARED_DATA;
};

// دالة لحفظ البيانات محلياً (للتحديثات)
window.saveSharedData = function(newData) {
    if (newData && newData.players) {
        window.BARCELONA_SHARED_DATA.players = newData.players;
        console.log(`✅ تم حفظ ${newData.players.length} لاعب في الملف المشترك`);
        
        // حفظ في localStorage كنسخة احتياطية
        try {
            localStorage.setItem('barcelona_shared_backup', JSON.stringify(window.BARCELONA_SHARED_DATA));
        } catch (e) {
            console.warn('فشل في حفظ النسخة الاحتياطية:', e);
        }
    }
};

// تحميل النسخة الاحتياطية إذا كانت متاحة
try {
    const backup = localStorage.getItem('barcelona_shared_backup');
    if (backup) {
        const backupData = JSON.parse(backup);
        if (backupData && backupData.players && backupData.players.length > 0) {
            window.BARCELONA_SHARED_DATA = backupData;
            console.log('✅ تم تحميل النسخة الاحتياطية من localStorage');
        }
    }
} catch (e) {
    console.warn('فشل في تحميل النسخة الاحتياطية:', e);
}

// وظائف إضافية لإدارة التخزين المحلي
window.BARCELONA_STORAGE = {
    // الحصول على معلومات التخزين
    getStorageInfo: function() {
        return window.barcelonaDataManager.getStorageInfo();
    },

    // تنظيف التخزين
    cleanup: function() {
        window.barcelonaDataManager.cleanupStorage();
        window.barcelonaDataManager.cleanupOldData();
    },

    // إنشاء نسخة احتياطية يدوية
    createBackup: function() {
        return window.barcelonaDataManager.createBackup();
    },

    // الحصول على النسخ الاحتياطية
    getBackups: function() {
        return window.barcelonaDataManager.getBackups();
    },

    // استعادة من نسخة احتياطية
    restoreBackup: function(backupKey) {
        return window.barcelonaDataManager.restoreFromBackup(backupKey);
    },

    // الحصول على التاريخ
    getHistory: function() {
        return window.barcelonaDataManager.getHistory();
    },

    // استعادة من التاريخ
    restoreFromHistory: function(index) {
        return window.barcelonaDataManager.restoreFromHistory(index);
    },

    // تصدير شامل
    exportAll: function() {
        return window.barcelonaDataManager.exportAllData();
    },

    // استيراد شامل
    importAll: function(data) {
        return window.barcelonaDataManager.importAllData(data);
    },

    // مسح شامل
    clearAll: function() {
        return window.barcelonaDataManager.clearAllData();
    }
};

// وظائف إضافية للتزامن المتقدم
window.BARCELONA_SYNC = {
    // تحديث البث المباشر
    refreshBroadcast: function() {
        // إرسال حدث مخصص لتحديث البث
        window.dispatchEvent(new CustomEvent('barcelonaDataUpdated', {
            detail: {
                players: window.BARCELONA_SHARED_DATA.players,
                timestamp: new Date().toISOString()
            }
        }));

        // تحديث جميع الـ iframes
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentWindow && iframe.contentWindow.location.href.includes('barcelona-ultimate-broadcast')) {
                    iframe.contentWindow.postMessage({
                        type: 'DATA_UPDATE',
                        data: window.BARCELONA_SHARED_DATA
                    }, '*');
                }
            } catch (error) {
                // تجاهل أخطاء CORS
            }
        });
    },

    // مراقبة التغييرات
    watchChanges: function(callback) {
        window.barcelonaDataManager.addListener(callback);
    },

    // إيقاف مراقبة التغييرات
    unwatchChanges: function(callback) {
        window.barcelonaDataManager.removeListener(callback);
    },

    // تصدير البيانات
    exportData: function() {
        return {
            players: window.BARCELONA_SHARED_DATA.players,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
    },

    // استيراد البيانات
    importData: function(data) {
        if (data.players && Array.isArray(data.players)) {
            window.BARCELONA_SHARED_DATA.players = data.players;
            window.barcelonaDataManager.saveToStorage();
            this.refreshBroadcast();
            return true;
        }
        return false;
    },

    // إحصائيات سريعة
    getStats: function() {
        const players = window.BARCELONA_SHARED_DATA.players || [];
        return {
            total: players.length,
            official: players.filter(p => p.status === 'official').length,
            close: players.filter(p => p.status === 'close').length,
            negotiating: players.filter(p => p.status === 'negotiating').length,
            rumor: players.filter(p => p.status === 'rumor').length,
            rejected: players.filter(p => p.status === 'rejected').length,
            avgProbability: players.length > 0 ?
                Math.round(players.reduce((sum, p) => sum + (p.probability || 0), 0) / players.length) : 0
        };
    },

    // البحث في اللاعبين
    searchPlayers: function(query) {
        const players = window.BARCELONA_SHARED_DATA.players || [];
        const searchTerm = query.toLowerCase();
        return players.filter(player =>
            player.name.toLowerCase().includes(searchTerm) ||
            player.position.toLowerCase().includes(searchTerm) ||
            player.currentClub.toLowerCase().includes(searchTerm) ||
            player.nationality.toLowerCase().includes(searchTerm)
        );
    },

    // ترتيب اللاعبين
    sortPlayers: function(sortBy = 'probability', order = 'desc') {
        const players = [...(window.BARCELONA_SHARED_DATA.players || [])];
        return players.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (order === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });
    }
};

// مراقبة الرسائل من الـ iframes
window.addEventListener('message', function(event) {
    if (event.data.type === 'REQUEST_DATA') {
        event.source.postMessage({
            type: 'DATA_RESPONSE',
            data: window.BARCELONA_SHARED_DATA
        }, '*');
    }
});

// تحديث تلقائي للبث عند تغيير البيانات
window.addEventListener('barcelonaDataUpdated', function(event) {
    console.log('🔄 تم تحديث بيانات برشلونة:', event.detail);
});

console.log('🎯 تم تحميل ملف البيانات المشترك لبرشلونة مع نظام التزامن المتقدم');
