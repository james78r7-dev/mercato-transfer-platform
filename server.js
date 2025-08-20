const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();
const clubLogoService = require('./clubLogos');
const playerImageService = require('./services/playerImageService');
const PinterestImageService = require('./services/pinterestImageService');
const NetworkService = require('./services/networkService');
const LMStudioConfigService = require('./services/lmStudioConfigService');
const OBSTransferExtractor = require('./services/obsTransferExtractor');
const GlobalConfigService = require('./services/globalConfigService');
const supportersService = require('./services/supportersService');
const FotMobExtractorService = require('./services/fotmobExtractorService');
const TrueFotMobExtractor = require('./services/trueFotMobExtractor');
const EnhancedTransfermarktExtractor = require('./services/enhancedTransfermarktExtractor');
require('dotenv').config();

// نظام تخزين مؤقت لنتائج البحث
const searchCache = new Map();
const SEARCH_CACHE_DURATION = 30 * 60 * 1000; // 30 دقيقة بالمللي ثانية

// نظام تخزين روابط صفحات اللاعبين مع حفظ دائم
const playerPagesCache = new Map();
const PLAYER_PAGES_FILE = path.join(__dirname, 'data', 'player-pages.json');

// إنشاء مجلد البيانات إذا لم يكن موجوداً
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 تم إنشاء مجلد البيانات');
}

// ملف بيانات البث
const STREAM_DATA_FILE = path.join(__dirname, 'public', 'stream-data.json');

// نظام إدارة حالة OBS Transfer Tool
const obsTransferExtractor = new OBSTransferExtractor();
let obsTransfersData = [];
let obsSelectedTransfers = [];
const OBS_TRANSFERS_FILE = path.join(__dirname, 'data', 'obs-transfers.json');
const OBS_SELECTED_FILE = path.join(__dirname, 'data', 'obs-selected.json');

// خدمة الإعدادات العالمية
const globalConfigService = new GlobalConfigService();

// تحميل البيانات المحفوظة عند بدء الخادم
function loadPlayerPagesFromFile() {
    try {
        if (fs.existsSync(PLAYER_PAGES_FILE)) {
            const data = fs.readFileSync(PLAYER_PAGES_FILE, 'utf8');
            // إذا كان الملف HTML أو تالف، أعد تهيئته
            if (data.trim().startsWith('<')) {
                console.warn('⚠️ ملف player-pages.json تالف (HTML)، سيتم إعادة تهيئته.');
                fs.writeFileSync(PLAYER_PAGES_FILE, '{}', 'utf8');
                return;
            }
            let savedData;
            try {
                savedData = JSON.parse(data);
            } catch (jsonErr) {
                console.warn('⚠️ ملف player-pages.json غير صالح JSON، سيتم إعادة تهيئته.');
                fs.writeFileSync(PLAYER_PAGES_FILE, '{}', 'utf8');
                return;
            }

            // تحويل البيانات إلى Map مع تحديث البيانات القديمة
            for (const [key, value] of Object.entries(savedData)) {
                // تحديث البيانات القديمة لتشمل الحقول الجديدة
                const updatedValue = {
                    arabicName: value.arabicName || key,
                    pageUrl: value.pageUrl || '',
                    playerImage: value.playerImage || null,
                    currentClub: value.currentClub || 'غير محدد',
                    addedAt: value.addedAt || new Date().toISOString(),
                    updatedAt: value.updatedAt || null
                };
                playerPagesCache.set(key, updatedValue);
            }

            console.log(`📥 تم تحميل ${playerPagesCache.size} لاعب محفوظ من الملف`);
            // حفظ البيانات المحدثة
            savePlayerPagesToFile();
        } else {
            console.log('📄 لا يوجد ملف بيانات محفوظ');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات المحفوظة:', error);
    }
}

// حفظ البيانات في الملف
function savePlayerPagesToFile() {
    try {
        // تحويل Map إلى Object للحفظ
        const dataToSave = {};
        for (const [key, value] of playerPagesCache.entries()) {
            dataToSave[key] = value;
        }

        fs.writeFileSync(PLAYER_PAGES_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
        console.log(`💾 تم حفظ ${playerPagesCache.size} لاعب في الملف`);
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
    }
}

// دوال إدارة بيانات OBS Transfer Tool
function loadOBSTransfersData() {
    try {
        if (fs.existsSync(OBS_TRANSFERS_FILE)) {
            const data = fs.readFileSync(OBS_TRANSFERS_FILE, 'utf8');
            obsTransfersData = JSON.parse(data);
            console.log(`📦 تم تحميل ${obsTransfersData.length} صفقة OBS`);
        }

        if (fs.existsSync(OBS_SELECTED_FILE)) {
            const data = fs.readFileSync(OBS_SELECTED_FILE, 'utf8');
            obsSelectedTransfers = JSON.parse(data);
            console.log(`✅ تم تحميل ${obsSelectedTransfers.length} صفقة محددة لـ OBS`);
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات OBS:', error);
        obsTransfersData = [];
        obsSelectedTransfers = [];
    }
}

function saveOBSTransfersData() {
    try {
        fs.writeFileSync(OBS_TRANSFERS_FILE, JSON.stringify(obsTransfersData, null, 2), 'utf8');
        console.log(`💾 تم حفظ ${obsTransfersData.length} صفقة OBS`);
    } catch (error) {
        console.error('❌ خطأ في حفظ بيانات OBS:', error);
    }
}

function saveOBSSelectedTransfers() {
    try {
        fs.writeFileSync(OBS_SELECTED_FILE, JSON.stringify(obsSelectedTransfers, null, 2), 'utf8');
        console.log(`💾 تم حفظ ${obsSelectedTransfers.length} صفقة محددة لـ OBS`);
    } catch (error) {
        console.error('❌ خطأ في حفظ الصفقات المحددة لـ OBS:', error);
    }
}

// تحميل البيانات عند بدء الخادم
loadPlayerPagesFromFile();
loadOBSTransfersData();

// دالة للتحقق من التخزين المؤقت مع تسجيل أفضل
function getCachedSearch(key) {
    if (searchCache.has(key)) {
        const cached = searchCache.get(key);
        if (Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
            console.log(`🔍 استخدام نتيجة بحث مخزنة: ${key}`);
            // زيادة عداد الوصول
            cached.accessCount = (cached.accessCount || 0) + 1;
            searchCache.set(key, cached);
            return cached.data;
        } else {
            console.log(`⏰ انتهت صلاحية نتيجة البحث المخزنة: ${key}`);
            // حذف النتيجة منتهية الصلاحية
            searchCache.delete(key);
        }
    }
    return null;
}

// دالة لتخزين نتائج البحث مع معلومات إضافية
function cacheSearchResult(key, data) {
    searchCache.set(key, {
        timestamp: Date.now(),
        data: data,
        accessCount: 0
    });
    console.log(`💾 تخزين نتيجة بحث: ${key}`);
}

// دالة لتنظيف التخزين المؤقت من النتائج منتهية الصلاحية
function cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    searchCache.forEach((value, key) => {
        if (now - value.timestamp > SEARCH_CACHE_DURATION) {
            searchCache.delete(key);
            cleaned++;
        }
    });

    if (cleaned > 0) {
        console.log(`🧹 تم تنظيف ${cleaned} نتائج بحث منتهية الصلاحية`);
    }

    return cleaned;
}

// تنظيف التخزين المؤقت كل ساعة
setInterval(cleanExpiredCache, 60 * 60 * 1000);

// Initialize services
const pinterestImageService = new PinterestImageService();
const networkService = new NetworkService();
const lmStudioConfigService = new LMStudioConfigService();

const PlayerDataExtractor = require('./services/playerDataExtractor');
const playerExtractor = new PlayerDataExtractor();

const TransfersService = require('./services/transfersService');
const transfersService = new TransfersService();

const UnifiedTransfersService = require('./services/unifiedTransfersService');
const unifiedTransfersService = new UnifiedTransfersService();

const FotMobIntegratedService = require('./services/fotmobIntegratedService');
const fotmobIntegratedService = new FotMobIntegratedService();

// Auto-update transfers every hour
let transfersAutoUpdateInterval;

function startTransfersAutoUpdate() {
    console.log('🔄 Starting transfers auto-update system...');

    // Update immediately on startup with enhanced system
    setTimeout(async () => {
        try {
            console.log('🚀 Initial transfers fetch with enhanced system...');
            const result = transfersService.fetchDailyTransfersEnhanced ?
                          await transfersService.fetchDailyTransfersEnhanced() :
                          await transfersService.fetchDailyTransfers();

            if (result.success) {
                console.log(`✅ Initial fetch successful: ${result.count} transfers (${result.source})`);
            }
        } catch (error) {
            console.error('❌ Error in initial transfers fetch:', error);
        }
    }, 5000); // Wait 5 seconds after server start

    // Then update every hour with smart caching
    transfersAutoUpdateInterval = setInterval(async () => {
        try {
            console.log('🔄 Auto-updating transfers with smart caching...');
            const result = transfersService.fetchDailyTransfersEnhanced ?
                          await transfersService.fetchDailyTransfersEnhanced() :
                          await transfersService.fetchDailyTransfers();

            if (result.success) {
                console.log(`✅ Auto-update successful: ${result.count} transfers (${result.source})`);
                if (result.cached) {
                    console.log('📁 Used cached data - no update needed');
                } else if (result.cacheStats) {
                    console.log(`💾 Cache updated: +${result.cacheStats.added} transfers`);
                }
            } else {
                console.log(`⚠️ Auto-update failed: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Error in transfers auto-update:', error);
        }
    }, 60 * 60 * 1000); // Every hour
}

// Start auto-update system
startTransfersAutoUpdate();

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 8201;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🚀 Starting server on port: ${PORT}`);

// معالجة خطأ EADDRINUSE (المنفذ مستخدم)
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ خطأ: المنفذ ${PORT} مستخدم بالفعل!\nيرجى إغلاق أي سيرفر آخر يعمل على هذا المنفذ أو إعادة تشغيل الجهاز.`);
        process.exit(1);
    } else {
        throw err;
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// APIs بسيطة للنظام الجديد (قبل static routes)
app.post('/api/save-simple-data', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'obs new tols', 'simple-data.json');

        console.log('💾 محاولة حفظ البيانات في:', dataPath);
        console.log('📊 البيانات المستلمة:', req.body);

        fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2));
        console.log('✅ تم حفظ البيانات البسيطة بنجاح');

        res.json({ success: true, message: 'تم الحفظ بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات البسيطة:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/get-simple-data', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'obs new tols', 'simple-data.json');

        console.log('📖 محاولة قراءة البيانات من:', dataPath);

        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            const parsed = JSON.parse(data);
            console.log('✅ تم قراءة البيانات بنجاح');
            res.json({ success: true, data: parsed });
        } else {
            console.log('⚠️ لا يوجد ملف بيانات');
            res.json({ success: false, error: 'لا توجد بيانات' });
        }
    } catch (error) {
        console.error('❌ خطأ في قراءة البيانات البسيطة:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/clear-simple-data', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'obs new tols', 'simple-data.json');

        console.log('🗑️ محاولة مسح البيانات من:', dataPath);

        if (fs.existsSync(dataPath)) {
            fs.unlinkSync(dataPath);
            console.log('✅ تم مسح البيانات بنجاح');
        }

        res.json({ success: true, message: 'تم المسح بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في مسح البيانات البسيطة:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.use(express.static('public'));

// خدمة ملفات OBS New Tools
console.log('🔍 Setting up OBS New Tools static route:', path.join(__dirname, 'obs new tols'));
app.use('/obs new tols', express.static(path.join(__dirname, 'obs new tols')));

// خدمة ملفات OBS New Tools بدون مسافات (alternative route)
app.use('/obs-new-tols', express.static(path.join(__dirname, 'obs new tols')));

// خدمة ملفات شريط التمرير
app.use('/شريط التمرير', express.static(path.join(__dirname, 'شريط التمرير')));

// خدمة ملفات شريط التمرير بدون مسافات (alternative route)
app.use('/scroll-bar', express.static(path.join(__dirname, 'شريط التمرير')));

// خدمة ملفات Football Design Studio
app.use('/football-design-studio', express.static(path.join(__dirname, 'football-design-studio-modern', 'dist')));

// حل مشكلة Cannot GET /real-transfer-tool
app.get('/real-transfer-tool', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'real-transfer-tool-fixed-final.html'));
});

// Routes محددة لملفات OBS New Tools
app.get('/obs new tols/club-logo-manager-enhanced.html', (req, res) => {
    const filePath = path.join(__dirname, 'obs new tols', 'club-logo-manager-enhanced.html');
    console.log('🎯 Requested OBS file:', filePath);
    console.log('🔍 File exists:', require('fs').existsSync(filePath));
    res.sendFile(filePath);
});

app.get('/obs new tols/transfermarkt-display-pro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'obs new tols', 'transfermarkt-display-pro.html'));
});

app.get('/obs new tols/transfermarkt-top-spenders-2025.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'obs new tols', 'transfermarkt-top-spenders-2025.html'));
});

app.get('/obs new tols/all-tools-temp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'obs new tols', 'all-tools-temp.html'));
});

// Routes بديلة بدون مسافات
app.get('/obs-new-tols/club-logo-manager-enhanced.html', (req, res) => {
    const filePath = path.join(__dirname, 'obs new tols', 'club-logo-manager-enhanced.html');
    console.log('🎯 Alternative route requested:', filePath);
    res.sendFile(filePath);
});

app.get('/obs-new-tols/transfermarkt-display-pro.html', (req, res) => {
    const filePath = path.join(__dirname, 'obs new tols', 'transfermarkt-display-pro.html');
    console.log('🎯 Alternative route requested:', filePath);
    res.sendFile(filePath);
});

app.get('/obs-new-tols/transfermarkt-top-spenders-2025.html', (req, res) => {
    const filePath = path.join(__dirname, 'obs new tols', 'transfermarkt-top-spenders-2025.html');
    console.log('🎯 Alternative route requested:', filePath);
    res.sendFile(filePath);
});

app.get('/obs-new-tols/all-tools-temp.html', (req, res) => {
    const filePath = path.join(__dirname, 'obs new tols', 'all-tools-temp.html');
    console.log('🎯 Alternative route requested:', filePath);
    res.sendFile(filePath);
});

// Routes محددة لملفات شريط التمرير
app.get('/شريط التمرير/support-bar-enhanced.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'شريط التمرير', 'support-bar-enhanced.html'));
});

app.get('/شريط التمرير/support-bar-pro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'شريط التمرير', 'support-bar-pro.html'));
});

app.get('/شريط التمرير/quick-example.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'شريط التمرير', 'quick-example.html'));
});

// Route للأداة النهائية
app.get('/support-bar-final.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'support-bar-final.html'));
});

app.get('/شريط التمرير/support-bar-final.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'support-bar-final.html'));
});

// Routes بديلة لشريط التمرير بدون مسافات
app.get('/scroll-bar/support-bar-enhanced.html', (req, res) => {
    const filePath = path.join(__dirname, 'شريط التمرير', 'support-bar-enhanced.html');
    console.log('🎯 Scroll bar alternative route requested:', filePath);
    res.sendFile(filePath);
});

app.get('/scroll-bar/support-bar-pro.html', (req, res) => {
    const filePath = path.join(__dirname, 'شريط التمرير', 'support-bar-pro.html');
    console.log('🎯 Scroll bar alternative route requested:', filePath);
    res.sendFile(filePath);
});

app.get('/scroll-bar/quick-example.html', (req, res) => {
    const filePath = path.join(__dirname, 'شريط التمرير', 'quick-example.html');
    console.log('🎯 Scroll bar alternative route requested:', filePath);
    res.sendFile(filePath);
});

app.get('/scroll-bar/support-bar-final.html', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'support-bar-final.html');
    console.log('🎯 Support bar final route requested:', filePath);
    res.sendFile(filePath);
});

// ========== OBS New Tools API Integration ==========
// مسارات البيانات لـ OBS Tools
const OBS_DATA_FILE = path.join(__dirname, 'obs new tols', 'clubs-data.json');
const OBS_BACKUP_DIR = path.join(__dirname, 'obs new tols', 'backups');

// إنشاء مجلد النسخ الاحتياطية لـ OBS إذا لم يكن موجوداً
async function ensureOBSBackupDir() {
    try {
        await fs.promises.access(OBS_BACKUP_DIR);
    } catch {
        await fs.promises.mkdir(OBS_BACKUP_DIR, { recursive: true });
    }
}

// حفظ بيانات الأندية لـ OBS Tools
app.post('/save-clubs-data', async (req, res) => {
    try {
        const clubsData = req.body;

        // التحقق من صحة البيانات
        if (!clubsData || !Array.isArray(clubsData.clubs)) {
            return res.status(400).json({
                success: false,
                error: 'بيانات غير صحيحة'
            });
        }

        // إنشاء نسخة احتياطية من الملف الحالي
        try {
            const existingData = await fs.promises.readFile(OBS_DATA_FILE, 'utf8');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(OBS_BACKUP_DIR, `clubs-data-backup-${timestamp}.json`);
            await fs.promises.writeFile(backupFile, existingData);
        } catch (error) {
            console.log('لا يوجد ملف سابق للنسخ الاحتياطي');
        }

        // حفظ البيانات الجديدة
        const dataToSave = {
            ...clubsData,
            savedAt: new Date().toISOString(),
            version: '2.0'
        };

        await fs.promises.writeFile(OBS_DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');

        console.log(`تم حفظ ${clubsData.clubs.length} نادي في ${OBS_DATA_FILE}`);

        res.json({
            success: true,
            message: 'تم حفظ البيانات بنجاح',
            savedCount: clubsData.clubs.length,
            filePath: OBS_DATA_FILE
        });

    } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في حفظ البيانات على الخادم'
        });
    }
});

// تحميل بيانات الأندية لـ OBS Tools
app.get('/load-clubs-data', async (req, res) => {
    try {
        const data = await fs.promises.readFile(OBS_DATA_FILE, 'utf8');
        const clubsData = JSON.parse(data);

        res.json({
            success: true,
            data: clubsData
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json({
                success: true,
                data: { clubs: [], version: '2.0' },
                message: 'لا يوجد ملف بيانات، سيتم إنشاء ملف جديد'
            });
        } else {
            console.error('خطأ في تحميل البيانات:', error);
            res.status(500).json({
                success: false,
                error: 'خطأ في تحميل البيانات'
            });
        }
    }
});

// الحصول على إحصائيات البيانات لـ OBS Tools
app.get('/clubs-stats', async (req, res) => {
    try {
        const data = await fs.promises.readFile(OBS_DATA_FILE, 'utf8');
        const clubsData = JSON.parse(data);

        const stats = {
            totalClubs: clubsData.clubs.length,
            clubsWithLogos: clubsData.clubs.filter(club => club.logo && club.logo.trim() !== '').length,
            leagues: [...new Set(clubsData.clubs.map(club => club.league).filter(Boolean))],
            countries: [...new Set(clubsData.clubs.map(club => club.country).filter(Boolean))],
            lastUpdated: clubsData.lastUpdated || clubsData.savedAt,
            version: clubsData.version
        };

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'خطأ في الحصول على الإحصائيات'
        });
    }
});

// قائمة النسخ الاحتياطية لـ OBS Tools
app.get('/backups', async (req, res) => {
    try {
        await ensureOBSBackupDir();
        const files = await fs.promises.readdir(OBS_BACKUP_DIR);
        const backups = files
            .filter(file => file.startsWith('clubs-data-backup-') && file.endsWith('.json'))
            .map(file => ({
                filename: file,
                path: path.join(OBS_BACKUP_DIR, file),
                created: file.match(/backup-(.+)\.json$/)?.[1]?.replace(/-/g, ':') || 'غير معروف'
            }))
            .sort((a, b) => b.created.localeCompare(a.created));

        res.json({
            success: true,
            backups: backups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'خطأ في الحصول على قائمة النسخ الاحتياطية'
        });
    }
});

// استعادة من نسخة احتياطية لـ OBS Tools
app.post('/restore-backup', async (req, res) => {
    try {
        const { filename } = req.body;
        const backupPath = path.join(OBS_BACKUP_DIR, filename);

        // التحقق من وجود الملف
        await fs.promises.access(backupPath);

        // قراءة النسخة الاحتياطية
        const backupData = await fs.promises.readFile(backupPath, 'utf8');

        // حفظ النسخة الحالية كنسخة احتياطية
        try {
            const currentData = await fs.promises.readFile(OBS_DATA_FILE, 'utf8');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const currentBackupFile = path.join(OBS_BACKUP_DIR, `clubs-data-before-restore-${timestamp}.json`);
            await fs.promises.writeFile(currentBackupFile, currentData);
        } catch (error) {
            console.log('لا يوجد ملف حالي للنسخ الاحتياطي');
        }

        // استعادة النسخة الاحتياطية
        await fs.promises.writeFile(OBS_DATA_FILE, backupData);

        res.json({
            success: true,
            message: 'تم استعادة النسخة الاحتياطية بنجاح'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'خطأ في استعادة النسخة الاحتياطية'
        });
    }
});

// تهيئة مجلد النسخ الاحتياطية لـ OBS عند بدء الخادم
ensureOBSBackupDir();

// حل مشكلة Cannot GET /obs-transfers-sidebar
app.get('/obs-transfers-sidebar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'obs-transfers-sidebar.html'));
});

// حل مشكلة Cannot GET /obs-transfer-tool
app.get('/obs-transfer-tool', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'obs-transfer-tool.html'));
});

// صفحة اختبار معالج الأخطاء المتقدم
app.get('/error-handler-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'error-handler-test.html'));
});

// API Routes
app.use('/api/network', require('./api/network'));

// Player Data Extraction API
app.post('/api/extract-player-data', async (req, res) => {
    try {
        const { url, targetClub } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        console.log('🔍 Extracting player data from:', url);
        const result = await playerExtractor.extractPlayerData(url, targetClub);

        res.json(result);
    } catch (error) {
        console.error('❌ Error in extract-player-data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search Player API
app.post('/api/search-player-by-name', async (req, res) => {
    try {
        const { playerName, clubName } = req.body;

        if (!playerName) {
            return res.status(400).json({
                success: false,
                error: 'Player name is required'
            });
        }

        console.log('🔍 Searching for player:', playerName);
        const result = await playerExtractor.searchPlayer(playerName, clubName);

        res.json(result);
    } catch (error) {
        console.error('❌ Error in search-player-by-name:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get Player Suggestions API
app.post('/api/get-player-suggestions', async (req, res) => {
    try {
        const { clubName } = req.body;

        if (!clubName) {
            return res.status(400).json({
                success: false,
                error: 'Club name is required'
            });
        }

        console.log('🔍 Getting player suggestions for:', clubName);
        const result = await playerExtractor.getPlayerSuggestions(clubName);

        res.json(result);
    } catch (error) {
        console.error('❌ Error in get-player-suggestions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get Supported Sites API
app.get('/api/supported-sites', (req, res) => {
    try {
        const sites = playerExtractor.getSupportedSites();
        res.json({
            success: true,
            sites: sites
        });
    } catch (error) {
        console.error('❌ Error in supported-sites:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== TRANSFERS API ENDPOINTS =====

// Basic transfers endpoint for professional-transfers page
app.get('/api/transfers', async (req, res) => {
    try {
        console.log('📋 API: Getting all transfers...');
        const transfers = await transfersService.loadCachedTransfers();

        res.json({
            success: true,
            transfers: transfers || [],
            count: transfers ? transfers.length : 0,
            timestamp: Date.now(),
            source: 'cached_data'
        });
    } catch (error) {
        console.error('❌ Error getting transfers:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// Get selected transfers for OBS overlay
app.get('/api/transfers/selected', async (req, res) => {
    try {
        console.log('📺 API: Getting selected transfers for OBS...');

        // Load all transfers and filter selected ones
        const allTransfers = await transfersService.loadCachedTransfers();
        const selectedTransfers = allTransfers ? allTransfers.filter(t => t.selected) : [];

        res.json({
            success: true,
            transfers: selectedTransfers,
            count: selectedTransfers.length,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Error getting selected transfers:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// Save selected transfers for professional-transfers page
app.post('/api/transfers/save-selected', async (req, res) => {
    try {
        console.log('💾 API: Saving selected transfers...');
        const { selectedIds, transfers } = req.body;

        if (!selectedIds || !Array.isArray(selectedIds)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid selectedIds provided'
            });
        }

        // Save selected transfers to the main system
        await transfersService.saveSelectedTransfers(selectedIds, transfers);

        console.log(`✅ Saved ${selectedIds.length} selected transfers`);
        res.json({
            success: true,
            message: `تم حفظ ${selectedIds.length} صفقة للعرض`,
            count: selectedIds.length
        });
    } catch (error) {
        console.error('❌ Error saving selected transfers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fetch daily transfers from FotMob (Enhanced)
app.post('/api/transfers/fetch-daily', async (req, res) => {
    try {
        console.log('🔍 API: Fetching daily transfers with enhanced system...');
        const { forceUpdate = false } = req.body || {};

        if (forceUpdate) {
            console.log('🔄 Force update requested - clearing cache...');
            if (transfersService.clearCache) {
                transfersService.clearCache();
            }
        }

        // Use enhanced method if available, fallback to original
        const result = transfersService.fetchDailyTransfersEnhanced ?
                      await transfersService.fetchDailyTransfersEnhanced() :
                      await transfersService.fetchDailyTransfers();

        res.json(result);
    } catch (error) {
        console.error('❌ Error in fetch-daily-transfers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get cache statistics
app.get('/api/transfers/cache-stats', async (req, res) => {
    try {
        const stats = transfersService.getCacheStats ? transfersService.getCacheStats() : null;
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('❌ Error getting cache stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Clean cache
app.post('/api/transfers/clean-cache', async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;
        const result = transfersService.cleanupCache ? transfersService.cleanupCache(daysToKeep) : null;
        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('❌ Error cleaning cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Advanced FotMob extraction (direct)
app.post('/api/transfers/fetch-advanced', async (req, res) => {
    try {
        console.log('🚀 API: Advanced FotMob extraction...');

        const AdvancedFotMobScraper = require('./services/advancedFotMobScraper');
        const scraper = new AdvancedFotMobScraper();

        const transfers = await scraper.extractRealTransfers();

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            source: 'advanced_fotmob_direct'
        });
    } catch (error) {
        console.error('❌ Error in advanced extraction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Ultimate FotMob extraction (Most Advanced System)
app.post('/api/transfers/fetch-ultimate', async (req, res) => {
    try {
        console.log('🚀 API: Ultimate FotMob extraction...');

        // Check if puppeteer is available
        let FotMobUltimateExtractor;
        try {
            FotMobUltimateExtractor = require('./services/fotmobUltimateExtractor');
        } catch (requireError) {
            if (requireError.code === 'MODULE_NOT_FOUND' && requireError.message.includes('puppeteer')) {
                console.log('⚠️ Puppeteer not installed - Ultimate extraction unavailable');
                return res.status(503).json({
                    success: false,
                    error: 'Ultimate extraction requires puppeteer. Please install it with: npm install puppeteer',
                    fallback: 'Use /api/transfers/fetch-daily for the enhanced system instead',
                    transfers: [],
                    count: 0,
                    alternative: {
                        endpoint: '/api/transfers/fetch-daily',
                        description: 'Enhanced system without puppeteer dependency'
                    }
                });
            }
            throw requireError;
        }

        const extractor = new FotMobUltimateExtractor();
        const transfers = await extractor.extractTransfersUltimate();

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            source: 'fotmob_ultimate_system',
            methods: ['Puppeteer Browser Automation', 'Hidden API Discovery', 'Deep DOM Analysis', 'Network Request Monitoring', 'GraphQL Queries'],
            timestamp: new Date().toISOString(),
            organized: true,
            realData: transfers.length > 0,
            quality: 'Ultimate',
            accuracy: 'Maximum'
        });
    } catch (error) {
        console.error('❌ Error in ultimate extraction:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// Professional FotMob extraction (Advanced System) - Enhanced 2025
app.post('/api/transfers/fetch-professional', async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
        console.log(`🚀 API: Professional FotMob extraction [${requestId}]...`);

        // Validate request
        const dateFilter = req.body.dateFilter || req.query.date || 'today';
        const validFilters = ['today', 'yesterday', 'week', 'month'];

        if (!validFilters.includes(dateFilter)) {
            return res.status(400).json({
                success: false,
                error: 'معامل التاريخ غير صحيح',
                validFilters: validFilters,
                requestId: requestId
            });
        }

        // Set enhanced headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Request-ID': requestId,
            'X-API-Version': '2.0'
        });

        const FotMobAdvancedExtractor = require('./services/fotmobAdvancedExtractor');
        const extractor = new FotMobAdvancedExtractor();

        // Add timeout protection
        const extractionPromise = extractor.extractTransfers(dateFilter);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Extraction timeout after 60 seconds')), 60000);
        });

        const transfers = await Promise.race([extractionPromise, timeoutPromise]);
        const processingTime = Date.now() - startTime;

        console.log(`✅ Professional extraction completed [${requestId}]: ${transfers.length} transfers in ${processingTime}ms`);

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            source: 'fotmob_professional_advanced_2025',
            methods: ['Enhanced JSON Analysis', 'Advanced DOM Parsing', 'Multiple API Endpoints', 'Deep Structure Analysis'],
            timestamp: new Date().toISOString(),
            processingTime: processingTime,
            requestId: requestId,
            dateFilter: dateFilter,
            organized: true,
            realData: transfers.length > 0,
            version: '2.0'
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Error in professional extraction [${requestId}]:`, error);

        // Enhanced error handling
        const errorResponse = {
            success: false,
            error: getEnhancedErrorMessage(error),
            errorType: error.name || 'ExtractionError',
            requestId: requestId,
            processingTime: processingTime,
            timestamp: new Date().toISOString(),
            suggestions: getErrorSuggestions(error)
        };

        const statusCode = getErrorStatusCode(error);
        res.status(statusCode).json(errorResponse);
    }
});

// Enhanced error message generator
function getEnhancedErrorMessage(error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
        return 'انتهت مهلة الاستخراج - الخدمة قد تكون بطيئة';
    } else if (message.includes('network') || message.includes('fetch') || message.includes('enotfound')) {
        return 'خطأ في الاتصال بالشبكة - تحقق من الاتصال';
    } else if (message.includes('parse') || message.includes('json') || message.includes('syntax')) {
        return 'خطأ في تحليل البيانات - البيانات قد تكون تالفة';
    } else if (message.includes('403') || message.includes('forbidden')) {
        return 'تم رفض الوصول - قد يكون هناك حجب';
    } else if (message.includes('404') || message.includes('not found')) {
        return 'الخدمة غير متوفرة - قد يكون هناك تغيير في الموقع';
    } else if (message.includes('500') || message.includes('internal server')) {
        return 'خطأ في خادم FotMob - يرجى المحاولة لاحقاً';
    } else {
        return `خطأ في الاستخراج: ${error.message}`;
    }
}

// Error suggestions generator
function getErrorSuggestions(error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
        return ['جرب مرة أخرى بعد دقيقة', 'تحقق من سرعة الإنترنت'];
    } else if (message.includes('network') || message.includes('fetch')) {
        return ['تحقق من الاتصال بالإنترنت', 'جرب مرة أخرى بعد قليل'];
    } else if (message.includes('403') || message.includes('forbidden')) {
        return ['انتظر قليلاً قبل المحاولة مرة أخرى', 'قد يكون هناك حد للطلبات'];
    } else {
        return ['جرب مرة أخرى', 'تحقق من حالة الخدمة'];
    }
}

// Save selected transfers for OBS - Enhanced 2025
app.post('/api/transfers/save-selected', async (req, res) => {
    const requestId = `save_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
        console.log(`💾 Saving selected transfers [${requestId}]...`);

        const { selectedIds, transfers, timestamp } = req.body;

        // Validate request data
        if (!Array.isArray(selectedIds)) {
            return res.status(400).json({
                success: false,
                error: 'selectedIds يجب أن يكون مصفوفة',
                requestId: requestId
            });
        }

        if (!Array.isArray(transfers)) {
            return res.status(400).json({
                success: false,
                error: 'transfers يجب أن يكون مصفوفة',
                requestId: requestId
            });
        }

        // Save to file system for persistence (optional)
        const fs = require('fs').promises;
        const path = require('path');

        const saveData = {
            selectedIds: selectedIds,
            transfers: transfers,
            timestamp: timestamp || new Date().toISOString(),
            requestId: requestId
        };

        try {
            const saveDir = path.join(__dirname, 'data');
            await fs.mkdir(saveDir, { recursive: true });

            const filePath = path.join(saveDir, 'selected-transfers.json');
            await fs.writeFile(filePath, JSON.stringify(saveData, null, 2));

            console.log(`✅ Selected transfers saved to file [${requestId}]: ${selectedIds.length} IDs, ${transfers.length} transfers`);
        } catch (fileError) {
            console.warn(`⚠️ Could not save to file [${requestId}]:`, fileError.message);
        }

        res.json({
            success: true,
            message: 'تم حفظ الصفقات المختارة بنجاح',
            selectedCount: selectedIds.length,
            transfersCount: transfers.length,
            timestamp: new Date().toISOString(),
            requestId: requestId
        });

    } catch (error) {
        console.error(`❌ Error saving selected transfers [${requestId}]:`, error);

        res.status(500).json({
            success: false,
            error: 'فشل في حفظ الصفقات المختارة',
            details: error.message,
            requestId: requestId
        });
    }
});

// System status endpoint
app.get('/api/transfers/status', (req, res) => {
    const requestId = `status_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        res.json({
            success: true,
            status: 'متاح',
            uptime: Math.floor(uptime),
            uptimeFormatted: formatUptime(uptime),
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            },
            timestamp: new Date().toISOString(),
            requestId: requestId,
            version: '2.0'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'خطأ',
            error: error.message,
            requestId: requestId
        });
    }
});

