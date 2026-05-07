// Leaguepedia API 기반 LCK 스크래퍼
// gol.gg HTML 파싱이 불안정해서 Leaguepedia Cargo API로 전환
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚠️ 시즌 변경 시 이 값만 수정 (예: 'LCK/2026 Season/Rounds 3-4')
const TOURNAMENT = 'LCK/2026 Season/Rounds 1-2';
const API_BASE = 'https://lol.fandom.com/api.php';

// 팀명 매핑 (Leaguepedia 영문명 → 앱 표시용)
const TEAM_META = {
  'Hanwha Life Esports': { code: 'HLE', kor: '한화생명e스포츠', color: '#F37021' },
  'KT Rolster':          { code: 'KT',  kor: 'KT 롤스터',       color: '#FF0000' },
  'Gen.G':               { code: 'GEN', kor: '젠지',            color: '#AA8B56' },
  'T1':                  { code: 'T1',  kor: 'T1',              color: '#E2012D' },
  'Dplus KIA':           { code: 'DK',  kor: '디플러스 기아',   color: '#1B1F3F' },
  'Nongshim RedForce':   { code: 'NS',  kor: '농심 레드포스',   color: '#D62E36' },
  'BNK FearX':           { code: 'BNK', kor: 'BNK FEARX',       color: '#A8B5C0' },
  'OK Wave Brion':       { code: 'BRO', kor: 'OK저축은행 브리온', color: '#80C242' },
  'OKSavingsBank Brion': { code: 'BRO', kor: 'OK저축은행 브리온', color: '#80C242' },
  'DRX':                 { code: 'DRX', kor: 'DRX',             color: '#1A78D2' },
  'DN Freecs':           { code: 'DN',  kor: 'DN FREECS',       color: '#FE5000' },
  'DenAir Freecs':       { code: 'DN',  kor: 'DN FREECS',       color: '#FE5000' },
};

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'lck-app/1.0 (https://github.com/officealone00/lck-app)',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.log(`  재시도 ${i + 1}/${retries}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function scrapeStandings() {
  const where = `Standings.OverviewPage="${TOURNAMENT}"`;
  const url =
    `${API_BASE}?action=cargoquery&format=json&tables=Standings` +
    `&fields=Team,Place,WinSeries,LossSeries,WinGames,LossGames` +
    `&where=${encodeURIComponent(where)}&limit=20`;
  console.log(`[fetch standings] ${url}`);

  const data = await fetchJson(url);
  const rows = (data && data.cargoquery) || [];

  if (rows.length === 0) {
    console.log('⚠️  standings 데이터 없음');
    return null;
  }

  const teams = rows
    .map((r) => {
      const t = r.title;
      const teamName = t.Team || '';
      const meta = TEAM_META[teamName] || {
        code: teamName.substring(0, 3).toUpperCase(),
        kor: teamName,
        color: '#888888',
      };
      const wg = parseInt(t.WinGames, 10) || 0;
      const lg = parseInt(t.LossGames, 10) || 0;
      const total = wg + lg;
      const winRate = total > 0 ? Math.round((wg / total) * 100) : 0;
      return {
        rank: parseInt(t.Place, 10) || 0,
        code: meta.code,
        name: meta.kor,
        fullName: teamName,
        wins: wg,
        losses: lg,
        winRate,
        color: meta.color,
        gameTime: '',
        gdm: 0,
      };
    })
    .filter((t) => t.rank > 0 && t.fullName)
    .sort((a, b) => a.rank - b.rank);

  console.log(`✅ standings ${teams.length}팀`);
  return teams;
}

async function scrapeMatches() {
  const where = `MatchSchedule.OverviewPage="${TOURNAMENT}"`;
  const url =
    `${API_BASE}?action=cargoquery&format=json&tables=MatchSchedule` +
    `&fields=Team1,Team2,DateTime_UTC,Winner,Tab,Team1Score,Team2Score` +
    `&where=${encodeURIComponent(where)}` +
    `&order_by=MatchSchedule.DateTime_UTC&limit=200`;
  console.log(`[fetch matches] ${url}`);

  const data = await fetchJson(url);
  const rows = (data && data.cargoquery) || [];

  if (rows.length === 0) {
    console.log('⚠️  matches 데이터 없음');
    return null;
  }

  const now = new Date();
  const upcoming = [];

  for (const r of rows) {
    const t = r.title;
    const dateStr = t['DateTime UTC'] || t['DateTime_UTC'];
    if (!dateStr) continue;
    const matchDate = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(matchDate.getTime())) continue;
    if (matchDate <= now) continue;
    if (!t.Team1 || !t.Team2) continue;

    const m1 = TEAM_META[t.Team1];
    const m2 = TEAM_META[t.Team2];
    if (!m1 || !m2) continue;

    upcoming.push({
      team1: m1.code,
      team1Name: m1.kor,
      team1Color: m1.color,
      team2: m2.code,
      team2Name: m2.kor,
      team2Color: m2.color,
      date: matchDate.toISOString(),
      tab: t.Tab || '',
    });

    if (upcoming.length >= 8) break;
  }

  console.log(`✅ matches ${upcoming.length}건`);
  return upcoming;
}

(async () => {
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  let standings = null;
  let matches = null;

  try {
    standings = await scrapeStandings();
  } catch (e) {
    console.log('❌ standings 에러:', e.message);
  }

  try {
    matches = await scrapeMatches();
  } catch (e) {
    console.log('❌ matches 에러:', e.message);
  }

  let count = 0;

  if (standings && standings.length >= 5) {
    fs.writeFileSync(
      path.join(dataDir, 'standings.json'),
      JSON.stringify(standings, null, 2)
    );
    count++;
  } else {
    console.log('⚠️  standings 저장 안함 (기존 파일 유지)');
  }

  if (matches && matches.length > 0) {
    fs.writeFileSync(
      path.join(dataDir, 'matches.json'),
      JSON.stringify(matches, null, 2)
    );
    count++;
  } else {
    console.log('⚠️  matches 저장 안함 (기존 파일 유지)');
  }

  // 항상 갱신 시각은 기록
  fs.writeFileSync(
    path.join(dataDir, 'updated.json'),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        updatedAtKST: new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
        }),
        successCount: count,
        tournament: TOURNAMENT,
      },
      null,
      2
    )
  );

  console.log(`\n=== 완료: ${count}/2 ===`);

  if (count === 0) {
    console.log('❌ 모든 스크래핑 실패!');
    process.exit(1);
  }

  console.log('✅ 정상 완료');
})();
