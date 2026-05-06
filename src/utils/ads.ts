import * as AppsInToss from '@apps-in-toss/web-framework';

export const IS_AD_PRODUCTION = true;

export const AD_GROUP = {
  BANNER: 'ait.v2.live.ac4bad23a1d043f6',
  REWARDED: 'ait.v2.live.9e6990b873b5409c',
};

const ait = AppsInToss as any;

function isAitAvailable(): boolean {
  return (
    IS_AD_PRODUCTION &&
    typeof window !== 'undefined' &&
    typeof ait?.showFullScreenAd === 'function'
  );
}

export async function showRewardedAd(): Promise<boolean> {
  if (!isAitAvailable()) {
    console.log('[ads] dev mode - 3s fallback');
    await new Promise((r) => setTimeout(r, 3000));
    return true;
  }
  return new Promise<boolean>((resolve) => {
    let earned = false;
    try {
      ait.showFullScreenAd({
        options: { adGroupId: AD_GROUP.REWARDED },
        onEvent: (event: any) => {
          console.log('[ads]', event.type);
          if (event.type === 'userEarnedReward') earned = true;
          if (event.type === 'dismissed') resolve(earned);
          if (event.type === 'failedToShow') resolve(false);
        },
        onError: (err: any) => {
          console.error('[ads] error', err);
          resolve(false);
        },
      });
    } catch (e) {
      console.error('[ads] exception', e);
      resolve(false);
    }
  });
}

export function preloadRewardedAd(): void {
  if (!isAitAvailable() || typeof ait?.loadFullScreenAd !== 'function') return;
  try {
    ait.loadFullScreenAd({
      options: { adGroupId: AD_GROUP.REWARDED },
      onEvent: (event: any) => {
        if (event.type === 'loaded') console.log('[ads] preloaded');
      },
    });
  } catch (e) {
    console.error('[ads] preload error', e);
  }
}

// ============ 배너 광고 ============

let tossAdsInitialized = false;
let tossAdsInitializing = false;
const initCallbacks: Array<() => void> = [];

function getTossAds(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).TossAds || null;
}

export function initTossAds(): Promise<boolean> {
  return new Promise((resolve) => {
    if (tossAdsInitialized) {
      resolve(true);
      return;
    }
    const TossAds = getTossAds();
    if (!TossAds || typeof TossAds.initialize !== 'function') {
      console.log('[banner] TossAds SDK not available');
      resolve(false);
      return;
    }
    if (typeof TossAds.initialize.isSupported === 'function' && !TossAds.initialize.isSupported()) {
      console.log('[banner] TossAds.initialize not supported');
      resolve(false);
      return;
    }
    if (tossAdsInitializing) {
      initCallbacks.push(() => resolve(true));
      return;
    }
    tossAdsInitializing = true;
    try {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            console.log('[banner] TossAds initialized');
            tossAdsInitialized = true;
            tossAdsInitializing = false;
            initCallbacks.forEach((cb) => cb());
            initCallbacks.length = 0;
            resolve(true);
          },
          onInitializationFailed: (err: any) => {
            console.error('[banner] init failed', err);
            tossAdsInitializing = false;
            resolve(false);
          },
        },
      });
    } catch (e) {
      console.error('[banner] init exception', e);
      tossAdsInitializing = false;
      resolve(false);
    }
  });
}

export interface BannerHandle {
  destroy: () => void;
}

export async function attachBanner(container: HTMLElement): Promise<BannerHandle | null> {
  const ok = await initTossAds();
  if (!ok) return null;
  const TossAds = getTossAds();
  if (!TossAds || typeof TossAds.attachBanner !== 'function') return null;
  try {
    const result = TossAds.attachBanner(AD_GROUP.BANNER, container, {
      theme: 'dark',
      tone: 'colorful',
      variant: 'expanded',
      callbacks: {
        onAdRendered: () => {
          console.log('[banner] rendered');
          container.classList.add('banner-shown');
        },
        onAdImpression: () => console.log('[banner] impression'),
        onAdClicked: () => console.log('[banner] clicked'),
        onNoFill: () => {
          console.log('[banner] no fill');
          container.classList.remove('banner-shown');
        },
        onAdFailedToRender: (err: any) => {
          console.error('[banner] render failed', err);
          container.classList.remove('banner-shown');
        },
      },
    });
    if (result && typeof result.destroy === 'function') {
      return { destroy: () => result.destroy() };
    }
    return { destroy: () => {} };
  } catch (e) {
    console.error('[banner] attach exception', e);
    return null;
  }
}
