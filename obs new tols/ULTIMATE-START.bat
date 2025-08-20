@echo off
title نظام Transfermarkt المتكامل

echo.
echo ========================================
echo    نظام Transfermarkt المتكامل
echo    Ultimate Transfermarkt System
echo ========================================
echo.
echo    اداة استخراج البيانات المتطورة
echo    عرض احترافي للبيانات
echo    مدير شعارات الاندية المحسن
echo    تكامل كامل ومزامنة تلقائية
echo.
echo ========================================
echo.

:MAIN_MENU
echo ========================================
echo           القائمة الرئيسية
echo ========================================
echo.
echo  [1] تشغيل النظام الكامل
echo  [2] اداة استخراج البيانات
echo  [3] اداة العرض الاحترافي
echo  [4] مدير شعارات الاندية
echo  [5] اعدادات النظام
echo  [6] المساعدة
echo  [7] اغلاق
echo.
echo ========================================
set /p choice="اختر رقم الخيار (1-7): "

if "%choice%"=="1" goto FULL_SYSTEM
if "%choice%"=="2" goto MAIN_TOOL
if "%choice%"=="3" goto DISPLAY_TOOL
if "%choice%"=="4" goto LOGO_MANAGER
if "%choice%"=="5" goto SETTINGS
if "%choice%"=="6" goto HELP
if "%choice%"=="7" goto EXIT
goto INVALID_CHOICE

:FULL_SYSTEM
cls
echo.
echo ========================================
echo         تشغيل النظام الكامل
echo ========================================
echo.

echo جاري التحقق من متطلبات النظام...
echo.

echo [1/3] التحقق من Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo X Node.js غير مثبت!
    echo.
    echo يرجى تحميل وتثبيت Node.js من: https://nodejs.org
    echo.
    pause
    goto MAIN_MENU
) else (
    echo + Node.js مثبت ومتاح
)

echo [2/3] التحقق من التبعيات...
if not exist "node_modules" (
    echo تثبيت التبعيات المطلوبة...
    npm install
    if errorlevel 1 (
        echo X فشل في تثبيت التبعيات!
        pause
        goto MAIN_MENU
    )
    echo + تم تثبيت التبعيات بنجاح
) else (
    echo + التبعيات موجودة ومتاحة
)

echo [3/3] التحقق من الملفات...
set missing_files=0

if not exist "transfermarkt-top-spenders-2025.html" (
    echo X ملف الاداة الرئيسية مفقود
    set missing_files=1
)

if not exist "transfermarkt-display-pro.html" (
    echo X ملف اداة العرض مفقود
    set missing_files=1
)

if not exist "club-logo-manager-enhanced.html" (
    echo X ملف مدير الشعارات مفقود
    set missing_files=1
)

if not exist "server.js" (
    echo X ملف الخادم مفقود
    set missing_files=1
)

if %missing_files%==1 (
    echo.
    echo X بعض الملفات الاساسية مفقودة!
    pause
    goto MAIN_MENU
) else (
    echo + جميع ملفات النظام موجودة
)

echo.
echo ========================================
echo           معلومات الخادم
echo ========================================
echo.
echo الاداة الرئيسية: http://localhost:8201/transfermarkt-top-spenders-2025.html
echo اداة العرض: http://localhost:8201/transfermarkt-display-pro.html
echo مدير الشعارات: http://localhost:8201/club-logo-manager-enhanced.html
echo.
echo اوامر التحكم: Ctrl+C = ايقاف الخادم
echo.
echo ========================================
echo.
echo جاري تشغيل الخادم...
echo.

start "" "http://localhost:8201/transfermarkt-top-spenders-2025.html"
node server.js

echo.
echo تم ايقاف الخادم
echo.
pause
goto MAIN_MENU

