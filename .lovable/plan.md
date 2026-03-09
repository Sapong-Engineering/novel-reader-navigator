

# Add @capacitor/splash-screen with Programmatic Hiding

## Changes

1. **Install `@capacitor/splash-screen`** package

2. **Update `capacitor.config.ts`** — Set `launchAutoHide: false` so the splash screen stays visible until we explicitly dismiss it

3. **Update `src/main.tsx`** — After React renders, call `SplashScreen.hide()`. Use a small delay or `requestIdleCallback` to ensure the first paint is complete.

4. **Update `src/pages/Index.tsx`** — Add a secondary `SplashScreen.hide()` call after the library data loads (sync completes), as a fallback in case the user lands directly on the index page. This ensures the splash hides once real content is ready.

5. **Create `src/lib/splash.ts`** — A small utility that wraps `SplashScreen.hide()` with a guard so it only fires once and gracefully no-ops in the browser (non-Capacitor) environment.

## Flow

```text
App launches → Capacitor shows splash (autoHide OFF)
  → React mounts, first render completes
    → splash.ts hide() called → splash fades out
```

The splash stays visible during the white-screen bootstrap phase and hides once the UI is actually painted.

