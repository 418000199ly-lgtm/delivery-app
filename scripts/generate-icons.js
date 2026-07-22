import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const LOGO_SOURCE = 'src/assets/images/hwdj_launcher_icon_1784366761434.jpg';
const DARK_BG_COLOR = 0x03050cff; // Splash background color (#03050c)
const WHITE_COLOR = 0xffffffff;   // Launcher icon background color (#ffffff)
const TRANSPARENT_COLOR = 0x00000000;

function ensureDirExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function makeCircular(image) {
  const radius = image.width / 2;
  const cx = image.width / 2;
  const cy = image.height / 2;
  for (let x = 0; x < image.width; x++) {
    for (let y = 0; y < image.height; y++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > radius * radius) {
        image.setPixelColor(TRANSPARENT_COLOR, x, y);
      }
    }
  }
}

async function generate() {
  console.log('--- Generating Android Icons and Splash Screen Assets ---');
  
  if (!fs.existsSync(LOGO_SOURCE)) {
    console.error(`Error: Source logo image not found at ${LOGO_SOURCE}`);
    process.exit(1);
  }

  const baseLogo = await Jimp.read(LOGO_SOURCE);
  console.log(`Source logo loaded successfully: ${baseLogo.width}x${baseLogo.height}`);

  // Classic MIPMAP icon sizes
  const mipmapSizes = [
    { name: 'mdpi', size: 48 },
    { name: 'hdpi', size: 72 },
    { name: 'xhdpi', size: 96 },
    { name: 'xxhdpi', size: 144 },
    { name: 'xxxhdpi', size: 192 }
  ];

  // Adaptive icon foreground sizes (108dp base)
  const adaptiveSizes = [
    { name: 'mdpi', size: 108 },
    { name: 'hdpi', size: 162 },
    { name: 'xhdpi', size: 216 },
    { name: 'xxhdpi', size: 324 },
    { name: 'xxxhdpi', size: 432 }
  ];

  // 1. Generate Classic Square Icons
  console.log('Generating classic square launcher icons...');
  for (const item of mipmapSizes) {
    const destPath = `android/app/src/main/res/mipmap-${item.name}/ic_launcher.png`;
    ensureDirExists(destPath);
    const canvas = new Jimp({ width: item.size, height: item.size, color: WHITE_COLOR });
    const logoSize = Math.round(item.size * 0.85);
    const scaledLogo = baseLogo.clone().resize({ w: logoSize, h: logoSize });
    const offset = Math.round((item.size - logoSize) / 2);
    canvas.composite(scaledLogo, offset, offset);
    await canvas.write(destPath);
  }

  // 2. Generate Classic Round Icons
  console.log('Generating classic round launcher icons...');
  for (const item of mipmapSizes) {
    const destPath = `android/app/src/main/res/mipmap-${item.name}/ic_launcher_round.png`;
    ensureDirExists(destPath);
    const canvas = new Jimp({ width: item.size, height: item.size, color: WHITE_COLOR });
    makeCircular(canvas);
    const logoSize = Math.round(item.size * 0.80);
    const scaledLogo = baseLogo.clone().resize({ w: logoSize, h: logoSize });
    const offset = Math.round((item.size - logoSize) / 2);
    canvas.composite(scaledLogo, offset, offset);
    await canvas.write(destPath);
  }

  // 3. Generate Adaptive Foreground Icons
  console.log('Generating adaptive foreground icons...');
  for (const item of adaptiveSizes) {
    const destPath = `android/app/src/main/res/mipmap-${item.name}/ic_launcher_foreground.png`;
    ensureDirExists(destPath);
    const canvas = new Jimp({ width: item.size, height: item.size, color: TRANSPARENT_COLOR });
    const logoSize = Math.round(item.size * 0.65);
    const scaledLogo = baseLogo.clone().resize({ w: logoSize, h: logoSize });
    const offset = Math.round((item.size - logoSize) / 2);
    canvas.composite(scaledLogo, offset, offset);
    await canvas.write(destPath);
  }

  // Splash Screen Sizes
  const splashSizes = [
    { path: 'android/app/src/main/res/drawable/splash.png', w: 2732, h: 2732 },
    { path: 'android/app/src/main/res/drawable-port-mdpi/splash.png', w: 320, h: 480 },
    { path: 'android/app/src/main/res/drawable-port-hdpi/splash.png', w: 480, h: 800 },
    { path: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', w: 720, h: 1280 },
    { path: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', w: 960, h: 1600 },
    { path: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920 },
    { path: 'android/app/src/main/res/drawable-land-mdpi/splash.png', w: 480, h: 320 },
    { path: 'android/app/src/main/res/drawable-land-hdpi/splash.png', w: 800, h: 480 },
    { path: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', w: 1280, h: 720 },
    { path: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', w: 1600, h: 960 },
    { path: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280 }
  ];

  // 4. Generate Splash Screens (Android & iOS)
  console.log('Generating splash screen images...');
  for (const item of splashSizes) {
    ensureDirExists(item.path);
    const canvas = new Jimp({ width: item.w, height: item.h, color: DARK_BG_COLOR });
    const minDim = Math.min(item.w, item.h);
    const logoSize = Math.round(minDim * 0.25);
    const scaledLogo = baseLogo.clone().resize({ w: logoSize, h: logoSize });
    const offsetX = Math.round((item.w - logoSize) / 2);
    const offsetY = Math.round((item.h - logoSize) / 2);
    canvas.composite(scaledLogo, offsetX, offsetY);
    await canvas.write(item.path);
  }

  // 5. Generate iOS AppIcon & Splash Screen Assets
  console.log('Generating iOS AppIcon & Splash assets...');
  const iosIconDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  const iosSplashDir = 'ios/App/App/Assets.xcassets/Splash.imageset';

  // Make 1024x1024 iOS Marketing Icon & AppIcon
  const iosIconSizes = [
    { name: 'AppIcon-20x20@2x.png', size: 40 },
    { name: 'AppIcon-20x20@3x.png', size: 60 },
    { name: 'AppIcon-29x29@2x.png', size: 58 },
    { name: 'AppIcon-29x29@3x.png', size: 87 },
    { name: 'AppIcon-40x40@2x.png', size: 80 },
    { name: 'AppIcon-40x40@3x.png', size: 120 },
    { name: 'AppIcon-60x60@2x.png', size: 120 },
    { name: 'AppIcon-60x60@3x.png', size: 180 },
    { name: 'AppIcon-76x76@2x.png', size: 152 },
    { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
    { name: 'AppIcon-1024.png', size: 1024 },
    { name: 'AppIcon-512@2x.png', size: 1024 }
  ];

  for (const item of iosIconSizes) {
    const destPath = path.join(iosIconDir, item.name);
    ensureDirExists(destPath);
    const canvas = new Jimp({ width: item.size, height: item.size, color: WHITE_COLOR });
    const logoSize = Math.round(item.size * 0.85);
    const scaledLogo = baseLogo.clone().resize({ w: logoSize, h: logoSize });
    const offset = Math.round((item.size - logoSize) / 2);
    canvas.composite(scaledLogo, offset, offset);
    await canvas.write(destPath);
  }

  // Create iOS AppIcon Contents.json
  const iosAppIconContents = {
    images: [
      { size: "20x20", idiom: "iphone", filename: "AppIcon-20x20@2x.png", scale: "2x" },
      { size: "20x20", idiom: "iphone", filename: "AppIcon-20x20@3x.png", scale: "3x" },
      { size: "29x29", idiom: "iphone", filename: "AppIcon-29x29@2x.png", scale: "2x" },
      { size: "29x29", idiom: "iphone", filename: "AppIcon-29x29@3x.png", scale: "3x" },
      { size: "40x40", idiom: "iphone", filename: "AppIcon-40x40@2x.png", scale: "2x" },
      { size: "40x40", idiom: "iphone", filename: "AppIcon-40x40@3x.png", scale: "3x" },
      { size: "60x60", idiom: "iphone", filename: "AppIcon-60x60@2x.png", scale: "2x" },
      { size: "60x60", idiom: "iphone", filename: "AppIcon-60x60@3x.png", scale: "3x" },
      { size: "20x20", idiom: "ipad", filename: "AppIcon-20x20@2x.png", scale: "2x" },
      { size: "29x29", idiom: "ipad", filename: "AppIcon-29x29@2x.png", scale: "2x" },
      { size: "40x40", idiom: "ipad", filename: "AppIcon-40x40@2x.png", scale: "2x" },
      { size: "76x76", idiom: "ipad", filename: "AppIcon-76x76@2x.png", scale: "2x" },
      { size: "83.5x83.5", idiom: "ipad", filename: "AppIcon-83.5x83.5@2x.png", scale: "2x" },
      { size: "1024x1024", idiom: "ios-marketing", filename: "AppIcon-1024.png", scale: "1x" },
      { size: "1024x1024", idiom: "universal", platform: "ios", filename: "AppIcon-512@2x.png" }
    ],
    info: { author: "xcode", version: 1 }
  };
  fs.writeFileSync(path.join(iosIconDir, 'Contents.json'), JSON.stringify(iosAppIconContents, null, 2), 'utf8');

  // Generate iOS Splash images
  const iosSplashFiles = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'];
  for (const sFile of iosSplashFiles) {
    const destPath = path.join(iosSplashDir, sFile);
    ensureDirExists(destPath);
    const canvas = new Jimp({ width: 2732, height: 2732, color: DARK_BG_COLOR });
    const logoSize = Math.round(2732 * 0.25);
    const scaledLogo = baseLogo.clone().resize({ w: logoSize, h: logoSize });
    const offset = Math.round((2732 - logoSize) / 2);
    canvas.composite(scaledLogo, offset, offset);
    await canvas.write(destPath);
  }

  // Create iOS Splash Contents.json
  const iosSplashContents = {
    images: [
      { idiom: "universal", filename: "splash-2732x2732.png", scale: "1x" },
      { idiom: "universal", filename: "splash-2732x2732-1.png", scale: "2x" },
      { idiom: "universal", filename: "splash-2732x2732-2.png", scale: "3x" }
    ],
    info: { author: "xcode", version: 1 }
  };
  fs.writeFileSync(path.join(iosSplashDir, 'Contents.json'), JSON.stringify(iosSplashContents, null, 2), 'utf8');

  // Ensure colors.xml is up to date with correct adaptive background
  const colorsXmlPath = 'android/app/src/main/res/values/colors.xml';
  ensureDirExists(colorsXmlPath);
  const colorsXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#03050c</color>
    <color name="colorPrimaryDark">#000000</color>
    <color name="colorAccent">#ff7d00</color>
    <color name="ic_launcher_background">#ffffff</color>
</resources>
`;
  fs.writeFileSync(colorsXmlPath, colorsXmlContent, 'utf8');

  console.log('--- All assets generated successfully! ---');
}

generate().catch(err => {
  console.error('Error during asset generation:', err);
  process.exit(1);
});