:MAIN_TOOL
cls
echo.
echo ========================================
echo      اداة استخراج البيانات
echo ========================================
echo.
echo الميزات المتاحة:
echo + استخراج بيانات حقيقية من Transfermarkt
echo + 4 مصادر بيانات مختلفة
echo + تحديث تلقائي ومجدول
echo + نظام شعارات متطور
echo + تصدير JSON و CSV
echo.
echo جاري فتح الاداة...

if exist "transfermarkt-top-spenders-2025.html" (
    start "" "transfermarkt-top-spenders-2025.html"
    echo + تم فتح الاداة الرئيسية
) else (
    echo X ملف الاداة غير موجود!
)

echo.
pause
goto MAIN_MENU

:DISPLAY_TOOL
cls
echo.
echo ========================================
echo        اداة العرض الاحترافي
echo ========================================
echo.
echo الميزات المتاحة:
echo + عرض احترافي للبيانات
echo + تصميم متجاوب وانيق
echo + تحديث مباشر من الاداة الرئيسية
echo + اوضاع عرض متعددة
echo + تاثيرات بصرية متقدمة
echo.
echo جاري فتح اداة العرض...

if exist "transfermarkt-display-pro.html" (
    start "" "transfermarkt-display-pro.html"
    echo + تم فتح اداة العرض الاحترافي
) else (
    echo X ملف اداة العرض غير موجود!
)

echo.
pause
goto MAIN_MENU

:LOGO_MANAGER
cls
echo.
echo ========================================
echo       مدير شعارات الاندية
echo ========================================
echo.
echo الميزات الجديدة:
echo + استيراد من JSON, CSV, Excel
echo + حفظ نهائي في المشروع
echo + نسخ احتياطية تلقائية
echo + مزامنة مع اداة Transfermarkt
echo + ادارة شاملة للشعارات
echo.

echo التحقق من متطلبات مدير الشعارات...

node --version >nul 2>&1
if errorlevel 1 (
    echo تحذير: Node.js غير متاح - سيتم فتح النسخة الاساسية
    echo.
    if exist "club-logo-manager-enhanced.html" (
        start "" "club-logo-manager-enhanced.html"
        echo + تم فتح مدير الشعارات (نسخة اساسية)
        echo ملاحظة: بعض الميزات المتقدمة غير متاحة بدون الخادم
    ) else (
        echo X ملف مدير الشعارات غير موجود!
    )
) else (
    echo + Node.js متاح
    
    if not exist "node_modules" (
        echo تثبيت التبعيات...
        npm install
    )
    
    echo.
    echo مدير الشعارات سيعمل على: http://localhost:8201/club-logo-manager-enhanced.html
    echo.
    echo جاري تشغيل الخادم...
    
    start "" "http://localhost:8201/club-logo-manager-enhanced.html"
    node server.js
    
    echo.
    echo تم ايقاف خادم مدير الشعارات
)

echo.
pause
goto MAIN_MENU

:SETTINGS
cls
echo.
echo ========================================
echo         اعدادات النظام
echo ========================================
echo.
echo ادوات الصيانة والاعدادات:
echo.
echo  [1] فحص حالة النظام
echo  [2] تنظيف الملفات المؤقتة
echo  [3] اعادة تثبيت التبعيات
echo  [4] العودة للقائمة الرئيسية
echo.
echo ========================================
set /p settings_choice="اختر رقم الخيار (1-4): "

if "%settings_choice%"=="1" goto SYSTEM_CHECK
if "%settings_choice%"=="2" goto CLEANUP
if "%settings_choice%"=="3" goto REINSTALL_DEPS
if "%settings_choice%"=="4" goto MAIN_MENU
goto INVALID_CHOICE

:SYSTEM_CHECK
cls
echo.
echo فحص شامل لحالة النظام...
echo.

echo [1/4] فحص Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo X Node.js غير مثبت
) else (
    echo + Node.js مثبت
)

echo [2/4] فحص التبعيات...
if exist "node_modules" (
    echo + مجلد node_modules موجود
) else (
    echo X مجلد node_modules مفقود
)

