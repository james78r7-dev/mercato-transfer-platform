/**
 * نظام Transfermarkt الموحد
 * نظام متكامل لإدارة البيانات والشعارات والعرض
 * 
 * يوفر هذا النظام واجهة موحدة للتعامل مع:
 * - استخراج البيانات من Transfermarkt
 * - ربط الشعارات من club-logo-manager
 * - حفظ وتحميل البيانات
 * - عرض البيانات في OBS
 */

class TransfermarktUnifiedSystem {
    constructor() {
        this.currentData = [];
        this.logoDatabase = [];
        this.dataManager = null;
        this.lastUpdate = null;
        this.dataSource = 'none';
        this.isInitialized = false;
        
        // تهيئة النظام
        this.init();
    }
    
    /**
     * تهيئة النظام
     */
    async init() {
        console.log('🚀 تهيئة نظام Transfermarkt الموحد...');
        
        try {
            // تحميل نظام إدارة البيانات إذا كان متاحاً
            if (typeof TransfermarktDataManager !== 'undefined') {
                this.dataManager = new TransfermarktDataManager();
                await this.dataManager.ensureDefaultClubs();
                console.log('✅ تم تهيئة مدير البيانات');
            }
            
            // تحميل قاعدة بيانات الشعارات
            await this.loadLogoDatabase();
            
            // تحميل البيانات المحفوظة
            await this.loadSavedData();
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة النظام الموحد بنجاح');
            
            // إعداد مراقبة التحديثات
            this.setupStorageListener();
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في تهيئة النظام الموحد:', error);
            return false;
        }
    }
    
