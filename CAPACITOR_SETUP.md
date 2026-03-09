# Capacitor Native App Setup Guide

This guide walks you through building and publishing **NovelNav** as a native app for iOS (Apple App Store) and Android (Google Play Store) using Capacitor.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Environment Setup](#local-environment-setup)
3. [Adding Native Platforms](#adding-native-platforms)
4. [Generating App Icons & Splash Screens](#generating-app-icons--splash-screens)
5. [Development Workflow](#development-workflow)
6. [Building for Production](#building-for-production)
7. [iOS App Store Submission](#ios-app-store-submission)
8. [Google Play Store Submission](#google-play-store-submission)
9. [Capacitor Config Reference](#capacitor-config-reference)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### General

- **Node.js** ≥ 18
- **npm** ≥ 9
- A GitHub account (to export and clone the project)

### iOS

- **macOS** (required — iOS builds only work on Mac)
- **Xcode** ≥ 15 (install from Mac App Store)
- **Xcode Command Line Tools**: `xcode-select --install`
- **CocoaPods**: `sudo gem install cocoapods`
- **Apple Developer Account** ($99/year) — required for App Store submission

### Android

- **Android Studio** (latest stable) — [download](https://developer.android.com/studio)
- **Android SDK** ≥ API 22 (Android 5.1+)
- **Java JDK** ≥ 17
- **Google Play Developer Account** ($25 one-time) — required for Play Store submission

---

## Local Environment Setup

### 1. Export & Clone the Project

1. In Lovable, go to **Settings → GitHub** and click **Export to GitHub**
2. Clone your repo locally:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify the Build

```bash
npm run build
```

This creates the `dist/` folder that Capacitor will bundle into the native app.

---

## Adding Native Platforms

### Add iOS

```bash
npx cap add ios
```

This creates an `ios/` directory with a full Xcode project.

### Add Android

```bash
npx cap add android
```

This creates an `android/` directory with a full Android Studio project.

### Sync Web Assets to Native

After every build, sync your web code into the native projects:

```bash
npm run build
npx cap sync
```

---

## Generating App Icons & Splash Screens

Source assets are pre-configured in the `resources/` directory:

| File | Purpose |
|------|---------|
| `resources/icon.png` | App icon (512×512, used as source for all sizes) |
| `resources/splash.png` | Splash screen — light mode |
| `resources/splash-dark.png` | Splash screen — dark mode |

### Generate All Sizes

```bash
npx capacitor-assets generate
```

This automatically generates:

**iOS Icons:**
- 20px, 29px, 40px, 58px, 60px, 76px, 80px, 87px, 120px, 152px, 167px, 180px, 1024px

**Android Icons:**
- mdpi (48px), hdpi (72px), xhdpi (96px), xxhdpi (144px), xxxhdpi (192px), Play Store (512px)

**Splash Screens:**
- All required sizes for both platforms, light and dark variants

---

## Development Workflow

### Live Reload (Recommended for Development)

The `capacitor.config.ts` is pre-configured with a live-reload server URL pointing to the Lovable preview. This means during development, the native app loads content directly from the Lovable sandbox — so changes appear instantly without rebuilding.

Simply run:

```bash
# iOS
npx cap run ios

# Android
npx cap run android
```

> **Note:** Your development device must be on the same network or have internet access to reach the preview URL.

### Running on a Physical Device

**iOS:**
1. Open the project in Xcode: `npx cap open ios`
2. Select your device in the device dropdown
3. Click the Run button (▶)
4. You may need to configure signing in Xcode under **Signing & Capabilities**

**Android:**
1. Open the project in Android Studio: `npx cap open android`
2. Enable **USB Debugging** on your Android device (Settings → Developer Options)
3. Select your device and click Run (▶)

### Running on an Emulator

**iOS Simulator:**
```bash
npx cap run ios --target "iPhone 15"
```

**Android Emulator:**
1. Open Android Studio → **Device Manager** → Create a virtual device
2. Run:
```bash
npx cap run android
```

---

## Building for Production

> **Important:** Before building for production, remove the `server` block from `capacitor.config.ts` so the app uses the bundled `dist/` folder instead of the live-reload URL.

### 1. Update `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.85eb9eef4af846689a48faf34d9b198f',
  appName: 'novelnav',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#f5f0eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
```

### 2. Build & Sync

```bash
npm run build
npx cap sync
```

### 3. Build Release Versions

**iOS (Xcode):**
1. `npx cap open ios`
2. Set the scheme to **Release**
3. Select **Any iOS Device** as the target
4. Go to **Product → Archive**
5. In the Organizer, click **Distribute App**

**Android (Android Studio):**
1. `npx cap open android`
2. Go to **Build → Generate Signed Bundle / APK**
3. Choose **Android App Bundle (AAB)** for Play Store
4. Create or select a keystore, fill in credentials
5. Select **release** build variant
6. Click **Finish**

---

## iOS App Store Submission

### Checklist

- [ ] Apple Developer Program membership active
- [ ] App icon (1024×1024) — generated via `capacitor-assets`
- [ ] Screenshots for required device sizes (6.7", 6.5", 5.5" iPhones; iPad Pro)
- [ ] App description, keywords, and category
- [ ] Privacy policy URL
- [ ] Support URL

### Steps

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps → + → New App**
3. Fill in app details:
   - **Name:** NovelNav
   - **Bundle ID:** `app.lovable.85eb9eef4af846689a48faf34d9b198f`
   - **SKU:** `novelnav-001`
4. Upload your archive from Xcode (Product → Archive → Distribute)
5. Fill in metadata, upload screenshots
6. Submit for review (typically 24–48 hours)

### App Review Tips

- Ensure the app works fully offline (PWA features help here)
- Include a demo account if login is required
- Provide clear app description explaining functionality
- Make sure no placeholder content remains

---

## Google Play Store Submission

### Checklist

- [ ] Google Play Developer account active
- [ ] Signed AAB (Android App Bundle)
- [ ] App icon (512×512) — generated via `capacitor-assets`
- [ ] Feature graphic (1024×500)
- [ ] Screenshots (phone + optional tablet)
- [ ] App description (short + full)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire completed

### Steps

1. Log in to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in app details:
   - **App name:** NovelNav
   - **Default language:** English
   - **App type:** App
   - **Free or Paid:** Free
4. Complete the **Dashboard setup tasks**:
   - Store listing (description, screenshots, graphics)
   - Content rating
   - Target audience
   - Privacy policy
5. Go to **Production → Create new release**
6. Upload the signed AAB
7. Review and roll out

### Signing

For Play Store, you'll need a **keystore**:

```bash
keytool -genkey -v -keystore novelnav-release.keystore -alias novelnav -keyalg RSA -keysize 2048 -validity 10000
```

> **Keep your keystore file safe!** You cannot update your app without it.

---

## Capacitor Config Reference

| Property | Value | Description |
|----------|-------|-------------|
| `appId` | `app.lovable.85eb9eef4af846689a48faf34d9b198f` | Unique app identifier for stores |
| `appName` | `novelnav` | Display name of the app |
| `webDir` | `dist` | Directory containing the built web app |
| `server.url` | Lovable preview URL | Live-reload URL (remove for production) |
| `server.cleartext` | `true` | Allow HTTP connections (development only) |
| `SplashScreen.launchShowDuration` | `2000` | Splash screen display time (ms) |
| `SplashScreen.launchFadeOutDuration` | `500` | Fade-out animation duration (ms) |
| `SplashScreen.backgroundColor` | `#f5f0eb` | Splash screen background color |

---

## Troubleshooting

### "Pod install failed" (iOS)

```bash
cd ios/App
pod install --repo-update
cd ../..
```

### "SDK not found" (Android)

Open Android Studio → **SDK Manager** → install the required SDK version (API 22+).

### App shows blank white screen

- Make sure you ran `npm run build && npx cap sync`
- Check that `webDir` in `capacitor.config.ts` points to `dist`
- If using live-reload, verify the preview URL is accessible

### Changes not appearing in the native app

```bash
npm run build
npx cap sync
npx cap run ios  # or android
```

Always run `cap sync` after pulling new changes from GitHub.

### Splash screen not showing

- Ensure `resources/splash.png` exists before running `npx capacitor-assets generate`
- Run `npx cap sync` after generating assets

### Live reload not connecting

- Ensure your device has internet access
- Check that the `server.url` in `capacitor.config.ts` is correct
- For physical devices, ensure they can reach the Lovable preview URL

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build the web app to `dist/` |
| `npx cap sync` | Sync web assets + plugins to native projects |
| `npx cap run ios` | Build and run on iOS device/simulator |
| `npx cap run android` | Build and run on Android device/emulator |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap open android` | Open Android project in Android Studio |
| `npx capacitor-assets generate` | Generate all icon and splash screen sizes |
| `npx cap doctor` | Diagnose common Capacitor issues |

---

## Further Reading

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Lovable Mobile Development Guide](https://docs.lovable.dev/tips-tricks/mobile-development)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Launch Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)