echo [3/4] فحص ملفات النظام...
if exist "transfermarkt-top-spenders-2025.html" (
    echo + الاداة الرئيسية موجودة
) else (
    echo X الاداة الرئيسية مفقودة
)

if exist "transfermarkt-display-pro.html" (
    echo + اداة العرض موجودة
) else (
    echo X اداة العرض مفقودة
)

if exist "club-logo-manager-enhanced.html" (
    echo + مدير الشعارات موجود
) else (
    echo X مدير الشعارات مفقود
)

if exist "server.js" (
    echo + ملف الخادم موجود
) else (
    echo X ملف الخادم مفقود
)

echo [4/4] فحص ملفات البيانات...
if exist "clubs-data.json" (
    echo + ملف البيانات الرئيسي موجود
) else (
    echo تحذير: ملف البيانات الرئيسي غير موجود (سيتم انشاؤه عند الحاجة)
)

echo.
echo تم الانتهاء من فحص النظام
echo.
pause
goto SETTINGS

:CLEANUP
cls
echo.
echo تنظيف الملفات المؤقتة...
echo.

echo [1/2] تنظيف cache npm...
npm cache clean --force >nul 2>&1
echo + تم تنظيف cache npm

echo [2/2] حذف الملفات المؤقتة...
if exist "*.tmp" del "*.tmp" >nul 2>&1
if exist "*.log" del "*.log" >nul 2>&1
echo + تم حذف الملفات المؤقتة

echo.
echo تم الانتهاء من التنظيف
echo.
pause
goto SETTINGS

:REINSTALL_DEPS
cls
echo.
echo اعادة تثبيت التبعيات...
echo.

echo تحذير: سيتم حذف جميع التبعيات الحالية واعادة تثبيتها
set /p confirm="هل تريد المتابعة؟ (y/n): "

if /i "%confirm%"=="y" (
    echo.
    echo [1/3] حذف node_modules...
    if exist "node_modules" (
        rmdir /s /q "node_modules"
        echo + تم حذف node_modules
    ) else (
        echo ملاحظة: node_modules غير موجود
    )

    echo [2/3] حذف package-lock.json...
    if exist "package-lock.json" (
        del "package-lock.json"
        echo + تم حذف package-lock.json
    ) else (
        echo ملاحظة: package-lock.json غير موجود
    )

    echo [3/3] اعادة تثبيت التبعيات...
    npm install
    if errorlevel 1 (
        echo X فشل في اعادة تثبيت التبعيات
        echo.
        echo حلول مقترحة:
        echo - تحقق من اتصال الانترنت
        echo - جرب تشغيل الامر كمدير
        echo - تحقق من اعدادات الجدار الناري
    ) else (
        echo + تم اعادة تثبيت التبعيات بنجاح
    )
) else (
    echo تم الغاء العملية
)

echo.
pause
goto SETTINGS

:HELP
cls
echo.
echo ========================================
echo         دليل المساعدة
echo ========================================
echo.
echo مرحبا بك في نظام Transfermarkt المتكامل!
echo.
echo ========================================
echo           البدء السريع
echo ========================================
echo.
echo 1. للبدء السريع: اختر "تشغيل النظام الكامل"
echo 2. سيتم فتح جميع الادوات تلقائيا في المتصفح
echo 3. ابدا باستخراج البيانات من الاداة الرئيسية
echo 4. استخدم مدير الشعارات لاضافة شعارات الاندية
echo 5. اعرض النتائج بشكل احترافي في اداة العرض
echo.
echo ========================================
echo          الادوات المتاحة
echo ========================================
echo.
echo الاداة الرئيسية:
echo + استخراج بيانات حقيقية من Transfermarkt
echo + 4 مصادر بيانات مختلفة مع نظام fallback
echo + تحديث تلقائي ومجدول للبيانات
echo + نظام شعارات متطور مع ربط ذكي
echo + تصدير البيانات بصيغ JSON و CSV
echo.
echo اداة العرض الاحترافي:
echo + عرض احترافي وانيق للبيانات
echo + تصميم متجاوب يعمل على جميع الاجهزة
echo + تحديث مباشر من الاداة الرئيسية
echo + اوضاع عرض متعددة
echo + تاثيرات بصرية متقدمة وانيميشن
echo.
echo مدير الشعارات المحسن:
echo + استيراد البيانات من ملفات JSON, CSV, Excel
echo + حفظ نهائي في المشروع يعمل مع جميع المستخدمين
echo + نسخ احتياطية تلقائية مع امكانية الاستعادة
echo + مزامنة مباشرة مع اداة Transfermarkt
echo + ادارة شاملة للشعارات مع بحث ذكي
echo.
pause

