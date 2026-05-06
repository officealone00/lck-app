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
