#!/usr/bin/env python3
"""Apply release-signing and Android 16 build settings after `cap add android`."""
import os
import re

APP_GRADLE = "android/app/build.gradle"
if os.path.exists(APP_GRADLE):
    with open(APP_GRADLE, encoding="utf-8") as handle:
        source = handle.read()

    signing_block = '''    signingConfigs {
        release {
            storeFile file(System.getenv("CM_KEYSTORE_PATH"))
            storePassword System.getenv("CM_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CM_KEY_ALIAS")
            keyPassword System.getenv("CM_KEY_PASSWORD")
        }
    }
'''
    if "signingConfigs" not in source:
        marker = "android {"
        marker_end = source.index(marker) + len(marker)
        newline = source.index("\n", marker_end)
        source = source[:newline + 1] + signing_block + source[newline + 1:]

    if "signingConfig signingConfigs.release" not in source:
        source = re.sub(
            r'(buildTypes\s*\{\s*\n\s*release\s*\{\s*\n)',
            r'\1            signingConfig signingConfigs.release\n',
            source,
            count=1,
        )

    with open(APP_GRADLE, "w", encoding="utf-8") as handle:
        handle.write(source)

VARIABLES = "android/variables.gradle"
if os.path.exists(VARIABLES):
    with open(VARIABLES, encoding="utf-8") as handle:
        variables = handle.read()
    variables = re.sub(r'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 36', variables)
    variables = re.sub(r'targetSdkVersion\s*=\s*\d+', 'targetSdkVersion = 36', variables)
    with open(VARIABLES, "w", encoding="utf-8") as handle:
        handle.write(variables)

PROJECT_GRADLE = "android/build.gradle"
if os.path.exists(PROJECT_GRADLE):
    with open(PROJECT_GRADLE, encoding="utf-8") as handle:
        project = handle.read()
    project = re.sub(
        r'com\.android\.tools\.build:gradle:[0-9.]+',
        'com.android.tools.build:gradle:8.9.1',
        project,
    )
    with open(PROJECT_GRADLE, "w", encoding="utf-8") as handle:
        handle.write(project)

WRAPPER = "android/gradle/wrapper/gradle-wrapper.properties"
if os.path.exists(WRAPPER):
    with open(WRAPPER, encoding="utf-8") as handle:
        wrapper = handle.read()
    wrapper = re.sub(r'gradle-[0-9.]+-(all|bin)\.zip', 'gradle-8.11.1-all.zip', wrapper)
    with open(WRAPPER, "w", encoding="utf-8") as handle:
        handle.write(wrapper)

print("Android release signing and API 36 settings applied")