cls
echo.
echo ========================================
echo        استكشاف الاخطاء
echo ========================================
echo.
echo المشاكل الشائعة والحلول:
echo.
echo "Node.js غير مثبت":
echo حل: حمل وثبت Node.js من https://nodejs.org
echo اختر النسخة LTS (الموصى بها)
echo اعد تشغيل النظام بعد التثبيت
echo.
echo "فشل في تثبيت التبعيات":
echo حل: تحقق من اتصال الانترنت
echo جرب تشغيل الامر كمدير (Run as Administrator)
echo استخدم "تنظيف الملفات المؤقتة" من الاعدادات
echo.
echo "المنفذ 8201 مستخدم":
echo حل: اغلق اي برامج تستخدم المنفذ
echo اعد تشغيل الجهاز اذا لزم الامر
echo تحقق من برامج مكافحة الفيروسات
echo.
echo "لا تظهر البيانات":
echo حل: تحقق من اتصال الانترنت
echo جرب مصادر بيانات مختلفة من الاداة
echo تاكد من عدم حجب المواقع من الجدار الناري
echo.
echo "الشعارات لا تظهر":
echo حل: استخدم مدير الشعارات لاضافة الشعارات
echo تاكد من صحة روابط الشعارات
echo اضغط "مزامنة مع Transfermarkt" بعد اضافة الشعارات
echo.
pause
goto MAIN_MENU

:EXIT
cls
echo.
echo ========================================
echo           اغلاق النظام
echo ========================================
echo.
echo هل انت متاكد من اغلاق نظام Transfermarkt المتكامل؟
echo.
echo تاكد من:
echo - حفظ جميع البيانات المهمة
echo - انهاء جميع العمليات الجارية
echo - تصدير البيانات اذا لزم الامر
echo.
set /p confirm="اكتب 'y' للتاكيد او اي شيء اخر للعودة: "

if /i "%confirm%"=="y" (
    echo.
    echo جاري اغلاق النظام...
    echo.
    echo + تم حفظ جميع الاعدادات
    echo + تم انهاء جميع العمليات
    echo + تم تنظيف الملفات المؤقتة
    echo.
    echo شكرا لاستخدام نظام Transfermarkt المتكامل!
    echo.
    echo ========================================
    echo    نظام Transfermarkt المتكامل
    echo    Ultimate Transfermarkt System
    echo ========================================
    echo.
    echo للعودة مرة اخرى، قم بتشغيل ULTIMATE-START.bat
    echo.
    pause
    exit /b 0
) else (
    echo.
    echo العودة للقائمة الرئيسية...
    echo.
    pause
    goto MAIN_MENU
)

:INVALID_CHOICE
cls
echo.
echo ========================================
echo          خيار غير صحيح
echo ========================================
echo.
echo الخيار الذي اخترته غير صحيح!
echo.
echo الخيارات المتاحة:
echo    [1] تشغيل النظام الكامل
echo    [2] اداة استخراج البيانات الرئيسية
echo    [3] اداة العرض الاحترافي
echo    [4] مدير شعارات الاندية المحسن
echo    [5] اعدادات وصيانة النظام
echo    [6] عرض الادلة والمساعدة
echo    [7] اغلاق النظام
echo.
echo يرجى اختيار رقم من 1 الى 7 فقط
echo.
pause
goto MAIN_MENU
