/**
 * النظام الموحد لحل مشكلة الشعارات - Universal Logo Fix
 * حل مضمون وقوي لمشكلة عدم ظهور الشعارات في جميع الصفحات
 * إصدار محسن لحل مشكلة انهيار المتصفح
 */

class UniversalLogoFix {
    constructor() {
        this.version = '2025.1.1';
        this.isInitialized = false;
        this.isInitializing = false;
        this.logoDatabase = [];
        this.storageKeys = {
            clubManagerData: 'clubManagerData',
            verifiedClubs: 'verifiedClubs',
            transfermarktData: 'transfermarktData',
            transfermarktRealData: 'transfermarktRealData',
            unifiedLogoDatabase: 'unifiedLogoDatabase'
        };
        
        // منع التهيئة التلقائية لتجنب التهيئة المتعددة
        // this.init();
    }

    async init() {
        // حماية ضد التهيئة المتعددة
        if (this.isInitialized || this.isInitializing) {
            console.log('🔄 النظام الموحد متهيأ بالفعل أو قيد التهيئة...');
            return;
        }

        this.isInitializing = true;
        console.log('🚀 تهيئة النظام الموحد لحل مشكلة الشعارات...');
        
        try {
            await this.loadAndSyncLogoDatabase();
            this.setupGlobalListeners();
            this.isInitialized = true;
            console.log('✅ تم تهيئة النظام الموحد بنجاح');
            
            // إرسال إشعار نجاح التهيئة
            this.broadcastMessage('system-ready', { logoCount: this.logoDatabase.length });
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة النظام الموحد:', error);
            this.isInitialized = false;
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * تحميل ومزامنة قاعدة بيانات الشعارات - محسن للأداء
     */
    async loadAndSyncLogoDatabase() {
        console.log('📊 تحميل ومزامنة قاعدة بيانات الشعارات...');
        
        let allClubs = [];

        // تحميل من جميع المصادر مع حماية ضد الأخطاء
        for (const [key, storageKey] of Object.entries(this.storageKeys)) {
            try {
                const data = localStorage.getItem(storageKey);
                if (data) {
                    const parsedData = JSON.parse(data);
                    
                    if (Array.isArray(parsedData)) {
                        // مصفوفة مباشرة
                        allClubs = allClubs.concat(parsedData);
                        console.log(`📥 تم تحميل ${parsedData.length} نادي من ${key}`);
                    } else if (parsedData.clubs && Array.isArray(parsedData.clubs)) {
                        // مصفوفة داخل كائن
                        allClubs = allClubs.concat(parsedData.clubs);
                        console.log(`📥 تم تحميل ${parsedData.clubs.length} نادي من ${key}`);
                    }
                }
            } catch (e) {
                console.warn(`⚠️ خطأ في تحميل ${key}:`, e);
                continue; // الاستمرار مع المصادر الأخرى
            }
        }

        // إزالة التكرارات والحفاظ على أفضل البيانات
        this.logoDatabase = this.removeDuplicatesAndMerge(allClubs);
        
        // حفظ قاعدة البيانات الموحدة
        this.saveUnifiedDatabase();
        
        console.log(`✅ قاعدة بيانات الشعارات جاهزة: ${this.logoDatabase.length} نادي`);
        return this.logoDatabase;
    }

    /**
     * إزالة التكرارات ودمج البيانات - محسن للأداء
     */
    removeDuplicatesAndMerge(allClubs) {
        const uniqueClubs = new Map();
        
        // فلترة البيانات الفارغة أولاً
        const validClubs = allClubs.filter(club => club && (club.englishName || club.arabicName || club.name));
        
        validClubs.forEach(club => {
            // إنشاء مفتاح فريد للنادي
            const key = this.generateClubKey(club);
            
            if (key) {
                if (!uniqueClubs.has(key)) {
                    uniqueClubs.set(key, club);
                } else {
                    // دمج البيانات مع الحفاظ على الشعار
                    const existing = uniqueClubs.get(key);
                    const merged = this.mergeClubData(existing, club);
                    uniqueClubs.set(key, merged);
                }
            }
        });
        
        return Array.from(uniqueClubs.values());
    }

    /**
     * إنشاء مفتاح فريد للنادي - محسن
     */
    generateClubKey(club) {
        const names = [
            club.englishName,
            club.arabicName,
            club.name
        ].filter(name => name && name.trim());
        
        if (names.length === 0) return null;
        
        // استخدام الاسم الأول كقاعدة مع تنظيف أفضل
        return names[0].toLowerCase().trim().replace(/[^\w\s]/g, '');
    }

    /**
     * دمج بيانات النادي - محسن
     */
    mergeClubData(existing, newClub) {
        return {
            ...existing,
            ...newClub,
            // الحفاظ على الشعار إذا كان موجوداً
            logoUrl: existing.logoUrl || newClub.logoUrl,
            // الحفاظ على أفضل البيانات
            englishName: existing.englishName || newClub.englishName,
            arabicName: existing.arabicName || newClub.arabicName,
            name: existing.name || newClub.name
        };
    }

    /**
     * حفظ قاعدة البيانات الموحدة - محسن
     */
    saveUnifiedDatabase() {
        try {
            const unifiedData = {
                clubs: this.logoDatabase,
                lastUpdate: new Date().toISOString(),
                source: 'universal-logo-fix',
                version: this.version,
                totalClubs: this.logoDatabase.length,
                clubsWithLogos: this.logoDatabase.filter(club => club.logoUrl).length
            };
            
            localStorage.setItem('unifiedLogoDatabase', JSON.stringify(unifiedData));
            console.log('💾 تم حفظ قاعدة البيانات الموحدة');
        } catch (error) {
            console.warn('⚠️ خطأ في حفظ قاعدة البيانات الموحدة:', error);
        }
    }

    /**
     * البحث عن شعار النادي - محسن ومضمون
     */
    findClubLogo(clubName) {
        if (!clubName || !this.logoDatabase || this.logoDatabase.length === 0) return null;
        
        const searchName = clubName.toString().trim();
        if (!searchName) return null;

        // 1. البحث المباشر
        let club = this.logoDatabase.find(c => 
            c.englishName === searchName ||
            c.arabicName === searchName ||
            c.name === searchName
        );
        
        if (club && club.logoUrl) {
            return club.logoUrl;
        }

        // 2. البحث بدون FC
        const cleanName = searchName.replace(/\s+FC$/, '').replace(/\s+Football Club$/, '');
        club = this.logoDatabase.find(c => {
            const cleanEnglish = (c.englishName || '').replace(/\s+FC$/, '').replace(/\s+Football Club$/, '');
            const cleanArabic = (c.arabicName || '').replace(/\s+FC$/, '').replace(/\s+Football Club$/, '');
            return cleanEnglish === cleanName || cleanArabic === cleanName;
        });
        
        if (club && club.logoUrl) {
            return club.logoUrl;
        }

        // 3. البحث الذكي - محسن للأداء
        const searchNameLower = searchName.toLowerCase();
        club = this.logoDatabase.find(c => {
            const englishName = (c.englishName || '').toLowerCase();
            const arabicName = (c.arabicName || '').toLowerCase();
            const name = (c.name || '').toLowerCase();
            
            return englishName.includes(searchNameLower) ||
                   searchNameLower.includes(englishName) ||
                   arabicName.includes(searchNameLower) ||
                   searchNameLower.includes(arabicName) ||
                   name.includes(searchNameLower) ||
                   searchNameLower.includes(name);
        });
        
        if (club && club.logoUrl) {
            return club.logoUrl;
        }

        // 4. البحث بالكلمات المفتاحية - محسن للأداء
        const keywords = searchName.toLowerCase().split(' ').filter(word => word.length > 2);
        for (const keyword of keywords) {
            club = this.logoDatabase.find(c => {
                const englishName = (c.englishName || '').toLowerCase();
                const arabicName = (c.arabicName || '').toLowerCase();
                const name = (c.name || '').toLowerCase();
                
                return englishName.includes(keyword) ||
                       arabicName.includes(keyword) ||
                       name.includes(keyword);
            });
            
            if (club && club.logoUrl) {
                return club.logoUrl;
            }
        }

        return null;
    }

    /**
     * ربط الشعارات بالبيانات - محسن ومضمون
     */
    enrichWithLogos(clubsData) {
        if (!clubsData || clubsData.length === 0) {
            return [];
        }

        if (!this.isInitialized) {
            console.warn('⚠️ النظام الموحد غير متهيأ، استخدام البيانات الأصلية');
            return clubsData.map(club => ({
                ...club,
                logoUrl: club.logoUrl || this.generateFallbackLogo(club.englishName || club.arabicName || club.name)
            }));
        }

        console.log('🎨 بدء ربط الشعارات بالبيانات...');

        const enrichedClubs = clubsData.map(club => {
            try {
                // البحث عن الشعار
                let logoUrl = club.logoUrl || club.logo;

                if (!logoUrl) {
                    // البحث بالاسم الإنجليزي أولاً
                    logoUrl = this.findClubLogo(club.englishName);
                    
                    // إذا لم نجد، جرب الاسم العربي
                    if (!logoUrl && club.arabicName) {
                        logoUrl = this.findClubLogo(club.arabicName);
                    }
                    
                    // إذا لم نجد، جرب الاسم العام
                    if (!logoUrl && club.name) {
                        logoUrl = this.findClubLogo(club.name);
                    }
                }

                const enrichedClub = {
                    ...club,
                    logoUrl: logoUrl || this.generateFallbackLogo(club.englishName || club.arabicName || club.name)
                };

                return enrichedClub;

            } catch (error) {
                console.warn(`⚠️ خطأ في ربط شعار ${club.englishName || club.arabicName || club.name}:`, error);
                
                return {
                    ...club,
                    logoUrl: this.generateFallbackLogo(club.englishName || club.arabicName || club.name)
                };
            }
        });

        console.log(`✅ تم ربط ${enrichedClubs.length} شعار بالبيانات`);
        return enrichedClubs;
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
     * إعداد المراقبين العامين - محسن
     */
    setupGlobalListeners() {
        // مراقبة تحديثات localStorage - محسن
        const storageHandler = (event) => {
            if (Object.values(this.storageKeys).includes(event.key)) {
                console.log('🔄 تم اكتشاف تحديث في البيانات:', event.key);
                // تأخير التحديث لتجنب التحديثات المتكررة
                setTimeout(() => {
                    this.loadAndSyncLogoDatabase();
                    this.broadcastMessage('database-updated', { 
                        key: event.key,
                        logoCount: this.logoDatabase.length 
                    });
                }, 1000);
            }
        };

        window.addEventListener('storage', storageHandler);

        // مراقبة BroadcastChannel - محسن
        if ('BroadcastChannel' in window) {
            try {
                const channel = new BroadcastChannel('universal-logo-fix');
                channel.addEventListener('message', (event) => {
                    if (event.data.type === 'database-updated') {
                        console.log('🔄 تم استلام تحديث قاعدة البيانات');
                        setTimeout(() => {
                            this.loadAndSyncLogoDatabase();
                        }, 500);
                    }
                });
            } catch (error) {
                console.warn('⚠️ خطأ في إعداد BroadcastChannel:', error);
            }
        }

        // مراقبة تحميل الصفحة - محسن
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.broadcastMessage('page-ready', { logoCount: this.logoDatabase.length });
            });
        } else {
            this.broadcastMessage('page-ready', { logoCount: this.logoDatabase.length });
        }
    }