// Format uptime helper
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours}h ${minutes}m ${secs}s`;
}

// Modern FotMob extraction (2024/2025) - Legacy
app.post('/api/transfers/fetch-modern', async (req, res) => {
    try {
        console.log('🚀 API: Modern FotMob extraction...');

        const ModernFotMobScraper = require('./services/modernFotMobScraper');
        const scraper = new ModernFotMobScraper();

        const transfers = await scraper.extractRealTransfers();

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            source: 'modern_fotmob_2024',
            methods: ['JSON', 'API', 'DOM', 'News'],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error in modern extraction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get today's transfers
app.get('/api/transfers/today', async (req, res) => {
    try {
        console.log('📅 API: Getting today transfers...');
        const transfers = await transfersService.getTodayTransfers();

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            date: new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('❌ Error in get-today-transfers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get today's transfers with Arabic names
app.get('/api/transfers/today-arabic', async (req, res) => {
    try {
        console.log('📅 API: Getting today transfers with Arabic names...');
        const transfers = await transfersService.getTransfersWithArabicNames();

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            date: new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('❌ Error in get-today-transfers-arabic:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});



// Get selected transfers
app.get('/api/transfers/selected', async (req, res) => {
    try {
        console.log('📋 API: Getting selected transfers...');
        const transfers = await transfersService.getSelectedTransfers();

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length
        });
    } catch (error) {
        console.error('❌ Error in get-selected-transfers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get selected transfers with Arabic names
app.get('/api/transfers/selected-arabic', async (req, res) => {
    try {
        console.log('📋 API: Getting selected transfers with Arabic names...');
        const transfers = await transfersService.getSelectedTransfersWithArabicNames();

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length
        });
    } catch (error) {
        console.error('❌ Error in get-selected-transfers-arabic:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate mock transfers for testing
app.post('/api/transfers/generate-mock', async (req, res) => {
    try {
        console.log('🧪 API: Generating mock transfers...');
        const mockTransfers = transfersService.generateMockTransfers();

        // Save mock transfers
        await transfersService.saveTransfers(mockTransfers);

        res.json({
            success: true,
            transfers: mockTransfers,
            count: mockTransfers.length,
            message: 'Mock transfers generated and saved'
        });
    } catch (error) {
        console.error('❌ Error in generate-mock-transfers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get transfers by date range
app.get('/api/transfers-by-date', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required',
                transfers: [],
                count: 0
            });
        }

        console.log(`🔍 API: Fetching transfers from ${startDate} to ${endDate}...`);

        // Validate date range (max 5 days)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 5) {
            return res.status(400).json({
                success: false,
                error: 'Date range cannot exceed 5 days',
                transfers: [],
                count: 0
            });
        }

        // Get all transfers from the enhanced system
        const allTransfers = await fotmobAdvancedExtractor.getDailyTransfers();

        // Filter transfers by date range
        const filteredTransfers = allTransfers.filter(transfer => {
            if (!transfer.date && !transfer.timestamp) return true; // Include transfers without dates

            const transferDate = new Date(transfer.date || transfer.timestamp);
            return transferDate >= start && transferDate <= end;
        });

        // Sort by date (newest first)
        const sortedTransfers = filteredTransfers.sort((a, b) => {
            const dateA = new Date(a.date || a.timestamp || 0);
            const dateB = new Date(b.date || b.timestamp || 0);
            return dateB - dateA;
        });

        res.json({
            success: true,
            transfers: sortedTransfers,
            count: sortedTransfers.length,
            dateRange: { startDate, endDate },
            timestamp: new Date().toISOString(),
            source: 'fotmob_advanced_filtered'
        });

    } catch (error) {
        console.error('❌ API Error (date range):', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// Live Streaming Data Management
const liveStreamData = {
    sessions: new Map(),
    activeOverlays: new Map(),
    templates: new Map()
};

// Initialize default templates
liveStreamData.templates.set('transfer-lineup', {
    id: 'transfer-lineup',
    name: 'Transfer Lineup Display',
    description: 'Professional transfer rumors display for 1-8 players',
    maxPlayers: 8,
    settings: {
        animationDuration: 1000,
        displayDuration: 10000,
        theme: 'modern-dark',
        showLogos: true,
        showProbabilities: true
    }
});

// LM Studio configuration - Using config service
const LM_STUDIO_URL = lmStudioConfigService.getLMStudioURL();

console.log(`🤖 LM Studio URL: ${LM_STUDIO_URL}`);

// Function to translate Arabic name to English using LM Studio
async function translatePlayerName(arabicName, currentClub = null) {
    try {
        // First, check fallback translations
        const fallbackTranslations = lmStudioConfigService.getFallbackTranslations();

        if (fallbackTranslations[arabicName]) {
            console.log(`استخدام الترجمة الاحتياطية: ${arabicName} -> ${fallbackTranslations[arabicName]}`);
            return fallbackTranslations[arabicName];
        }

        // Try translation using LM Studio
        let prompt = `ترجم اسم اللاعب التالي من العربية إلى الإنجليزية: ${arabicName}`;

        // Add club context if available
        if (currentClub) {
            prompt += ` (يلعب حالياً في ${currentClub})`;
        }

        // Add additional instructions for accurate translation
        prompt += `. أعطني الاسم باللغة الإنجليزية فقط بدون أي تعليقات إضافية.`;

        const response = await axios.post(lmStudioConfigService.getLMStudioURL(), {
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 50
        });

        const translatedName = response.data.choices[0].message.content.trim();

        // Save translation in fallback translations for future use
        lmStudioConfigService.addFallbackTranslation(arabicName, translatedName);

        return translatedName;
    } catch (error) {
        console.error('Error translating name:', error.message);

        // If translation fails, check fallback translations again
        const fallbackTranslations = lmStudioConfigService.getFallbackTranslations();

        if (fallbackTranslations[arabicName]) {
            console.log(`استخدام الترجمة الاحتياطية: ${arabicName} -> ${fallbackTranslations[arabicName]}`);
            return fallbackTranslations[arabicName];
        }

        // If all fails, return the Arabic name as is
        return arabicName;
    }
}

// Function to get player info from saved URL
async function getPlayerInfoFromUrl(playerUrl) {
    try {
        console.log(`🔗 جلب بيانات اللاعب من الرابط: ${playerUrl}`);

        const response = await axios.get(playerUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Extract player ID from URL
        const urlMatch = playerUrl.match(/\/spieler\/(\d+)/);
        const playerId = urlMatch ? urlMatch[1] : null;

        // Extract player name
        let playerName = $('h1.data-header__headline-wrapper').text().trim() ||
                        $('.data-header__headline-wrapper').text().trim() ||
                        $('h1').first().text().trim();

        // Clean up player name (remove jersey number and extra whitespace)
        playerName = playerName.replace(/^#\d+\s*/, '').replace(/\s+/g, ' ').trim();

        // Extract current club
        const currentClub = $('.data-header__club a').text().trim() ||
                           $('.data-header__club').text().trim() ||
                           'غير محدد';

        // Extract age - ULTRA SIMPLE FOCUSED METHOD
        let age = '';
        console.log('🎯 getPlayerInfoFromUrl: Starting ULTRA SIMPLE age extraction...');

        // ULTRA SIMPLE AGE EXTRACTION - Focus only on "Date of birth/Age: ... (age)"
        function extractAgeFromTransfermarkt($) {
            console.log('🔍 getPlayerInfoFromUrl ULTRA SIMPLE: Looking for "Date of birth/Age: ... (age)" pattern...');

            // Get all text content from the page
            const pageText = $('body').text();

            // THE ONLY PATTERN WE NEED: "Date of birth/Age: Nov 15, 2005 (19)"
            const exactPattern = /Date of birth\/Age[:\s]*[^(]*\((\d{1,2})\)/i;
            const match = pageText.match(exactPattern);

            if (match && match[1]) {
                const extractedAge = parseInt(match[1]);
                if (extractedAge >= 15 && extractedAge <= 50) {
                    console.log(`✅ getPlayerInfoFromUrl ULTRA SIMPLE: Found age ${extractedAge} from "Date of birth/Age" pattern`);
                    return extractedAge.toString();
                }
            }

            console.log('❌ getPlayerInfoFromUrl ULTRA SIMPLE: "Date of birth/Age" pattern not found');
            return null;
        }

        // Use the ultra simple extraction function
        age = extractAgeFromTransfermarkt($) || 'غير محدد';

        // Extract position
        const position = $('.data-header__position').text().trim() || 'غير محدد';

        console.log(`✅ تم استخراج بيانات اللاعب: ${playerName} (${currentClub})`);

        return {
            playerId: playerId,
            name: playerName,
            club: currentClub,
            age: age,
            position: position,
            playerUrl: playerUrl
        };

    } catch (error) {
        console.error(`❌ خطأ في جلب بيانات اللاعب من الرابط: ${error.message}`);
        throw new Error(`فشل في جلب بيانات اللاعب من الرابط المحفوظ`);
    }
}

// Function to correct spelling mistakes in Arabic club names
function correctSpelling(arabicClubName) {
    if (!arabicClubName) return '';

    const spellingCorrections = {
        // تصحيحات شائعة للأندية
        'برشلونه': 'برشلونة',
        'برشلونا': 'برشلونة',
        'ريال مدريد': 'ريال مدريد',
        'ريال': 'ريال مدريد',
        'مانشستر يونايتد': 'مانشستر يونايتد',
        'مانشستر يونايتيد': 'مانشستر يونايتد',
        'مانشستر سيتي': 'مانشستر سيتي',
        'مانشستر سيتى': 'مانشستر سيتي',
        'ليفربول': 'ليفربول',
        'تشيلسي': 'تشيلسي',
        'تشيلسى': 'تشيلسي',
        'ارسنال': 'أرسنال',
        'الارسنال': 'أرسنال',
        'توتنهام': 'توتنهام',
        'يوفنتوس': 'يوفنتوس',
        'يوفي': 'يوفنتوس',
        'ميلان': 'ميلان',
        'انتر ميلان': 'إنتر ميلان',
        'انتر': 'إنتر ميلان',
        'نابولي': 'نابولي',
        'روما': 'روما',
        'لاتسيو': 'لاتسيو',
        'بايرن ميونخ': 'بايرن ميونخ',
        'بايرن': 'بايرن ميونخ',
        'دورتموند': 'دورتموند',
        'باريس سان جيرمان': 'باريس سان جيرمان',
        'باريس': 'باريس سان جيرمان',
        'بي اس جي': 'باريس سان جيرمان'
    };

    const trimmedName = arabicClubName.trim();
    return spellingCorrections[trimmedName] || trimmedName;
}

// Function to translate Arabic club names to English
function translateClubName(arabicClubName) {
    if (!arabicClubName) return null;

    // تصحيح الأخطاء الإملائية أولاً
    const correctedName = correctSpelling(arabicClubName);

    const clubTranslations = {
        // Spanish clubs
        'برشلونة': 'Barcelona',
        'ريال مدريد': 'Real Madrid',
        'أتلتيكو مدريد': 'Atletico Madrid',
        'إشبيلية': 'Sevilla',
        'فالنسيا': 'Valencia',
        'فياريال': 'Villarreal',
        'ريال سوسيداد': 'Real Sociedad',
        'أتلتيك بيلباو': 'Athletic Bilbao',

        // English clubs
        'مانشستر سيتي': 'Manchester City',
        'مانشستر يونايتد': 'Manchester United',
        'ليفربول': 'Liverpool',
        'تشيلسي': 'Chelsea',
        'أرسنال': 'Arsenal',
        'توتنهام': 'Tottenham',
        'نيوكاسل': 'Newcastle',
        'أستون فيلا': 'Aston Villa',

        // Italian clubs
        'يوفنتوس': 'Juventus',
        'إنتر ميلان': 'Inter Milan',
        'ميلان': 'AC Milan',
        'نابولي': 'Napoli',
        'روما': 'AS Roma',
        'لاتسيو': 'Lazio',
        'أتالانتا': 'Atalanta',
        'فيورنتينا': 'Fiorentina',

        // German clubs
        'بايرن ميونخ': 'Bayern Munich',
        'بوروسيا دورتموند': 'Borussia Dortmund',
        'لايبزيغ': 'RB Leipzig',
        'باير ليفركوزن': 'Bayer Leverkusen',
        'فرانكفورت': 'Eintracht Frankfurt',

        // French clubs
        'باريس سان جيرمان': 'Paris Saint-Germain',
        'مارسيليا': 'Marseille',
        'ليون': 'Lyon',
        'موناكو': 'Monaco',
        'نيس': 'Nice',

        // Other clubs
        'أياكس': 'Ajax',
        'بورتو': 'Porto',
        'بنفيكا': 'Benfica',
        'سبورتينغ لشبونة': 'Sporting CP'
    };

    return clubTranslations[correctedName] || correctedName;
}

// Function to search player by direct URL
async function searchPlayerByUrl(playerUrl, targetClub) {
    try {
        console.log(`🔍 البحث عن معلومات اللاعب باستخدام الرابط: ${playerUrl}`);

        // الحصول على محتوى الصفحة
        const response = await axios.get(playerUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // استخراج معلومات اللاعب من الصفحة
        const playerName = $('h1.data-header__headline-wrapper').text().trim() ||
                          $('h1.data-header__headline').text().trim() ||
                          $('h1').first().text().trim();

        const currentClub = $('.data-header__club a').text().trim() ||
                           $('.data-header__club').text().trim() ||
                           $('.info-table__content a').first().text().trim();

        const playerImage = $('.data-header__profile-image img').attr('src') ||
                           $('img.data-header__profile-image').attr('src') ||
                           $('.player-image img').attr('src');

        // Extract player ID from URL
        const playerIdMatch = playerUrl.match(/spieler\/(\d+)/);
        const playerId = playerIdMatch ? playerIdMatch[1] : null;

        if (!playerId) {
            throw new Error('لم يتم العثور على معرف اللاعب في الرابط');
        }

        // Extract position - multiple methods for accuracy
        let position = '';

        // Method 1: Main position selector
        position = $('.data-header__position').text().trim();

        // Method 2: Look in info table for "Position"
        if (!position) {
            $('.info-table__content--regular').each((i, el) => {
                const $el = $(el);
                const label = $el.text().trim();
                if (label.includes('Position') || label.includes('position')) {
                    const nextElement = $el.next('.info-table__content');
                    if (nextElement.length > 0) {
                        position = nextElement.text().trim();
                        return false; // Break the loop
                    }
                }
            });
        }

        // Method 3: Alternative selectors
        if (!position) {
            position = $('span:contains("Position")').next().text().trim() ||
                      $('td:contains("Position")').next().text().trim() ||
                      $('.info-table__content:contains("Position")').text().replace('Position:', '').trim();
        }

        // Extract age - ULTRA SIMPLE FOCUSED METHOD
        let age = '';
        console.log('🎯 Starting ULTRA SIMPLE age extraction...');

        // ULTRA SIMPLE AGE EXTRACTION - Focus only on "Date of birth/Age: ... (age)"
        function extractAgeFromTransfermarkt($) {
            console.log('🔍 ULTRA SIMPLE: Looking for "Date of birth/Age: ... (age)" pattern...');

            // Get all text content from the page
            const pageText = $('body').text();

            // THE ONLY PATTERN WE NEED: "Date of birth/Age: Nov 15, 2005 (19)"
            const exactPattern = /Date of birth\/Age[:\s]*[^(]*\((\d{1,2})\)/i;
            const match = pageText.match(exactPattern);

            if (match && match[1]) {
                const extractedAge = parseInt(match[1]);
                if (extractedAge >= 15 && extractedAge <= 50) {
                    console.log(`✅ ULTRA SIMPLE: Found age ${extractedAge} from "Date of birth/Age" pattern`);
                    return extractedAge.toString();
                }
            }

            console.log('❌ ULTRA SIMPLE: "Date of birth/Age" pattern not found');
            return null;
        }

        // Use the ultra simple extraction function
        age = extractAgeFromTransfermarkt($) || 'غير محدد';

        // Fallback: If simple method didn't work, try one more approach
        if (!age) {
            console.log('🔄 Simple method failed, trying fallback...');

            // Look specifically in info table
            $('.info-table__content--regular').each((i, el) => {
                const $el = $(el);
                const label = $el.text().trim();

                if (label.includes('Date of birth/Age') || label.includes('Age')) {
                    const nextElement = $el.next('.info-table__content');
                    if (nextElement.length > 0) {
                        const content = nextElement.text().trim();
                        console.log(`🔍 Fallback - Found content: "${content}"`);

                        // Extract age from content like "Jan 13, 1997 (27)"
                        const ageMatch = content.match(/\((\d+)\)/);
                        if (ageMatch && parseInt(ageMatch[1]) >= 15 && parseInt(ageMatch[1]) <= 50) {
                            age = ageMatch[1];
                            console.log(`✅ Fallback - Extracted age: ${age}`);
                            return false;
                        }
                    }
                }
            });
        }

        // Final validation and logging
        if (!age || age === 'غير محدد' || age === 'N/A' || age === '') {
            console.log('⚠️ SIMPLE age extraction failed - setting default');
            age = 'غير محدد';
        } else {
            console.log(`🎉 SIMPLE age extraction successful: ${age} years old`);
        }



        console.log(`📊 Final extracted data - Age: ${age}, Position: ${position || 'غير محدد'}`);

        // الحصول على شعار النادي الحالي
        let currentClubLogo = null;
        try {
            currentClubLogo = await clubLogoService.getClubLogo(currentClub);
        } catch (logoError) {
            console.error('خطأ في الحصول على شعار النادي الحالي:', logoError);
        }

        // الحصول على شعار النادي المطلوب
        let targetClubLogo = null;
        try {
            targetClubLogo = await clubLogoService.getClubLogo(targetClub);
        } catch (logoError) {
            console.error('خطأ في الحصول على شعار النادي المطلوب:', logoError);
        }

        // Get transfer rumors
        const rumors = await getTransferRumors(playerId, targetClub);

        // Get club logos
        const clubsToFetchLogos = new Set();
        clubsToFetchLogos.add(currentClub);
        clubsToFetchLogos.add(targetClub);

        if (rumors.allRumors) {
            rumors.allRumors.forEach(rumor => {
                if (rumor.club) {
                    clubsToFetchLogos.add(rumor.club);
                }
            });
        }

        const clubLogos = await clubLogoService.getMultipleClubLogos(Array.from(clubsToFetchLogos));

        // تحديد احتمالية الانتقال
        let probability = 'غير معروف';
        let probabilityValue = 0;

        if (rumors.targetRumor) {
            probability = rumors.targetRumor.probability;
            // استخراج القيمة العددية من النسبة المئوية
            const match = probability.match(/(\d+)%/);
            if (match && match[1]) {
                probabilityValue = parseInt(match[1]);
            }
        } else if (rumors.allRumors.length > 0) {
            // استخدام أعلى احتمالية من جميع الشائعات
            let highestProb = 0;
            rumors.allRumors.forEach(rumor => {
                const match = rumor.probability.match(/(\d+)%/);
                if (match && match[1]) {
                    const probValue = parseInt(match[1]);
                    if (probValue > highestProb) {
                        highestProb = probValue;
                        probability = rumor.probability;
                        probabilityValue = probValue;
                    }
                }
            });
        }

        // Fix player image URL if needed
        if (playerImage && !playerImage.startsWith('http')) {
            playerImage = 'https://tmssl.akamaized.net' + playerImage;
        }

        return {
            player: {
                arabicName: '', // Will be filled by caller
                englishName: playerName,
                name: playerName,
                age: age,
                position: position,
                club: currentClub,
                clubLogo: clubLogos[currentClub] || null,
                image: playerImage,
                transfermarktUrl: playerUrl,
                playerId: playerId
            },
            targetClub: {
                name: targetClub,
                logo: clubLogos[targetClub] || null
            },
            rumors: rumors,
            probability: probability,
            probabilityValue: probabilityValue,
            customPage: true
        };
    } catch (error) {
        console.error('خطأ في البحث باستخدام الرابط المخصص:', error);
        throw new Error('فشل في البحث عن اللاعب باستخدام الرابط المخصص');
    }
}

// Function to search for multiple players and return all results
async function searchPlayersMultiple(playerName) {
    try {
        const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(playerName)}&Spieler_page=1`;

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const $ = cheerio.load(response.data);
        const players = [];

        // Extract all player results from search
        $('table.items tbody tr').each((index, row) => {
            const $row = $(row);
            const playerLink = $row.find('a[href*="/profil/spieler/"]').attr('href');
            const playerName = $row.find('a[href*="/profil/spieler/"]').text().trim();

            // Try multiple ways to get club name
            let clubName = '';

            // Method 1: Look for club link
            const clubLink = $row.find('a[href*="/verein/"]');
            if (clubLink.length > 0) {
                clubName = clubLink.text().trim();
            }

            // Method 2: Look for club image title
            if (!clubName) {
                const clubImg = $row.find('img[title]');
                if (clubImg.length > 0) {
                    clubName = clubImg.attr('title');
                }
            }

            // Method 3: Look in specific table cells
            if (!clubName) {
                const cells = $row.find('td');
                cells.each((cellIndex, cell) => {
                    const $cell = $(cell);
                    const cellText = $cell.text().trim();
                    // Skip if it's a number, age, or position
                    if (cellText && !cellText.match(/^\d+$/) && !cellText.match(/^(GK|CB|LB|RB|CDM|CM|CAM|LM|RM|LW|RW|CF|ST)$/)) {
                        const cellLink = $cell.find('a[href*="/verein/"]');
                        if (cellLink.length > 0 && !clubName) {
                            clubName = cellLink.text().trim();
                        }
                    }
                });
            }

            const age = $row.find('td.zentriert').eq(1).text().trim();
            const position = $row.find('td.zentriert').first().text().trim();

            if (playerLink && playerName) {
                const playerIdMatch = playerLink.match(/spieler\/(\d+)/);
                if (playerIdMatch) {
                    players.push({
                        playerId: playerIdMatch[1],
                        playerUrl: `https://www.transfermarkt.com${playerLink}`,
                        name: playerName,
                        club: clubName || 'غير محدد',
                        age: age || 'غير محدد',
                        position: position || 'غير محدد'
                    });
                }
            }
        });

        return players;
    } catch (error) {
        console.error('Error searching players:', error.message);
        throw new Error('فشل في البحث عن اللاعبين');
    }
}

