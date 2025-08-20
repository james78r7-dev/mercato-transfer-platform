/**
 * نظام الإصلاح السريع - Quick Fix System
 * حل فوري لمشكلة "فشل في تهيئة النظام"
 * إصدار مبسط ومضمون للعمل
 */

class QuickFixSystem {
    constructor() {
        this.version = '2025.1.0';
        this.isInitialized = false;
        this.defaultClubs = [
            {
                rank: 1,
                name: "ليفربول",
                englishName: "Liverpool FC",
                expenditure: "€308.68m",
                arrivals: 13,
                income: "€63.30m",
                departures: 6,
                balance: "€-245.38m",
                league: "الدوري الإنجليزي الممتاز",
                logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png",
                lastUpdated: new Date().toISOString()
            },
            {
                rank: 2,
                name: "تشيلسي",
                englishName: "Chelsea FC",
                expenditure: "€243.77m",
                arrivals: 22,
                income: "€121.48m",
                departures: 8,
                balance: "€-122.29m",
                league: "الدوري الإنجليزي الممتاز",
                logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png",
                lastUpdated: new Date().toISOString()
            },
            {
                rank: 3,
                name: "ريال مدريد",
                englishName: "Real Madrid",
                expenditure: "€167.50m",
                arrivals: 7,
                income: "€2.00m",
                departures: 4,
                balance: "€-165.50m",
                league: "الدوري الإسباني",
                logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png",
                lastUpdated: new Date().toISOString()
            }
        ];
    }

    async init() {
        console.log('🚀 تهيئة نظام الإصلاح السريع...');
        
        try {
            // ضمان وجود البيانات الأساسية
            await this.ensureDefaultData();
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة نظام الإصلاح السريع بنجاح');
            return true;
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام الإصلاح السريع:', error);
            return false;
        }
    }

    async ensureDefaultData() {
        try {
            // حفظ البيانات الافتراضية إذا لم تكن موجودة
            const realData = localStorage.getItem('transfermarktRealData');
            const oldData = localStorage.getItem('transfermarktData');

            if (!realData && !oldData) {
                console.log('📊 حفظ البيانات الافتراضية...');
                
                const dataToSave = {
                    clubs: this.defaultClubs,
                    lastUpdate: new Date().toISOString(),
                    source: 'quick-fix-system'
                };

                localStorage.setItem('transfermarktRealData', JSON.stringify(dataToSave));
                localStorage.setItem('transfermarktData', JSON.stringify(this.defaultClubs));
                localStorage.setItem('transfermarktLastUpdate', new Date().toISOString());
                
                console.log('✅ تم حفظ البيانات الافتراضية');
            }

            // ضمان وجود قاعدة بيانات الشعارات الأساسية
            await this.ensureLogoDatabase();
            
        } catch (error) {
            console.warn('⚠️ خطأ في ضمان البيانات الأساسية:', error);
        }
    }

    async ensureLogoDatabase() {
        try {
            const clubManagerData = localStorage.getItem('clubManagerData');
            
            if (!clubManagerData) {
                console.log('🎨 إنشاء قاعدة بيانات الشعارات الأساسية...');
                
                const basicLogos = [
                    {
                        englishName: 'Liverpool FC',
                        arabicName: 'ليفربول',
                        logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png'
                    },
                    {
                        englishName: 'Chelsea FC',
                        arabicName: 'تشيلسي',
                        logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png'
                    },
                    {
                        englishName: 'Real Madrid',
                        arabicName: 'ريال مدريد',
                        logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png'
                    },
                    {
                        englishName: 'Arsenal FC',
                        arabicName: 'آرسنال',
                        logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png'
                    },
                    {
                        englishName: 'Manchester United',
                        arabicName: 'مانشستر يونايتد',
                        logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Manchester-United-Logo.png'
                    }
                ];

                localStorage.setItem('clubManagerData', JSON.stringify(basicLogos));
                console.log('✅ تم إنشاء قاعدة بيانات الشعارات الأساسية');
            }
        } catch (error) {
            console.warn('⚠️ خطأ في إنشاء قاعدة بيانات الشعارات:', error);
        }
    }

    getData() {
        try {
            // محاولة الحصول على البيانات الحقيقية أولاً
            const realData = localStorage.getItem('transfermarktRealData');
            if (realData) {
                const data = JSON.parse(realData);
                if (data.clubs && Array.isArray(data.clubs) && data.clubs.length > 0) {
                    return data.clubs;
                }
            }

            // محاولة الحصول على البيانات القديمة
            const oldData = localStorage.getItem('transfermarktData');
            if (oldData) {
                const data = JSON.parse(oldData);
                if (Array.isArray(data) && data.length > 0) {
                    return data;
                }
            }

            // إرجاع البيانات الافتراضية
            return this.defaultClubs;
        } catch (error) {
            console.warn('⚠️ خطأ في الحصول على البيانات:', error);
            return this.defaultClubs;
        }
    }

    findClubLogo(clubName) {
        try {
            const clubManagerData = localStorage.getItem('clubManagerData');
            if (clubManagerData) {
                const data = JSON.parse(clubManagerData);
                const club = data.find(c => 
                    c.englishName === clubName || 
                    c.arabicName === clubName ||
                    c.name === clubName
                );
                return club ? club.logoUrl : null;
            }
        } catch (error) {
            console.warn('⚠️ خطأ في البحث عن الشعار:', error);
        }
        return null;
    }

    generateFallbackLogo(clubName) {
        const initials = clubName.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=400&background=1a1a2e&color=ffd700&bold=true&format=png&rounded=true&font-size=0.6`;
    }

    enrichWithLogos(clubsData) {
        if (!clubsData || clubsData.length === 0) {
            return [];
        }

        return clubsData.map(club => {
            let logoUrl = club.logoUrl || club.logo;
            
            if (!logoUrl) {
                logoUrl = this.findClubLogo(club.englishName || club.arabicName || club.name);
            }

            return {
                ...club,
                logoUrl: logoUrl || this.generateFallbackLogo(club.englishName || club.arabicName || club.name)
            };
        });
    }
}

// إنشاء نسخة عالمية
window.quickFixSystem = new QuickFixSystem();

console.log('✅ تم تحميل نظام الإصلاح السريع');
