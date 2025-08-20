@echo off
echo ========================================
echo    مدير شعارات الأندية المحسن
echo    Enhanced Club Logo Manager Server
echo ========================================
echo.

echo جاري التحقق من Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js غير مثبت!
    echo يرجى تحميل وتثبيت Node.js من: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js مثبت
echo.

echo جاري التحقق من التبعيات...
if not exist "node_modules" (
    echo 📦 تثبيت التبعيات...
    npm install
    if errorlevel 1 (
        echo ❌ فشل في تثبيت التبعيات
        pause
        exit /b 1
    )
    echo ✅ تم تثبيت التبعيات
) else (
    echo ✅ التبعيات موجودة
)

echo.
echo 🚀 بدء تشغيل الخادم...
echo.
echo الخادم سيعمل على: http://localhost:8201
echo مدير الشعارات: http://localhost:8201/club-logo-manager-enhanced.html
echo أداة Transfermarkt: http://localhost:8201/transfermarkt-top-spenders-2025.html
echo.
echo اضغط Ctrl+C لإيقاف الخادم
echo ========================================
echo.

node server.js

echo.
echo تم إيقاف الخادم
pause
