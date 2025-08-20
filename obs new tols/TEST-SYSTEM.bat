@echo off
title اختبار نظام Transfermarkt

echo.
echo ========================================
echo      اختبار نظام Transfermarkt
echo ========================================
echo.

echo جاري فحص النظام...
echo.

echo [1/5] فحص ملف ULTIMATE-START.bat...
if exist "ULTIMATE-START.bat" (
    echo + ملف ULTIMATE-START.bat موجود
) else (
    echo X ملف ULTIMATE-START.bat مفقود!
    goto ERROR
)

echo [2/5] فحص ملفات HTML...
if exist "transfermarkt-top-spenders-2025.html" (
    echo + الاداة الرئيسية موجودة
) else (
    echo X الاداة الرئيسية مفقودة!
    goto ERROR
)

if exist "transfermarkt-display-pro.html" (
    echo + اداة العرض موجودة
) else (
    echo X اداة العرض مفقودة!
    goto ERROR
)

if exist "club-logo-manager-enhanced.html" (
    echo + مدير الشعارات موجود
) else (
    echo X مدير الشعارات مفقود!
    goto ERROR
)

echo [3/5] فحص ملفات الخادم...
if exist "server.js" (
    echo + ملف الخادم موجود
) else (
    echo X ملف الخادم مفقود!
    goto ERROR
)

if exist "package.json" (
    echo + ملف package.json موجود
) else (
    echo X ملف package.json مفقود!
    goto ERROR
)

echo [4/5] فحص Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo تحذير: Node.js غير مثبت
    echo سيعمل النظام بميزات محدودة
) else (
    echo + Node.js مثبت ومتاح
)

echo [5/5] فحص التبعيات...
if exist "node_modules" (
    echo + مجلد node_modules موجود
) else (
    echo تحذير: مجلد node_modules مفقود
    echo سيتم تثبيت التبعيات عند التشغيل
)

echo.
echo ========================================
echo        نتيجة الفحص
echo ========================================
echo.
echo + جميع الملفات الاساسية موجودة
echo + النظام جاهز للتشغيل
echo.
echo لتشغيل النظام:
echo 1. انقر نقرا مزدوجا على ULTIMATE-START.bat
echo 2. اختر "تشغيل النظام الكامل"
echo 3. انتظر تحميل الادوات
echo.
echo ========================================
echo.
pause
exit /b 0

:ERROR
echo.
echo ========================================
echo           خطأ في النظام
echo ========================================
echo.
echo X بعض الملفات الاساسية مفقودة!
echo يرجى التاكد من وجود جميع ملفات النظام
echo.
pause
exit /b 1
