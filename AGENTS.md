# Project Guidelines & GitHub Sync Commit Conventions

## GitHub Sync Commit Messages
When the user asks to sync/push code to GitHub or requests "What changes did you make?", ALWAYS provide a clear, ready-to-copy commit message for the AI Studio "What changes did you make?" box.

### Standard Format for Commit Message:
```text
feat(mobile & deploy): auto-generate mobile icons, fix GitHub Actions npm peer dependency conflict, update PWA manifest & Baota deployment packages
```

## Mobile & Packaging Rules
1. App Icon: `hwdjtb.png` is the standard lossless 1024x1024 full-bleed icon stored locally in `public/hwdjtb.png` and `src/assets/images/hwdjtb.png`.
2. Mobile Assets Script: `python3 scripts/generate_mobile_assets.py` auto-scales icons for Android (`res/mipmap-*`), iOS (`Assets.xcassets`), and PWA (`public/icons/`).
3. GitHub Actions: `.github/workflows/build-mobile.yml` builds Android APK and Web/Baota deployment artifacts automatically on push using `npm ci --legacy-peer-deps`.
