/**
 * مساعد تزامن الشعارات - Logo Sync Helper
 * نظام موحد لضمان تزامن الشعارات بين جميع صفحات النظام
 */

class LogoSyncHelper {
    constructor() {
        this.version = '2025.1.0';
        this.storageKeys = {
            clubManagerData: 'clubManagerData',
            verifiedClubs: 'verifiedClubs',
            transfermarktData: 'transfermarktData',
            transfermarktRealData: 'transfermarktRealData'
        };
        this.isInitialized = false;
        this.logoDatabase = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 تهيئة مساعد تزامن الشعارات...');
        
        try {
            await this.loadLogoDatabase();
            this.setupStorageListener();
            this.isInitialized = true;
            console.log('✅ تم تهيئة مساعد تزامن الشعارات بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تهيئة مساعد تزامن الشعارات:', error);
        }
    }

    /**
     * تحميل قاعدة بيانات الشعارات
     */
    async loadLogoDatabase() {
        try {
            console.log('📊 تحميل قاعدة بيانات الشعارات...');
            
            let logoDatabase = [];

            // تحميل من جميع المصادر
            for (const [key, storageKey] of Object.entries(this.storageKeys)) {
                const data = localStorage.getItem(storageKey);
                if (data) {
                    try {
                        const parsedData = JSON.parse(data);
                        
                        if (Array.isArray(parsedData)) {
                            // إذا كانت مصفوفة مباشرة
                            const clubsWithLogos = parsedData.filter(club => club.logoUrl);
                            logoDatabase = logoDatabase.concat(clubsWithLogos);
                            console.log(`📥 تم تحميل ${clubsWithLogos.length} نادي من ${key}`);
                        } else if (parsedData.clubs && Array.isArray(parsedData.clubs)) {
                            // إذا كانت تحتوي على مصفوفة clubs
                            const clubsWithLogos = parsedData.clubs.filter(club => club.logoUrl);
                            logoDatabase = logoDatabase.concat(clubsWithLogos);
                            console.log(`📥 تم تحميل ${clubsWithLogos.length} نادي من ${key}`);
                        }
                    } catch (e) {
                        console.warn(`⚠️ خطأ في تحميل ${key}:`, e);
                    }
                }
            }

            // إزالة التكرارات
            this.logoDatabase = logoDatabase.filter((club, index, self) =>
                index === self.findIndex(c =>
                    c.englishName === club.englishName ||
                    c.arabicName === club.arabicName ||
                    c.name === club.name
                )
            );

            console.log(`✅ قاعدة بيانات الشعارات جاهزة: ${this.logoDatabase.length} نادي`);
            return this.logoDatabase;

        } catch (error) {
            console.error('❌ خطأ في تحميل قاعدة بيانات الشعارات:', error);
            this.logoDatabase = [];
            return [];
        }
    }

    /**
     * البحث عن شعار النادي
     */
    findClubLogo(clubName) {
        if (!clubName || !this.logoDatabase) return null;

        // البحث المباشر
        const club = this.logoDatabase.find(c =>
            c.englishName === clubName ||
            c.arabicName === clubName ||
            c.name === clubName
        );

        if (club && club.logoUrl) {
            return club.logoUrl;
        }

        // البحث بدون FC
        const cleanName = clubName.replace(/\s+FC$/, '').replace(/\s+Football Club$/, '');
        const clubWithoutFC = this.logoDatabase.find(c => {
            const cleanEnglish = (c.englishName || '').replace(/\s+FC$/, '').replace(/\s+Football Club$/, '');
            const cleanArabic = (c.arabicName || '').replace(/\s+FC$/, '').replace(/\s+Football Club$/, '');
            return cleanEnglish === cleanName || cleanArabic === cleanName;
        });

        if (clubWithoutFC && clubWithoutFC.logoUrl) {
            return clubWithoutFC.logoUrl;
        }

        // البحث الذكي
        const searchName = clubName.toLowerCase();
        const smartMatch = this.logoDatabase.find(c => {
            const englishName = (c.englishName || '').toLowerCase();
            const arabicName = (c.arabicName || '').toLowerCase();
            const name = (c.name || '').toLowerCase();

            return englishName.includes(searchName) ||
                   searchName.includes(englishName) ||
                   arabicName.includes(searchName) ||
                   name.includes(searchName);
        });

        if (smartMatch && smartMatch.logoUrl) {
            return smartMatch.logoUrl;
        }

        // البحث بالكلمات المفتاحية
        const keywords = clubName.toLowerCase().split(' ').filter(word => word.length > 2);
        for (const keyword of keywords) {
            const keywordMatch = this.logoDatabase.find(c => {
                const englishName = (c.englishName || '').toLowerCase();
                const arabicName = (c.arabicName || '').toLowerCase();
                const name = (c.name || '').toLowerCase();

                return englishName.includes(keyword) ||
                       arabicName.includes(keyword) ||
                       name.includes(keyword);
            });

            if (keywordMatch && keywordMatch.logoUrl) {
                return keywordMatch.logoUrl;
            }
        }

        return null;
    }

