import { defineConfig } from '@apps-in-toss/web-framework/config';

// SDK 3.8 설정 (2026-10-18)
// - 자체 헤더/뒤로가기 없이 토스 내비게이션 바의 뒤로가기만 사용해요.
export default defineConfig({
  appName: 'lck-app',
  brand: {
    primaryColor: '#F0C674',
  },
  navigationBar: {
    withBackButton: true,
  },
  permissions: [],
  webBundleDir: 'dist',
});
