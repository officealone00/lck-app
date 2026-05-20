# LCK 앱 v4 패치 - 데이터 정합성 수정

## 진단 요약

### 마지막 자동 갱신: 2026-05-09 22:05 KST (= 12일 전)

`public/data/updated.json`에 박혀있는 시각 → 그 사이 GitHub Actions가 한 번도 안 돌았거나, 돌긴 했는데 commit이 실패함.

### 데이터별 출처

| 데이터 | 출처 | 자동 여부 |
|---|---|---|
| standings | Riot lolesports API | ✅ (KST 02:00 cron) |
| matches | Riot lolesports API | ✅ (KST 02:00 cron) |
| **players** | **없음 - fallback.ts에 직접 박힘** | ❌ **수동** |
| faker | 없음 - 수동 | ❌ 수동 |
| meta | 없음 - 수동 | ❌ 수동 |

### 왜 화면이 거짓말했나

1. **선수 포인트 (Chovy 600P vs 실제 700P)** : players는 애초에 자동 스크래퍼가 없음. fallback이 5/9에서 멈춤.
2. **"2일 후 BFX vs HLE"** : 스크래퍼가 `"오늘/내일/N일 후"` 같은 **상대 라벨**로 저장했는데, GitHub Actions가 멈추니까 옛 라벨이 그대로 굳어버림.

---

## 변경 내역 (v4)

### 1. `scraper/scrape.js`
- 매치 일정 저장 형식: `"오늘/내일/N일 후"` → `"5/21(목)"` (절대 날짜)
- ISO `startTime` 필드 추가 (정렬·필터링용)
- 이렇게 하면 GitHub Actions가 며칠 밀려도 화면이 거짓말 안 함

### 2. `src/utils/fallback.ts`
- `FALLBACK_PLAYERS`: 5/21 네이버 캡처 기준 최신화 (Chovy 700P → Zeka 500P → Teddy/Taeyoon 400P)
- `FALLBACK_MATCHES`: 절대 날짜 형식으로 재작성 (5/21~5/22 일정)

### 3. `src/App.tsx`
- `api.updated()` 호출 추가
- 헤더의 `"방금 업데이트"` → `"5/21 11:00 갱신"` 같은 실제 시각으로 변경
- `formatUpdatedLabel()` 헬퍼 함수 추가

### 4. `public/data/*.json`
- `players.json`, `matches.json`, `updated.json` 최신본으로 교체

---

## 적용 방법 (cmd 기준)

```cmd
cd C:\Users\Lee\lck-app

REM 1) 패치 파일들을 해당 경로에 덮어쓰기
copy /Y <패치>\scraper\scrape.js          scraper\scrape.js
copy /Y <패치>\src\App.tsx                src\App.tsx
copy /Y <패치>\src\utils\fallback.ts      src\utils\fallback.ts
copy /Y <패치>\public\data\players.json   public\data\players.json
copy /Y <패치>\public\data\matches.json   public\data\matches.json
copy /Y <패치>\public\data\updated.json   public\data\updated.json

REM 2) 빌드 확인 (개발 서버)
npm run dev

REM 3) 문제 없으면 commit & push
git add .
git commit -m "v4: 절대 날짜 형식 + 갱신 시각 노출 + 5/21 기준 데이터 갱신"
git push

REM 4) jsdelivr 캐시 즉시 갱신 (브라우저로 열기)
REM https://purge.jsdelivr.net/gh/officealone00/lck-app@main/public/data/players.json
REM https://purge.jsdelivr.net/gh/officealone00/lck-app@main/public/data/matches.json
REM https://purge.jsdelivr.net/gh/officealone00/lck-app@main/public/data/updated.json

REM 5) 앱인토스 빌드 → 콘솔에 새 deploymentId 등록
npx ait build
```

---

## ⚠️ 별도 점검 필요: GitHub Actions가 왜 멈췄나

1. `https://github.com/officealone00/lck-app/actions` 접속
2. `Scrape LCK Data` 워크플로우 클릭
3. 최근 실행 기록 확인 (5/10 이후)
   - **실행이 아예 없음** → cron 자동 비활성화 가능성 (60일 무활동 + push 누락). `workflow_dispatch`로 한 번 수동 실행.
   - **실행은 있는데 실패** → 로그에서 에러 확인 (Riot API 응답 변화, 또는 git push 권한)

### 자주 발생하는 원인 2가지
- (a) **60일 무활동 시 cron 비활성화** → 의외로 흔함. Actions 탭에 "이 워크플로우가 비활성화되었습니다" 배너가 뜸. 클릭 한 번으로 재활성화.
- (b) **`git pull --rebase` 단계에서 충돌** → 로컬 commit과 Actions commit이 엇갈리면 발생. 패치 적용 후 `git push` 한 번 하면 자동 해결.

수동 실행으로 한 번 강제로 돌려보면 (b)인지 (a)인지 바로 알 수 있어요.
