#!/usr/bin/env python3
import os
import subprocess
import json

def run_cmd(cmd):
    print(f"Running: {cmd}")
    subprocess.run(cmd, shell=True, check=True)

def main():
    print("🚀 Starting Mobile App Icon & Asset Generation for iOS and Android...")
    
    # Source image
    src_icon = "hwdjtb.png"
    if not os.path.exists(src_icon):
        src_icon = "public/hwdjtb.png"
        
    if not os.path.exists(src_icon):
        print(f"❌ Source icon {src_icon} not found!")
        return

    # Directories to create
    dirs = [
        "public/icons",
        "resources/android",
        "resources/ios",
        "android/app/src/main/res/mipmap-mdpi",
        "android/app/src/main/res/mipmap-hdpi",
        "android/app/src/main/res/mipmap-xhdpi",
        "android/app/src/main/res/mipmap-xxhdpi",
        "android/app/src/main/res/mipmap-xxxhdpi",
        "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # 1. Generate Web PWA Icons
    pwa_sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    for sz in pwa_sizes:
        out_path = f"public/icons/icon-{sz}.png"
        run_cmd(f"convert {src_icon} -resize {sz}x{sz}! {out_path}")

    # Apple Touch Icon
    run_cmd(f"convert {src_icon} -resize 180x180! public/apple-touch-icon.png")
    run_cmd(f"convert {src_icon} -resize 64x64! public/favicon.ico")
    run_cmd(f"cp {src_icon} public/icon.png")

    # 2. Android Mipmap Icons
    android_mipmaps = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    for folder, sz in android_mipmaps.items():
        # Square launcher icon
        run_cmd(f"convert {src_icon} -resize {sz}x{sz}! android/app/src/main/res/{folder}/ic_launcher.png")
        # Round launcher icon
        run_cmd(f"convert {src_icon} -resize {sz}x{sz}! android/app/src/main/res/{folder}/ic_launcher_round.png")
        # Foreground adaptive icon
        run_cmd(f"convert {src_icon} -resize {int(sz*1.2)}x{int(sz*1.2)}! -gravity center -extent {sz*2}x{sz*2} android/app/src/main/res/{folder}/ic_launcher_foreground.png")

    # 3. iOS AppIcon Set
    ios_sizes = [
        ("AppIcon-20x20@1x.png", 20),
        ("AppIcon-20x20@2x.png", 40),
        ("AppIcon-20x20@3x.png", 60),
        ("AppIcon-29x29@1x.png", 29),
        ("AppIcon-29x29@2x.png", 58),
        ("AppIcon-29x29@3x.png", 87),
        ("AppIcon-40x40@1x.png", 40),
        ("AppIcon-40x40@2x.png", 80),
        ("AppIcon-40x40@3x.png", 120),
        ("AppIcon-60x60@2x.png", 120),
        ("AppIcon-60x60@3x.png", 180),
        ("AppIcon-76x76@1x.png", 76),
        ("AppIcon-76x76@2x.png", 152),
        ("AppIcon-83.5x83.5@2x.png", 167),
        ("AppIcon-512@2x.png", 1024)
    ]
    for fname, sz in ios_sizes:
        run_cmd(f"convert {src_icon} -resize {sz}x{sz}! ios/App/App/Assets.xcassets/AppIcon.appiconset/{fname}")

    # Contents.json for iOS
    contents_json = {
        "images": [
            {"size": "20x20", "idiom": "iphone", "filename": "AppIcon-20x20@2x.png", "scale": "2x"},
            {"size": "20x20", "idiom": "iphone", "filename": "AppIcon-20x20@3x.png", "scale": "3x"},
            {"size": "29x29", "idiom": "iphone", "filename": "AppIcon-29x29@2x.png", "scale": "2x"},
            {"size": "29x29", "idiom": "iphone", "filename": "AppIcon-29x29@3x.png", "scale": "3x"},
            {"size": "40x40", "idiom": "iphone", "filename": "AppIcon-40x40@2x.png", "scale": "2x"},
            {"size": "40x40", "idiom": "iphone", "filename": "AppIcon-40x40@3x.png", "scale": "3x"},
            {"size": "60x60", "idiom": "iphone", "filename": "AppIcon-60x60@2x.png", "scale": "2x"},
            {"size": "60x60", "idiom": "iphone", "filename": "AppIcon-60x60@3x.png", "scale": "3x"},
            {"size": "1024x1024", "idiom": "ios-marketing", "filename": "AppIcon-512@2x.png", "scale": "1x"}
        ],
        "info": {"version": 1, "author": "xcode"}
    }
    with open("ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json", "w", encoding="utf-8") as f:
        json.dump(contents_json, f, indent=2)

    # Copy resources
    run_cmd(f"cp {src_icon} resources/icon.png")

    print("✨ All mobile app icon assets generated successfully without white borders!")

if __name__ == "__main__":
    main()
