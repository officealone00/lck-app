# LCK 앱 자동 데이터 갱신 시스템

## 📦 이 패키지에 포함된 것

```
lck-real-data/
├── scraper/
│   └── scrape.js                    (gol.gg 스크래퍼)
├── .github/workflows/
│   └── scrape.yml                   (GitHub Actions cron)
├── public/data/
│   ├── standings.json               (시드 데이터)
│   ├── faker.json
│   ├── meta.json
│   ├── matches.json
│   └── updated.json
└── src/
    ├── App.tsx                      (fetch 사용으로 변경됨)
    └── utils/
        ├── api.ts                   (jsdelivr CDN + 재시도 + 폴백)
        └── fallback.ts              (네트워크 실패 시 폴백 데이터)
```

## 🚀 적용 방법

### 1. 압축 해제 → `C:\Users\Lee\lck-app\`에 통째로 복사

zip 풀고 안의 파일/폴더를 lck-app 폴더에 그대로 드래그.
- `scraper/`, `.github/`, `public/`, `src/` 폴더가 lck-app에 추가/덮어쓰기됨
- 덮어쓰기 다 "예"

### 2. 빌드 + 푸시

```cmd
cd C:\Users\Lee\lck-app
npm run build
git add .
git commit -m "실시간 데이터 자동 갱신 시스템"
git push
```

### 3. GitHub Actions 자동 실행 확인

```
https://github.com/officealone00/lck-app/actions
```

`Scrape LCK Data` 워크플로우가 보임. **수동 실행** 버튼 (Run workflow)으로 즉시 테스트.

성공하면:
- public/data/*.json 파일이 자동 업데이트되어 커밋됨
- jsdelivr CDN에 5~10분 후 반영
- 앱이 그 데이터를 fetch해서 화면에 표시

### 4. 자동 스케줄

매일 **KST 01:00** (UTC 16:00)에 자동 실행. 코드 수정 안 해도 매일 알아서 갱신됨.

### 5. 콘솔 새 빌드 등록

`lck-app.ait` 파일을 콘솔에 새 버전으로 업로드.

## ⚙️ 시즌 변경 시

`scraper/scrape.js` 맨 위 두 줄만 수정:

```javascript
const TOURNAMENT_SLUG = 'LCK%202026%20Rounds%201-2';
const TOURNAMENT_DISPLAY = 'LCK 2026 Rounds 1-2';
```

→ 다음 스플릿/플옵 시작하면 슬러그만 바꿔서 push.

## 📊 데이터 흐름

```
gol.gg (소스)
   ↓
scraper/scrape.js (Node.js)
   ↓
public/data/*.json (자동 commit)
   ↓
jsdelivr CDN (5~10분 캐시)
   ↓
App.tsx (api.standings() 호출)
   ↓
화면 자동 업데이트 ✅
```

## 🛡️ 안정성

- 스크래핑 실패해도 **기존 JSON 유지** (덮어쓰기 안 함)
- 네트워크 실패해도 **내장 폴백** 사용 (빈 화면 X)
- jsdelivr 장애 시 **raw.githubusercontent** 자동 시도
- 8초 타임아웃 + 3회 재시도

## 🔍 폰에서 확인하는 법

1. 앱 처음 켤 때: 폴백 데이터 0.1초 보임
2. 잠시 후 (1~3초): 실제 데이터로 자동 갱신
3. 콘솔 로그: `[api] jsdelivr 시도 1 실패` 같은 로그가 보이면 폴백 동작중