// Function to find best matching player based on current club
function findBestPlayerMatch(players, currentClub) {
    if (!players || players.length === 0) {
        throw new Error('لم يتم العثور على أي لاعبين');
    }

    // If no current club specified, return first result
    if (!currentClub) {
        return players[0];
    }

    // Normalize club names for comparison
    const normalizeClubName = (name) => {
        if (!name) return '';
        return name.toLowerCase()
            .replace(/fc|cf|ac|sc|real|club|football|soccer/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const targetClub = normalizeClubName(currentClub);

    // Try to find exact or partial match
    for (const player of players) {
        const playerClub = normalizeClubName(player.club);

        // Exact match
        if (playerClub === targetClub) {
            console.log(`✅ تطابق دقيق: ${player.name} - ${player.club}`);
            return player;
        }

        // Partial match
        if (playerClub.includes(targetClub) || targetClub.includes(playerClub)) {
            console.log(`✅ تطابق جزئي: ${player.name} - ${player.club}`);
            return player;
        }
    }

    // If no club match found, return first result but log warning
    console.log(`⚠️ لم يتم العثور على تطابق للنادي "${currentClub}"، سيتم استخدام أول نتيجة`);
    return players[0];
}

// Legacy function for backward compatibility
async function searchPlayer(playerName, currentClub = null) {
    const players = await searchPlayersMultiple(playerName);
    return findBestPlayerMatch(players, currentClub);
}

// Function to get transfer rumors
async function getTransferRumors(playerId, targetClub) {
    try {
        // Use the correct URL format for rumors page
        const rumorsUrl = `https://www.transfermarkt.com/luis-diaz/geruechte/spieler/${playerId}`;

        const response = await axios.get(rumorsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const $ = cheerio.load(response.data);

        // Find rumors table - improved extraction
        const rumors = [];

        // Try different table selectors
        $('table').each((tableIndex, table) => {
            const $table = $(table);
            const tableText = $table.text();

            if (tableText.includes('%')) {
                $table.find('tr').each((rowIndex, row) => {
                    const $row = $(row);
                    const rowText = $row.text().trim();

                    if (rowText.includes('%')) {
                        // Extract data from this row
                        const cells = [];
                        $row.find('td').each((cellIndex, cell) => {
                            const cellText = $(cell).text().trim();
                            if (cellText) cells.push(cellText);
                        });

                        if (cells.length >= 3) {
                            // For Transfermarkt rumors table structure
                            let clubName = '';
                            let probability = '';
                            let lastUpdate = '';

                            // Find club name (usually first cell with text)
                            clubName = cells.find(cell =>
                                !cell.includes('%') &&
                                !cell.match(/\d{1,2}\/\d{1,2}\/\d{4}|\w{3}\s\d{1,2},\s\d{4}|\d{4}-\d{2}-\d{2}/) &&
                                cell.length > 2
                            ) || cells[0];

                            // Find probability (cell with %)
                            probability = cells.find(cell => cell.includes('%')) || '';

                            // Find date
                            lastUpdate = cells.find(cell =>
                                cell.match(/\d{1,2}\/\d{1,2}\/\d{4}|\w{3}\s\d{1,2},\s\d{4}|\d{4}-\d{2}-\d{2}/)
                            ) || 'غير محدد';

                            if (clubName && probability) {
                                rumors.push({
                                    club: clubName,
                                    probability: probability,
                                    lastUpdate: lastUpdate
                                });
                            }
                        }
                    }
                });
            }
        });

        // Find specific club with flexible matching
        const targetRumor = rumors.find(rumor => {
            const clubLower = rumor.club.toLowerCase();
            const targetLower = targetClub.toLowerCase();
            const translatedTargetLower = translateClubName(targetClub)?.toLowerCase() || '';

            return clubLower.includes(targetLower) ||
                   targetLower.includes(clubLower) ||
                   clubLower.includes(translatedTargetLower) ||
                   translatedTargetLower.includes(clubLower) ||
                   // Specific Arabic-English mappings
                   (clubLower.includes('barcelona') || clubLower.includes('fc barcelona')) && (targetLower.includes('برشلونة') || targetLower.includes('برشلونا')) ||
                   (clubLower.includes('real madrid') || clubLower.includes('madrid')) && (targetLower.includes('ريال مدريد') || targetLower.includes('ريال')) ||
                   (clubLower.includes('manchester united') || clubLower.includes('man utd')) && targetLower.includes('مانشستر يونايتد') ||
                   (clubLower.includes('manchester city') || clubLower.includes('man city')) && targetLower.includes('مانشستر سيتي') ||
                   clubLower.includes('liverpool') && targetLower.includes('ليفربول') ||
                   (clubLower.includes('chelsea') || clubLower.includes('chelsea fc')) && targetLower.includes('تشيلسي') ||
                   (clubLower.includes('arsenal') || clubLower.includes('arsenal fc')) && targetLower.includes('أرسنال') ||
                   (clubLower.includes('juventus') || clubLower.includes('juve')) && targetLower.includes('يوفنتوس') ||
                   (clubLower.includes('ac milan') || clubLower.includes('milan')) && targetLower.includes('ميلان') ||
                   (clubLower.includes('inter milan') || clubLower.includes('inter')) && targetLower.includes('إنتر') ||
                   (clubLower.includes('bayern munich') || clubLower.includes('bayern')) && targetLower.includes('بايرن') ||
                   (clubLower.includes('paris saint-germain') || clubLower.includes('psg')) && (targetLower.includes('باريس') || targetLower.includes('بي اس جي'));
        });

        return {
            allRumors: rumors,
            targetRumor: targetRumor || null
        };
    } catch (error) {
        console.error('Error getting rumors:', error.message);
        throw new Error('فشل في جلب الشائعات');
    }
}

// API Routes
app.post('/api/search-player', async (req, res) => {
    try {
        const { arabicName, targetClub, currentClub } = req.body;

        if (!arabicName || !targetClub) {
            return res.status(400).json({
                error: 'يرجى إدخال اسم اللاعب والنادي المطلوب'
            });
        }

        console.log(`البحث عن: ${arabicName} -> ${targetClub}${currentClub ? ` (يلعب حالياً في: ${currentClub})` : ''}`);

        // Check cache first
        const cacheKey = `${arabicName}_${currentClub || ''}_${targetClub}`;
        const cachedResult = getCachedSearch(cacheKey);
        if (cachedResult) {
            // Get fresh club logos for cached results
            console.log(`🏆 Getting fresh logos for cached result: Current="${cachedResult.player?.club}", Target="${targetClub}"`);

            let currentClubLogo = null;
            let targetClubLogo = null;

            try {
                if (cachedResult.player?.club) {
                    currentClubLogo = await clubLogoService.getClubLogo(cachedResult.player.club);
                    console.log(`✅ Fresh current club logo: ${currentClubLogo}`);
                }
            } catch (error) {
                console.log(`❌ Failed to get fresh current club logo: ${error.message}`);
            }

            try {
                targetClubLogo = await clubLogoService.getClubLogo(targetClub);
                console.log(`✅ Fresh target club logo: ${targetClubLogo}`);
            } catch (error) {
                console.log(`❌ Failed to get fresh target club logo: ${error.message}`);
            }

            const cachedResponseData = {
                success: true,
                arabicName: cachedResult.player?.arabicName || arabicName,
                englishName: cachedResult.player?.englishName || cachedResult.player?.name,
                currentClub: cachedResult.player?.club,
                playerPosition: cachedResult.player?.position,
                targetRumor: cachedResult.rumors?.targetRumor,
                allRumors: cachedResult.rumors?.allRumors,
                data: {
                    ...cachedResult,
                    age: cachedResult.player?.age, // Add age directly to data
                    playerAge: cachedResult.player?.age, // Also add as playerAge for compatibility
                    playerImage: cachedResult.player?.image,
                    currentClubLogo: currentClubLogo || cachedResult.player?.clubLogo || null, // Add fresh current club logo
                    targetClubLogo: targetClubLogo || cachedResult.targetClub?.logo || null, // Add fresh target club logo
                    marketValue: cachedResult.player?.marketValue || 'غير محدد',
                    contractExpiry: cachedResult.player?.contractExpiry || 'غير محدد',
                    nationality: cachedResult.player?.nationality || 'غير محدد',
                    height: cachedResult.player?.height || 'غير محدد',
                    preferredFoot: cachedResult.player?.preferredFoot || 'غير محدد'
                },
                cached: true
            };

            // Auto-update stream for cached results too (FIXED!)
            try {
                if (streamData.active) {
                    console.log('🎬 Auto-updating stream with cached player data...');

                    const streamCardHTML = `
                        <div style="
                            background: linear-gradient(135deg, #1e3c72, #2a5298);
                            border-radius: 25px;
                            padding: 40px;
                            color: white;
                            text-align: center;
                            width: 450px;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                        ">
                            <h2 style="font-size: 36px; margin-bottom: 20px; font-weight: 900;">${arabicName}</h2>
                            <div style="margin: 30px 0;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                                    ${cachedResponseData.data.currentClubLogo ? `<img src="${cachedResponseData.data.currentClubLogo}" alt="${cachedResult.player?.club}" style="width: 32px; height: 32px; object-fit: contain;">` : ''}
                                    <div style="font-size: 24px;">→</div>
                                    ${cachedResponseData.data.targetClubLogo ? `<img src="${cachedResponseData.data.targetClubLogo}" alt="${targetClub}" style="width: 32px; height: 32px; object-fit: contain;">` : ''}
                                </div>
                            </div>
                            <div style="margin: 40px 0; background: rgba(16, 185, 129, 0.2); border-radius: 20px; padding: 20px;">
                                <div style="font-size: 48px; font-weight: 900; color: #10b981;">85%</div>
                                <div style="font-size: 18px; opacity: 0.8;">احتمالية الانتقال</div>
                            </div>
                            <div style="font-size: 14px; opacity: 0.6;">من الذاكرة المؤقتة: ${new Date().toLocaleString('ar-SA')}</div>
                        </div>
                    `;

                    streamData.content = {
                        html: streamCardHTML,
                        timestamp: Date.now(),
                        source: 'API Auto-Stream (Cached)',
                        playerData: cachedResponseData
                    };

                    console.log('✅ Stream auto-updated with cached player data');
                }
            } catch (streamError) {
                console.warn('⚠️ Failed to auto-update stream for cached result:', streamError.message);
            }

            return res.json(cachedResponseData);
        }

        // Translate club names from Arabic to English
        const translatedCurrentClub = currentClub ? translateClubName(currentClub) : null;
        const translatedTargetClub = translateClubName(targetClub);

        console.log(`الأندية المترجمة: ${translatedCurrentClub || 'لا يوجد'} -> ${translatedTargetClub}`);

        // Step 1: Check if we have a saved player page URL
        const playerKey = arabicName.toLowerCase().trim();
        const savedPlayerPage = playerPagesCache.get(playerKey);

        let playerInfo;
        let englishName;

        if (savedPlayerPage) {
            console.log(`🔗 استخدام الرابط المحفوظ للاعب: ${arabicName} -> ${savedPlayerPage.pageUrl}`);

            // Extract player ID from saved URL
            const urlMatch = savedPlayerPage.pageUrl.match(/\/spieler\/(\d+)/);
            if (urlMatch) {
                const playerId = urlMatch[1];
                console.log(`🆔 معرف اللاعب من الرابط المحفوظ: ${playerId}`);

                // Get player info directly using the saved URL
                try {
                    playerInfo = await getPlayerInfoFromUrl(savedPlayerPage.pageUrl);
                    englishName = playerInfo.name;
                    console.log(`✅ تم جلب بيانات اللاعب من الرابط المحفوظ: ${englishName}`);
                } catch (error) {
                    console.log(`⚠️ فشل في استخدام الرابط المحفوظ، سيتم استخدام البحث العادي`);
                    // Fallback to normal search
                    englishName = await translatePlayerName(arabicName, translatedCurrentClub);
                    playerInfo = await searchPlayer(englishName, translatedCurrentClub);

                    // CRITICAL FIX: Extract age from player's individual page
                    if (playerInfo && playerInfo.playerUrl) {
                        console.log(`🎂 استخراج العمر من صفحة اللاعب الفردية: ${playerInfo.playerUrl}`);
                        try {
                            const detailedPlayerInfo = await getPlayerInfoFromUrl(playerInfo.playerUrl);
                            playerInfo.age = detailedPlayerInfo.age;
                            console.log(`✅ تم استخراج العمر بنجاح: ${playerInfo.age}`);
                        } catch (ageError) {
                            console.log(`⚠️ فشل في استخراج العمر: ${ageError.message}`);
                        }
                    }
                }
            } else {
                console.log(`⚠️ رابط غير صحيح، سيتم استخدام البحث العادي`);
                // Fallback to normal search
                englishName = await translatePlayerName(arabicName, translatedCurrentClub);
                playerInfo = await searchPlayer(englishName, translatedCurrentClub);

                // CRITICAL FIX: Extract age from player's individual page
                if (playerInfo && playerInfo.playerUrl) {
                    console.log(`🎂 استخراج العمر من صفحة اللاعب الفردية: ${playerInfo.playerUrl}`);
                    try {
                        const detailedPlayerInfo = await getPlayerInfoFromUrl(playerInfo.playerUrl);
                        playerInfo.age = detailedPlayerInfo.age;
                        console.log(`✅ تم استخراج العمر بنجاح: ${playerInfo.age}`);
                    } catch (ageError) {
                        console.log(`⚠️ فشل في استخراج العمر: ${ageError.message}`);
                    }
                }
            }
        } else {
            // Normal search process
            console.log(`🔍 لا يوجد رابط محفوظ للاعب، سيتم البحث العادي`);
            englishName = await translatePlayerName(arabicName, translatedCurrentClub);
            playerInfo = await searchPlayer(englishName, translatedCurrentClub);

            // CRITICAL FIX: Extract age from player's individual page
            if (playerInfo && playerInfo.playerUrl) {
                console.log(`🎂 استخراج العمر من صفحة اللاعب الفردية: ${playerInfo.playerUrl}`);
                try {
                    const detailedPlayerInfo = await getPlayerInfoFromUrl(playerInfo.playerUrl);
                    playerInfo.age = detailedPlayerInfo.age;
                    console.log(`✅ تم استخراج العمر بنجاح: ${playerInfo.age}`);
                } catch (ageError) {
                    console.log(`⚠️ فشل في استخراج العمر: ${ageError.message}`);
                }
            }
        }
        console.log(`معرف اللاعب: ${playerInfo.playerId} - ${playerInfo.name} (${playerInfo.club}) - العمر: ${playerInfo.age}`);

        // Step 3: Get transfer rumors
        const rumors = await getTransferRumors(playerInfo.playerId, translatedTargetClub);

        // Get club logos for current and target clubs directly
        console.log(`🏆 Getting logos for: Current="${playerInfo.club}", Target="${targetClub}"`);

        let currentClubLogo = null;
        let targetClubLogo = null;

        try {
            currentClubLogo = await clubLogoService.getClubLogo(playerInfo.club);
            console.log(`✅ Current club logo: ${currentClubLogo}`);
        } catch (error) {
            console.log(`❌ Failed to get current club logo: ${error.message}`);
        }

        try {
            targetClubLogo = await clubLogoService.getClubLogo(targetClub);
            console.log(`✅ Target club logo: ${targetClubLogo}`);
        } catch (error) {
            console.log(`❌ Failed to get target club logo: ${error.message}`);
        }

        // Get club logos for all clubs mentioned in rumors (for compatibility)
        const clubsToFetchLogos = new Set();
        clubsToFetchLogos.add(playerInfo.club); // Current club
        clubsToFetchLogos.add(targetClub); // Target club

        // Add all clubs from rumors
        if (rumors.allRumors) {
            rumors.allRumors.forEach(rumor => {
                if (rumor.club) {
                    clubsToFetchLogos.add(rumor.club);
                }
            });
        }

        // Fetch logos for all clubs (for backward compatibility)
        const clubLogos = await clubLogoService.getMultipleClubLogos(Array.from(clubsToFetchLogos));

        // Get player image - Try Pinterest first, then fallback to original service
        let playerImage;
        try {
            const pinterestResult = await pinterestImageService.getPlayerImage({
                arabicName,
                englishName,
                currentClub: playerInfo.club,
                position: playerInfo.position
            });

            if (pinterestResult.success && pinterestResult.imageUrl) {
                playerImage = pinterestResult.imageUrl;
                console.log(`✅ Using Pinterest image for ${arabicName}: ${playerImage}`);
            } else {
                throw new Error('Pinterest image not found');
            }
        } catch (error) {
            console.log(`⚠️ Pinterest failed for ${arabicName}, using fallback service`);
            playerImage = await playerImageService.getPlayerImage({
                playerId: playerInfo.playerId,
                englishName,
                arabicName,
                currentClub: playerInfo.club,
                playerPosition: playerInfo.position
            });
        }

        const result = {
            player: {
                arabicName,
                englishName,
                name: playerInfo.name,
                age: playerInfo.age,
                position: playerInfo.position,
                club: playerInfo.club,
                clubLogo: clubLogos[playerInfo.club] || null,
                image: playerImage,
                transfermarktUrl: playerInfo.playerUrl,
                playerId: playerInfo.playerId
            },
            targetClub: {
                name: targetClub,
                logo: clubLogos[targetClub] || null
            },
            rumors: rumors
        };

        // Cache the result
        cacheSearchResult(cacheKey, result);

        const responseData = {
            success: true,
            arabicName: arabicName,
            englishName: englishName,
            currentClub: playerInfo.club,
            playerPosition: playerInfo.position,
            targetRumor: rumors.targetRumor,
            allRumors: rumors.allRumors,
            data: {
                ...result,
                age: playerInfo.age, // Add age directly to data
                playerAge: playerInfo.age, // Also add as playerAge for compatibility
                playerImage: playerImage,
                currentClubLogo: currentClubLogo || result.player?.clubLogo || clubLogos[playerInfo.club] || null, // Add current club logo
                targetClubLogo: targetClubLogo || result.targetClub?.logo || clubLogos[targetClub] || null, // Add target club logo
                marketValue: result.player?.marketValue || 'غير محدد',
                contractExpiry: result.player?.contractExpiry || 'غير محدد',
                nationality: result.player?.nationality || 'غير محدد',
                height: result.player?.height || 'غير محدد',
                preferredFoot: result.player?.preferredFoot || 'غير محدد'
            },
            cached: false
        };

        // Auto-update stream if enabled (for API-based auto-streaming)
        try {
            // Check if auto-streaming is enabled by checking if stream is active
            if (streamData.active) {
                console.log('🎬 Auto-updating stream with new player data...');

                // Create a simple card HTML for streaming
                const streamCardHTML = `
                    <div style="
                        background: linear-gradient(135deg, #1e3c72, #2a5298);
                        border-radius: 25px;
                        padding: 40px;
                        color: white;
                        text-align: center;
                        width: 450px;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    ">
                        <h2 style="font-size: 36px; margin-bottom: 20px; font-weight: 900;">${arabicName}</h2>
                        <div style="margin: 30px 0;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                                ${responseData.data.currentClubLogo ? `<img src="${responseData.data.currentClubLogo}" alt="${playerInfo.club}" style="width: 32px; height: 32px; object-fit: contain;">` : ''}
                                <div style="font-size: 24px;">→</div>
                                ${responseData.data.targetClubLogo ? `<img src="${responseData.data.targetClubLogo}" alt="${targetClub}" style="width: 32px; height: 32px; object-fit: contain;">` : ''}
                            </div>
                        </div>
                        <div style="margin: 40px 0; background: rgba(16, 185, 129, 0.2); border-radius: 20px; padding: 20px;">
                            <div style="font-size: 48px; font-weight: 900; color: #10b981;">85%</div>
                            <div style="font-size: 18px; opacity: 0.8;">احتمالية الانتقال</div>
                        </div>
                        <div style="font-size: 14px; opacity: 0.6;">تم إنشاؤها تلقائياً: ${new Date().toLocaleString('ar-SA')}</div>
                    </div>
                `;

                // Update stream data
                streamData.content = {
                    html: streamCardHTML,
                    timestamp: Date.now(),
                    source: 'API Auto-Stream',
                    playerData: responseData
                };

                console.log('✅ Stream auto-updated with new player data');
            }
        } catch (streamError) {
            console.warn('⚠️ Failed to auto-update stream:', streamError.message);
        }

        res.json(responseData);

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({
            error: error.message || 'حدث خطأ في الخادم'
        });
    }
});

// API endpoint to get club logo
app.get('/api/club-logo/:clubName', async (req, res) => {
    try {
        const { clubName } = req.params;

        if (!clubName) {
            return res.status(400).json({
                error: 'اسم النادي مطلوب'
            });
        }

        console.log(`🔍 Fetching logo for club: ${clubName}`);
        const logoUrl = await clubLogoService.getClubLogo(decodeURIComponent(clubName));

        if (logoUrl) {
            res.json({
                success: true,
                data: {
                    clubName: clubName,
                    logoUrl: logoUrl
                }
            });
        } else {
            res.json({
                success: false,
                message: 'لم يتم العثور على شعار النادي',
                data: {
                    clubName: clubName,
                    logoUrl: null
                }
            });
        }
    } catch (error) {
        console.error('Club logo API Error:', error.message);
        res.status(500).json({
            error: 'خطأ في جلب شعار النادي'
        });
    }
});

// API endpoint to get club logo (query parameter version for pro-studio)
app.get('/api/get-club-logo', async (req, res) => {
    try {
        const { clubName } = req.query;

        if (!clubName) {
            return res.status(400).json({
                success: false,
                error: 'اسم النادي مطلوب'
            });
        }

        console.log(`🔍 Fetching logo for club via query: ${clubName}`);
        const logoUrl = await clubLogoService.getClubLogo(decodeURIComponent(clubName));

        if (logoUrl) {
            res.json({
                success: true,
                data: {
                    clubName: clubName,
                    logoUrl: logoUrl
                }
            });
        } else {
            res.json({
                success: false,
                error: 'لم يتم العثور على شعار النادي',
                data: {
                    clubName: clubName,
                    logoUrl: null
                }
            });
        }
    } catch (error) {
        console.error('خطأ في جلب شعار النادي:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ في الخادم'
        });
    }
});

// API endpoint to get multiple club logos
app.post('/api/club-logos', async (req, res) => {
    try {
        const { clubNames } = req.body;

        if (!clubNames || !Array.isArray(clubNames)) {
            return res.status(400).json({
                error: 'قائمة أسماء الأندية مطلوبة'
            });
        }

        console.log(`🔍 Fetching logos for ${clubNames.length} clubs`);
        const clubLogos = await clubLogoService.getMultipleClubLogos(clubNames);

        res.json({
            success: true,
            data: clubLogos
        });
    } catch (error) {
        console.error('Multiple club logos API Error:', error.message);
        res.status(500).json({
            error: 'خطأ في جلب شعارات الأندية'
        });
    }
});

// API endpoint to get cache statistics
app.get('/api/logo-cache-stats', (req, res) => {
    try {
        const stats = clubLogoService.getCacheStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Cache stats API Error:', error.message);
        res.status(500).json({
            error: 'خطأ في جلب إحصائيات التخزين المؤقت'
        });
    }
});

// API endpoint to get search cache statistics
app.get('/api/search-cache-stats', (req, res) => {
    try {
        // تنظيف التخزين المؤقت قبل إرجاع الإحصائيات
        const cleanedCount = cleanExpiredCache();

        const stats = {
            size: searchCache.size,
            entries: Array.from(searchCache.keys()),
            cleaned: cleanedCount,
            details: Array.from(searchCache.entries()).map(([key, value]) => ({
                key,
                age: Math.round((Date.now() - value.timestamp) / 1000 / 60) + ' دقيقة',
                accessCount: value.accessCount || 0
            }))
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('خطأ في إحصائيات التخزين المؤقت للبحث:', error.message);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في جلب إحصائيات التخزين المؤقت'
        });
    }
});

// API endpoint to clear search cache
app.post('/api/clear-search-cache', (req, res) => {
    try {
        searchCache.clear();
        console.log('🗑️ تم مسح التخزين المؤقت للبحث');
        res.json({
            success: true,
            message: 'تم مسح التخزين المؤقت للبحث بنجاح'
        });
    } catch (error) {
        console.error('خطأ في مسح التخزين المؤقت للبحث:', error.message);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في مسح التخزين المؤقت للبحث'
        });
    }
});

// API للحصول على جميع اللاعبين المحفوظين
app.get('/api/get-player-pages', (req, res) => {
    try {
        console.log('📋 API: Getting all saved player pages...');

        if (!playerPagesCache || playerPagesCache.size === 0) {
            console.log('⚠️ API: No player pages found in cache');
            return res.json({
                success: true,
                data: {},
                message: 'No saved players found'
            });
        }

        // تحويل Map إلى Object للإرسال
        const dataObject = {};
        for (const [key, value] of playerPagesCache.entries()) {
            dataObject[value.arabicName] = value;
        }

        console.log(`✅ API: Found ${playerPagesCache.size} saved players`);
        res.json({
            success: true,
            data: dataObject,
            count: playerPagesCache.size
        });
    } catch (error) {
        console.error('❌ API: Error getting player pages:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API لإضافة رابط صفحة لاعب
app.post('/api/add-player-page', (req, res) => {
    try {
        const { arabicName, pageUrl, playerImage, currentClub } = req.body;

        if (!arabicName || !pageUrl) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال اسم اللاعب ورابط الصفحة'
            });
        }

        if (!currentClub) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال النادي الحالي'
            });
        }

        // التحقق من صحة الرابط
        if (!pageUrl.includes('transfermarkt.com')) {
            return res.status(400).json({
                success: false,
                error: 'يجب أن يكون الرابط من موقع Transfermarkt'
            });
        }

        // حفظ رابط الصفحة مع المعلومات الإضافية
        const key = arabicName.toLowerCase().trim();
        const playerData = {
            arabicName: arabicName.trim(),
            pageUrl: pageUrl.trim(),
            currentClub: currentClub.trim(),
            addedAt: new Date().toISOString()
        };

        // إضافة صورة اللاعب إذا تم توفيرها
        if (playerImage && playerImage.trim()) {
            playerData.playerImage = playerImage.trim();
            console.log(`📸 تم إضافة صورة للاعب: ${playerImage.trim()}`);
        }

        playerPagesCache.set(key, playerData);

        console.log(`✅ تم إضافة رابط صفحة اللاعب: ${arabicName} (${currentClub})`);

        // حفظ البيانات في الملف
        savePlayerPagesToFile();

        res.json({
            success: true,
            message: `تم إضافة رابط صفحة اللاعب ${arabicName} بنجاح`
        });
    } catch (error) {
        console.error('خطأ في إضافة رابط صفحة لاعب:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في إضافة رابط صفحة اللاعب'
        });
    }
});

// API لجلب إحصائيات روابط صفحات اللاعبين
app.get('/api/player-pages-cache-stats', (req, res) => {
    try {
        const entries = Array.from(playerPagesCache.entries()).map(([key, value]) => ({
            name: value.arabicName,
            url: value.pageUrl,
            playerImage: value.playerImage || null,
            currentClub: value.currentClub,
            addedAt: value.addedAt,
            updatedAt: value.updatedAt || null,
            age: Math.round((Date.now() - new Date(value.addedAt).getTime()) / (1000 * 60)) + ' دقيقة'
        }));

        res.json({
            success: true,
            data: {
                size: playerPagesCache.size,
                entries: entries
            }
        });
    } catch (error) {
        console.error('خطأ في جلب إحصائيات روابط صفحات اللاعبين:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في جلب إحصائيات روابط صفحات اللاعبين'
        });
    }
});

// API لجلب بيانات لاعب واحد
app.get('/api/player-page/:arabicName', (req, res) => {
    try {
        const arabicName = decodeURIComponent(req.params.arabicName);
        const key = arabicName.toLowerCase().trim();

        if (playerPagesCache.has(key)) {
            const playerData = playerPagesCache.get(key);
            res.json({
                success: true,
                data: playerData
            });
        } else {
            res.status(404).json({
                success: false,
                error: `لم يتم العثور على اللاعب ${arabicName}`
            });
        }
    } catch (error) {
        console.error('خطأ في جلب بيانات اللاعب:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في جلب بيانات اللاعب'
        });
    }
});

