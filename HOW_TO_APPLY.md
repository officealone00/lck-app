# LCK 앱 자동화 업데이트 (Riot lolesports API 사용)

## 🎯 핵심: 진짜 자동 업데이트 가능

Riot 공식 `esports-api.lolesports.com` 사용:
- ✅ 글로벌 IP 허용 (한국 IP 차단 X)
- ✅ 한국어 지원 (`hl=ko-KR`)
- ✅ 진행 중 토너먼트도 데이터 있음
- ✅ getStandings 비어있으면 매치 결과로 직접 계산

매일 KST 02:00 (UTC 17:00)에 자동 실행 → standings + matches 갱신.

## 📦 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `scraper/scrape.js` | **NEW** - lolesports API 사용 (Leaguepedia 대체) |
| `.github/workflows/scrape.yml` | cron 재활성화 + jsdelivr 캐시 자동 퍼지 |
| `src/utils/fallback.ts` | 네이버 데이터 기반 폴백 (자동화 실패 시 대비) |
| `src/utils/api.ts` | PlayerRanking 인터페이스 추가 |
| `src/App.tsx` | stars 9명 + 진짜 stat 표시 |
| `public/data/*.json` | 6개 - jsdelivr 배포 데이터 |

## 🚀 적용 (cmd)

```cmd
cd C:\Users\Lee\lck-app
:: zip 풀어서 모두 덮어쓰기

git add .
git commit -m "auto-update: lolesports API scraper + 9 LEGENDS players"
git push
```

## ✅ 자동화 작동 확인

1. GitHub repo → **Actions** 탭
2. "Scrape LCK Data" 워크플로우 → **"Run workflow"** 버튼
3. 클릭 후 1분 대기
4. 성공하면 ✅ standings.json 자동 갱신됨

작동 시:
- 매일 KST 02:00 자동 실행
- 데이터 변경 시 자동 git commit + push
- jsdelivr CDN 캐시 자동 퍼지 (즉시 반영)
- 앱 재빌드 X, 검수 X

## ⚠️ 첫 실행 시 확인 사항

만약 첫 실행 실패하면:
- LCK leagueId가 바뀌었을 수 있음 (`98767991310872058`)
- lolesports.com 들어가서 LCK 페이지 → F12 → Network 탭 → `getTournaments` 검색 → `leagueId` 파라미터 확인

## 🛠 빌드 + 출시

코드 변경 (`src/`, `public/` 외) 있을 때만:
```cmd
npx ait build
:: 새 deploymentId 콘솔 등록 → 검수
```

데이터만 바뀌는 매일 자동 갱신은 **재빌드 X**, **재제출 X**.
