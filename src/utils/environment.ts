export type BrowserType = 'instagram' | 'facebook' | 'ios_webview' | 'other';

export const detectInAppBrowser = (): { isInApp: boolean, browserType: BrowserType } => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;

  const isInstagram = ua.indexOf('Instagram') > -1;
  const isFacebook = ua.indexOf('FBAN') > -1 || ua.indexOf('FBAV') > -1;
  
  // Generic check for iOS WebView that isn't Safari itself
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIosWebView = isIos && !isSafari;

  if (isInstagram) return { isInApp: true, browserType: 'instagram' };
  if (isFacebook) return { isInApp: true, browserType: 'facebook' };
  if (isIosWebView) return { isInApp: true, browserType: 'ios_webview' };

  return { isInApp: false, browserType: 'other' };
};