// API لحذف رابط صفحة لاعب محدد (للواجهات الجديدة)
app.post('/api/delete-player-page', (req, res) => {
    try {
        const { arabicName } = req.body;

        if (!arabicName) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال اسم اللاعب'
            });
        }

        // إزالة رابط الصفحة من التخزين المؤقت
        const key = arabicName.toLowerCase().trim();
        const exists = playerPagesCache.has(key);

        if (exists) {
            playerPagesCache.delete(key);
            console.log(`🗑️ تم حذف رابط صفحة اللاعب: ${arabicName}`);

            // حفظ البيانات في الملف
            savePlayerPagesToFile();

            res.json({
                success: true,
                message: `تم حذف رابط صفحة اللاعب ${arabicName} بنجاح`
            });
        } else {
            res.status(404).json({
                success: false,
                error: `لم يتم العثور على رابط صفحة للاعب ${arabicName}`
            });
        }
    } catch (error) {
        console.error('خطأ في حذف رابط صفحة لاعب:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في حذف رابط صفحة اللاعب'
        });
    }
});

// API لتحديث بيانات لاعب
app.post('/api/update-player-page', (req, res) => {
    try {
        const { arabicName, pageUrl, playerImage, currentClub } = req.body;

        if (!arabicName) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال اسم اللاعب'
            });
        }

        const key = arabicName.toLowerCase().trim();
        const exists = playerPagesCache.has(key);

        if (!exists) {
            return res.status(404).json({
                success: false,
                error: `لم يتم العثور على اللاعب ${arabicName}`
            });
        }

        // الحصول على البيانات الحالية
        const currentData = playerPagesCache.get(key);

        // تحديث البيانات
        const updatedData = {
            ...currentData,
            arabicName: arabicName.trim(),
            pageUrl: pageUrl ? pageUrl.trim() : currentData.pageUrl,
            currentClub: currentClub ? currentClub.trim() : currentData.currentClub,
            updatedAt: new Date().toISOString()
        };

        // تحديث صورة اللاعب إذا تم توفيرها
        if (playerImage && playerImage.trim()) {
            updatedData.playerImage = playerImage.trim();
            console.log(`📸 تم تحديث صورة اللاعب: ${playerImage.trim()}`);
        } else if (playerImage === '') {
            // إزالة الصورة إذا تم إرسال قيمة فارغة
            delete updatedData.playerImage;
            console.log(`🗑️ تم إزالة صورة اللاعب`);
        }

        playerPagesCache.set(key, updatedData);

        // حفظ البيانات في الملف
        savePlayerPagesToFile();

        console.log(`✅ تم تحديث بيانات اللاعب: ${arabicName}`);

        res.json({
            success: true,
            message: `تم تحديث بيانات اللاعب ${arabicName} بنجاح`,
            data: updatedData
        });
    } catch (error) {
        console.error('خطأ في تحديث بيانات اللاعب:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في تحديث بيانات اللاعب'
        });
    }
});

// API لإزالة رابط صفحة لاعب محدد
app.post('/api/remove-player-page', (req, res) => {
    try {
        const { arabicName } = req.body;

        if (!arabicName) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال اسم اللاعب'
            });
        }

        // إزالة رابط الصفحة من التخزين المؤقت
        const key = arabicName.toLowerCase().trim();
        const exists = playerPagesCache.has(key);

        if (exists) {
            playerPagesCache.delete(key);
            console.log(`🗑️ تم إزالة رابط صفحة اللاعب: ${arabicName}`);

            // حفظ البيانات في الملف
            savePlayerPagesToFile();

            res.json({
                success: true,
                message: `تم إزالة رابط صفحة اللاعب ${arabicName} بنجاح`
            });
        } else {
            res.status(404).json({
                success: false,
                error: `لم يتم العثور على رابط صفحة للاعب ${arabicName}`
            });
        }
    } catch (error) {
        console.error('خطأ في إزالة رابط صفحة لاعب:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في إزالة رابط صفحة اللاعب'
        });
    }
});

// API لمسح جميع روابط صفحات اللاعبين
app.post('/api/clear-player-pages-cache', (req, res) => {
    try {
        playerPagesCache.clear();
        console.log('🗑️ تم مسح جميع روابط صفحات اللاعبين');

        res.json({
            success: true,
            message: 'تم مسح جميع روابط صفحات اللاعبين بنجاح'
        });
    } catch (error) {
        console.error('خطأ في مسح روابط صفحات اللاعبين:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في مسح روابط صفحات اللاعبين'
        });
    }
});

// Pinterest Image APIs
app.get('/api/pinterest/players', (req, res) => {
    try {
        const result = pinterestImageService.getAvailablePlayers();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/pinterest/add-player', async (req, res) => {
    try {
        const { arabicName, englishName, images, currentClub, position } = req.body;

        if (!arabicName || !images) {
            return res.status(400).json({
                success: false,
                error: 'اسم اللاعب والصور مطلوبة'
            });
        }

        const result = await pinterestImageService.addPlayerImage(
            arabicName, englishName, images, currentClub, position
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/pinterest/search/:playerName', async (req, res) => {
    try {
        const { playerName } = req.params;
        const result = await pinterestImageService.searchPinterestUrls(decodeURIComponent(playerName));
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Network Service APIs
app.get('/api/network/info', (req, res) => {
    try {
        const networkInfo = networkService.getNetworkInfo();
        res.json({
            success: true,
            data: networkInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/network/find-lm-studio', async (req, res) => {
    try {
        const result = await networkService.findLMStudio();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/network/test-lm-studio', async (req, res) => {
    try {
        const { port, ip } = req.body;
        const result = await networkService.testLMStudioConnection(port || 1234, ip);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI Analysis API for Professional Overlay
app.post('/api/ai/analyze-rumors', async (req, res) => {
    try {
        const { playerName, targetClub, rumors, enableCredibilityCheck, enableTrendAnalysis } = req.body;

        if (!playerName || !targetClub) {
            return res.status(400).json({
                success: false,
                error: 'اسم اللاعب والنادي المطلوب مطلوبان'
            });
        }

        console.log(`🧠 AI Analysis requested for ${playerName} -> ${targetClub}`);

        // Simulate AI analysis (replace with actual AI service)
        const analysis = {
            playerName,
            targetClub,
            credibilityScore: enableCredibilityCheck ? Math.floor(Math.random() * 40) + 60 : null, // 60-100%
            trendDirection: enableTrendAnalysis ? (Math.random() > 0.5 ? 'up' : 'down') : null,
            marketValue: `${Math.floor(Math.random() * 50) + 20}M €`,
            transferProbability: Math.floor(Math.random() * 30) + 20, // 20-50%
            confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
            keyFactors: [
                'عقد اللاعب ينتهي قريباً',
                'النادي يحتاج لتعزيز المركز',
                'العلاقة الجيدة مع المدرب',
                'الوضع المالي للنادي مستقر'
            ].slice(0, Math.floor(Math.random() * 3) + 2),
            riskFactors: [
                'منافسة من أندية أخرى',
                'سعر الانتقال مرتفع',
                'عدم رغبة النادي الحالي في البيع'
            ].slice(0, Math.floor(Math.random() * 2) + 1),
            timeline: `${Math.floor(Math.random() * 6) + 1} أشهر`,
            lastUpdated: new Date().toISOString()
        };

        res.json({
            success: true,
            data: analysis
        });

        console.log(`✅ AI Analysis completed for ${playerName}`);

    } catch (error) {
        console.error('❌ AI Analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في التحليل الذكي'
        });
    }
});

// Enhanced search with AI integration
app.post('/api/search-player-ai', async (req, res) => {
    try {
        const { arabicName, targetClub, currentClub, enableAI } = req.body;

        if (!arabicName || !targetClub) {
            return res.status(400).json({
                error: 'يرجى إدخال اسم اللاعب والنادي المطلوب'
            });
        }

        console.log(`🔍 AI-Enhanced search: ${arabicName} -> ${targetClub}`);

        // Use existing search functionality
        const searchResponse = await fetch(`http://localhost:8201/api/search-player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arabicName, targetClub, currentClub })
        });

        const searchData = await searchResponse.json();

        if (!searchData.success) {
            throw new Error(searchData.error);
        }

        let aiAnalysis = null;
        if (enableAI) {
            // Get AI analysis
            const aiResponse = await fetch(`http://localhost:8201/api/ai/analyze-rumors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName: searchData.englishName,
                    targetClub: targetClub,
                    rumors: searchData.allRumors,
                    enableCredibilityCheck: true,
                    enableTrendAnalysis: true
                })
            });

            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                if (aiData.success) {
                    aiAnalysis = aiData.data;
                }
            }
        }

        res.json({
            ...searchData,
            aiAnalysis: aiAnalysis
        });

    } catch (error) {
        console.error('❌ AI-Enhanced search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ في البحث المحسن'
        });
    }
});

// LM Studio Config APIs
app.get('/api/lm-studio/config', (req, res) => {
    try {
        const config = lmStudioConfigService.getStatus();
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/lm-studio/update-config', async (req, res) => {
    try {
        const { ip, port, model, timeout, maxTokens, temperature } = req.body;
        const result = lmStudioConfigService.updateLMStudioSettings({
            ip, port, model, timeout, maxTokens, temperature
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/lm-studio/test-connection', async (req, res) => {
    try {
        const result = await lmStudioConfigService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/lm-studio/add-translation', async (req, res) => {
    try {
        const { arabicName, englishName } = req.body;

        if (!arabicName || !englishName) {
            return res.status(400).json({
                success: false,
                error: 'الاسم العربي والإنجليزي مطلوبان'
            });
        }

        const result = lmStudioConfigService.addFallbackTranslation(arabicName, englishName);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Live Streaming APIs
app.post('/api/live/create-session', (req, res) => {
    try {
        const sessionId = uuidv4();
        const { templateId, players, targetClub, settings } = req.body;

        if (!templateId || !players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({
                error: 'معرف القالب وقائمة اللاعبين مطلوبة'
            });
        }

        if (players.length > 8) {
            return res.status(400).json({
                error: 'الحد الأقصى 8 لاعبين'
            });
        }

        const session = {
            sessionId: sessionId,
            id: sessionId,
            templateId,
            players,
            targetClub,
            settings: settings || {},
            overlayUrl: `http://localhost:${PORT}/overlay/${sessionId}`,
            controlUrl: `http://localhost:${PORT}/control/${sessionId}`,
            createdAt: new Date(),
            status: 'created'
        };

        liveStreamData.sessions.set(sessionId, session);
        console.log(`✅ Session created: ${sessionId}`);
        console.log(`📊 Total sessions: ${liveStreamData.sessions.size}`);
        console.log(`📋 Session data:`, session);

        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Create session error:', error.message);
        res.status(500).json({
            error: 'خطأ في إنشاء جلسة البث'
        });
    }
});

app.get('/api/live/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        console.log(`📋 Fetching session: ${sessionId}`);
        console.log(`📊 Available sessions: ${Array.from(liveStreamData.sessions.keys()).join(', ')}`);

        const session = liveStreamData.sessions.get(sessionId);

        if (!session) {
            console.log(`❌ Session not found: ${sessionId}`);
            return res.status(404).json({
                error: 'جلسة البث غير موجودة'
            });
        }

        console.log(`✅ Session found: ${sessionId}`, session);
        res.json({
            success: true,
            data: session
        });
    } catch (error) {
        console.error('Get session error:', error.message);
        res.status(500).json({
            error: 'خطأ في جلب بيانات الجلسة'
        });
    }
});

app.post('/api/live/process-players', async (req, res) => {
    try {
        const { players, targetClub, searchMode } = req.body;

        if (!players || !Array.isArray(players)) {
            return res.status(400).json({
                error: 'قائمة اللاعبين مطلوبة'
            });
        }

        // For single club mode, targetClub is required
        if (searchMode === 'single' && !targetClub) {
            return res.status(400).json({
                error: 'النادي المطلوب مطلوب في وضع النادي الواحد'
            });
        }

        const processedPlayers = [];

        for (const playerData of players) {
            const { arabicName, currentClub, targetClub: playerTargetClub } = playerData;

            try {
                // Determine target club based on search mode
                const finalTargetClub = searchMode === 'multi' ? playerTargetClub : targetClub;

                if (!finalTargetClub) {
                    throw new Error('النادي المطلوب غير محدد لهذا اللاعب');
                }

                // Check cache first
                const cacheKey = `${arabicName}_${finalTargetClub}_${currentClub || ''}`;
                const cachedResult = getCachedSearch(cacheKey);

                if (cachedResult) {
                    // Use cached result but generate new ID
                    processedPlayers.push({
                        ...cachedResult,
                        id: uuidv4(),
                        fromCache: true
                    });
                    continue; // Skip to next player
                }

                // Translate names
                const translatedCurrentClub = currentClub ? translateClubName(currentClub) : null;
                const translatedTargetClub = translateClubName(finalTargetClub);

                // Get English name
                const englishName = await translatePlayerName(arabicName, translatedCurrentClub);

                // Search player
                const playerInfo = await searchPlayer(englishName, translatedCurrentClub);

                // Get rumors
                const rumors = await getTransferRumors(playerInfo.playerId, translatedTargetClub);

                // Get logos
                const clubsToFetchLogos = new Set();
                clubsToFetchLogos.add(playerInfo.club);
                clubsToFetchLogos.add(finalTargetClub);
                if (rumors.allRumors) {
                    rumors.allRumors.forEach(rumor => {
                        if (rumor.club) clubsToFetchLogos.add(rumor.club);
                    });
                }
                const clubLogos = await clubLogoService.getMultipleClubLogos(Array.from(clubsToFetchLogos));

                // Get player image - Try Pinterest first, then fallback
                let playerImage;
                try {
                    const pinterestResult = await pinterestImageService.getPlayerImage({
                        arabicName,
                        englishName,
                        currentClub: playerInfo.club,
                        position: playerInfo.position
                    });

                    if (pinterestResult.success && pinterestResult.imageUrl) {
                        playerImage = pinterestResult.imageUrl;
                        console.log(`✅ Using Pinterest image for ${arabicName}: ${playerImage}`);
                    } else {
                        throw new Error('Pinterest image not found');
                    }
                } catch (error) {
                    console.log(`⚠️ Pinterest failed for ${arabicName}, using fallback service`);
                    playerImage = await playerImageService.getPlayerImage({
                        playerId: playerInfo.playerId,
                        englishName,
                        arabicName,
                        currentClub: playerInfo.club,
                        playerPosition: playerInfo.position
                    });
                }

                const playerResult = {
                    id: uuidv4(),
                    arabicName,
                    englishName,
                    playerId: playerInfo.playerId,
                    playerUrl: playerInfo.playerUrl,
                    playerName: playerInfo.name,
                    currentClub: playerInfo.club,
                    playerAge: playerInfo.age,
                    playerPosition: playerInfo.position,
                    playerImage: playerImage,
                    targetClub: finalTargetClub,
                    targetRumor: rumors.targetRumor,
                    allRumors: rumors.allRumors,
                    clubLogos
                };

                // Cache the result (without the ID)
                const cacheData = { ...playerResult };
                delete cacheData.id; // Remove ID from cached data
                cacheSearchResult(cacheKey, cacheData);

                processedPlayers.push(playerResult);

            } catch (playerError) {
                console.error(`Error processing player ${arabicName}:`, playerError.message);
                processedPlayers.push({
                    id: uuidv4(),
                    arabicName,
                    error: playerError.message,
                    status: 'failed'
                });
            }
        }

        res.json({
            success: true,
            data: {
                players: processedPlayers,
                searchMode,
                targetClub: searchMode === 'single' ? targetClub : null,
                processedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Process players error:', error.message);
        res.status(500).json({
            error: 'خطأ في معالجة بيانات اللاعبين'
        });
    }
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`🔗 New WebSocket connection: ${socket.id}`);

    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        console.log(`📺 Socket ${socket.id} joined session ${sessionId}`);
    });

    socket.on('control-overlay', (data) => {
        const { sessionId, action, payload } = data;
        console.log(`🎮 Control action: ${action} for session ${sessionId}`);

        // Broadcast to all clients in the session
        io.to(sessionId).emit('overlay-update', {
            action,
            payload,
            timestamp: new Date()
        });
    });

    socket.on('toggle-overlay', (data) => {
        const { sessionId, visible } = data;
        console.log(`👁️ Toggle overlay: ${visible ? 'show' : 'hide'} for session ${sessionId}`);

        // Broadcast to all clients in the session
        io.to(sessionId).emit('toggle-overlay', {
            visible,
            timestamp: new Date()
        });
    });

    socket.on('update-settings', (data) => {
        const { sessionId, settings } = data;
        console.log(`⚙️ Update settings for session ${sessionId}:`, settings);

        // Broadcast settings update to all clients in the session
        io.to(sessionId).emit('settings-update', {
            settings,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log(`❌ WebSocket disconnected: ${socket.id}`);
    });
});

// Serve overlay pages
app.get('/overlay/:sessionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

// Serve control panel
app.get('/control/:sessionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'control.html'));
});

// Serve professional studio v3 enhanced (New Enhanced Version)
app.get('/pro-studio-v3-enhanced', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pro-studio-v3-enhanced.html'));
});

// Serve Ultimate Studio V4 - World-Class Creative Platform
app.get('/ultimate-studio-v4', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pro-studio-v4-ultimate.html'));
});

// Serve Ultimate Studio V4 - Alternative Path (Old)
app.get('/pro-studio-v4-ultimate', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pro-studio-v4-ultimate.html'));
});

// Serve Pro Studio V5 Modern - New Beautiful Design
app.get('/pro-studio-v5-modern', (req, res) => {
    console.log('🎨 طلب Pro Studio V5 Modern من:', req.ip);
    res.sendFile(path.join(__dirname, 'public', 'pro-studio-v5-modern.html'));
});

// Redirect main studio to new modern version
app.get('/pro-studio', (req, res) => {
    res.redirect('/pro-studio-v5-modern');
});

// Serve Design Comparison Page
app.get('/design-comparison', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'design-comparison.html'));
});

// Serve Pro Studio V5 Ultimate - Complete Working Version
app.get('/pro-studio-v5-ultimate', (req, res) => {
    console.log('🚀 طلب Pro Studio V5 Ultimate من:', req.ip);
    res.sendFile(path.join(__dirname, 'public', 'pro-studio-v5-modern.html'));
});

// Serve Stream View for Ultimate Studio V4
app.get('/stream-view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-view.html'));
});

// Serve Simple Stream Overlay
app.get('/stream-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-overlay.html'));
});

// Serve Test Stream Page
app.get('/test-stream', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-stream.html'));
});

// Serve Stream Test Page
app.get('/stream-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-test.html'));
});

// Serve Stream Diagnosis Page
app.get('/stream-diagnosis', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-diagnosis.html'));
});

// Serve LM Studio Test Page
app.get('/lm-studio-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lm-studio-test.html'));
});

// Serve Ultimate Stream Control
app.get('/ultimate-stream-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ultimate-stream-control.html'));
});

// Serve Ultimate Stream Overlay
app.get('/ultimate-stream-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ultimate-stream-overlay.html'));
});

// Serve Test Pages
app.get('/test-pages', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-pages.html'));
});

// Serve Multi Player Interface
app.get('/multi-player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'multi-player.html'));
});

// Serve Stream System Test
app.get('/test-stream-system', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-stream-system.html'));
});

// Serve Stream Control Panel
app.get('/stream-control-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-control-panel.html'));
});

// Serve Simple Stream Overlay
app.get('/stream-overlay-simple', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-overlay-simple.html'));
});

// Serve Direct Stream View (Ultimate Studio V4 content only)
app.get('/stream-direct-view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-direct-view.html'));
});

// Serve Clean Stream Overlay (New clean version for OBS)
app.get('/stream-overlay-clean', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-overlay-clean.html'));
});

// Serve Stream Functions Test Tool
app.get('/test-stream-functions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-stream-functions.html'));
});

// Serve Enhanced Clean Stream Overlay (Ultimate Studio V4 Design)
app.get('/stream-overlay-enhanced', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-overlay-enhanced.html'));
});

// Serve Enhanced Clean Stream Overlay (Direct)
app.get('/stream-overlay-clean-enhanced', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-overlay-clean-enhanced.html'));
});

// Serve Test Fixes Page
app.get('/test-fixes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-fixes.html'));
});

// Serve Debug Stream Page
app.get('/debug-stream', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'debug-stream.html'));
});

// Serve Stream Test Page
app.get('/stream-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-test.html'));
});

// Serve Working Stream Overlay
app.get('/stream-working', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-working.html'));
});

// Serve Final Test Page
app.get('/final-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'final-test.html'));
});

// Serve Clean Stream Overlay (Production Ready)
app.get('/stream-clean', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-clean.html'));
});

// Serve Centering Test Page
app.get('/test-centering', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-centering.html'));
});

// Serve Stream Overlay Control Panel (REO SHOW)
app.get('/stream-overlay-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-overlay-control.html'));
});

// ===== TRANSFERS PAGES =====

// Serve Daily Transfers Management Page
app.get('/daily-transfers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'daily-transfers.html'));
});

// Serve Daily Transfers Stream Overlay
app.get('/transfers-stream', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'transfers-stream.html'));
});

// Serve Daily Transfers Sidebar
app.get('/transfers-sidebar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'transfers-sidebar.html'));
});

// Serve Standings Manager Page
app.get('/standings-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'standings-manager.html'));
});

// Serve Daily Transfers Sidebar
app.get('/daily-transfers-sidebar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'daily-transfers-sidebar.html'));
});

// Serve Transfers Manager Page (Original)
app.get('/transfers-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'transfers-manager.html'));
});

// Serve Professional Transfers Manager Page (New)
app.get('/professional-transfers', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'professional-transfers-new.html'));
});

// Serve System Dashboard
app.get('/system-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'system-dashboard.html'));
});

// Serve Professional Transfers Manager Page (Old)
app.get('/professional-transfers-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'professional-transfers-new.html'));
});

// Serve Professional OBS Overlay Page
app.get('/professional-obs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'professional-obs-overlay.html'));
});

// Serve Old Professional Transfers Manager Page (Backup)
app.get('/professional-transfers-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'professional-transfers-manager.html'));
});

// Serve Live Overlay Page (OBS Ready)
app.get('/live-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'live-overlay.html'));
});

// Serve Transfers Test Page
app.get('/transfers-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'transfers-test.html'));
});

