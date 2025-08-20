#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ملف لحفظ بيانات الأدوات تلقائياً في مجلد المشروع
"""

import json
import os
import sys
from datetime import datetime

def save_data_to_project(data, filename="home-tools-data.json"):
    """
    حفظ البيانات في مجلد المشروع
    """
    try:
        # تحديد مسار مجلد المشروع (المجلد الأب)
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(project_dir, "saved_data")
        
        # إنشاء مجلد البيانات إذا لم يكن موجوداً
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        
        # مسار الملف الكامل
        file_path = os.path.join(data_dir, filename)
        
        # حفظ البيانات مع timestamp
        data_with_timestamp = {
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data_with_timestamp, f, ensure_ascii=False, indent=2)
        
        print(f"تم حفظ البيانات في: {file_path}")
        return True
        
    except Exception as e:
        print(f"خطأ في حفظ البيانات: {e}")
        return False

def load_data_from_project(filename="home-tools-data.json"):
    """
    تحميل البيانات من مجلد المشروع
    """
    try:
        # تحديد مسار مجلد المشروع
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(project_dir, "saved_data")
        file_path = os.path.join(data_dir, filename)
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data_with_timestamp = json.load(f)
                return data_with_timestamp.get("data", {})
        else:
            print(f"الملف غير موجود: {file_path}")
            return {}
            
    except Exception as e:
        print(f"خطأ في تحميل البيانات: {e}")
        return {}

if __name__ == "__main__":
    # اختبار الدوال
    test_data = {
        "groups": [
            {
                "id": 1,
                "name": "مجموعة تجريبية",
                "tools": []
            }
        ]
    }
    
    # حفظ البيانات
    save_data_to_project(test_data)
    
    # تحميل البيانات
    loaded_data = load_data_from_project()
    print("البيانات المحملة:", loaded_data)