    /**
     * تحميل قاعدة بيانات الشعارات
     */
    async loadLogoDatabase() {
        try {
            console.log('📊 تحميل قاعدة بيانات الشعارات...');
            
            // محاولة تحميل من localStorage أولاً
            const clubManagerData = localStorage.getItem('clubManagerData');
            const verifiedClubs = localStorage.getItem('verifiedClubs');
            
            let logoDatabase = [];
            
            if (clubManagerData) {
                const data = JSON.parse(clubManagerData);
                logoDatabase = logoDatabase.concat(data);
                console.log(`📥 تم تحميل ${data.length} نادي من clubManagerData`);
            }
            
            if (verifiedClubs) {
                const data = JSON.parse(verifiedClubs);
                logoDatabase = logoDatabase.concat(data);
                console.log(`📥 تم تحميل ${data.length} نادي من verifiedClubs`);
            }
            
            // إزالة التكرارات
            this.logoDatabase = logoDatabase.filter((club, index, self) => 
                index === self.findIndex(c => 
                    c.englishName === club.englishName || 
                    c.arabicName === club.arabicName
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
     * تحميل البيانات المحفوظة
     */
    async loadSavedData() {
        try {
            console.log('📂 تحميل البيانات المحفوظة...');
            
            // محاولة تحميل البيانات من النظام الجديد أولاً
            const realData = localStorage.getItem('transfermarktRealData');
            
            if (realData) {
                const data = JSON.parse(realData);
                
                if (data.clubs && Array.isArray(data.clubs) && data.clubs.length > 0) {
                    this.currentData = data.clubs;
                    this.lastUpdate = data.lastUpdate;
                    this.dataSource = data.source || 'saved';
                    
                    console.log(`✅ تم تحميل ${this.currentData.length} نادي من النظام الجديد`);
                    return this.currentData;
                }
            }
            
            // محاولة تحميل البيانات من النظام القديم
            const savedData = localStorage.getItem('transfermarktData');
            
            if (savedData) {
                const data = JSON.parse(savedData);
                
                if (Array.isArray(data) && data.length > 0) {
                    this.currentData = data;
                    this.lastUpdate = localStorage.getItem('transfermarktLastUpdate');
                    this.dataSource = 'legacy';
                    
                    console.log(`✅ تم تحميل ${this.currentData.length} نادي من النظام القديم`);
                    return this.currentData;
                }
            }
            
            console.log('⚠️ لا توجد بيانات محفوظة');
            return [];
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحفوظة:', error);
            return [];
        }
    }
    
    /**
     * حفظ البيانات الحالية
     */
    saveData(data = null, source = 'manual-save') {
        try {
            const dataToSave = data || this.currentData;
            
            if (!dataToSave || dataToSave.length === 0) {
                console.error('❌ لا توجد بيانات للحفظ');
                return false;
            }
            
            // حفظ البيانات مع طابع زمني
            const saveObject = {
                clubs: dataToSave,
                lastUpdate: new Date().toISOString(),
                source: source,
                version: '2025.2.0',
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem('transfermarktRealData', JSON.stringify(saveObject));
            localStorage.setItem('transfermarktData', JSON.stringify(dataToSave));
            localStorage.setItem('transfermarktLastUpdate', new Date().toISOString());
            
            this.lastUpdate = saveObject.lastUpdate;
            this.dataSource = source;
            
            // إرسال إشعار للصفحات الأخرى
            this.broadcastUpdate('data-saved');
            
            console.log(`💾 تم حفظ ${dataToSave.length} نادي بنجاح`);
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات:', error);
            return false;
        }
    }
    
    /**
     * البحث عن شعار النادي
     */
    findClubLogo(clubName) {
        if (!clubName) return null;
        
        // البحث في قاعدة البيانات المحملة
        const club = this.logoDatabase.find(c => 
            c.englishName === clubName || 
            c.arabicName === clubName ||
            c.name === clubName
        );
        
        if (club && club.logoUrl) {
            return club.logoUrl;
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
        
        // استخدام مدير البيانات إذا كان متاحاً
        if (this.dataManager) {
            return this.dataManager.getClubLogo(clubName);
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
        
        return clubsData.map(club => {
            try {
                // البحث عن الشعار
                let logoUrl = this.findClubLogo(club.englishName);
                
                // إذا لم نجد بالاسم الإنجليزي، جرب الاسم العربي
                if (!logoUrl && club.arabicName) {
                    logoUrl = this.findClubLogo(club.arabicName);
                }
                
                return {
                    ...club,
                    logoUrl: logoUrl || this.generateFallbackLogo(club.englishName || club.name)
                };
                
            } catch (error) {
                console.warn(`⚠️ خطأ في ربط شعار ${club.englishName}:`, error);
                
                return {
                    ...club,
                    logoUrl: this.generateFallbackLogo(club.englishName || club.name)
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
     * إرسال إشعار تحديث
     */
    broadcastUpdate(type = 'data-updated') {
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('transfermarkt-updates');
            channel.postMessage({
                type: type,
                timestamp: new Date().toISOString(),
                clubsCount: this.currentData.length
            });
            channel.close();
        }
    }
    
    /**
     * إعداد مراقبة التحديثات
     */
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === 'transfermarktRealData' || event.key === 'transfermarktData') {
                console.log('🔄 تم اكتشاف تحديث في البيانات');
                this.loadSavedData();
            } else if (event.key === 'clubManagerData' || event.key === 'verifiedClubs') {
                console.log('🔄 تم اكتشاف تحديث في قاعدة بيانات الشعارات');
                this.loadLogoDatabase();
            }
        });
    }
    
    /**
     * الحصول على البيانات الحالية
     */
    getData() {
        return this.currentData;
    }
    
    /**
     * تعيين البيانات الحالية
     */
    setData(data, save = true) {
        if (!data || data.length === 0) {
            console.error('❌ البيانات فارغة');
            return false;
        }
        
        this.currentData = data;
        
        if (save) {
            return this.saveData(data);
        }
        
        return true;
    }
    
    /**
     * الحصول على آخر تحديث
     */
    getLastUpdate() {
        return this.lastUpdate;
    }
    
    /**
     * الحصول على مصدر البيانات
     */
    getDataSource() {
        return this.dataSource;
    }
}

// إنشاء نسخة عالمية من النظام
window.transfermarktSystem = new TransfermarktUnifiedSystem();