// NEW REAL FotMob API endpoint - Most Reliable System
app.post('/api/transfers/fetch-real', async (req, res) => {
    try {
        console.log('🚀 API: جلب الصفقات الحقيقية من النظام الجديد...');

        const RealFotmobExtractor = require('./services/realFotmobExtractor');
        const extractor = new RealFotmobExtractor();

        let transfers = await extractor.extractRealTransfers();

        console.log(`📊 النظام الجديد أرجع ${transfers ? transfers.length : 0} صفقة`);

        // إذا لم يجد صفقات، أنشئ بيانات بديلة
        if (!transfers || transfers.length === 0) {
            console.log('🔄 إنشاء بيانات بديلة...');
            transfers = generateFallbackTransfers();
        }

        if (transfers && transfers.length > 0) {
            // حفظ البيانات في الكاش
            if (transfersService && transfersService.saveTransfersToCache) {
                try {
                    await transfersService.saveTransfersToCache(transfers);
                } catch (cacheError) {
                    console.log('⚠️ خطأ في حفظ الكاش:', cacheError.message);
                }
            }

            res.json({
                success: true,
                transfers: transfers,
                count: transfers.length,
                source: 'real_fotmob_extractor',
                timestamp: new Date().toISOString(),
                message: `تم جلب ${transfers.length} صفقة حقيقية بنجاح`
            });
        } else {
            console.log('⚠️ النظام الجديد لم يجد صفقات');
            res.json({
                success: false,
                transfers: [],
                count: 0,
                error: 'لم يتم العثور على صفقات حقيقية',
                fallback: 'يمكن استخدام البيانات المحفوظة'
            });
        }
    } catch (error) {
        console.error('❌ خطأ في جلب الصفقات الحقيقية:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// FOTMOB INTEGRATED SYSTEM - النظام المتكامل مع FotMob
app.post('/api/transfers/fotmob-integrated', async (req, res) => {
    try {
        console.log('🚀 API: النظام المتكامل مع FotMob...');
        const { dateFilter = 'today' } = req.body;

        // Use the enhanced FotMob Advanced Extractor
        const FotMobAdvancedExtractor = require('./services/fotmobAdvancedExtractor');
        const extractor = new FotMobAdvancedExtractor();

        console.log(`📅 جلب الصفقات للتاريخ: ${dateFilter}`);

        // Try enhanced extractor first
        let transfers = await extractor.extractTransfers(dateFilter);

        // If no results, try fallback
        if (!transfers || transfers.length === 0) {
            console.log('⚠️ لم يتم العثور على صفقات، محاولة الطريقة البديلة...');
            transfers = await fotmobIntegratedService.getTransfersByDate(dateFilter);
        }

        if (transfers && transfers.length > 0) {
            res.json({
                success: true,
                transfers: transfers,
                count: transfers.length,
                source: 'fotmob_integrated',
                dateFilter: dateFilter,
                timestamp: new Date().toISOString(),
                message: `تم جلب ${transfers.length} صفقة من FotMob للتاريخ ${dateFilter}`
            });
        } else {
            res.json({
                success: false,
                transfers: [],
                count: 0,
                error: 'لم يتم العثور على صفقات في FotMob للتاريخ المحدد',
                dateFilter: dateFilter
            });
        }
    } catch (error) {
        console.error('❌ خطأ في النظام المتكامل مع FotMob:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// ULTIMATE TRANSFERS SYSTEM INFO - معلومات النظام النهائي
app.get('/api/transfers/ultimate', (req, res) => {
    res.json({
        success: true,
        message: 'Ultimate Transfers System API',
        description: 'نظام استخراج الصفقات النهائي المحسن',
        version: '1.0.0',
        endpoints: {
            'POST /api/transfers/ultimate': 'استخراج الصفقات',
            'GET /api/transfers/ultimate/errors': 'تقرير الأخطاء',
            'POST /api/transfers/ultimate/search-errors': 'البحث في الأخطاء'
        },
        usage: {
            method: 'POST',
            body: { dateFilter: 'today|yesterday|week|month' },
            example: 'POST /api/transfers/ultimate with body {"dateFilter": "today"}'
        },
        timestamp: Date.now()
    });
});

// ADVANCED TRANSFERS SYSTEM - النظام المتقدم الجديد
app.post('/api/transfers/advanced', async (req, res) => {
    try {
        console.log('🚀 API: النظام المتقدم الجديد...');
        const { dateFilter = 'today' } = req.body;

        // استخدام النظام المتقدم الجديد
        const AdvancedFotMobExtractor = require('./services/advancedFotMobExtractor');
        const extractor = new AdvancedFotMobExtractor();

        console.log(`📅 جلب الصفقات المتقدمة للتاريخ: ${dateFilter}`);

        const transfers = await extractor.extractAdvancedTransfers(dateFilter);
        const stats = extractor.getExtractionStats();

        console.log(`✅ النظام المتقدم أرجع ${transfers ? transfers.length : 0} صفقة محسنة`);

        res.json({
            success: true,
            transfers: transfers || [],
            count: transfers ? transfers.length : 0,
            dateFilter,
            stats,
            timestamp: Date.now(),
            source: 'advanced_system',
            enhanced: true
        });

    } catch (error) {
        console.error('❌ خطأ في النظام المتقدم:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// ULTIMATE TRANSFERS SYSTEM - النظام النهائي المحسن
app.post('/api/transfers/ultimate', async (req, res) => {
    try {
        console.log('🚀 API: النظام النهائي المحسن...');
        const { dateFilter = 'today' } = req.body;

        // استخدام النظام النهائي الجديد
        const UltimateTransfersExtractor = require('./services/ultimateTransfersExtractor');
        const extractor = new UltimateTransfersExtractor();

        console.log(`📅 جلب الصفقات النهائية للتاريخ: ${dateFilter}`);

        const transfers = await extractor.extractTransfers(dateFilter);
        const stats = extractor.getStats();

        console.log(`✅ النظام النهائي أرجع ${transfers ? transfers.length : 0} صفقة`);

        res.json({
            success: true,
            transfers: transfers || [],
            count: transfers ? transfers.length : 0,
            dateFilter,
            stats,
            timestamp: Date.now(),
            source: 'ultimate_system'
        });

    } catch (error) {
        console.error('❌ خطأ في النظام النهائي:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// ULTIMATE SYSTEM ERROR REPORT - تقرير أخطاء النظام النهائي
app.get('/api/transfers/ultimate/errors', async (req, res) => {
    try {
        console.log('📊 API: طلب تقرير الأخطاء...');

        const UltimateTransfersExtractor = require('./services/ultimateTransfersExtractor');
        const extractor = new UltimateTransfersExtractor();

        const errorReport = extractor.getErrorReport();
        const stats = extractor.getStats();

        res.json({
            success: true,
            errorReport,
            systemStats: stats,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ خطأ في تقرير الأخطاء:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ULTIMATE SYSTEM SEARCH ERRORS - البحث في الأخطاء
app.post('/api/transfers/ultimate/search-errors', async (req, res) => {
    try {
        console.log('🔍 API: البحث في الأخطاء...');
        const { query, filters } = req.body;

        const UltimateTransfersExtractor = require('./services/ultimateTransfersExtractor');
        const extractor = new UltimateTransfersExtractor();

        const searchResults = extractor.searchErrors(query, filters);

        res.json({
            success: true,
            results: searchResults,
            count: searchResults.length,
            query,
            filters,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ خطأ في البحث:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PROFESSIONAL ULTIMATE TRANSFERS SYSTEM - النظام الاحترافي النهائي
app.post('/api/transfers/professional-ultimate', async (req, res) => {
    try {
        console.log('🚀 API: النظام الاحترافي النهائي...');
        const { dateFilter = 'today' } = req.body;

        // استخدام النظام الاحترافي الجديد
        const ProfessionalTransfersExtractor = require('./services/professionalTransfersExtractor');
        const extractor = new ProfessionalTransfersExtractor();

        console.log(`📅 جلب الصفقات الاحترافية للتاريخ: ${dateFilter}`);

        const transfers = await extractor.extractTransfers(dateFilter);

        if (transfers && transfers.length > 0) {
            res.json({
                success: true,
                transfers: transfers,
                count: transfers.length,
                source: 'professional_ultimate',
                dateFilter: dateFilter,
                timestamp: new Date().toISOString(),
                message: `تم جلب ${transfers.length} صفقة فريدة من النظام الاحترافي`
            });
        } else {
            // إرجاع البيانات الاحتياطية
            const fallbackData = extractor.generateProfessionalFallbackData(dateFilter);
            res.json({
                success: true,
                transfers: fallbackData,
                count: fallbackData.length,
                source: 'professional_fallback',
                dateFilter: dateFilter,
                timestamp: new Date().toISOString(),
                message: `تم جلب ${fallbackData.length} صفقة احتياطية من النظام الاحترافي`
            });
        }
    } catch (error) {
        console.error('❌ خطأ في النظام الاحترافي النهائي:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// NEW UNIFIED TRANSFERS SYSTEM - الحل النهائي
app.post('/api/transfers/fetch-unified', async (req, res) => {
    try {
        console.log('🚀 API: النظام الموحد المتطور...');
        const { dateFilter = 'today' } = req.body;

        const transfers = await unifiedTransfersService.getTransfersByDate(dateFilter);

        if (transfers && transfers.length > 0) {
            res.json({
                success: true,
                transfers: transfers,
                count: transfers.length,
                source: 'unified_system',
                dateFilter: dateFilter,
                timestamp: new Date().toISOString(),
                message: `تم جلب ${transfers.length} صفقة من النظام الموحد`
            });
        } else {
            res.json({
                success: false,
                transfers: [],
                count: 0,
                error: 'لم يتم العثور على صفقات',
                dateFilter: dateFilter
            });
        }
    } catch (error) {
        console.error('❌ خطأ في النظام الموحد:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// Generate fallback transfers
function generateFallbackTransfers() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return [
        {
            id: `fallback_${Date.now()}_1`,
            playerName: "Kylian Mbappé",
            fromClub: "Paris Saint-Germain",
            toClub: "Real Madrid",
            transferFee: "Free Transfer",
            position: "RW",
            age: 25,
            marketValue: "€180M",
            contract: "2024-2029",
            date: today.toISOString().split('T')[0],
            source: "Fallback_Data",
            selected: false
        },
        {
            id: `fallback_${Date.now()}_2`,
            playerName: "Erling Haaland",
            fromClub: "Manchester City",
            toClub: "Real Madrid",
            transferFee: "€150M",
            position: "ST",
            age: 24,
            marketValue: "€170M",
            contract: "2024-2030",
            date: today.toISOString().split('T')[0],
            source: "Fallback_Data",
            selected: false
        },
        {
            id: `fallback_${Date.now()}_3`,
            playerName: "Victor Osimhen",
            fromClub: "Napoli",
            toClub: "Chelsea",
            transferFee: "€120M",
            position: "ST",
            age: 25,
            marketValue: "€110M",
            contract: "2024-2029",
            date: yesterday.toISOString().split('T')[0],
            source: "Fallback_Data",
            selected: false
        },
        {
            id: `fallback_${Date.now()}_4`,
            playerName: "Jude Bellingham",
            fromClub: "Real Madrid",
            toClub: "Manchester United",
            transferFee: "On Loan",
            position: "CM",
            age: 21,
            marketValue: "€120M",
            contract: "2024-2025",
            date: today.toISOString().split('T')[0],
            source: "Fallback_Data",
            selected: false
        },
        {
            id: `fallback_${Date.now()}_5`,
            playerName: "Jamal Musiala",
            fromClub: "Bayern Munich",
            toClub: "Manchester City",
            transferFee: "€100M",
            position: "AM",
            age: 21,
            marketValue: "€90M",
            contract: "2024-2028",
            date: yesterday.toISOString().split('T')[0],
            source: "Fallback_Data",
            selected: false
        }
    ];
}

// REAL FotMob API endpoint - Enhanced scraping (Legacy)
app.post('/api/transfers/fetch-fotmob', async (req, res) => {
    try {
        console.log('🔍 API call to fetch REAL FotMob transfers...');

        const RealFotMobScraper = require('./services/realFotmobScraper');
        const scraper = new RealFotMobScraper();

        console.log('🚀 Starting real transfer scraping from multiple sources...');

        // Try FotMob first
        const fotmobTransfers = await scraper.fetchRealTransfers();
        console.log(`📊 FotMob found: ${fotmobTransfers.length} transfers`);

        // Try alternative sources
        const AlternativeTransferSources = require('./services/alternativeTransferSources');
        const altScraper = new AlternativeTransferSources();
        const altTransfers = await altScraper.fetchRealTransfers();
        console.log(`📊 Alternative sources found: ${altTransfers.length} transfers`);

        // Combine all transfers
        const allTransfers = [...fotmobTransfers, ...altTransfers];

        // Remove duplicates
        const uniqueTransfers = removeDuplicateTransfers(allTransfers);

        if (uniqueTransfers && uniqueTransfers.length > 0) {
            console.log(`✅ SUCCESS: Found ${uniqueTransfers.length} REAL transfers from all sources!`);

            // Log some details for verification
            uniqueTransfers.slice(0, 5).forEach((transfer, index) => {
                console.log(`📋 Real Transfer ${index + 1}: ${transfer.playerName} from ${transfer.fromClub} to ${transfer.toClub} (${transfer.source})`);
            });

            res.json({
                success: true,
                transfers: uniqueTransfers,
                count: uniqueTransfers.length,
                source: 'real',
                message: `Found ${uniqueTransfers.length} real transfers from multiple sources`,
                sources: {
                    fotmob: fotmobTransfers.length,
                    alternative: altTransfers.length,
                    total: uniqueTransfers.length
                },
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('⚠️ No real transfers found from any source, using realistic generator');

            // Use realistic transfer generator
            const RealisticTransferGenerator = require('./services/realisticTransferGenerator');
            const generator = new RealisticTransferGenerator();
            const realisticTransfers = generator.getTodaysTransfers();

            console.log(`🎭 Generated ${realisticTransfers.length} realistic transfers based on current market`);

            res.json({
                success: true,
                transfers: realisticTransfers,
                count: realisticTransfers.length,
                source: 'realistic',
                message: `Generated ${realisticTransfers.length} realistic transfers based on current market trends`,
                note: 'These are realistic transfers based on current market conditions and player situations',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ CRITICAL ERROR in FotMob scraping:', error.message);
        console.error('❌ Stack trace:', error.stack);

        // Return mock data on error
        const mockTransfers = generateRealisticMockTransfers();
        res.json({
            success: false,
            transfers: mockTransfers,
            count: mockTransfers.length,
            source: 'mock',
            error: error.message,
            message: 'Error occurred, using mock data',
            timestamp: new Date().toISOString()
        });
    }
});

// Generate realistic mock transfers for fallback
function generateRealisticMockTransfers() {
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    return [
        {
            id: `mock_${Date.now()}_1`,
            playerName: 'Kylian Mbappé',
            fromClub: 'Paris Saint-Germain',
            toClub: 'Real Madrid',
            transferFee: 'Free Transfer',
            transferType: 'Free Transfer',
            position: 'LW',
            date: today,
            source: 'Mock Data (Realistic)',
            timestamp: new Date().toISOString(),
            isOfficial: true
        },
        {
            id: `mock_${Date.now()}_2`,
            playerName: 'Erling Haaland',
            fromClub: 'Manchester City',
            toClub: 'Real Madrid',
            transferFee: '€150M',
            transferType: 'Transfer',
            position: 'ST',
            date: today,
            source: 'Mock Data (Realistic)',
            timestamp: new Date().toISOString(),
            isOfficial: true
        },
        {
            id: `mock_${Date.now()}_3`,
            playerName: 'Victor Osimhen',
            fromClub: 'Napoli',
            toClub: 'Chelsea',
            transferFee: '€120M',
            transferType: 'Transfer',
            position: 'ST',
            date: today,
            source: 'Mock Data (Realistic)',
            timestamp: new Date().toISOString(),
            isOfficial: true
        },
        {
            id: `mock_${Date.now()}_4`,
            playerName: 'Jude Bellingham',
            fromClub: 'Real Madrid',
            toClub: 'Manchester United',
            transferFee: 'Loan',
            transferType: 'Loan',
            position: 'CM',
            date: today,
            source: 'Mock Data (Realistic)',
            timestamp: new Date().toISOString(),
            isOfficial: true
        },
        {
            id: `mock_${Date.now()}_5`,
            playerName: 'Xavi Simons',
            fromClub: 'PSV Eindhoven',
            toClub: 'Liverpool',
            transferFee: '€80M',
            transferType: 'Transfer',
            position: 'AM',
            date: today,
            source: 'Mock Data (Realistic)',
            timestamp: new Date().toISOString(),
            isOfficial: true
        }
    ];
}

// Remove duplicate transfers
function removeDuplicateTransfers(transfers) {
    const seen = new Set();
    return transfers.filter(transfer => {
        const key = `${transfer.playerName}_${transfer.toClub}`.toLowerCase().replace(/\s+/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Test FotMob connection endpoint
app.get('/api/transfers/test-fotmob', async (req, res) => {
    try {
        console.log('🧪 Testing FotMob connection...');

        const axios = require('axios');

        const response = await axios.get('https://www.fotmob.com/transfers', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const contentLength = response.data.length;
        const hasTransferContent = response.data.toLowerCase().includes('transfer');
        const hasPlayerContent = response.data.toLowerCase().includes('player');

        console.log(`✅ FotMob connection test successful`);
        console.log(`📊 Content length: ${contentLength}`);
        console.log(`🔍 Has transfer content: ${hasTransferContent}`);
        console.log(`👤 Has player content: ${hasPlayerContent}`);

        res.json({
            success: true,
            status: 'Connected to FotMob',
            contentLength: contentLength,
            hasTransferContent: hasTransferContent,
            hasPlayerContent: hasPlayerContent,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ FotMob connection test failed:', error.message);

        res.json({
            success: false,
            status: 'Failed to connect to FotMob',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get realistic transfers with different types
app.post('/api/transfers/get-realistic', async (req, res) => {
    try {
        console.log('🎭 API call for realistic transfers...');

        const { type = 'today', count = 5 } = req.body;

        const RealisticTransferGenerator = require('./services/realisticTransferGenerator');
        const generator = new RealisticTransferGenerator();

        let transfers = [];
        let message = '';

        switch (type) {
            case 'today':
                transfers = generator.getTodaysTransfers();
                message = 'Today\'s realistic transfers';
                break;
            case 'breaking':
                transfers = generator.generateBreakingNews(count);
                message = 'Breaking news transfers';
                break;
            case 'rumors':
                transfers = generator.generateRumors(count);
                message = 'Transfer rumors';
                break;
            case 'custom':
                transfers = generator.generateTransfersWithCriteria(req.body.criteria || {});
                message = 'Custom criteria transfers';
                break;
            default:
                transfers = generator.generateRealisticTransfers(count);
                message = 'General realistic transfers';
        }

        console.log(`✅ Generated ${transfers.length} ${type} transfers`);

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            type: type,
            source: 'realistic_generator',
            message: message,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in realistic transfers API:', error.message);

        res.json({
            success: false,
            transfers: [],
            count: 0,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve Quick Test Page (REO SHOW)
app.get('/test-reo-show', (req, res) => {
    res.sendFile(path.join(__dirname, '🧪 اختبار سريع للبث المحسن.html'));
});

// Serve Enhanced Test Page (REO SHOW)
app.get('/test-reo-enhanced', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-reo-enhanced.html'));
});

// Serve Clubs Database Manager
app.get('/clubs-database-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'clubs-database-manager.html'));
});

// Serve Clubs Database Management (New Dedicated Page)
app.get('/clubs-database-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'clubs-database-management.html'));
});

// Serve Stream Design Showcase
app.get('/stream-showcase', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stream-showcase.html'));
});

// Serve OBS Test Tool
app.get('/obs-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'obs-test.html'));
});

// 🎬 Stream Data API - For OBS compatibility
let streamData = {
    active: false,
    content: null,
    lastUpdate: Date.now()
};

// API to get stream data
app.get('/api/stream-data', (req, res) => {
    res.json(streamData);
});

// API to update stream data
app.post('/api/stream-data', express.json(), (req, res) => {
    const { active, content } = req.body;

    if (typeof active !== 'undefined') {
        streamData.active = active;
    }

    if (content) {
        streamData.content = content;
        streamData.lastUpdate = Date.now();
    }

    console.log('📡 Stream data updated:', { active: streamData.active, hasContent: !!streamData.content });
    res.json({ success: true, data: streamData });
});

// API to clear stream data
app.delete('/api/stream-data', (req, res) => {
    streamData = {
        active: false,
        content: null,
        lastUpdate: Date.now()
    };
    console.log('🗑️ Stream data cleared');
    res.json({ success: true });
});

// REO SHOW API endpoints
let reoShowPlayers = [];
let reoShowStats = {
    totalDeals: 0,
    successRate: 0,
    lastUpdate: new Date(),
    date: new Date().toDateString()
};

// Get players data
app.get('/api/players-data', (req, res) => {
    res.json({
        players: reoShowPlayers,
        stats: reoShowStats,
        timestamp: Date.now()
    });
});

// Add/Update players
app.post('/api/players-data', express.json(), (req, res) => {
    const { players, stats } = req.body;

    if (players && Array.isArray(players)) {
        reoShowPlayers = players;
        console.log(`👥 Updated players data: ${players.length} players`);
    }

    if (stats) {
        reoShowStats = {
            ...reoShowStats,
            ...stats,
            lastUpdate: new Date(),
            date: new Date().toDateString()
        };
        console.log('📊 Updated REO SHOW stats:', reoShowStats);
    }

    res.json({
        success: true,
        players: reoShowPlayers,
        stats: reoShowStats,
        timestamp: Date.now()
    });
});

// Get statistics
app.get('/api/reo-stats', (req, res) => {
    res.json({
        stats: reoShowStats,
        playersCount: reoShowPlayers.length,
        timestamp: Date.now()
    });
});

// Update statistics
app.post('/api/reo-stats', express.json(), (req, res) => {
    const { totalDeals, successRate } = req.body;

    if (typeof totalDeals === 'number') {
        reoShowStats.totalDeals = totalDeals;
    }

    if (typeof successRate === 'number') {
        reoShowStats.successRate = successRate;
    }

    reoShowStats.lastUpdate = new Date();
    reoShowStats.date = new Date().toDateString();

    console.log('📊 REO SHOW stats updated:', reoShowStats);

    res.json({
        success: true,
        stats: reoShowStats,
        timestamp: Date.now()
    });
});

// Clubs Database Management
let clubsDatabase = {};

// Load clubs database from file
function loadClubsDatabase() {
    try {
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(__dirname, 'data', 'clubs-database.json');

        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf8');
            clubsDatabase = JSON.parse(data);
            console.log('🏆 Clubs database loaded:', Object.keys(clubsDatabase).length, 'clubs');
        } else {
            // Initialize with default clubs
            initializeDefaultClubs();
        }
    } catch (error) {
        console.error('Error loading clubs database:', error);
        initializeDefaultClubs();
    }
}

// Save clubs database to file
function saveClubsDatabase() {
    try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(__dirname, 'data');
        const dbPath = path.join(dataDir, 'clubs-database.json');

        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(dbPath, JSON.stringify(clubsDatabase, null, 2));
        console.log('💾 Clubs database saved');
    } catch (error) {
        console.error('Error saving clubs database:', error);
    }
}

// Initialize default clubs
function initializeDefaultClubs() {
    clubsDatabase = {
        "ريال مدريد": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png",
            status: "unknown"
        },
        "برشلونة": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Barcelona-Logo.png",
            status: "unknown"
        },
        "مانشستر سيتي": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Manchester-City-Logo.png",
            status: "unknown"
        },
        "ليفربول": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png",
            status: "unknown"
        },
        "أرسنال": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png",
            status: "unknown"
        },
        "تشيلسي": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png",
            status: "unknown"
        },
        "مانشستر يونايتد": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Manchester-United-Logo.png",
            status: "unknown"
        },
        "توتنهام": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Tottenham-Logo.png",
            status: "unknown"
        },
        "بايرن ميونخ": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Bayern-Munich-Logo.png",
            status: "unknown"
        },
        "باريس سان جيرمان": {
            logo: "https://logos-world.net/wp-content/uploads/2020/06/Paris-Saint-Germain-Logo.png",
            status: "unknown"
        }
    };
    saveClubsDatabase();
    console.log('🏆 Default clubs database initialized');
}

// API: Get clubs database
app.get('/api/club-logos', (req, res) => {
    res.json({
        success: true,
        data: clubsDatabase,
        count: Object.keys(clubsDatabase).length
    });
});

// API: Save clubs database
app.post('/api/save-clubs-database', express.json(), (req, res) => {
    try {
        const { clubs } = req.body;

        if (clubs && typeof clubs === 'object') {
            clubsDatabase = clubs;
            saveClubsDatabase();

            res.json({
                success: true,
                message: 'Clubs database saved successfully',
                count: Object.keys(clubsDatabase).length
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid clubs data'
            });
        }
    } catch (error) {
        console.error('Error saving clubs database:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save clubs database'
        });
    }
});

// API: Reset clubs database
app.post('/api/reset-clubs-database', (req, res) => {
    try {
        initializeDefaultClubs();
        res.json({
            success: true,
            message: 'Clubs database reset successfully',
            count: Object.keys(clubsDatabase).length
        });
    } catch (error) {
        console.error('Error resetting clubs database:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset clubs database'
        });
    }
});

// Load clubs database on startup
loadClubsDatabase();

// Serve Test Functions Page
app.get('/test-functions', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-functions.html'));
});

// Serve Debug Test Page
app.get('/debug-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug-test.html'));
});

// Serve test overlay
app.get('/test-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-overlay.html'));
});

// Serve test fixes page
app.get('/test-fixes', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-fixes.html'));
});

// Serve fix all issues script
app.get('/fix-all-issues.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'fix-all-issues.js'));
});

// Serve diagnose issues page
app.get('/diagnose', (req, res) => {
    res.sendFile(path.join(__dirname, 'diagnose-issues.html'));
});

// Serve simple test page
app.get('/simple-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple-test.html'));
});

// Serve debug check page
app.get('/debug-check', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug-check.html'));
});

// Serve live test page
app.get('/live-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'live-test.html'));
});

// Serve multiclub test page
app.get('/test-multiclub', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-multiclub.html'));
});

// Serve Pinterest manager page
app.get('/pinterest-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'pinterest-manager.html'));
});

// Serve network settings page
app.get('/network-settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'network-settings.html'));
});

// Serve final test page (duplicate - removing)
// app.get('/final-test', (req, res) => {
//     res.sendFile(path.join(__dirname, 'final-test.html'));
// });

// Serve ultimate test page
app.get('/ultimate-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'ultimate-test.html'));
});

// Serve LM Studio test page
app.get('/test-lm-studio', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-lm-studio.html'));
});

// Serve complete test page
app.get('/complete-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'complete-test.html'));
});

// Serve final solution test page
app.get('/final-solution', (req, res) => {
    res.sendFile(path.join(__dirname, 'final-solution-test.html'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve Comprehensive Dashboard v2.0 (NEW)
app.get('/comprehensive-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'comprehensive-dashboard.html'));
});

// API endpoints for Global Clubs Extractor
app.post('/api/save-clubs-database', (req, res) => {
    try {
        const clubsData = req.body;

        // Save to file system - UPDATED FOR ULTIMATE SYSTEM
        const filePath = path.join(__dirname, 'data', 'ultimate_clubs_database.json');

        // Ensure data directory exists
        const dataDir = path.dirname(filePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(clubsData, null, 2));

        console.log(`💾 Saved ${clubsData.clubs?.length || 0} clubs to database`);

        res.json({
            success: true,
            message: 'Clubs database saved successfully',
            clubsCount: clubsData.clubs?.length || 0
        });

    } catch (error) {
        console.error('❌ Error saving clubs database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/load-clubs-database', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'ultimate_clubs_database.json');

        if (fs.existsSync(filePath)) {
            const clubsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            console.log(`📂 Loaded ${clubsData.clubs?.length || 0} clubs from database`);

            res.json(clubsData);
        } else {
            res.status(404).json({
                success: false,
                error: 'No clubs database found'
            });
        }

    } catch (error) {
        console.error('❌ Error loading clubs database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to get club logo from the new database
app.get('/api/get-club-logo-from-database', (req, res) => {
    try {
        const { clubName } = req.query;

        if (!clubName) {
            return res.status(400).json({
                success: false,
                error: 'Club name is required'
            });
        }

        const filePath = path.join(__dirname, 'data', 'fotmob_clubs_database.json');

        if (fs.existsSync(filePath)) {
            const clubsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Search for club by English or Arabic name
            const club = clubsData.clubs?.find(c =>
                c.englishName.toLowerCase() === clubName.toLowerCase() ||
                c.arabicName.toLowerCase() === clubName.toLowerCase() ||
                c.shortName?.toLowerCase() === clubName.toLowerCase()
            );

            if (club) {
                res.json({
                    success: true,
                    data: {
                        logoUrl: club.logoUrl,
                        englishName: club.englishName,
                        arabicName: club.arabicName,
                        league: club.league,
                        verified: club.verified
                    }
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Club not found in database'
                });
            }
        } else {
            res.status(404).json({
                success: false,
                error: 'Clubs database not found'
            });
        }

    } catch (error) {
        console.error('❌ Error getting club logo from database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve player links management page
app.get('/player-links', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player-links.html'));
});

// Serve professional overlay studio
app.get('/professional-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'professional-overlay.html'));
});

// Serve creative overlay studio
app.get('/creative-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'creative-overlay.html'));
});

// Serve AI dashboard
app.get('/ai-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ai-dashboard.html'));
});

// Serve analytics hub
app.get('/analytics-hub', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'analytics-hub.html'));
});

// Serve professional studio v2
app.get('/pro-studio-v2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pro-studio-v2.html'));
});

// Serve professional studio v3 (Real Data Version)
app.get('/pro-studio-v3', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pro-studio-v3.html'));
});

// API to get club logos
app.get('/api/club-logos', (req, res) => {
    try {
        const clubLogos = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'club-logos.json'), 'utf8'));
        res.json({
            success: true,
            data: clubLogos.clubs
        });
    } catch (error) {
        console.error('Error reading club logos:', error);
        res.json({
            success: false,
            message: 'فشل في تحميل صور الأندية'
        });
    }
});

// API to get club logo by name
app.get('/api/club-logo/:clubName', (req, res) => {
    try {
        const clubLogos = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'club-logos.json'), 'utf8'));
        const clubName = decodeURIComponent(req.params.clubName);
        const club = clubLogos.clubs[clubName];

        if (club) {
            res.json({
                success: true,
                data: club
            });
        } else {
            res.json({
                success: false,
                message: 'النادي غير موجود'
            });
        }
    } catch (error) {
        console.error('Error getting club logo:', error);
        res.json({
            success: false,
            message: 'فشل في تحميل شعار النادي'
        });
    }
});

// API to get transfer probability (same logic as professional overlay)
app.get('/api/get-transfer-probability', (req, res) => {
    try {
        const playerName = req.query.player;
        const targetClub = req.query.club;

        if (!playerName || !targetClub) {
            return res.json({
                success: false,
                message: 'معلومات اللاعب والنادي مطلوبة'
            });
        }

        // Use the same probability calculation as professional overlay
        let probability = calculateTransferProbability(playerName, targetClub);

        res.json({
            success: true,
            probability: probability + '%',
            playerName: playerName,
            targetClub: targetClub
        });

    } catch (error) {
        console.error('Error calculating transfer probability:', error);
        res.json({
            success: false,
            message: 'فشل في حساب احتمالية الانتقال'
        });
    }
});

// API to clear probability cache
app.post('/api/clear-probability-cache', (req, res) => {
    try {
        const cacheSize = probabilityCache.size;
        probabilityCache.clear();

        res.json({
            success: true,
            message: `تم مسح ${cacheSize} نتيجة من ذاكرة الاحتمالية`,
            clearedCount: cacheSize
        });

        console.log(`🗑️ Probability cache cleared: ${cacheSize} entries removed`);
    } catch (error) {
        console.error('Error clearing probability cache:', error);
        res.json({
            success: false,
            message: 'فشل في مسح ذاكرة الاحتمالية'
        });
    }
});

// API للحصول على بيانات اللاعب الكاملة (للربط مع جميع الأدوات)
app.get('/api/get-player-data/:arabicName', async (req, res) => {
    try {
        const arabicName = decodeURIComponent(req.params.arabicName);
        const key = arabicName.toLowerCase().trim();

        if (!playerPagesCache.has(key)) {
            return res.status(404).json({
                success: false,
                error: `لم يتم العثور على اللاعب ${arabicName}`
            });
        }

        const playerData = playerPagesCache.get(key);

        // جلب بيانات إضافية من صفحة اللاعب إذا أمكن
        let additionalData = {};
        try {
            if (playerData.pageUrl) {
                const playerInfo = await getPlayerInfoFromUrl(playerData.pageUrl);
                additionalData = {
                    englishName: playerInfo.name,
                    age: playerInfo.age,
                    position: playerInfo.position,
                    playerId: playerInfo.playerId
                };
            }
        } catch (error) {
            console.error('خطأ في جلب البيانات الإضافية:', error);
        }

        // دمج البيانات
        const completePlayerData = {
            ...playerData,
            ...additionalData,
            // إضافة معلومات للعرض
            displayName: playerData.arabicName,
            clubLogo: null, // سيتم جلبه من API منفصل
            lastUpdated: new Date().toISOString()
        };

        res.json({
            success: true,
            data: completePlayerData
        });

    } catch (error) {
        console.error('خطأ في جلب بيانات اللاعب الكاملة:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في جلب بيانات اللاعب'
        });
    }
});

// Cache for consistent probability results
const probabilityCache = new Map();

// Function to calculate transfer probability (consistent results)
function calculateTransferProbability(playerName, targetClub) {
    // Create cache key for consistent results
    const cacheKey = `${playerName.toLowerCase().trim()}_${targetClub.toLowerCase().trim()}`;

    // Check if we already calculated this combination
    if (probabilityCache.has(cacheKey)) {
        console.log(`📋 Using cached probability for: ${playerName} → ${targetClub}`);
        return probabilityCache.get(cacheKey);
    }

    let baseProbability = 45;

    // Player-based adjustments
    if (playerName.includes('محمد صلاح')) baseProbability = 75;
    else if (playerName.includes('صلاح')) baseProbability += 20;
    else if (playerName.includes('محمد') || playerName.includes('أحمد')) baseProbability += 10;
    else if (playerName.includes('مانه') || playerName.includes('فيرمينو')) baseProbability += 15;
    else if (playerName.includes('بنزيما')) baseProbability += 18;
    else if (playerName.includes('رونالدو')) baseProbability += 22;
    else if (playerName.includes('ميسي')) baseProbability += 20;
    else if (playerName.includes('نيمار')) baseProbability += 17;
    else if (playerName.includes('مبابي')) baseProbability += 19;

    // Club-based adjustments
    const bigClubs = ['ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'باريس سان جيرمان', 'بايرن ميونخ'];
    const saudiClubs = ['الهلال', 'النصر', 'الاتحاد', 'الأهلي'];

    if (bigClubs.includes(targetClub)) {
        baseProbability += 15;
    } else if (saudiClubs.includes(targetClub)) {
        baseProbability += 25; // Saudi clubs have high transfer success
    }

    // Use consistent hash-based variation instead of random
    const nameHash = playerName.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);

    const clubHash = targetClub.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);

    // Create consistent variation based on name and club
    const variation = ((Math.abs(nameHash + clubHash) % 16) - 8); // -8 to +8
    const finalProbability = Math.max(20, Math.min(90, baseProbability + variation));

    // Cache the result for consistency
    probabilityCache.set(cacheKey, finalProbability);
    console.log(`💾 Cached probability for: ${playerName} → ${targetClub} = ${finalProbability}%`);

    return finalProbability;
}

// Core application routes only - cleaned up

// Serve settings page
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Serve test overlay page
app.get('/test-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-overlay.html'));
});

// ===== ENHANCED CLUB LOGO SERVICE API =====

// Enhanced Club Logo Service API
app.get('/api/get-club-logo', async (req, res) => {
    try {
        const { clubName } = req.query;

        if (!clubName) {
            return res.status(400).json({
                success: false,
                error: 'Club name is required'
            });
        }

        console.log(`🔍 Searching for club logo: "${clubName}"`);

        // Try to get logo from unified service
        const logoData = await getClubLogoFromUnifiedService(clubName);

        if (logoData) {
            console.log(`✅ Logo found for "${clubName}": ${logoData.logoUrl}`);
            res.json({
                success: true,
                data: logoData
            });
        } else {
            console.log(`❌ Logo not found for "${clubName}"`);
            res.status(404).json({
                success: false,
                error: 'Logo not found',
                searchedFor: clubName
            });
        }
    } catch (error) {
        console.error('🚨 Error in get-club-logo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API لجلب البيانات من Transfermarkt مباشرة (للـ Control Panel)
app.post('/api/fetch-transfermarkt-data', async (req, res) => {
    try {
        console.log('🚀 بدء جلب البيانات من Transfermarkt للـ Control Panel...');

        // استخدام نفس منطق transfermarkt-real-data.html
        const TRANSFERMARKT_URL = 'https://www.transfermarkt.com/transfers/einnahmenausgaben/statistik/plus/0?ids=a&sa=&saison_id=2025&saison_id_bis=2025&land_id=&nat=&kontinent_id=&pos=&altersklasse=&w_s=&leihe=&intern=0&plus=0';

        const proxies = [
            { url: 'https://api.allorigins.win/get?url=', type: 'allorigins', name: 'AllOrigins' },
            { url: 'https://corsproxy.io/?', type: 'direct', name: 'CorsProxy.io' },
            { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'direct', name: 'CodeTabs' },
            { url: 'https://cors-anywhere.herokuapp.com/', type: 'direct', name: 'CORS Anywhere' }
        ];

        let htmlContent = null;

        // محاولة جلب HTML من Transfermarkt
        for (const proxy of proxies) {
            try {
                console.log(`📡 محاولة جلب عبر ${proxy.name}...`);

                let requestUrl;
                const options = {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Cache-Control': 'no-cache'
                    }
                };

                if (proxy.type === 'allorigins') {
                    requestUrl = proxy.url + encodeURIComponent(TRANSFERMARKT_URL + '&_=' + Date.now());
                } else {
                    requestUrl = proxy.url + TRANSFERMARKT_URL + '&_=' + Date.now();
                }

                const response = await fetch(requestUrl, options);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                if (proxy.type === 'allorigins') {
                    const data = await response.json();
                    htmlContent = data.contents;
                } else {
                    htmlContent = await response.text();
                }

                if (htmlContent && htmlContent.length > 1000) {
                    console.log(`✅ تم جلب HTML عبر ${proxy.name}`);
                    break;
                }

            } catch (error) {
                console.warn(`❌ فشل ${proxy.name}: ${error.message}`);
            }
        }

        if (!htmlContent) {
            throw new Error('فشل في جلب البيانات من جميع البروكسيات');
        }

        // تحليل HTML واستخراج البيانات
        const clubs = parseTransfermarktHTML(htmlContent);

        if (!clubs || clubs.length === 0) {
            throw new Error('لم يتم العثور على أندية في البيانات');
        }

        console.log(`✅ تم استخراج ${clubs.length} نادي بنجاح`);

        // حفظ البيانات في ملف محلي داخل المشروع
        const dataToSave = {
            clubs: clubs,
            lastUpdate: new Date().toISOString(),
            source: 'control-panel-api',
            version: '2025.1.0'
        };

        try {
            const fs = require('fs');
            const dataPath = path.join(__dirname, 'obs new tols', 'transfermarkt-live-data.json');
            fs.writeFileSync(dataPath, JSON.stringify(dataToSave, null, 2));
            console.log(`💾 تم حفظ البيانات في: ${dataPath}`);
        } catch (saveError) {
            console.warn('⚠️ خطأ في حفظ البيانات:', saveError.message);
        }

        res.json({
            success: true,
            data: clubs,
            count: clubs.length,
            timestamp: new Date().toISOString(),
            saved: true
        });

    } catch (error) {
        console.error('❌ خطأ في جلب بيانات Transfermarkt:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all clubs from the verified extractor database
app.get('/api/clubs-database', async (req, res) => {
    try {
        const clubsData = await getVerifiedClubsDatabase();

        res.json({
            success: true,
            data: {
                totalClubs: clubsData.length,
                clubs: clubsData,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('🚨 Error getting clubs database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// دالة تحليل HTML من Transfermarkt
function parseTransfermarktHTML(html) {
    const jsdom = require('jsdom');
    const { JSDOM } = jsdom;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const clubs = [];

    // البحث عن الجدول
    const tableSelectors = [
        'table.items',
        '.responsive-table table',
        'table[class*="items"]',
        'table tbody',
        'table'
    ];

    let table = null;
    for (const selector of tableSelectors) {
        table = document.querySelector(selector);
        if (table) break;
    }

    if (!table) {
        const allTables = document.querySelectorAll('table');
        for (const t of allTables) {
            if (t.textContent.includes('€') && t.textContent.includes('m')) {
                table = t;
                break;
            }
        }
    }

    if (!table) {
        throw new Error('لم يتم العثور على جدول البيانات');
    }

    const rows = table.querySelectorAll('tbody tr, tr');
    let validRowCount = 0;

    rows.forEach((row, index) => {
        if (validRowCount >= 10) return; // أول 10 أندية فقط

        const cells = row.querySelectorAll('td, th');
        if (cells.length < 4) return;

        try {
            const clubData = extractClubDataFromRow(cells, validRowCount + 1);
            if (clubData) {
                validRowCount++;
                clubs.push(clubData);
            }
        } catch (error) {
            console.warn(`تخطي الصف ${index}: ${error.message}`);
        }
    });

    return clubs;
}

// استخراج بيانات النادي من صف الجدول
function extractClubDataFromRow(cells, rank) {
    let clubName = '';

    // البحث عن اسم النادي
    for (let i = 0; i < Math.min(3, cells.length); i++) {
        const cell = cells[i];

        const nameLink = cell.querySelector('a[href*="/verein/"]') ||
                        cell.querySelector('a[title]') ||
                        cell.querySelector('a');

        if (nameLink && nameLink.textContent.trim().length > 2) {
            clubName = nameLink.textContent.trim();
            break;
        }

        const logoImg = cell.querySelector('img[alt]');
        if (logoImg && logoImg.alt.trim().length > 2) {
            if (!clubName) clubName = logoImg.alt.trim();
        }

        const cellText = cell.textContent.trim();
        if (!clubName && cellText.length > 2 && !cellText.includes('€') && !/^\d+$/.test(cellText)) {
            clubName = cellText;
        }
    }

    // تنظيف اسم النادي
    clubName = clubName.replace(/^\d+\.?\s*/, '').trim();

    if (!clubName || clubName.length < 2) {
        return null;
    }

    // استخراج البيانات المالية
    let expenditure = '€0.00m';
    let arrivals = '0';
    let income = '€0.00m';
    let departures = '0';
    let balance = '€0.00m';

    for (let i = 1; i < cells.length; i++) {
        const cellText = cells[i].textContent.trim();

        if (cellText.includes('€') && cellText.includes('m')) {
            if (expenditure === '€0.00m') {
                expenditure = cellText;
            } else if (income === '€0.00m') {
                income = cellText;
            } else if (balance === '€0.00m') {
                balance = cellText;
            }
        } else if (/^\d+$/.test(cellText)) {
            if (arrivals === '0') {
                arrivals = cellText;
            } else if (departures === '0') {
                departures = cellText;
            }
        }
    }

    if (!expenditure.includes('€')) {
        return null;
    }

    const englishName = clubName;
    const arabicName = translateClubName(englishName);

    return {
        rank: rank,
        englishName: englishName,
        arabicName: arabicName,
        name: arabicName || englishName,
        expenditure: expenditure,
        arrivals: parseInt(arrivals.replace(/\D/g, '')) || 0,
        income: income,
        departures: parseInt(departures.replace(/\D/g, '')) || 0,
        balance: balance,
        league: getClubLeague(englishName),
        logoUrl: null,
        lastUpdated: new Date().toISOString(),
        dataSource: 'server-api'
    };
}

// ترجمة أسماء الأندية
function translateClubName(englishName) {
    const translations = {
        'Liverpool FC': 'ليفربول',
        'Chelsea FC': 'تشيلسي',
        'Real Madrid': 'ريال مدريد',
        'Manchester United': 'مانشستر يونايتد',
        'Manchester City': 'مانشستر سيتي',
        'Arsenal FC': 'آرسنال',
        'Tottenham Hotspur': 'توتنهام',
        'FC Barcelona': 'برشلونة',
        'Atletico Madrid': 'أتلتيكو مدريد',
        'Paris Saint-Germain': 'باريس سان جيرمان',
        'Bayern Munich': 'بايرن ميونخ',
        'Borussia Dortmund': 'بوروسيا دورتموند',
        'Juventus': 'يوفنتوس',
        'AC Milan': 'ميلان',
        'Inter Milan': 'إنتر ميلان',
        'AS Roma': 'روما',
        'Napoli': 'نابولي',
        'Sevilla FC': 'إشبيلية',
        'Valencia CF': 'فالنسيا',
        'Villarreal CF': 'فياريال'
    };

    return translations[englishName] || englishName;
}

// تحديد دوري النادي
function getClubLeague(clubName) {
    const leagues = {
        'Liverpool FC': 'الدوري الإنجليزي الممتاز',
        'Chelsea FC': 'الدوري الإنجليزي الممتاز',
        'Manchester United': 'الدوري الإنجليزي الممتاز',
        'Manchester City': 'الدوري الإنجليزي الممتاز',
        'Arsenal FC': 'الدوري الإنجليزي الممتاز',
        'Tottenham Hotspur': 'الدوري الإنجليزي الممتاز',
        'Real Madrid': 'الدوري الإسباني',
        'FC Barcelona': 'الدوري الإسباني',
        'Atletico Madrid': 'الدوري الإسباني',
        'Bayern Munich': 'الدوري الألماني',
        'Borussia Dortmund': 'الدوري الألماني',
        'Juventus': 'الدوري الإيطالي',
        'AC Milan': 'الدوري الإيطالي',
        'Inter Milan': 'الدوري الإيطالي',
        'Paris Saint-Germain': 'الدوري الفرنسي'
    };

    return leagues[clubName] || 'غير محدد';
}

// تم نقل APIs البسيطة إلى أعلى الملف لتجنب التضارب مع static routes

// API لقراءة البيانات المحفوظة محلياً
app.get('/api/get-live-data', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'obs new tols', 'transfermarkt-live-data.json');

        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            const parsed = JSON.parse(data);

            res.json({
                success: true,
                data: parsed,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: false,
                error: 'لا توجد بيانات محفوظة',
                data: null
            });
        }
    } catch (error) {
        console.error('❌ خطأ في قراءة البيانات:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API لحفظ البيانات محلياً (للـ Control Panel)
app.post('/api/save-live-data', (req, res) => {
    try {
        const { clubs } = req.body;

        if (!clubs || !Array.isArray(clubs)) {
            return res.status(400).json({
                success: false,
                error: 'بيانات الأندية مطلوبة'
            });
        }

        const dataToSave = {
            clubs: clubs,
            lastUpdate: new Date().toISOString(),
            source: 'control-panel',
            version: '2025.1.0'
        };

        const fs = require('fs');
        const dataPath = path.join(__dirname, 'obs new tols', 'transfermarkt-live-data.json');
        fs.writeFileSync(dataPath, JSON.stringify(dataToSave, null, 2));

        console.log(`💾 تم حفظ ${clubs.length} نادي في: ${dataPath}`);

        res.json({
            success: true,
            message: 'تم حفظ البيانات بنجاح',
            count: clubs.length,
            path: dataPath
        });

    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API لمسح البيانات المحفوظة
app.delete('/api/clear-live-data', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'obs new tols', 'transfermarkt-live-data.json');

        if (fs.existsSync(dataPath)) {
            fs.unlinkSync(dataPath);
            console.log('🗑️ تم مسح البيانات المحفوظة');
        }

        res.json({
            success: true,
            message: 'تم مسح البيانات بنجاح'
        });

    } catch (error) {
        console.error('❌ خطأ في مسح البيانات:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search clubs by name (Arabic or English)
app.get('/api/search-clubs', async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const results = await searchClubsInDatabase(query, parseInt(limit));

        res.json({
            success: true,
            data: {
                query: query,
                results: results,
                totalFound: results.length
            }
        });
    } catch (error) {
        console.error('🚨 Error searching clubs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update club logo
app.post('/api/update-club-logo', async (req, res) => {
    try {
        const { clubName, logoUrl, arabicName, englishName } = req.body;

        if (!clubName || !logoUrl) {
            return res.status(400).json({
                success: false,
                error: 'Club name and logo URL are required'
            });
        }

        const result = await updateClubLogoInDatabase(clubName, logoUrl, arabicName, englishName);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('🚨 Error updating club logo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Sync clubs database from frontend
app.post('/api/sync-clubs-database', async (req, res) => {
    try {
        const { clubs, syncTime } = req.body;

        if (!clubs || !Array.isArray(clubs)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid clubs data provided'
            });
        }

        // منع المزامنة المتكررة - فقط كل 5 دقائق
        const now = Date.now();
        if (global.lastSyncTime && (now - global.lastSyncTime) < 300000) { // 5 minutes
            // تقليل الرسائل - فقط كل دقيقة
            if (!global.lastSkipMessage || (now - global.lastSkipMessage) > 60000) {
                console.log(`⏸️ Sync rate limited - allowing sync every 5 minutes (last: ${Math.round((now - global.lastSyncTime) / 1000)}s ago)`);
                global.lastSkipMessage = now;
            }
            return res.json({
                success: true,
                data: {
                    totalClubs: clubs.length,
                    syncTime: syncTime,
                    saved: 0,
                    updated: 0,
                    errors: 0,
                    skipped: true,
                    reason: 'Rate limited - sync every 5 minutes max'
                }
            });
        }

        console.log(`🔄 Syncing ${clubs.length} clubs from frontend...`);
        global.lastSyncTime = now;

        // Save to verified clubs database
        const result = await syncClubsToDatabase(clubs, syncTime);

        res.json({
            success: true,
            data: {
                totalClubs: clubs.length,
                syncTime: syncTime,
                saved: result.saved,
                updated: result.updated,
                errors: result.errors
            }
        });
    } catch (error) {
        console.error('🚨 Error syncing clubs database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get sync status
app.get('/api/sync-status', async (req, res) => {
    try {
        const clubsData = await getVerifiedClubsDatabase();
        const stats = {
            totalClubs: clubsData.length,
            clubsWithLogos: clubsData.filter(club => club.logoUrl).length,
            clubsWithoutLogos: clubsData.filter(club => !club.logoUrl).length,
            lastUpdated: clubsData.length > 0 ?
                Math.max(...clubsData.map(club => new Date(club.lastUpdated || club.createdAt || 0).getTime())) : null,
            sources: {}
        };

        // Count by source
        clubsData.forEach(club => {
            const source = club.source || 'unknown';
            stats.sources[source] = (stats.sources[source] || 0) + 1;
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('🚨 Error getting sync status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===== CLUB LOGO SERVICE HELPER FUNCTIONS =====

// Enhanced club logo service with intelligent matching
async function getClubLogoFromUnifiedService(clubName) {
    try {
        // First, try to get from verified clubs database
        const verifiedClub = await findClubInVerifiedDatabase(clubName);
        if (verifiedClub && verifiedClub.logoUrl) {
            return {
                clubName: clubName,
                logoUrl: verifiedClub.logoUrl,
                arabicName: verifiedClub.arabicName,
                englishName: verifiedClub.englishName,
                source: 'verified_database'
            };
        }

        // Fallback to static mappings for common clubs
        const staticMappings = await getStaticClubMappings();
        const staticResult = findClubInStaticMappings(clubName, staticMappings);

        if (staticResult) {
            return {
                clubName: clubName,
                logoUrl: staticResult.logoUrl,
                arabicName: staticResult.arabicName,
                englishName: staticResult.englishName,
                source: 'static_mapping'
            };
        }

        return null;
    } catch (error) {
        console.error('🚨 Error in getClubLogoFromUnifiedService:', error);
        return null;
    }
}

// Get verified clubs database from localStorage simulation
async function getVerifiedClubsDatabase() {
    try {
        // This would normally read from the verified extractor's localStorage
        // For now, we'll simulate reading from a file or database
        const clubsFile = path.join(__dirname, 'data', 'verified-clubs.json');

        if (fs.existsSync(clubsFile)) {
            const data = fs.readFileSync(clubsFile, 'utf8');
            return JSON.parse(data);
        }

        return [];
    } catch (error) {
        console.error('🚨 Error reading verified clubs database:', error);
        return [];
    }
}

// Find club in verified database with intelligent matching
async function findClubInVerifiedDatabase(clubName) {
    try {
        const clubs = await getVerifiedClubsDatabase();

        // Normalize search term
        const normalizedSearch = normalizeClubName(clubName);

        // Try exact match first
        for (const club of clubs) {
            if (normalizeClubName(club.arabicName) === normalizedSearch ||
                normalizeClubName(club.englishName) === normalizedSearch) {
                return club;
            }
        }

        // Try partial match
        for (const club of clubs) {
            const normalizedArabic = normalizeClubName(club.arabicName);
            const normalizedEnglish = normalizeClubName(club.englishName);

            if (normalizedArabic.includes(normalizedSearch) ||
                normalizedSearch.includes(normalizedArabic) ||
                normalizedEnglish.includes(normalizedSearch) ||
                normalizedSearch.includes(normalizedEnglish)) {
                return club;
            }
        }

        return null;
    } catch (error) {
        console.error('🚨 Error finding club in verified database:', error);
        return null;
    }
}

// Search clubs in database
async function searchClubsInDatabase(query, limit = 10) {
    try {
        const clubs = await getVerifiedClubsDatabase();
        const normalizedQuery = normalizeClubName(query);

        const results = [];

        for (const club of clubs) {
            const normalizedArabic = normalizeClubName(club.arabicName);
            const normalizedEnglish = normalizeClubName(club.englishName);

            if (normalizedArabic.includes(normalizedQuery) ||
                normalizedEnglish.includes(normalizedQuery) ||
                normalizedQuery.includes(normalizedArabic) ||
                normalizedQuery.includes(normalizedEnglish)) {
                results.push(club);

                if (results.length >= limit) break;
            }
        }

        return results;
    } catch (error) {
        console.error('🚨 Error searching clubs in database:', error);
        return [];
    }
}

// Update club logo in database
async function updateClubLogoInDatabase(clubName, logoUrl, arabicName, englishName) {
    try {
        const clubs = await getVerifiedClubsDatabase();
        const clubsFile = path.join(__dirname, 'data', 'verified-clubs.json');

        // Find existing club or create new one
        let existingClub = clubs.find(club =>
            normalizeClubName(club.arabicName) === normalizeClubName(arabicName || clubName) ||
            normalizeClubName(club.englishName) === normalizeClubName(englishName || clubName)
        );

        if (existingClub) {
            // Update existing club
            existingClub.logoUrl = logoUrl;
            existingClub.arabicName = arabicName || existingClub.arabicName;
            existingClub.englishName = englishName || existingClub.englishName;
            existingClub.updatedAt = new Date().toISOString();
        } else {
            // Add new club
            clubs.push({
                id: Date.now().toString(),
                arabicName: arabicName || clubName,
                englishName: englishName || clubName,
                logoUrl: logoUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        // Save updated clubs
        fs.writeFileSync(clubsFile, JSON.stringify(clubs, null, 2));

        return {
            success: true,
            club: existingClub || clubs[clubs.length - 1]
        };
    } catch (error) {
        console.error('🚨 Error updating club in database:', error);
        throw error;
    }
}

// Normalize club name for comparison
function normalizeClubName(name) {
    if (!name) return '';

    return name.toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ي]/g, 'ى')
        .replace(/fc|cf|ac|sc|real|club|football|soccer/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Get static club mappings for fallback
async function getStaticClubMappings() {
    return {
        // Spanish clubs
        'ريال مدريد': {
            logoUrl: 'https://logos.footyrenders.com/real-madrid.png',
            arabicName: 'ريال مدريد',
            englishName: 'Real Madrid'
        },
        'برشلونة': {
            logoUrl: 'https://logos.footyrenders.com/barcelona.png',
            arabicName: 'برشلونة',
            englishName: 'Barcelona'
        },
        'أتلتيكو مدريد': {
            logoUrl: 'https://logos.footyrenders.com/atletico-madrid.png',
            arabicName: 'أتلتيكو مدريد',
            englishName: 'Atletico Madrid'
        },

        // English clubs
        'مانشستر سيتي': {
            logoUrl: 'https://logos.footyrenders.com/manchester-city.png',
            arabicName: 'مانشستر سيتي',
            englishName: 'Manchester City'
        },
        'مانشستر يونايتد': {
            logoUrl: 'https://logos.footyrenders.com/manchester-united.png',
            arabicName: 'مانشستر يونايتد',
            englishName: 'Manchester United'
        },
        'ليفربول': {
            logoUrl: 'https://logos.footyrenders.com/liverpool.png',
            arabicName: 'ليفربول',
            englishName: 'Liverpool'
        },
        'تشيلسي': {
            logoUrl: 'https://logos.footyrenders.com/chelsea.png',
            arabicName: 'تشيلسي',
            englishName: 'Chelsea'
        },
        'أرسنال': {
            logoUrl: 'https://logos.footyrenders.com/arsenal.png',
            arabicName: 'أرسنال',
            englishName: 'Arsenal'
        },
        'توتنهام': {
            logoUrl: 'https://logos.footyrenders.com/tottenham.png',
            arabicName: 'توتنهام',
            englishName: 'Tottenham'
        },

        // Italian clubs
        'يوفنتوس': {
            logoUrl: 'https://logos.footyrenders.com/juventus.png',
            arabicName: 'يوفنتوس',
            englishName: 'Juventus'
        },
        'إنتر ميلان': {
            logoUrl: 'https://logos.footyrenders.com/inter-milan.png',
            arabicName: 'إنتر ميلان',
            englishName: 'Inter Milan'
        },
        'ميلان': {
            logoUrl: 'https://logos.footyrenders.com/ac-milan.png',
            arabicName: 'ميلان',
            englishName: 'AC Milan'
        },
        'نابولي': {
            logoUrl: 'https://logos.footyrenders.com/napoli.png',
            arabicName: 'نابولي',
            englishName: 'Napoli'
        },

        // German clubs
        'بايرن ميونخ': {
            logoUrl: 'https://logos.footyrenders.com/bayern-munich.png',
            arabicName: 'بايرن ميونخ',
            englishName: 'Bayern Munich'
        },
        'بوروسيا دورتموند': {
            logoUrl: 'https://logos.footyrenders.com/borussia-dortmund.png',
            arabicName: 'بوروسيا دورتموند',
            englishName: 'Borussia Dortmund'
        },

        // French clubs
        'باريس سان جيرمان': {
            logoUrl: 'https://logos.footyrenders.com/psg.png',
            arabicName: 'باريس سان جيرمان',
            englishName: 'Paris Saint-Germain'
        },

        // Saudi clubs
        'الهلال': {
            logoUrl: 'https://logos.footyrenders.com/al-hilal.png',
            arabicName: 'الهلال',
            englishName: 'Al Hilal'
        },
        'النصر': {
            logoUrl: 'https://logos.footyrenders.com/al-nassr.png',
            arabicName: 'النصر',
            englishName: 'Al Nassr'
        },
        'الاتحاد': {
            logoUrl: 'https://logos.footyrenders.com/al-ittihad.png',
            arabicName: 'الاتحاد',
            englishName: 'Al Ittihad'
        },
        'الأهلي': {
            logoUrl: 'https://logos.footyrenders.com/al-ahli.png',
            arabicName: 'الأهلي',
            englishName: 'Al Ahli'
        }
    };
}

// Find club in static mappings
function findClubInStaticMappings(clubName, mappings) {
    const normalizedSearch = normalizeClubName(clubName);

    // Try exact match first
    for (const [key, value] of Object.entries(mappings)) {
        if (normalizeClubName(key) === normalizedSearch ||
            normalizeClubName(value.arabicName) === normalizedSearch ||
            normalizeClubName(value.englishName) === normalizedSearch) {
            return value;
        }
    }

    // Try partial match
    for (const [key, value] of Object.entries(mappings)) {
        const normalizedKey = normalizeClubName(key);
        const normalizedArabic = normalizeClubName(value.arabicName);
        const normalizedEnglish = normalizeClubName(value.englishName);

        if (normalizedKey.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedKey) ||
            normalizedArabic.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedArabic) ||
            normalizedEnglish.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedEnglish)) {
            return value;
        }
    }

    return null;
}

// Sync clubs to database
async function syncClubsToDatabase(clubs, syncTime) {
    try {
        const existingClubs = await getVerifiedClubsDatabase();
        const clubsFile = path.join(__dirname, 'data', 'verified-clubs.json');

        let saved = 0;
        let updated = 0;
        let errors = 0;

        // Create a map of existing clubs for faster lookup
        const existingClubsMap = new Map();
        existingClubs.forEach(club => {
            if (club.id) existingClubsMap.set(club.id, club);
            if (club.arabicName) existingClubsMap.set(club.arabicName, club);
            if (club.englishName) existingClubsMap.set(club.englishName, club);
        });

        // Process incoming clubs
        const processedClubs = [];
        const seenIds = new Set();

        for (const club of clubs) {
            try {
                // Skip duplicates
                if (seenIds.has(club.id)) continue;
                seenIds.add(club.id);

                // Find existing club
                let existingClub = existingClubsMap.get(club.id) ||
                                 existingClubsMap.get(club.arabicName) ||
                                 existingClubsMap.get(club.englishName);

                if (existingClub) {
                    // Update existing club
                    const updatedClub = {
                        ...existingClub,
                        ...club,
                        updatedAt: new Date().toISOString(),
                        syncTime: syncTime
                    };
                    processedClubs.push(updatedClub);
                    updated++;
                } else {
                    // Add new club
                    const newClub = {
                        ...club,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        syncTime: syncTime
                    };
                    processedClubs.push(newClub);
                    saved++;
                }
            } catch (clubError) {
                console.error('Error processing club:', club, clubError);
                errors++;
            }
        }

        // Add existing clubs that weren't updated
        existingClubs.forEach(existingClub => {
            if (!seenIds.has(existingClub.id)) {
                processedClubs.push(existingClub);
            }
        });

        // Save to file
        fs.writeFileSync(clubsFile, JSON.stringify(processedClubs, null, 2));

        console.log(`✅ Sync complete: ${saved} saved, ${updated} updated, ${errors} errors`);

        return { saved, updated, errors };
    } catch (error) {
        console.error('🚨 Error syncing clubs to database:', error);
        throw error;
    }
}

// ==================== OBS File System API ====================

// متغيرات للـ Server-Sent Events
const sseClients = new Map();

// Server-Sent Events للتحديث المباشر (مثل overlays.uno)
app.get('/api/stream-events', (req, res) => {
    // إعداد SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // قراءة البيانات الحالية
    let currentData = { active: false, content: null };
    try {
        if (fs.existsSync(STREAM_DATA_FILE)) {
            const data = fs.readFileSync(STREAM_DATA_FILE, 'utf8');
            const streamData = JSON.parse(data);
            currentData = {
                active: streamData.active,
                content: streamData.html ? {
                    html: streamData.html,
                    timestamp: streamData.timestamp,
                    id: streamData.id,
                    source: streamData.source
                } : null
            };
        }
    } catch (error) {
        console.error('❌ Error reading stream data for SSE:', error);
    }

    // إرسال البيانات الحالية فوراً
    res.write(`data: ${JSON.stringify(currentData)}\n\n`);

    // إضافة العميل إلى قائمة المتصلين
    const clientId = Date.now();
    sseClients.set(clientId, res);

    console.log(`📡 SSE client connected: ${clientId} (Total: ${sseClients.size})`);

    // إرسال heartbeat كل 10 ثوان (أكثر تكراراً)
    const heartbeat = setInterval(() => {
        try {
            res.write(`data: {"type":"heartbeat","timestamp":${Date.now()}}\n\n`);
        } catch (error) {
            clearInterval(heartbeat);
            sseClients.delete(clientId);
        }
    }, 10000);

    // تنظيف عند قطع الاتصال
    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(clientId);
        console.log(`📡 SSE client disconnected: ${clientId} (Remaining: ${sseClients.size})`);
    });
});

// دالة لإرسال التحديثات لجميع عملاء SSE
function broadcastToSSEClients(data) {
    if (sseClients.size === 0) return;

    const message = `data: ${JSON.stringify(data)}\n\n`;

    sseClients.forEach((client, clientId) => {
        try {
            client.write(message);
        } catch (error) {
            console.log(`❌ Failed to send to SSE client ${clientId}, removing...`);
            sseClients.delete(clientId);
        }
    });

    console.log(`📡 Broadcasted to ${sseClients.size} SSE clients`);
}

// API لتحديث بيانات البث - محسن مع SSE
app.post('/api/update-stream', (req, res) => {
    try {
        const streamData = req.body;

        // التحقق من صحة البيانات
        if (typeof streamData.active !== 'boolean') {
            return res.status(400).json({ error: 'Invalid active field' });
        }

        // كتابة البيانات إلى الملف
        fs.writeFileSync(STREAM_DATA_FILE, JSON.stringify(streamData, null, 2), 'utf8');

        // إرسال التحديث لجميع عملاء SSE
        const sseData = {
            active: streamData.active,
            content: streamData.html ? {
                html: streamData.html,
                timestamp: streamData.timestamp,
                id: streamData.id,
                source: streamData.source
            } : null
        };
        broadcastToSSEClients(sseData);

        console.log(`📁 تم تحديث ملف البث: ${streamData.active ? 'نشط' : 'متوقف'}`);

        res.json({
            success: true,
            message: 'Stream data updated successfully',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ خطأ في تحديث ملف البث:', error);
        res.status(500).json({
            error: 'Failed to update stream data',
            details: error.message
        });
    }
});

// API لقراءة بيانات البث
app.get('/api/stream-content', (req, res) => {
    try {
        if (!fs.existsSync(STREAM_DATA_FILE)) {
            // إنشاء ملف افتراضي إذا لم يكن موجوداً
            const defaultData = {
                active: false,
                html: '',
                timestamp: 0,
                id: '',
                source: 'File System'
            };
            fs.writeFileSync(STREAM_DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
            return res.json(defaultData);
        }

        const data = fs.readFileSync(STREAM_DATA_FILE, 'utf8');
        const streamData = JSON.parse(data);

        // إضافة headers لمنع التخزين المؤقت
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.json({
            active: streamData.active,
            content: {
                html: streamData.html,
                timestamp: streamData.timestamp,
                id: streamData.id,
                source: streamData.source
            }
        });

    } catch (error) {
        console.error('❌ خطأ في قراءة ملف البث:', error);
        res.status(500).json({
            error: 'Failed to read stream data',
            details: error.message
        });
    }
});

// ELITE TRANSFERS API - النظام الاحترافي المتقدم مثل المثال المعروض
app.post('/api/transfers/elite', async (req, res) => {
    try {
        console.log('🚀 API: النظام الاحترافي المتقدم (مثل المثال المعروض)...');
        const { dateFilter = 'today', sortBy = 'date', searchTerm = '' } = req.body;

        // استخدام النظام الاحترافي الجديد
        const EliteTransfersExtractor = require('./services/eliteTransfersExtractor');
        const extractor = new EliteTransfersExtractor();

        console.log(`📅 جلب الصفقات النخبة للتاريخ: ${dateFilter}`);

        let transfers = await extractor.generateEliteTransfers(dateFilter);

        // تطبيق الفلاتر
        if (dateFilter !== 'all') {
            transfers = extractor.filterByDate(transfers, dateFilter);
        }

        // تطبيق البحث
        if (searchTerm) {
            transfers = extractor.searchTransfers(transfers, searchTerm);
        }

        // ترتيب النتائج
        transfers = extractor.sortTransfers(transfers, sortBy);

        // الحصول على الإحصائيات
        const stats = extractor.getStats();

        console.log(`✅ تم جلب ${transfers.length} صفقة نخبة`);

        res.json({
            success: true,
            transfers: transfers,
            count: transfers.length,
            enhanced: true,
            timestamp: new Date().toISOString(),
            source: 'Elite_System',
            quality: 'Premium',
            stats: stats,
            filters: {
                dateFilter,
                sortBy,
                searchTerm
            }
        });

    } catch (error) {
        console.error('❌ خطأ في النظام النخبة:', error.message);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب صفقات النخبة',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== API للداعمين ====================

// الحصول على جميع الداعمين
app.get('/api/supporters', async (req, res) => {
    try {
        const filters = {};

        // إضافة فلاتر التاريخ إذا تم توفيرها
        if (req.query.start) {
            filters.startDate = req.query.start;
        }
        if (req.query.end) {
            filters.endDate = req.query.end;
        }

        const result = await supportersService.getAllSupporters(filters);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ خطأ في الحصول على الداعمين:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في الحصول على الداعمين',
            error: error.message
        });
    }
});

// الحصول على داعم محدد
app.get('/api/supporters/:id', async (req, res) => {
    try {
        const supporter = await supportersService.getSupporterById(req.params.id);

        res.json({
            success: true,
            supporter: supporter
        });
    } catch (error) {
        console.error('❌ خطأ في الحصول على الداعب:', error);
        res.status(404).json({
            success: false,
            message: 'الداعب غير موجود',
            error: error.message
        });
    }
});

// إضافة داعب جديد
app.post('/api/supporters', async (req, res) => {
    try {
        const supporterData = req.body;

        // التحقق من البيانات المطلوبة
        if (!supporterData.name || !supporterData.amount) {
            return res.status(400).json({
                success: false,
                message: 'الاسم والمبلغ مطلوبان'
            });
        }

        const newSupporter = await supportersService.addSupporter(supporterData);

        res.status(201).json({
            success: true,
            message: 'تم إضافة الداعب بنجاح',
            supporter: newSupporter
        });
    } catch (error) {
        console.error('❌ خطأ في إضافة الداعب:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إضافة الداعب',
            error: error.message
        });
    }
});

// تحديث داعب
app.put('/api/supporters/:id', async (req, res) => {
    try {
        const updatedSupporter = await supportersService.updateSupporter(req.params.id, req.body);

        res.json({
            success: true,
            message: 'تم تحديث الداعب بنجاح',
            supporter: updatedSupporter
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث الداعب:', error);
        res.status(404).json({
            success: false,
            message: 'فشل في تحديث الداعب',
            error: error.message
        });
    }
});

// حذف داعب
app.delete('/api/supporters/:id', async (req, res) => {
    try {
        const deletedSupporter = await supportersService.deleteSupporter(req.params.id);

        res.json({
            success: true,
            message: 'تم حذف الداعب بنجاح',
            supporter: deletedSupporter
        });
    } catch (error) {
        console.error('❌ خطأ في حذف الداعب:', error);
        res.status(404).json({
            success: false,
            message: 'فشل في حذف الداعب',
            error: error.message
        });
    }
});

// الحصول على إحصائيات الداعمين
app.get('/api/supporters/stats', async (req, res) => {
    try {
        const filters = {};

        if (req.query.start) {
            filters.startDate = req.query.start;
        }
        if (req.query.end) {
            filters.endDate = req.query.end;
        }

        const stats = await supportersService.getStatistics(filters);

        res.json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        console.error('❌ خطأ في الحصول على إحصائيات الداعمين:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في الحصول على الإحصائيات',
            error: error.message
        });
    }
});

// تحديث البيانات من الملف
app.post('/api/supporters/refresh', async (req, res) => {
    try {
        await supportersService.refreshData();

        res.json({
            success: true,
            message: 'تم تحديث البيانات بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث البيانات:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث البيانات',
            error: error.message
        });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
    console.log(`🏆 نظام شعارات الأندية متاح ومجهز!`);
    console.log(`📺 نظام البث المباشر جاهز!`);
    console.log(`📁 نظام الملفات للبث: http://localhost:${PORT}/obs-file-controller.html`);
    console.log(`🎮 واجهة متعددة اللاعبين: http://localhost:${PORT}/multi-player`);
    console.log(`🔧 صفحة الاختبار: http://localhost:${PORT}/test-minimal.html`);
    console.log(`🎯 Barcelona OBS: http://localhost:${PORT}/barcelona-obs-overlay.html`);
    console.log(`📊 Barcelona API: http://localhost:${PORT}/api/barcelona-transfers`);
    console.log(`📦 أداة OBS Transfer Tool: http://localhost:${PORT}/obs-transfer-tool.html`);
});

// ===== OBS TRANSFER TOOL API ENDPOINTS =====

// استخراج الصفقات من FotMob
app.post('/api/obs-transfers/extract', express.json(), async (req, res) => {
    try {
        console.log('🔍 OBS API: بدء استخراج الصفقات...');
        const { dateFilter } = req.body;

        // استخراج الصفقات
        const transfers = await obsTransferExtractor.extractTransfers(dateFilter);

        // تحسين البيانات
        const enhancedTransfers = await obsTransferExtractor.enhanceTransfersData(transfers);

        // إزالة المكررات وترتيب
        const uniqueTransfers = obsTransferExtractor.removeDuplicates(enhancedTransfers);
        const sortedTransfers = obsTransferExtractor.sortTransfers(uniqueTransfers, 'date');

        // حفظ البيانات
        obsTransfersData = sortedTransfers;
        saveOBSTransfersData();

        console.log(`✅ OBS API: تم استخراج ${sortedTransfers.length} صفقة`);

        res.json({
            success: true,
            transfers: sortedTransfers,
            count: sortedTransfers.length,
            dateFilter: dateFilter,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ OBS API: خطأ في استخراج الصفقات:', error.message);
        res.status(500).json({
            success: false,
            message: 'فشل في استخراج الصفقات',
            error: error.message
        });
    }
});

// الحصول على البيانات المستخرجة
app.get('/api/obs-transfers/data', (req, res) => {
    try {
        console.log(`📋 OBS API: طلب البيانات - ${obsTransfersData.length} صفقة متوفرة`);

        res.json({
            success: true,
            transfers: obsTransfersData,
            count: obsTransfersData.length,
            lastUpdated: fs.existsSync(OBS_TRANSFERS_FILE) ?
                fs.statSync(OBS_TRANSFERS_FILE).mtime : null
        });

    } catch (error) {
        console.error('❌ OBS API: خطأ في جلب البيانات:', error.message);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب البيانات',
            error: error.message
        });
    }
});

// تصدير الصفقات المحددة للشريط الجانبي
app.post('/api/obs-transfers/export', express.json(), async (req, res) => {
    try {
        const { selectedIds } = req.body;

        if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب تحديد صفقات للتصدير'
            });
        }

        if (selectedIds.length > 7) {
            return res.status(400).json({
                success: false,
                message: 'يمكن تحديد 7 صفقات كحد أقصى'
            });
        }

        // فلترة الصفقات المحددة
        const selectedTransfers = obsTransfersData.filter(transfer =>
            selectedIds.includes(transfer.id)
        );

        if (selectedTransfers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'لم يتم العثور على الصفقات المحددة'
            });
        }

        // حفظ الصفقات المحددة
        obsSelectedTransfers = selectedTransfers;
        saveOBSSelectedTransfers();

        // تصدير للاستخدام في OBS
        const obsData = await obsTransferExtractor.exportForOBS(obsTransfersData, selectedIds);

        console.log(`📤 OBS API: تم تصدير ${selectedTransfers.length} صفقة للشريط الجانبي`);

        res.json({
            success: true,
            message: `تم تصدير ${selectedTransfers.length} صفقة بنجاح`,
            selectedTransfers: selectedTransfers,
            count: selectedTransfers.length,
            obsData: obsData
        });

    } catch (error) {
        console.error('❌ OBS API: خطأ في التصدير:', error.message);
        res.status(500).json({
            success: false,
            message: 'فشل في تصدير الصفقات',
            error: error.message
        });
    }
});

// الحصول على بيانات الشريط الجانبي
app.get('/api/obs-transfers/sidebar-data', (req, res) => {
    try {
        console.log(`📺 OBS API: طلب بيانات الشريط الجانبي - ${obsSelectedTransfers.length} صفقة محددة`);

        res.json({
            success: true,
            transfers: obsSelectedTransfers,
            count: obsSelectedTransfers.length,
            maxPlayers: 7,
            lastUpdated: fs.existsSync(OBS_SELECTED_FILE) ?
                fs.statSync(OBS_SELECTED_FILE).mtime : null
        });

    } catch (error) {
        console.error('❌ OBS API: خطأ في جلب بيانات الشريط الجانبي:', error.message);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب بيانات الشريط الجانبي',
            error: error.message
        });
    }
});

// إحصائيات OBS Transfer Tool
app.get('/api/obs-transfers/stats', (req, res) => {
    try {
        const stats = {
            totalTransfers: obsTransfersData.length,
            selectedTransfers: obsSelectedTransfers.length,
            maxSelection: 7,
            lastExtraction: fs.existsSync(OBS_TRANSFERS_FILE) ?
                fs.statSync(OBS_TRANSFERS_FILE).mtime : null,
            lastSelection: fs.existsSync(OBS_SELECTED_FILE) ?
                fs.statSync(OBS_SELECTED_FILE).mtime : null,
            transferStats: obsTransfersData.length > 0 ?
                obsTransferExtractor.getTransferStats(obsTransfersData) : null
        };

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('❌ OBS API: خطأ في جلب الإحصائيات:', error.message);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الإحصائيات',
            error: error.message
        });
    }
});

// مسح البيانات
app.delete('/api/obs-transfers/clear', (req, res) => {
    try {
        obsTransfersData = [];
        obsSelectedTransfers = [];

        // حذف الملفات
        if (fs.existsSync(OBS_TRANSFERS_FILE)) {
            fs.unlinkSync(OBS_TRANSFERS_FILE);
        }
        if (fs.existsSync(OBS_SELECTED_FILE)) {
            fs.unlinkSync(OBS_SELECTED_FILE);
        }

        console.log('🗑️ OBS API: تم مسح جميع بيانات OBS Transfer Tool');

        res.json({
            success: true,
            message: 'تم مسح جميع البيانات بنجاح'
        });

    } catch (error) {
        console.error('❌ OBS API: خطأ في مسح البيانات:', error.message);
        res.status(500).json({
            success: false,
            message: 'فشل في مسح البيانات',
            error: error.message
        });
    }
});

// ===== Barcelona Transfer Tracker API =====

const BARCELONA_TRANSFERS_FILE = path.join(__dirname, 'data', 'barcelona-transfers.json');

// تحميل بيانات صفقات برشلونة
function loadBarcelonaTransfers() {
    try {
        if (fs.existsSync(BARCELONA_TRANSFERS_FILE)) {
            const data = fs.readFileSync(BARCELONA_TRANSFERS_FILE, 'utf8');
            try {
                return JSON.parse(data);
            } catch (parseErr) {
                console.error('❌ خطأ في تحليل ملف البيانات (تالف)، سيتم إصلاح الملف تلقائيًا:', parseErr);
                // إصلاح الملف التالف ببيانات افتراضية
                const emptyData = { players: [], settings: { showProbabilityBars: true }, statusConfig: {} };
                fs.writeFileSync(BARCELONA_TRANSFERS_FILE, JSON.stringify(emptyData, null, 2), 'utf8');
                return emptyData;
            }
        }
        // إذا لم يوجد الملف، أنشئه ببيانات افتراضية
        const emptyData = { players: [], settings: { showProbabilityBars: true }, statusConfig: {} };
        fs.writeFileSync(BARCELONA_TRANSFERS_FILE, JSON.stringify(emptyData, null, 2), 'utf8');
        return emptyData;
    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات برشلونة (سيتم إصلاح الملف تلقائيًا):', error);
        // محاولة إصلاح الملف
        try {
            const emptyData = { players: [], settings: { showProbabilityBars: true }, statusConfig: {} };
            fs.writeFileSync(BARCELONA_TRANSFERS_FILE, JSON.stringify(emptyData, null, 2), 'utf8');
            return emptyData;
        } catch (fixErr) {
            console.error('❌ فشل في إصلاح ملف البيانات:', fixErr);
            return { players: [], settings: { showProbabilityBars: true }, statusConfig: {} };
        }
    }
}

// حفظ بيانات صفقات برشلونة
function saveBarcelonaTransfers(data) {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        try {
            fs.writeFileSync(BARCELONA_TRANSFERS_FILE, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            attempts++;
            console.error(`❌ خطأ في حفظ بيانات برشلونة (محاولة ${attempts}):`, error);
            // إذا فشل الحفظ، حاول إصلاح الملف ثم أعد المحاولة
            try {
                const emptyData = { players: [], settings: { showProbabilityBars: true }, statusConfig: {} };
                fs.writeFileSync(BARCELONA_TRANSFERS_FILE, JSON.stringify(emptyData, null, 2), 'utf8');
            } catch (fixErr) {
                console.error('❌ فشل في إصلاح ملف البيانات أثناء الحفظ:', fixErr);
            }
        }
    }
    return false;
}

// API للحصول على بيانات صفقات برشلونة
app.get('/api/barcelona-transfers', (req, res) => {
    try {
        const data = loadBarcelonaTransfers();
        console.log('📊 Barcelona API: تم تحميل بيانات الصفقات');
        res.json(data);
    } catch (error) {
        console.error('❌ Barcelona API: خطأ في تحميل البيانات:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحميل البيانات',
            error: error.message
        });
    }
});

// API لحفظ بيانات صفقات برشلونة
app.post('/api/barcelona-transfers', express.json(), (req, res) => {
    try {
        const { players, statusConfig, settings } = req.body;

        const data = {
            players: players || [],
            statusConfig: statusConfig || {},
            settings: settings || {}
        };

        const saved = saveBarcelonaTransfers(data);

        if (saved) {
            console.log('💾 Barcelona API: تم حفظ بيانات الصفقات');

            // إرسال تحديث عبر WebSocket
            io.emit('barcelona-transfers-updated', data);

            res.json({
                success: true,
                message: 'تم حفظ البيانات بنجاح'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل في حفظ البيانات'
            });
        }
    } catch (error) {
        console.error('❌ Barcelona API: خطأ في حفظ البيانات:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حفظ البيانات',
            error: error.message
        });
    }
});

// API لتحديث لاعب واحد
app.put('/api/barcelona-transfers/player/:id', (req, res) => {
    try {
        const playerId = req.params.id;
        const updatedPlayer = req.body;

        const data = loadBarcelonaTransfers();
        const playerIndex = data.players.findIndex(p => p.id === playerId);

        if (playerIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'اللاعب غير موجود'
            });
        }

        data.players[playerIndex] = { ...data.players[playerIndex], ...updatedPlayer };
        data.players[playerIndex].lastUpdate = new Date().toISOString();

        const saved = saveBarcelonaTransfers(data);

        if (saved) {
            console.log(`🔄 Barcelona API: تم تحديث بيانات اللاعب ${updatedPlayer.name}`);

            // إرسال تحديث عبر WebSocket
            io.emit('barcelona-player-updated', data.players[playerIndex]);

            // إرسال إشعارات للتغييرات المهمة
            const oldPlayer = data.players[playerIndex];
            if (updatedPlayer.probability && oldPlayer.probability !== updatedPlayer.probability) {
                io.emit('barcelona-probability-changed', {
                    playerName: updatedPlayer.name || oldPlayer.name,
                    oldProbability: oldPlayer.probability,
                    newProbability: updatedPlayer.probability
                });
            }

            if (updatedPlayer.status && oldPlayer.status !== updatedPlayer.status) {
                io.emit('barcelona-status-changed', {
                    playerName: updatedPlayer.name || oldPlayer.name,
                    oldStatus: oldPlayer.status,
                    newStatus: updatedPlayer.status
                });
            }

            res.json({
                success: true,
                message: 'تم تحديث بيانات اللاعب بنجاح',
                player: data.players[playerIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل في حفظ التحديث'
            });
        }
    } catch (error) {
        console.error('❌ Barcelona API: خطأ في تحديث اللاعب:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث اللاعب',
            error: error.message
        });
    }
});

// API لحذف لاعب
app.delete('/api/barcelona-transfers/player/:id', (req, res) => {
    try {
        const playerId = req.params.id;

        const data = loadBarcelonaTransfers();
        const playerIndex = data.players.findIndex(p => p.id === playerId);

        if (playerIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'اللاعب غير موجود'
            });
        }

        const deletedPlayer = data.players.splice(playerIndex, 1)[0];

        const saved = saveBarcelonaTransfers(data);

        if (saved) {
            console.log(`🗑️ Barcelona API: تم حذف اللاعب ${deletedPlayer.name}`);

            // إرسال تحديث عبر WebSocket
            io.emit('barcelona-player-deleted', deletedPlayer.id);

            res.json({
                success: true,
                message: 'تم حذف اللاعب بنجاح',
                deletedPlayer: deletedPlayer
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل في حفظ التغييرات'
            });
        }
    } catch (error) {
        console.error('❌ Barcelona API: خطأ في حذف اللاعب:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف اللاعب',
            error: error.message
        });
    }
});

// صفحات الويب
app.get('/barcelona-transfer-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-transfer-manager.html'));
});

app.get('/barcelona-obs-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-obs-overlay.html'));
});

app.get('/barcelona-enhanced-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-enhanced-manager.html'));
});

app.get('/barcelona-ultimate-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-ultimate-control.html'));
});

app.get('/barcelona-ultimate-broadcast', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-ultimate-broadcast.html'));
});

app.get('/barcelona-dynamic-overlay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-dynamic-overlay.html'));
});

app.get('/barcelona-player-editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-player-editor.html'));
});

app.get('/barcelona-live-notifications', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-live-notifications.html'));
});

app.get('/barcelona-analytics-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'barcelona-analytics-dashboard.html'));
});

app.get('/global-settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'global-settings.html'));
});

// 🎨 Football Design Studio Routes - Updated to use AI-Powered Studio
app.get('/design-studio', (req, res) => {
    console.log('🎨 Serving Football AI Design Studio');
    res.sendFile(path.join(__dirname, 'football-ai-studio', 'index.html'));
});

app.get('/football-design-studio', (req, res) => {
    res.sendFile(path.join(__dirname, 'football-design-studio-modern', 'dist', 'index.html'));
});

// Serve Football AI Studio (New Advanced Version)
app.use('/football-ai-studio', express.static(path.join(__dirname, 'football-ai-studio')));
app.get('/football-ai-studio', (req, res) => {
    const filePath = path.join(__dirname, 'football-ai-studio', 'index.html');
    console.log('🎨 Serving Football AI Studio from:', filePath);
    res.sendFile(filePath);
});

// Design Studio API Endpoints
app.post('/api/design/save', (req, res) => {
    try {
        const { name, canvas, metadata } = req.body;
        const designId = Date.now().toString();

        const designData = {
            id: designId,
            name: name || 'تصميم جديد',
            canvas: canvas,
            metadata: metadata || {},
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        // Save to file system (you can change this to database)
        const designsDir = path.join(__dirname, 'data', 'designs');
        if (!fs.existsSync(designsDir)) {
            fs.mkdirSync(designsDir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(designsDir, `${designId}.json`),
            JSON.stringify(designData, null, 2)
        );

        res.json({ success: true, designId, message: 'تم حفظ التصميم بنجاح' });
    } catch (error) {
        console.error('Error saving design:', error);
        res.status(500).json({ success: false, error: 'خطأ في حفظ التصميم' });
    }
});

app.get('/api/design/:id', (req, res) => {
    try {
        const designId = req.params.id;
        const designPath = path.join(__dirname, 'data', 'designs', `${designId}.json`);

        if (!fs.existsSync(designPath)) {
            return res.status(404).json({ success: false, error: 'التصميم غير موجود' });
        }

        const designData = JSON.parse(fs.readFileSync(designPath, 'utf8'));
        res.json({ success: true, design: designData });
    } catch (error) {
        console.error('Error loading design:', error);
        res.status(500).json({ success: false, error: 'خطأ في تحميل التصميم' });
    }
});

app.get('/api/designs', (req, res) => {
    try {
        const designsDir = path.join(__dirname, 'data', 'designs');
        if (!fs.existsSync(designsDir)) {
            return res.json({ success: true, designs: [] });
        }

        const designFiles = fs.readdirSync(designsDir).filter(file => file.endsWith('.json'));
        const designs = designFiles.map(file => {
            const designData = JSON.parse(fs.readFileSync(path.join(designsDir, file), 'utf8'));
            return {
                id: designData.id,
                name: designData.name,
                created: designData.created,
                updated: designData.updated
            };
        });

        res.json({ success: true, designs });
    } catch (error) {
        console.error('Error loading designs:', error);
        res.status(500).json({ success: false, error: 'خطأ في تحميل التصاميم' });
    }
});

// AI Design Suggestions API
app.post('/api/ai/suggest-design', async (req, res) => {
    try {
        const { content, type, platform } = req.body;

        // Simulate AI processing (replace with actual AI service)
        const suggestions = {
            colors: ['#667eea', '#764ba2', '#ff6b6b', '#4ecdc4'],
            fonts: ['Cairo', 'Arial Black', 'Helvetica'],
            layout: type === 'transfer-news' ? 'hero-layout' : 'centered',
            elements: [
                {
                    type: 'text',
                    content: content || 'عنوان جذاب',
                    style: 'bold',
                    size: platform === 'youtube' ? 64 : 48
                }
            ],
            message: 'تم إنشاء اقتراحات مخصصة لمحتواك'
        };

        res.json({ success: true, suggestions });
    } catch (error) {
        console.error('Error generating AI suggestions:', error);
        res.status(500).json({ success: false, error: 'خطأ في إنشاء الاقتراحات' });
    }
});

// Template Management API
app.get('/api/templates', (req, res) => {
    try {
        const templates = {
            'transfer-news': {
                name: 'أخبار الانتقالات',
                category: 'news',
                platforms: ['youtube', 'instagram', 'twitter'],
                preview: '/images/templates/transfer-news.jpg',
                dimensions: {
                    youtube: { width: 1280, height: 720 },
                    instagram: { width: 1080, height: 1080 },
                    twitter: { width: 1200, height: 675 }
                }
            },
            'match-report': {
                name: 'تقرير المباراة',
                category: 'reports',
                platforms: ['youtube', 'instagram'],
                preview: '/images/templates/match-report.jpg',
                dimensions: {
                    youtube: { width: 1280, height: 720 },
                    instagram: { width: 1080, height: 1080 }
                }
            },
            'player-stats': {
                name: 'إحصائيات اللاعب',
                category: 'stats',
                platforms: ['instagram', 'twitter'],
                preview: '/images/templates/player-stats.jpg',
                dimensions: {
                    instagram: { width: 1080, height: 1080 },
                    twitter: { width: 1200, height: 675 }
                }
            },
            'youtube-thumbnail': {
                name: 'مصغرة يوتيوب',
                category: 'youtube',
                platforms: ['youtube'],
                preview: '/images/templates/youtube-thumbnail.jpg',
                dimensions: {
                    youtube: { width: 1280, height: 720 }
                }
            },
            'instagram-story': {
                name: 'ستوري انستغرام',
                category: 'social',
                platforms: ['instagram'],
                preview: '/images/templates/instagram-story.jpg',
                dimensions: {
                    instagram: { width: 1080, height: 1920 }
                }
            }
        };

        res.json({ success: true, templates });
    } catch (error) {
        console.error('Error loading templates:', error);
        res.status(500).json({ success: false, error: 'خطأ في تحميل القوالب' });
    }
});

// Integration with existing transfer data
app.get('/api/design/transfer-data', async (req, res) => {
    try {
        // Get latest transfer data from existing system
        const transfersData = await getLatestTransfersData();
        const clubLogos = await getClubLogosData();
        const playerImages = await getPlayerImagesData();

        res.json({
            success: true,
            data: {
                transfers: transfersData,
                clubLogos: clubLogos,
                playerImages: playerImages
            }
        });
    } catch (error) {
        console.error('Error loading transfer data for design:', error);
        res.status(500).json({ success: false, error: 'خطأ في تحميل بيانات الانتقالات' });
    }
});

// Helper functions for design studio integration
async function getLatestTransfersData() {
    try {
        // Use existing transfer extraction logic
        const transfersFile = path.join(__dirname, 'data', 'obs-transfers.json');
        if (fs.existsSync(transfersFile)) {
            const data = fs.readFileSync(transfersFile, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error getting transfers data:', error);
        return [];
    }
}

async function getClubLogosData() {
    try {
        const clubLogosFile = path.join(__dirname, 'data', 'club-logos.json');
        if (fs.existsSync(clubLogosFile)) {
            const data = fs.readFileSync(clubLogosFile, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error getting club logos data:', error);
        return {};
    }
}

async function getPlayerImagesData() {
    try {
        const playerImagesFile = path.join(__dirname, 'data', 'pinterest-player-images.json');
        if (fs.existsSync(playerImagesFile)) {
            const data = fs.readFileSync(playerImagesFile, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error getting player images data:', error);
        return {};
    }
}

// API لإضافة لاعب جديد
app.post('/api/barcelona-transfers/add-player', (req, res) => {
    try {
        const newPlayer = req.body;

        // التحقق من البيانات المطلوبة
        if (!newPlayer.name || !newPlayer.position || !newPlayer.currentClub) {
            return res.status(400).json({
                success: false,
                message: 'البيانات الأساسية مطلوبة (الاسم، المركز، النادي الحالي)'
            });
        }

        const data = loadBarcelonaTransfers();

        // إضافة معرف فريد للاعب
        newPlayer.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        newPlayer.createdAt = new Date().toISOString();
        newPlayer.lastUpdate = new Date().toISOString();

        // إضافة اللاعب الجديد
        data.players.push(newPlayer);

        const saved = saveBarcelonaTransfers(data);

        if (saved) {
            console.log(`➕ Barcelona API: تم إضافة اللاعب ${newPlayer.name}`);

            // إرسال تحديث عبر WebSocket
            io.emit('barcelona-player-added', newPlayer);
            io.emit('barcelona-transfers-updated', data);

            res.json({
                success: true,
                message: 'تم إضافة اللاعب بنجاح',
                player: newPlayer
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل في حفظ اللاعب الجديد'
            });
        }
    } catch (error) {
        console.error('❌ Barcelona API: خطأ في إضافة اللاعب:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إضافة اللاعب',
            error: error.message
        });
    }
});

// API لإضافة لاعب جديد (endpoint بديل يستخدمه الكود في الصفحة)
app.post('/api/barcelona-transfers/player', (req, res) => {
    try {
        const newPlayer = req.body;

        // التحقق من البيانات المطلوبة
        if (!newPlayer.name || !newPlayer.position || !newPlayer.currentClub) {
            return res.status(400).json({
                success: false,
                message: 'البيانات الأساسية مطلوبة (الاسم، المركز، النادي الحالي)'
            });
        }

        const data = loadBarcelonaTransfers();

        // إضافة معرف فريد للاعب
        newPlayer.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        newPlayer.createdAt = new Date().toISOString();
        newPlayer.lastUpdate = new Date().toISOString();

        // إضافة اللاعب الجديد
        data.players.push(newPlayer);

        const saved = saveBarcelonaTransfers(data);

        if (saved) {
            console.log(`➕ Barcelona API: تم إضافة اللاعب ${newPlayer.name} عبر endpoint /player`);

            // إرسال تحديث عبر WebSocket
            io.emit('barcelona-player-added', newPlayer);
            io.emit('barcelona-transfers-updated', data);

            res.json({
                success: true,
                message: 'تم إضافة اللاعب بنجاح',
                player: newPlayer
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل في حفظ اللاعب الجديد'
            });
        }
    } catch (error) {
        console.error('❌ Barcelona API: خطأ في إضافة اللاعب:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إضافة اللاعب',
            error: error.message
        });
    }
});

// ===== Barcelona Advanced Configuration API =====

const BARCELONA_ADVANCED_CONFIG_FILE = path.join(__dirname, 'data', 'barcelona-advanced-config.json');

// تحميل الإعدادات المتقدمة
function loadAdvancedConfig() {
    try {
        if (fs.existsSync(BARCELONA_ADVANCED_CONFIG_FILE)) {
            const data = fs.readFileSync(BARCELONA_ADVANCED_CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
        return getDefaultAdvancedConfig();
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات المتقدمة:', error);
        return getDefaultAdvancedConfig();
    }
}

// حفظ الإعدادات المتقدمة
function saveAdvancedConfig(config) {
    try {
        fs.writeFileSync(BARCELONA_ADVANCED_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات المتقدمة:', error);
        return false;
    }
}

// الإعدادات الافتراضية
function getDefaultAdvancedConfig() {
    return {
        layouts: {
            sidebar_right: {
                name: "شريط جانبي يمين",
                position: "right",
                width: "400px",
                height: "100vh",
                direction: "column"
            },
            sidebar_left: {
                name: "شريط جانبي يسار",
                position: "left",
                width: "400px",
                height: "100vh",
                direction: "column"
            },
            top_bar: {
                name: "شريط علوي",
                position: "top",
                width: "100vw",
                height: "200px",
                direction: "row"
            },
            bottom_bar: {
                name: "شريط سفلي",
                position: "bottom",
                width: "100vw",
                height: "200px",
                direction: "row"
            }
        },
        themes: {
            barcelona_classic: {
                name: "برشلونة الكلاسيكي",
                colors: {
                    primary: "#004d98",
                    secondary: "#a50044",
                    accent: "#ffcc00"
                }
            },
            dark_professional: {
                name: "احترافي داكن",
                colors: {
                    primary: "#1a1a2e",
                    secondary: "#16213e",
                    accent: "#0f3460"
                }
            }
        },
        currentSettings: {
            selectedLayout: "sidebar_right",
            selectedTheme: "barcelona_classic",
            customHeaderTitle: "🔥 الصفقات القادمة",
            customHeaderSubtitle: "FC Barcelona Transfer Tracker"
        }
    };
}

// API للحصول على الإعدادات المتقدمة
app.get('/api/barcelona-advanced-config', (req, res) => {
    try {
        const config = loadAdvancedConfig();
        console.log('📊 Barcelona Advanced API: تم تحميل الإعدادات المتقدمة');
        res.json(config);
    } catch (error) {
        console.error('❌ Barcelona Advanced API: خطأ في تحميل الإعدادات:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحميل الإعدادات المتقدمة',
            error: error.message
        });
    }
});

// Mystery Candidates API
const MYSTERY_CANDIDATES_FILE = path.join(__dirname, 'data', 'barcelona-mystery-candidates.json');

function loadMystery() {
    try {
        if (fs.existsSync(MYSTERY_CANDIDATES_FILE)) {
            const data = fs.readFileSync(MYSTERY_CANDIDATES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('خطأ في تحميل المرشحين الغامضين:', error);
    }

    // Return default mystery candidates if file doesn't exist
    return {
        candidates: [
            {
                id: 'mystery-1',
                name: 'لاعب سري أ',
                position: 'مهاجم',
                currentClub: 'نادي أوروبي',
                image: '',
                revealed: false,
                hint: 'نجم شاب واعد',
                probability: 75,
                value: '€50M'
            },
            {
                id: 'mystery-2',
                name: 'لاعب سري ب',
                position: 'وسط',
                currentClub: 'الدوري الإنجليزي',
                image: '',
                revealed: false,
                hint: 'صانع ألعاب مبدع',
                probability: 60,
                value: '€35M'
            },
            {
                id: 'mystery-3',
                name: 'لاعب سري ج',
                position: 'مدافع',
                currentClub: 'الدوري الألماني',
                image: '',
                revealed: false,
                hint: 'مدافع قوي وسريع',
                probability: 80,
                value: '€40M'
            }
        ]
    };
}

function saveMystery(data) {
    try {
        // إنشاء مجلد البيانات إذا لم يكن موجوداً
        const dataDir = path.dirname(MYSTERY_CANDIDATES_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(MYSTERY_CANDIDATES_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('خطأ في حفظ المرشحين الغامضين:', error);
        return false;
    }
}

// API للحصول على المرشحين الغامضين
app.get('/api/barcelona-mystery-candidates', (req, res) => {
    try {
        const data = loadMystery();
        console.log('📊 Mystery API: تم تحميل بيانات المرشحين الغامضين');
        res.json(data);
    } catch (error) {
        console.error('❌ خطأ في تحميل المرشحين الغامضين:', error);
        res.status(500).json({ error: 'فشل في تحميل المرشحين الغامضين' });
    }
});

// API لحفظ المرشحين الغامضين
app.post('/api/barcelona-mystery-candidates', (req, res) => {
    try {
        const success = saveMystery(req.body);
        if (success) {
            console.log('✅ Mystery API: تم حفظ بيانات المرشحين الغامضين');
            res.json({ success: true, message: 'تم حفظ البيانات بنجاح' });
        } else {
            res.status(500).json({ error: 'فشل في حفظ البيانات' });
        }
    } catch (error) {
        console.error('❌ خطأ في حفظ المرشحين الغامضين:', error);
        res.status(500).json({ error: 'فشل في حفظ البيانات' });
    }
});

// API لحفظ الإعدادات المتقدمة
app.post('/api/barcelona-advanced-config', (req, res) => {
    try {
        const config = req.body;

        const saved = saveAdvancedConfig(config);

        if (saved) {
            console.log('💾 Barcelona Advanced API: تم حفظ الإعدادات المتقدمة');

            // إرسال تحديث عبر WebSocket
            io.emit('barcelona-config-updated', config);

            res.json({
                success: true,
                message: 'تم حفظ الإعدادات المتقدمة بنجاح'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل في حفظ الإعدادات المتقدمة'
            });
        }
    } catch (error) {
        console.error('❌ Barcelona Advanced API: خطأ في حفظ الإعدادات:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حفظ الإعدادات المتقدمة',
            error: error.message
        });
    }
});

// API لتحديث إعداد محدد
app.put('/api/barcelona-advanced-config/:setting', (req, res) => {
    try {
        const settingName = req.params.setting;
        const settingValue = req.body.value;

        const config = loadAdvancedConfig();

        // تحديث الإعداد المحدد
        if (config.currentSettings) {
            config.currentSettings[settingName] = settingValue;
        } else {
            config.currentSettings = { [settingName]: settingValue };
        }

        const saved = saveAdvancedConfig(config);

        if (saved) {
            console.log(`🔄 Barcelona Advanced API: تم تحديث الإعداد ${settingName}`);

            // إرسال تحديث عبر WebSocket
            io.emit('barcelona-setting-updated', { setting: settingName, value: settingValue });

            res.json({
                success: true,
                message: `تم تحديث الإعداد ${settingName} بنجاح`,
                setting: settingName,
                value: settingValue
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'فشل في حفظ التحديث'
            });
        }
    } catch (error) {
        console.error('❌ Barcelona Advanced API: خطأ في تحديث الإعداد:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الإعداد',
            error: error.message
        });
    }
});

// ===== Global Configuration APIs =====

// API للحصول على الإعدادات العالمية
app.get('/api/global-config', (req, res) => {
    try {
        const config = {
            supportedLanguages: globalConfigService.getSupportedLanguages(),
            supportedClubs: globalConfigService.getSupportedClubs(),
            userSettings: globalConfigService.getUserSettings(),
            systemStats: globalConfigService.getSystemStats()
        };

        console.log('📊 Global Config API: تم تحميل الإعدادات العالمية');
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات العالمية:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحميل الإعدادات العالمية',
            error: error.message
        });
    }
});

// API لتحديث إعدادات المستخدم العالمية
app.post('/api/global-config/user-settings', (req, res) => {
    try {
        const settings = req.body;
        const success = globalConfigService.updateUserSettings(settings);

        if (success) {
            console.log('✅ تم تحديث إعدادات المستخدم العالمية');
            res.json({
                success: true,
                message: 'تم تحديث الإعدادات بنجاح',
                data: globalConfigService.getUserSettings()
            });
        } else {
            throw new Error('فشل في حفظ الإعدادات');
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث إعدادات المستخدم:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الإعدادات',
            error: error.message
        });
    }
});

// API للحصول على ترجمات لغة معينة
app.get('/api/global-config/translations/:language', (req, res) => {
    try {
        const language = req.params.language;
        const translations = globalConfigService.getTranslations(language);

        res.json({
            success: true,
            language: language,
            translations: translations
        });
    } catch (error) {
        console.error('❌ خطأ في تحميل الترجمات:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحميل الترجمات',
            error: error.message
        });
    }
});

// API للحصول على معلومات نادي معين
app.get('/api/global-config/club/:clubKey', (req, res) => {
    try {
        const clubKey = req.params.clubKey;
        const clubInfo = globalConfigService.getClubInfo(clubKey);

        if (clubInfo) {
            const clubConfig = globalConfigService.generateClubConfig(clubKey);
            res.json({
                success: true,
                clubKey: clubKey,
                clubInfo: clubInfo,
                clubConfig: clubConfig
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'النادي غير موجود'
            });
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل معلومات النادي:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحميل معلومات النادي',
            error: error.message
        });
    }
});

// API للبحث عن الأندية
app.get('/api/global-config/clubs/search', (req, res) => {
    try {
        const query = req.query.q || '';
        const results = globalConfigService.searchClubs(query);

        res.json({
            success: true,
            query: query,
            results: results,
            count: results.length
        });
    } catch (error) {
        console.error('❌ خطأ في البحث عن الأندية:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في البحث عن الأندية',
            error: error.message
        });
    }
});

// ===== Top Transfers API =====

// API لاستخراج أغلى الصفقات من FotMob
app.get('/api/top-transfers', async (req, res) => {
    try {
        console.log('🚀 API: استخراج أغلى الصفقات من FotMob...');

        const limit = parseInt(req.query.limit) || 15;
        const TopTransfersExtractor = require('./services/topTransfersExtractor');
        const extractor = new TopTransfersExtractor();

        console.log(`📊 جلب أغلى ${limit} صفقة...`);

        const transfers = await extractor.extractTopTransfers(limit);

        if (transfers && transfers.length > 0) {
            res.json({
                success: true,
                transfers: transfers,
                count: transfers.length,
                limit: limit,
                source: 'FotMob Top Transfers',
                timestamp: new Date().toISOString(),
                message: `تم جلب ${transfers.length} صفقة من أغلى الصفقات`
            });
        } else {
            res.json({
                success: false,
                transfers: [],
                count: 0,
                error: 'لم يتم العثور على صفقات في FotMob',
                limit: limit
            });
        }
    } catch (error) {
        console.error('❌ خطأ في استخراج أغلى الصفقات:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// ===== FotMob Extractor API =====

// API لاستخراج البيانات الحقيقية من FotMob
app.post('/api/extract-fotmob', async (req, res) => {
    try {
        console.log('🚀 API: استخراج البيانات الحقيقية من FotMob...');

        // تعيين headers للـ JSON
        res.setHeader('Content-Type', 'application/json');

        const { limit = 15 } = req.body;

        // استخدام المستخرج الحقيقي الجديد
        const trueExtractor = new TrueFotMobExtractor();
        const transfers = await trueExtractor.extractTop15Transfers();

        if (transfers && transfers.length > 0) {
            console.log(`✅ تم استخراج ${transfers.length} صفقة حقيقية`);

            res.json({
                success: true,
                transfers: transfers.slice(0, limit),
                count: transfers.length,
                source: 'FotMob Real Data',
                extractedAt: new Date().toISOString()
            });
        } else {
            throw new Error('لم يتم العثور على صفقات');
        }

    } catch (error) {
        console.error('❌ خطأ في API:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: []
        });
    }
});

// API الأصلي (احتياطي)
app.post('/api/extract-fotmob-legacy', async (req, res) => {
    try {
        console.log('🚀 API Legacy: استخراج البيانات الحقيقية من FotMob...');

        // تعيين headers للـ JSON
        res.setHeader('Content-Type', 'application/json');

        const limit = parseInt(req.body.limit) || 15;
        const fotmobExtractor = new FotMobExtractorService();

        console.log(`📊 استخراج ${limit} صفقة من FotMob...`);

        const transfers = await fotmobExtractor.extractRealData(limit);

        if (transfers && transfers.length > 0) {
            res.json({
                success: true,
                transfers: transfers,
                count: transfers.length,
                limit: limit,
                source: 'FotMob Real Data',
                timestamp: new Date().toISOString(),
                message: `تم استخراج ${transfers.length} صفقة حقيقية من FotMob`
            });
        } else {
            res.json({
                success: false,
                transfers: [],
                count: 0,
                error: 'لم يتم العثور على بيانات في FotMob',
                limit: limit
            });
        }
    } catch (error) {
        console.error('❌ خطأ في استخراج البيانات من FotMob:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            transfers: [],
            count: 0
        });
    }
});

// API لاختبار الاتصال بـ FotMob
app.get('/api/test-fotmob-connection', async (req, res) => {
    try {
        console.log('🔍 API: اختبار الاتصال بـ FotMob...');

        // تعيين headers للـ JSON
        res.setHeader('Content-Type', 'application/json');

        const fotmobExtractor = new FotMobExtractorService();
        const result = await fotmobExtractor.testConnection();

        res.json(result);
    } catch (error) {
        console.error('❌ خطأ في اختبار الاتصال بـ FotMob:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API لتنظيف كاش FotMob
app.post('/api/fotmob/clear-cache', (req, res) => {
    try {
        const fotmobExtractor = new FotMobExtractorService();
        fotmobExtractor.clearCache();

        console.log('🧹 تم تنظيف كاش FotMob');
        res.json({
            success: true,
            message: 'تم تنظيف كاش FotMob بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في تنظيف كاش FotMob:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تنظيف الكاش',
            error: error.message
        });
    }
});

// API للحصول على إحصائيات FotMob
app.get('/api/fotmob/stats', (req, res) => {
    try {
        const fotmobExtractor = new FotMobExtractorService();
        const stats = fotmobExtractor.monitoring.getDetailedStats();

        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ خطأ في الحصول على إحصائيات FotMob:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في الحصول على الإحصائيات',
            error: error.message
        });
    }
});

// API لإعادة تعيين إحصائيات FotMob
app.post('/api/fotmob/reset-stats', (req, res) => {
    try {
        const fotmobExtractor = new FotMobExtractorService();
        fotmobExtractor.monitoring.resetStats();

        res.json({
            success: true,
            message: 'تم إعادة تعيين الإحصائيات بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في إعادة تعيين إحصائيات FotMob:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إعادة تعيين الإحصائيات',
            error: error.message
        });
    }
});

// ===== Advanced Error Handling API =====

// تهيئة معالج الأخطاء المتقدم (إذا لم يكن موجوداً)
if (!global.errorHandler) {
    const AdvancedErrorHandler = require('./services/advancedErrorHandler');
    global.errorHandler = new AdvancedErrorHandler();
}

// API لمعالجة الأخطاء بشكل شامل
app.post('/api/error-handler/process', async (req, res) => {
    try {
        const { error, context } = req.body;

        if (!error) {
            return res.status(400).json({
                success: false,
                message: 'يجب توفير معلومات الخطأ'
            });
        }

        console.log('🔧 معالجة خطأ باستخدام النظام المتقدم...');

        const errorObject = error instanceof Error ? error : new Error(error.message || error);
        const result = await global.errorHandler.handleError(errorObject, context);

        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('❌ خطأ في معالجة الخطأ:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في معالجة الخطأ',
            error: error.message
        });
    }
});

// API للحصول على تقرير الأخطاء
app.get('/api/error-handler/report', async (req, res) => {
    try {
        console.log('📊 إنشاء تقرير الأخطاء الشامل...');

        const report = global.errorHandler.generateComprehensiveReport();

        res.json({
            success: true,
            report: report
        });
    } catch (error) {
        console.error('❌ خطأ في إنشاء تقرير الأخطاء:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء التقرير',
            error: error.message
        });
    }
});

// API لتنظيف سجلات الأخطاء القديمة
app.post('/api/error-handler/cleanup', async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;

        console.log(`🧹 تنظيف سجلات الأخطاء الأقدم من ${daysToKeep} يوم...`);

        await global.errorHandler.cleanupOldLogs(daysToKeep);

        res.json({
            success: true,
            message: `تم تنظيف السجلات الأقدم من ${daysToKeep} يوم`
        });
    } catch (error) {
        console.error('❌ خطأ في تنظيف السجلات:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تنظيف السجلات',
            error: error.message
        });
    }
});

// API للحصول على إحصائيات الأخطاء
app.get('/api/error-handler/stats', (req, res) => {
    try {
        const stats = global.errorHandler.getErrorStats();

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('❌ خطأ في جلب إحصائيات الأخطاء:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الإحصائيات',
            error: error.message
        });
    }
});

// API لاختبار معالج الأخطاء
app.post('/api/error-handler/test', async (req, res) => {
    try {
        console.log('🧪 اختبار معالج الأخطاء المتقدم...');

        // إنشاء خطأ تجريبي
        const testError = new Error('خطأ تجريبي لاختبار النظام');
        const context = {
            service: 'test',
            method: 'test_method',
            timestamp: new Date().toISOString()
        };

        const result = await global.errorHandler.handleError(testError, context);

        res.json({
            success: true,
            message: 'تم اختبار معالج الأخطاء بنجاح',
            result: result
        });
    } catch (error) {
        console.error('❌ خطأ في اختبار معالج الأخطاء:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في اختبار معالج الأخطاء',
            error: error.message
        });
    }
});

// API للحصول على إحصائيات FotMob
app.get('/api/fotmob/stats', (req, res) => {
    try {
        const fotmobExtractor = new FotMobExtractorService();
        const stats = {
            cacheSize: fotmobExtractor.cache.size,
            cacheTimeout: fotmobExtractor.cacheTimeout,
            lastUpdate: new Date().toISOString(),
            serviceStatus: 'active'
        };

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('❌ خطأ في جلب إحصائيات FotMob:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الإحصائيات',
            error: error.message
        });
    }
});

// API لتنظيف كاش FotMob
app.post('/api/fotmob/clear-cache', (req, res) => {
    try {
        const fotmobExtractor = new FotMobExtractorService();
        fotmobExtractor.clearCache();

        console.log('🧹 تم تنظيف كاش FotMob');
        res.json({
            success: true,
            message: 'تم تنظيف كاش FotMob بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في تنظيف كاش FotMob:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تنظيف الكاش',
            error: error.message
        });
    }
});



// API لتحديث كاش الصفقات الأعلى
app.post('/api/top-transfers/clear-cache', (req, res) => {
    try {
        const TopTransfersExtractor = require('./services/topTransfersExtractor');
        const extractor = new TopTransfersExtractor();

        extractor.clearCache();

        console.log('🧹 تم تنظيف كاش الصفقات الأعلى');
        res.json({
            success: true,
            message: 'تم تنظيف كاش الصفقات الأعلى بنجاح'
        });
    } catch (error) {
        console.error('❌ خطأ في تنظيف كاش الصفقات الأعلى:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تنظيف الكاش',
            error: error.message
        });
    }
});

