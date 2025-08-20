#!/bin/bash

echo "========================================"
echo "   مدير شعارات الأندية المحسن"
echo "   Enhanced Club Logo Manager Server"
echo "========================================"
echo

echo "جاري التحقق من Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت!"
    echo "يرجى تحميل وتثبيت Node.js من: https://nodejs.org"
    echo
    exit 1
fi

echo "✅ Node.js مثبت ($(node --version))"
echo

echo "جاري التحقق من التبعيات..."
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت التبعيات..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ فشل في تثبيت التبعيات"
        exit 1
    fi
    echo "✅ تم تثبيت التبعيات"
else
    echo "✅ التبعيات موجودة"
fi

echo
echo "🚀 بدء تشغيل الخادم..."
echo
echo "الخادم سيعمل على: http://localhost:8201"
echo "مدير الشعارات: http://localhost:8201/club-logo-manager-enhanced.html"
echo "أداة Transfermarkt: http://localhost:8201/transfermarkt-top-spenders-2025.html"
echo
echo "اضغط Ctrl+C لإيقاف الخادم"
echo "========================================"
echo

node server.js

echo
echo "تم إيقاف الخادم"