    /**
     * ربط الشعارات بالبيانات
     */
    enrichWithLogos(clubsData) {
        if (!clubsData || clubsData.length === 0) {
            return [];
        }

        console.log('🎨 بدء ربط الشعارات بالبيانات...');

        return clubsData.map(club => {
            try {
                // البحث عن الشعار
                let logoUrl = club.logoUrl || club.logo;

                if (!logoUrl) {
                    logoUrl = this.findClubLogo(club.englishName || club.arabicName || club.name);
                }

                return {
                    ...club,
                    logoUrl: logoUrl || this.generateFallbackLogo(club.englishName || club.arabicName || club.name)
                };

            } catch (error) {
                console.warn(`⚠️ خطأ في ربط شعار ${club.englishName || club.arabicName || club.name}:`, error);

                return {
                    ...club,
                    logoUrl: this.generateFallbackLogo(club.englishName || club.arabicName || club.name)
                };
            }
        });
    }

    /**
     * إنشاء شعار احتياطي
     */
    generateFallbackLogo(clubName) {
        if (!clubName) return null;

        const initials = clubName.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=400&background=1a1a2e&color=ffd700&bold=true&format=png&rounded=true&font-size=0.6`;
    }

    /**
     * إعداد مراقبة التحديثات
     */
    setupStorageListener() {
        // مراقبة تحديثات localStorage
        window.addEventListener('storage', (event) => {
            if (Object.values(this.storageKeys).includes(event.key)) {
                console.log('🔄 تم اكتشاف تحديث في قاعدة بيانات الشعارات:', event.key);
                this.loadLogoDatabase();
                this.broadcastUpdate('logos-updated');
            }
        });

        // مراقبة BroadcastChannel
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('logo-sync-updates');
            channel.addEventListener('message', (event) => {
                if (event.data.type === 'logos-updated') {
                    console.log('🔄 تم استلام تحديث الشعارات عبر BroadcastChannel');
                    this.loadLogoDatabase();
                }
            });
        }
    }

    /**
     * إرسال إشعار تحديث
     */
    broadcastUpdate(type = 'logos-updated') {
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('logo-sync-updates');
            channel.postMessage({
                type: type,
                timestamp: new Date().toISOString(),
                logoCount: this.logoDatabase.length
            });
            channel.close();
        }
    }

    /**
     * تحديث قاعدة البيانات
     */
    async refreshDatabase() {
        console.log('🔄 تحديث قاعدة بيانات الشعارات...');
        await this.loadLogoDatabase();
        this.broadcastUpdate('logos-refreshed');
        return this.logoDatabase;
    }

    /**
     * الحصول على قاعدة البيانات
     */
    getDatabase() {
        return this.logoDatabase;
    }

    /**
     * الحصول على عدد الشعارات
     */
    getLogoCount() {
        return this.logoDatabase.length;
    }
}

// إنشاء نسخة عامة
window.logoSyncHelper = new LogoSyncHelper();

// تصدير للاستخدام في الوحدات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogoSyncHelper;
} 