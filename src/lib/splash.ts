import { SplashScreen } from '@capacitor/splash-screen';

let hidden = false;

export async function hideSplash(): Promise<void> {
  if (hidden) return;
  hidden = true;
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Not running in Capacitor — no-op
  }
}
