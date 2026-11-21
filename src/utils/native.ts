import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { ThemeMode } from '../types/study';

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function syncNativeSystemUI(theme: ThemeMode): Promise<void> {
  if (!isNativeAndroid()) return;
  const isDark = theme === 'dark';
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: isDark ? '#080D1A' : '#F4F6FB' });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch {
    // Ignore native StatusBar errors on unsupported OS versions
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await SplashScreen.hide();
  } catch {
    // Ignore if splash screen already hidden
  }
}
