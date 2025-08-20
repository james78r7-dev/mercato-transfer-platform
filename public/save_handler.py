#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
معالج حفظ البيانات من JavaScript
"""

import json
import sys
import os
from save_data import save_data_to_project, load_data_from_project

def handle_save_request():
    """
    معالجة طلب حفظ البيانات من JavaScript
    """
    try:
        # قراءة البيانات من stdin
        data = sys.stdin.read()
        data_json = json.loads(data)
        
        # حفظ البيانات
        success = save_data_to_project(data_json)
        
        # إرجاع النتيجة
        result = {"success": success}
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        result = {"success": False, "error": str(e)}
        print(json.dumps(result, ensure_ascii=False))

def handle_load_request():
    """
    معالجة طلب تحميل البيانات
    """
    try:
        # تحميل البيانات
        data = load_data_from_project()
        
        # إرجاع البيانات
        result = {"success": True, "data": data}
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        result = {"success": False, "error": str(e)}
        print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        action = sys.argv[1]
        if action == "save":
            handle_save_request()
        elif action == "load":
            handle_load_request()
        else:
            print(json.dumps({"success": False, "error": "Invalid action"}))
    else:
        print(json.dumps({"success": False, "error": "No action specified"}))
