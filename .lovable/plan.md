

# Native Mobile App Deployment with Capacitor

This plan sets up Capacitor so you can build and publish your Novel Reader app to the Apple App Store and Google Play Store.

## What will change

1. **Install Capacitor dependencies** — `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`

2. **Initialize Capacitor** — Run `npx cap init` and configure `capacitor.config.ts` with:
   - `appId`: `app.lovable.85eb9eef4af846689a48faf34d9b198f`
   - `appName`: `novelnav`
   - `webDir`: `dist`
   - Live-reload server pointing to the sandbox preview URL for development

3. **No code changes needed** — The app is already a PWA with proper viewport meta tags, icons, and mobile-friendly UI. Capacitor wraps the existing web app as-is.

## Steps you'll need to do locally

After I make the changes, you'll need to:

1. **Export to GitHub** via Settings → GitHub, then clone and pull the repo
2. Run `npm install`
3. Add platforms:
   - `npx cap add ios` (requires Mac with Xcode)
   - `npx cap add android` (requires Android Studio)
4. Run `npm run build` then `npx cap sync`
5. Run `npx cap run ios` or `npx cap run android` to test on emulator/device
6. For store submission, build release versions through Xcode (iOS) or Android Studio (Android)

## Requirements for store submission

- **Apple App Store**: Apple Developer account ($99/year), Mac with Xcode, app icons and screenshots
- **Google Play Store**: Google Play Developer account ($25 one-time), signed APK/AAB

## Reference

For a detailed walkthrough, see the Lovable docs on native mobile development.

