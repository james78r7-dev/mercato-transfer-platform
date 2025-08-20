/**
 * نظام إدارة البيانات البسيط والفعال - Transfermarkt 2025
 * نظام موحد لإدارة البيانات والشعارات بطريقة مبسطة
 */

class TransfermarktDataManager {
    constructor() {
        this.version = '2025.2.0';
        this.storageKeys = {
            clubs: 'clubManagerData',
            transfermarktData: 'transfermarktData',
            lastUpdate: 'lastDataUpdate'
        };

        this.defaultClubs = [
            {
                id: 'chelsea_fc',
                englishName: 'Chelsea FC',
                arabicName: 'تشيلسي',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png'
            },
            {
                id: 'psg',
                englishName: 'Paris Saint-Germain',
                arabicName: 'باريس سان جيرمان',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Paris-Saint-Germain-Logo.png'
            },
            {
                id: 'real_madrid',
                englishName: 'Real Madrid',
                arabicName: 'ريال مدريد',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png'
            },
            {
                id: 'arsenal_fc',
                englishName: 'Arsenal FC',
                arabicName: 'آرسنال',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png'
            },
            {
                id: 'manchester_united',
                englishName: 'Manchester United',
                arabicName: 'مانشستر يونايتد',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Manchester-United-Logo.png'
            },
            {
                id: 'bayern_munich',
                englishName: 'Bayern Munich',
                arabicName: 'بايرن ميونخ',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Bayern-Munich-Logo.png'
            },
            {
                id: 'liverpool_fc',
                englishName: 'Liverpool FC',
                arabicName: 'ليفربول',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png'
            },
            {
                id: 'juventus_fc',
                englishName: 'Juventus FC',
                arabicName: 'يوفنتوس',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Juventus-Logo.png'
            },
            {
                id: 'manchester_city',
                englishName: 'Manchester City',
                arabicName: 'مانشستر سيتي',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Manchester-City-Logo.png'
            },
            {
                id: 'atletico_madrid',
                englishName: 'Atlético Madrid',
                arabicName: 'أتلتيكو مدريد',
                logoUrl: 'https://logos-world.net/wp-content/uploads/2020/06/Atletico-Madrid-Logo.png'
            }
        ];

        this.isInitialized = false;
        this.init();
    }

    async init() {
        console.log('🚀 تهيئة نظام إدارة البيانات...');

        try {
            // التأكد من وجود الشعارات الأساسية
            await this.ensureDefaultClubs();

            this.isInitialized = true;
            console.log('✅ تم تهيئة نظام إدارة البيانات بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تهيئة النظام:', error);
            this.isInitialized = true; // تهيئة حتى لو فشلت
        }
    }

    // ضمان وجود الشعارات الأساسية
    async ensureDefaultClubs() {
        try {
            let clubs = this.getClubs();

            if (!clubs || clubs.length === 0) {
                console.log('📋 إنشاء الشعارات الأساسية...');
                this.saveClubs(this.defaultClubs);
                console.log(`✅ تم إنشاء ${this.defaultClubs.length} شعار أساسي`);
            } else {
                console.log(`📋 تم العثور على ${clubs.length} شعار محفوظ`);
            }
        } catch (error) {
            console.error('❌ خطأ في ضمان الشعارات الأساسية:', error);
        }
    }

    // حفظ الأندية
    saveClubs(clubs) {
        try {
            console.log(`💾 حفظ ${clubs.length} نادي...`);
            localStorage.setItem(this.storageKeys.clubs, JSON.stringify(clubs));
            console.log('✅ تم حفظ الأندية بنجاح');
            return true;
        } catch (error) {
            console.error('❌ خطأ في حفظ الأندية:', error);
            return false;
        }
    }

    // تحميل الأندية
    getClubs() {
        try {
            const data = localStorage.getItem(this.storageKeys.clubs);
            if (data) {
                const clubs = JSON.parse(data);
                console.log(`📋 تم تحميل ${clubs.length} نادي`);
                return clubs;
            }
            console.log('📋 لا توجد أندية محفوظة');
            return [];
        } catch (error) {
            console.error('❌ خطأ في تحميل الأندية:', error);
            return [];
        }
    }
            
    // البحث عن شعار نادي
    getClubLogo(clubName) {
        try {
            const clubs = this.getClubs();

            // البحث المباشر
            let club = clubs.find(c =>
                c.englishName === clubName ||
                c.arabicName === clubName
            );

            if (club && club.logoUrl) {
                console.log(`✅ وجد شعار لـ "${clubName}": ${club.logoUrl}`);
                return club.logoUrl;
            }

            // البحث المتقدم (تجاهل FC, CF, etc.)
            const cleanName = clubName.replace(/\s*(FC|CF|AC|SC)\s*$/i, '').trim();
            club = clubs.find(c => {
                const cleanEnglish = c.englishName?.replace(/\s*(FC|CF|AC|SC)\s*$/i, '').trim();
                const cleanArabic = c.arabicName?.replace(/\s*(FC|CF|AC|SC)\s*$/i, '').trim();
                return cleanEnglish === cleanName || cleanArabic === cleanName;
            });

            if (club && club.logoUrl) {
                console.log(`✅ وجد شعار متقدم لـ "${clubName}": ${club.logoUrl}`);
                return club.logoUrl;
            }

            // إرجاع placeholder
            console.log(`❌ لم يوجد شعار لـ "${clubName}" - استخدام placeholder`);
            return this.generatePlaceholder(clubName);
        } catch (error) {
            console.error('❌ خطأ في البحث عن الشعار:', error);
            return this.generatePlaceholder(clubName);
        }
    }

    // إنشاء placeholder
    generatePlaceholder(clubName) {
        const initials = clubName.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=400&background=3b82f6&color=ffffff&bold=true&format=png&rounded=true`;
    }

    // إضافة نادي جديد
    addClub(club) {
        try {
            const clubs = this.getClubs();

            // التحقق من عدم وجود النادي مسبقاً
            const exists = clubs.find(c => c.englishName === club.englishName);
            if (exists) {
                console.log(`⚠️ النادي ${club.englishName} موجود مسبقاً`);
                return false;
            }

            // إضافة النادي
            club.id = club.id || `club_${Date.now()}`;
            clubs.push(club);

            return this.saveClubs(clubs);
        } catch (error) {
            console.error('❌ خطأ في إضافة النادي:', error);
            return false;
        }
    }

}

// إنشاء مثيل عام
window.TransfermarktDataManager = TransfermarktDataManager;
window.dataManager = new TransfermarktDataManager();


}

// إنشاء مثيل عام
window.TransfermarktDataManager = TransfermarktDataManager;
window.dataManager = new TransfermarktDataManager();