    /**
     * إرسال رسائل عبر BroadcastChannel - محسن
     */
    broadcastMessage(type, data = {}) {
        if ('BroadcastChannel' in window) {
            try {
                const channel = new BroadcastChannel('universal-logo-fix');
                channel.postMessage({
                    type: type,
                    timestamp: new Date().toISOString(),
                    data: data
                });
                channel.close();
            } catch (error) {
                console.warn('⚠️ خطأ في إرسال رسالة BroadcastChannel:', error);
            }
        }
    }

    /**
     * تحديث قاعدة البيانات - محسن
     */
    async refreshDatabase() {
        console.log('🔄 تحديث قاعدة بيانات الشعارات...');
        await this.loadAndSyncLogoDatabase();
        this.broadcastMessage('database-refreshed', { logoCount: this.logoDatabase.length });
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

    /**
     * الحصول على عدد الأندية مع الشعارات
     */
    getClubsWithLogosCount() {
        return this.logoDatabase.filter(club => club.logoUrl).length;
    }

    /**
     * إضافة نادي جديد - محسن
     */
    addClub(club) {
        if (!club || !club.englishName) return false;
        
        const key = this.generateClubKey(club);
        if (!key) return false;

        // التحقق من عدم وجود النادي
        const existingIndex = this.logoDatabase.findIndex(c => this.generateClubKey(c) === key);
        
        if (existingIndex >= 0) {
            // تحديث النادي الموجود
            this.logoDatabase[existingIndex] = this.mergeClubData(this.logoDatabase[existingIndex], club);
        } else {
            // إضافة نادي جديد
            this.logoDatabase.push(club);
        }

        this.saveUnifiedDatabase();
        this.broadcastMessage('club-added', { club: club });
        return true;
    }

    /**
     * تصدير قاعدة البيانات
     */
    exportDatabase() {
        return {
            clubs: this.logoDatabase,
            exportDate: new Date().toISOString(),
            totalClubs: this.logoDatabase.length,
            clubsWithLogos: this.getClubsWithLogosCount(),
            version: this.version
        };
    }
}

// إنشاء نسخة عامة مع حماية ضد التهيئة المتعددة
if (!window.universalLogoFix) {
    window.universalLogoFix = new UniversalLogoFix();
}

// تصدير للاستخدام في الوحدات
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalLogoFix;
} 