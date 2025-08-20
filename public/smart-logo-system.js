/**
 * نظام الشعارات الذكي المتطور
 * يدعم الأندية الجديدة تلقائياً مع مصادر متعددة للشعارات
 */

class SmartLogoSystem {
    constructor() {
        this.logoCache = new Map();
        this.fallbackSources = [
            'https://logos-world.net/wp-content/uploads/2020/06/',
            'https://logoeps.com/wp-content/uploads/2013/03/',
            'https://seeklogo.com/images/',
            'https://www.pngkey.com/png/full/',
            'https://www.freepnglogos.com/uploads/football-club-logo-png/'
        ];
        
        // قاعدة بيانات شاملة للأندية مع أسمائها المختلفة
        this.clubDatabase = {
            // الدوري الإنجليزي الممتاز
            "Liverpool FC": {
                arabicName: "ليفربول",
                aliases: ["Liverpool", "LFC", "The Reds"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/liverpool-vector-logo.png",
                league: "الدوري الإنجليزي الممتاز",
                country: "إنجلترا",
                colors: ["#C8102E", "#00B2A9"]
            },
            "Chelsea FC": {
                arabicName: "تشيلسي",
                aliases: ["Chelsea", "CFC", "The Blues"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/chelsea-vector-logo.png",
                league: "الدوري الإنجليزي الممتاز",
                country: "إنجلترا",
                colors: ["#034694", "#6CABDD"]
            },
            "Manchester United": {
                arabicName: "مانشستر يونايتد",
                aliases: ["Man United", "MUFC", "United", "The Red Devils"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Manchester-United-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/manchester-united-vector-logo.png",
                league: "الدوري الإنجليزي الممتاز",
                country: "إنجلترا",
                colors: ["#DA020E", "#FBE122"]
            },
            "Manchester City": {
                arabicName: "مانشستر سيتي",
                aliases: ["Man City", "MCFC", "City", "The Citizens"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Manchester-City-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/manchester-city-vector-logo.png",
                league: "الدوري الإنجليزي الممتاز",
                country: "إنجلترا",
                colors: ["#6CABDD", "#1C2C5B"]
            },
            "Arsenal FC": {
                arabicName: "آرسنال",
                aliases: ["Arsenal", "AFC", "The Gunners"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/arsenal-vector-logo.png",
                league: "الدوري الإنجليزي الممتاز",
                country: "إنجلترا",
                colors: ["#EF0107", "#023474"]
            },
            "Tottenham Hotspur": {
                arabicName: "توتنهام",
                aliases: ["Tottenham", "Spurs", "THFC"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Tottenham-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/tottenham-vector-logo.png",
                league: "الدوري الإنجليزي الممتاز",
                country: "إنجلترا",
                colors: ["#132257", "#FFFFFF"]
            },
            
            // الدوري الإسباني
            "Real Madrid": {
                arabicName: "ريال مدريد",
                aliases: ["Real", "Madrid", "Los Blancos"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/real-madrid-vector-logo.png",
                league: "الدوري الإسباني",
                country: "إسبانيا",
                colors: ["#FFFFFF", "#FEBE10"]
            },
            "FC Barcelona": {
                arabicName: "برشلونة",
                aliases: ["Barcelona", "Barca", "FCB", "Blaugrana"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Barcelona-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/barcelona-vector-logo.png",
                league: "الدوري الإسباني",
                country: "إسبانيا",
                colors: ["#A50044", "#004D98"]
            },
            "Atlético de Madrid": {
                arabicName: "أتلتيكو مدريد",
                aliases: ["Atletico Madrid", "Atletico", "ATM"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Atletico-Madrid-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/atletico-madrid-vector-logo.png",
                league: "الدوري الإسباني",
                country: "إسبانيا",
                colors: ["#CE3524", "#FFFFFF"]
            },
            
            // الدوري الألماني
            "Bayern Munich": {
                arabicName: "بايرن ميونخ",
                aliases: ["Bayern", "Munich", "FCB", "Die Roten"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Bayern-Munich-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/bayern-munich-vector-logo.png",
                league: "الدوري الألماني",
                country: "ألمانيا",
                colors: ["#DC052D", "#0066B2"]
            },
            "Bayer 04 Leverkusen": {
                arabicName: "باير ليفركوزن",
                aliases: ["Bayer Leverkusen", "Leverkusen", "B04"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Bayer-Leverkusen-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/bayer-leverkusen-vector-logo.png",
                league: "الدوري الألماني",
                country: "ألمانيا",
                colors: ["#E32221", "#000000"]
            },
            
            // الدوري الإيطالي
            "Juventus FC": {
                arabicName: "يوفنتوس",
                aliases: ["Juventus", "Juve", "La Vecchia Signora"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Juventus-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/juventus-vector-logo.png",
                league: "الدوري الإيطالي",
                country: "إيطاليا",
                colors: ["#000000", "#FFFFFF"]
            },
            "AC Milan": {
                arabicName: "ميلان",
                aliases: ["Milan", "ACM", "Rossoneri"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/AC-Milan-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/ac-milan-vector-logo.png",
                league: "الدوري الإيطالي",
                country: "إيطاليا",
                colors: ["#FB090B", "#000000"]
            },
            "Inter Milan": {
                arabicName: "إنتر ميلان",
                aliases: ["Inter", "Internazionale", "Nerazzurri"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Inter-Milan-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/inter-milan-vector-logo.png",
                league: "الدوري الإيطالي",
                country: "إيطاليا",
                colors: ["#0068A8", "#000000"]
            },
            
            // الدوري الفرنسي
            "Paris Saint-Germain": {
                arabicName: "باريس سان جيرمان",
                aliases: ["PSG", "Paris", "Les Parisiens"],
                logo: "https://logos-world.net/wp-content/uploads/2020/06/Paris-Saint-Germain-Logo.png",
                fallback: "https://logoeps.com/wp-content/uploads/2013/03/psg-vector-logo.png",
                league: "الدوري الفرنسي",
                country: "فرنسا",
                colors: ["#004170", "#DA020E"]
            }
        };
        
        this.initializeSystem();
    }
    
    /**
     * تهيئة النظام
     */
    initializeSystem() {
        console.log('🎨 تم تهيئة نظام الشعارات الذكي');
        console.log(`📊 قاعدة البيانات تحتوي على ${Object.keys(this.clubDatabase).length} نادي`);
    }
    
    /**
     * البحث عن النادي بطرق متعددة
     */
    findClub(clubName) {
        if (!clubName) return null;
        
        const searchName = clubName.toLowerCase().trim();
        
        // البحث المباشر
        for (const [key, club] of Object.entries(this.clubDatabase)) {
            if (key.toLowerCase() === searchName) {
                return { key, ...club };
            }
        }
        
        // البحث بالاسم العربي
        for (const [key, club] of Object.entries(this.clubDatabase)) {
            if (club.arabicName && club.arabicName.toLowerCase() === searchName) {
                return { key, ...club };
            }
        }
        
        // البحث بالأسماء البديلة
        for (const [key, club] of Object.entries(this.clubDatabase)) {
            if (club.aliases) {
                for (const alias of club.aliases) {
                    if (alias.toLowerCase() === searchName) {
                        return { key, ...club };
                    }
                }
            }
        }
        
        // البحث الجزئي
        for (const [key, club] of Object.entries(this.clubDatabase)) {
            if (key.toLowerCase().includes(searchName) || searchName.includes(key.toLowerCase())) {
                return { key, ...club };
            }
        }
        
        return null;
    }
    
    /**
     * الحصول على شعار النادي مع نظام ذكي للبحث
     */
    async getClubLogo(clubName) {
        if (!clubName) return this.generateFallbackLogo('??');
        
        // التحقق من الكاش
        if (this.logoCache.has(clubName)) {
            return this.logoCache.get(clubName);
        }
        
        // البحث عن النادي
        const club = this.findClub(clubName);
        
        if (club) {
            // التحقق من صحة الشعار الأساسي
            const primaryLogo = await this.validateLogo(club.logo);
            if (primaryLogo) {
                this.logoCache.set(clubName, primaryLogo);
                return primaryLogo;
            }
            
            // التحقق من الشعار البديل
            const fallbackLogo = await this.validateLogo(club.fallback);
            if (fallbackLogo) {
                this.logoCache.set(clubName, fallbackLogo);
                return fallbackLogo;
            }
        }
        
        // البحث التلقائي في مصادر متعددة
        const autoLogo = await this.searchLogoAutomatically(clubName);
        if (autoLogo) {
            this.logoCache.set(clubName, autoLogo);
            return autoLogo;
        }
        
        // إنشاء شعار بديل
        const generatedLogo = this.generateFallbackLogo(clubName);
        this.logoCache.set(clubName, generatedLogo);
        return generatedLogo;
    }
    
    /**
     * التحقق من صحة رابط الشعار
     */
    async validateLogo(logoUrl) {
        if (!logoUrl) return null;
        
        try {
            const response = await fetch(logoUrl, { method: 'HEAD' });
            if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
                return logoUrl;
            }
        } catch (error) {
            console.warn(`⚠️ فشل في التحقق من الشعار: ${logoUrl}`);
        }
        
        return null;
    }
    
    /**
     * البحث التلقائي عن الشعار
     */
    async searchLogoAutomatically(clubName) {
        const searchTerms = [
            clubName.replace(/\s+/g, '-').toLowerCase(),
            clubName.replace(/\s+/g, '_').toLowerCase(),
            clubName.replace(/\s+/g, '').toLowerCase()
        ];
        
        for (const source of this.fallbackSources) {
            for (const term of searchTerms) {
                const possibleUrls = [
                    `${source}${term}-logo.png`,
                    `${source}${term}-vector-logo.png`,
                    `${source}${term}.png`,
                    `${source}${term}-badge.png`
                ];
                
                for (const url of possibleUrls) {
                    const validLogo = await this.validateLogo(url);
                    if (validLogo) {
                        console.log(`✅ تم العثور على شعار تلقائياً: ${url}`);
                        return validLogo;
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * إنشاء شعار بديل عصري
     */
    generateFallbackLogo(clubName) {
        const initials = clubName.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        const colors = ['1a1a2e', '16213e', '0f3460', '533483', '7209b7'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=400&background=${randomColor}&color=ffd700&bold=true&format=png&rounded=true&font-size=0.6`;
    }
    
    /**
     * الحصول على معلومات النادي الكاملة
     */
    getClubInfo(clubName) {
        const club = this.findClub(clubName);
        
        if (club) {
            return {
                name: club.arabicName || clubName,
                englishName: club.key,
                league: club.league,
                country: club.country,
                colors: club.colors,
                aliases: club.aliases
            };
        }
        
        return {
            name: clubName,
            englishName: clubName,
            league: 'الدوري الأوروبي',
            country: 'أوروبا',
            colors: ['#1a1a2e', '#ffd700'],
            aliases: []
        };
    }
    
    /**
     * إضافة نادي جديد إلى قاعدة البيانات
     */
    addClub(englishName, clubData) {
        this.clubDatabase[englishName] = clubData;
        console.log(`✅ تم إضافة نادي جديد: ${englishName}`);
    }
    
    /**
     * تحديث شعار نادي موجود
     */
    updateClubLogo(clubName, newLogoUrl) {
        const club = this.findClub(clubName);
        if (club) {
            this.clubDatabase[club.key].logo = newLogoUrl;
            this.logoCache.delete(clubName);
            console.log(`✅ تم تحديث شعار ${clubName}`);
        }
    }
    
    /**
     * مسح الكاش
     */
    clearCache() {
        this.logoCache.clear();
        console.log('🗑️ تم مسح كاش الشعارات');
    }
    
    /**
     * إحصائيات النظام
     */
    getStats() {
        return {
            totalClubs: Object.keys(this.clubDatabase).length,
            cachedLogos: this.logoCache.size,
            fallbackSources: this.fallbackSources.length
        };
    }
}

// إنشاء مثيل عام للنظام
window.SmartLogoSystem = new SmartLogoSystem();

// تصدير للاستخدام في Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartLogoSystem;
}
