const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8201;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// مسار حفظ البيانات
const DATA_FILE = path.join(__dirname, 'clubs-data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// إنشاء مجلد النسخ الاحتياطية إذا لم يكن موجوداً
async function ensureBackupDir() {
    try {
        await fs.access(BACKUP_DIR);
    } catch {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
    }
}

// حفظ البيانات
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
            const existingData = await fs.readFile(DATA_FILE, 'utf8');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(BACKUP_DIR, `clubs-data-backup-${timestamp}.json`);
            await fs.writeFile(backupFile, existingData);
        } catch (error) {
            console.log('لا يوجد ملف سابق للنسخ الاحتياطي');
        }

        // حفظ البيانات الجديدة
        const dataToSave = {
            ...clubsData,
            savedAt: new Date().toISOString(),
            version: '2.0'
        };

        await fs.writeFile(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');

        console.log(`تم حفظ ${clubsData.clubs.length} نادي في ${DATA_FILE}`);

        res.json({ 
            success: true, 
            message: 'تم حفظ البيانات بنجاح',
            savedCount: clubsData.clubs.length,
            filePath: DATA_FILE
        });

    } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في حفظ البيانات على الخادم' 
        });
    }
});

// تحميل البيانات
app.get('/load-clubs-data', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
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

// الحصول على إحصائيات البيانات
app.get('/clubs-stats', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
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

// قائمة النسخ الاحتياطية
app.get('/backups', async (req, res) => {
    try {
        await ensureBackupDir();
        const files = await fs.readdir(BACKUP_DIR);
        const backups = files
            .filter(file => file.startsWith('clubs-data-backup-') && file.endsWith('.json'))
            .map(file => ({
                filename: file,
                path: path.join(BACKUP_DIR, file),
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

// استعادة من نسخة احتياطية
app.post('/restore-backup', async (req, res) => {
    try {
        const { filename } = req.body;
        const backupPath = path.join(BACKUP_DIR, filename);
        
        // التحقق من وجود الملف
        await fs.access(backupPath);
        
        // قراءة النسخة الاحتياطية
        const backupData = await fs.readFile(backupPath, 'utf8');
        
        // حفظ النسخة الحالية كنسخة احتياطية
        try {
            const currentData = await fs.readFile(DATA_FILE, 'utf8');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const currentBackupFile = path.join(BACKUP_DIR, `clubs-data-before-restore-${timestamp}.json`);
            await fs.writeFile(currentBackupFile, currentData);
        } catch (error) {
            console.log('لا يوجد ملف حالي للنسخ الاحتياطي');
        }
        
        // استعادة النسخة الاحتياطية
        await fs.writeFile(DATA_FILE, backupData);
        
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

// بدء الخادم
app.listen(PORT, () => {
    console.log(`🚀 خادم مدير شعارات الأندية يعمل على المنفذ ${PORT}`);
    console.log(`📂 ملف البيانات: ${DATA_FILE}`);
    console.log(`💾 مجلد النسخ الاحتياطية: ${BACKUP_DIR}`);
    ensureBackupDir();
});

// معالجة إغلاق الخادم
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف الخادم...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 إيقاف الخادم...');
    process.exit(0);
});
