import { useEffect, useRef } from 'react';
import { attachBanner, BannerHandle } from '../utils/ads';

export function BannerAd({ style }: { style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<BannerHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;
    attachBanner(containerRef.current).then((h) => {
      if (cancelled) {
        h?.destroy();
        return;
      }
      handleRef.current = h;
    });
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  return (
    <div className="banner-wrapper" style={style}>
      <div ref={containerRef} className="banner-container">
        <div className="banner-fallback">
          <span className="ad-tag">AD</span>
          <span className="ad-text">광고 영역</span>
        </div>
      </div>
    </div>
  );
}
