#!/usr/bin/env python3
import os
import sys
import subprocess
import json
import shutil

# Ensure Pillow or fallback
PIL_AVAILABLE = False
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    print("Pillow not found, attempting to install Pillow...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "Pillow", "--quiet"], check=False)
        from PIL import Image
        PIL_AVAILABLE = True
    except Exception as e:
        print(f"Notice: Pillow install skipped ({e}). Will check for system image tools.")

def resize_image(src_path, dst_path, width, height):
    if PIL_AVAILABLE:
        try:
            with Image.open(src_path) as img:
                img = img.convert("RGBA")
                resized = img.resize((width, height), Image.LANCZOS)
                # Save as PNG or JPG based on extension
                if dst_path.endswith('.ico'):
                    resized.save(dst_path, format='ICO', sizes=[(width, height)])
                else:
                    resized.save(dst_path)
            return True
        except Exception as err:
            print(f"Pillow resize failed for {dst_path}: {err}, trying convert command...")

    # Fallback to convert CLI if available
    cmd = f"convert {src_path} -resize {width}x{height}! {dst_path}"
    try:
        subprocess.run(cmd, shell=True, check=True)
        return True
    except Exception as err:
        print(f"Warning: Failed to resize {dst_path} via convert: {err}")
        # As last resort, copy original file
        try:
            shutil.copy(src_path, dst_path)
        except Exception:
            pass
        return False

def main():
    print("🚀 Starting Mobile App Icon & Asset Generation for iOS and Android...")
    
    # Source image
    src_icon = "public/hwdjtb.png"
    if not os.path.exists(src_icon):
        src_icon = "src/assets/images/hwdjtb.png"
        
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
        resize_image(src_icon, out_path, sz, sz)

    # Apple Touch Icon & Favicon
    resize_image(src_icon, "public/apple-touch-icon.png", 180, 180)
    resize_image(src_icon, "public/favicon.ico", 64, 64)
    shutil.copy(src_icon, "public/icon.png")

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
        resize_image(src_icon, f"android/app/src/main/res/{folder}/ic_launcher.png", sz, sz)
        # Round launcher icon
        resize_image(src_icon, f"android/app/src/main/res/{folder}/ic_launcher_round.png", sz, sz)
        # Foreground adaptive icon
        resize_image(src_icon, f"android/app/src/main/res/{folder}/ic_launcher_foreground.png", sz, sz)

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
        resize_image(src_icon, f"ios/App/App/Assets.xcassets/AppIcon.appiconset/{fname}", sz, sz)

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
    shutil.copy(src_icon, "resources/icon.png")

    print("✨ All mobile app icon assets generated successfully without white borders!")

if __name__ == "__main__":
    main()
