#!/usr/bin/env python3
"""Донастройка сгенерированного Android-проекта (после `npx cap add android`):
разрешения для уведомлений, портретная ориентация, иконка уведомлений, версия."""
import os, re, shutil, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ANDROID = os.path.join(ROOT, 'android')
MANIFEST = os.path.join(ANDROID, 'app/src/main/AndroidManifest.xml')
GRADLE = os.path.join(ANDROID, 'app/build.gradle')
DRAW = os.path.join(ANDROID, 'app/src/main/res/drawable')
version_name = os.environ.get('VERSION_NAME', '1.0.0')
version_code = os.environ.get('VERSION_CODE', '1')

def must(cond, msg):
    if not cond:
        print('PATCH ERROR:', msg); sys.exit(1)

# 1. Манифест
must(os.path.exists(MANIFEST), 'AndroidManifest.xml не найден: сначала выполните npx cap add android')
m = open(MANIFEST, encoding='utf8').read()
perms = [
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.VIBRATE',
    'android.permission.WAKE_LOCK',
    'android.permission.INTERNET',
    'android.permission.CAMERA',
]
add = ''
for p in perms:
    if p not in m:
        add += '    <uses-permission android:name="%s" />\n' % p
must('</manifest>' in m, 'в манифесте нет </manifest>')
if 'android.hardware.camera' not in m:
    add += '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
m = m.replace('</manifest>', add + '</manifest>')
# модуль сканера Google подгружается заранее (если сканер не подключён, запись безвредна)
if 'com.google.mlkit.vision.DEPENDENCIES' not in m and '</application>' in m:
    m = m.replace('</application>', '        <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui"/>\n    </application>')
# портретная ориентация и ресайз при появлении клавиатуры
def patch_activity(match):
    tag = match.group(0)
    if 'android:screenOrientation' not in tag:
        tag = tag.replace('<activity', '<activity android:screenOrientation="portrait"', 1)
    if 'android:windowSoftInputMode' not in tag:
        tag = tag.replace('<activity', '<activity android:windowSoftInputMode="adjustResize"', 1)
    return tag
m = re.sub(r'<activity\b[^>]*>', patch_activity, m, count=1)
open(MANIFEST, 'w', encoding='utf8').write(m)

# 1a. minSdk 23 нужен плагину сканера штрихкодов
VARS = os.path.join(ANDROID, 'variables.gradle')
if os.path.exists(VARS):
    v = open(VARS, encoding='utf8').read()
    v2 = re.sub(r'minSdkVersion\s*=\s*(\d+)', lambda mm: 'minSdkVersion = ' + str(max(23, int(mm.group(1)))), v)
    open(VARS, 'w', encoding='utf8').write(v2)

# 2. Иконка уведомлений
os.makedirs(DRAW, exist_ok=True)
shutil.copy(os.path.join(ROOT, 'ci/ic_stat_legche.xml'), os.path.join(DRAW, 'ic_stat_legche.xml'))

# 3. Версия
must(os.path.exists(GRADLE), 'app/build.gradle не найден')
g = open(GRADLE, encoding='utf8').read()
g, n1 = re.subn(r'versionCode\s+\d+', 'versionCode ' + version_code, g, count=1)
g, n2 = re.subn(r'versionName\s+"[^"]*"', 'versionName "%s"' % version_name, g, count=1)
must(n1 and n2, 'не удалось задать версию в build.gradle')
open(GRADLE, 'w', encoding='utf8').write(g)
print('Android patched: version %s (%s)' % (version_name, version_code))