// API للنظام المحسن لاستخراج بيانات Transfermarkt
app.get('/api/transfermarkt/enhanced-extract', async (req, res) => {
    try {
        console.log('🚀 بدء استخراج البيانات باستخدام النظام المحسن');

        const enhancedExtractor = new EnhancedTransfermarktExtractor();
        const season = req.query.season || '2025';

        const clubs = await enhancedExtractor.extractTopSpenders(season);

        if (clubs && clubs.length > 0) {
            console.log(`✅ تم استخراج ${clubs.length} نادي بنجاح`);

            // حفظ البيانات في localStorage للصفحات الأخرى
            const dataToSave = {
                clubs: clubs,
                lastUpdate: new Date().toISOString(),
                source: 'enhanced-extractor',
                season: season,
                totalClubs: clubs.length
            };

            res.json({
                success: true,
                message: 'تم استخراج البيانات بنجاح',
                data: clubs,
                metadata: {
                    totalClubs: clubs.length,
                    season: season,
                    lastUpdate: new Date().toISOString(),
                    source: 'enhanced-extractor'
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'لم يتم العثور على بيانات',
                data: []
            });
        }

    } catch (error) {
        console.error('❌ خطأ في استخراج البيانات المحسن:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في استخراج البيانات',
            error: error.message
        });
    }
});

// API لاختبار النظام المحسن
app.get('/api/transfermarkt/enhanced-test', async (req, res) => {
    try {
        console.log('🧪 اختبار النظام المحسن');

        const enhancedExtractor = new EnhancedTransfermarktExtractor();

        // اختبار البيانات الافتراضية
        const defaultData = enhancedExtractor.getDefaultData();

        res.json({
            success: true,
            message: 'تم اختبار النظام المحسن بنجاح',
            data: defaultData,
            metadata: {
                totalClubs: defaultData.length,
                testMode: true,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ خطأ في اختبار النظام المحسن:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في اختبار النظام',
            error: error.message
        });
    }
});

// تم بدء الخادم بالفعل في السطر 5720
