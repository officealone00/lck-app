// ─────────────────────────────────────────────────────────────────────────────
// LCK 데이터 자동 스크래퍼 (Riot 공식 lolesports API 사용)
// ─────────────────────────────────────────────────────────────────────────────
// API: https://esports-api.lolesports.com/persisted/gw
// 공개 API 키: 0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z (lolesports.com 자체에서 사용)
// 한국어 지원: hl=ko-KR
// IP 제한: 없음 (글로벌, GitHub Actions 미국 IP에서도 작동)
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const DATA_DIR   = path.join(ROOT, 'public', 'data');

const API = 'https://esports-api.lolesports.com/persisted/gw';
const KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LCK_LEAGUE_ID = '98767991310872058';

// ─── 한국어/색상 매핑 ───
// API 응답이 영문 약자라서 우리 앱용 한글/색상 매핑
const TEAM_KO = {
  'HLE': '한화생명e스포츠',
  'GEN': '젠지',
  'KT':  'KT 롤스터',
  'T1':  'T1',
  'DK':  '디플러스 기아',
  'BRO': '한진 브리온',
  'BFX': 'BNK FearX',
  'NS':  '농심 레드포스',
  'KRX': '키움 DRX',
  'DNS': 'DN SOOPers',
};
const TEAM_COLOR = {
  'HLE': '#F37021',
  'GEN': '#AA8B56',
  'KT':  '#FF0000',
  'T1':  '#E2012D',
  'DK':  '#1B1F3F',
  'BRO': '#2D5F3F',
  'BFX': '#FFCC00',
  'NS':  '#D62E36',
  'KRX': '#FECB00',
  'DNS': '#0099CC',
};

// ─── API 호출 helper ───
async function fetchAPI(endpoint, params = {}) {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('hl', 'ko-KR');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { 'x-api-key': KEY }
  });
  if (!res.ok) throw new Error(`${endpoint} HTTP ${res.status}`);
  return res.json();
}

// ─── 진행 중 토너먼트 찾기 ───
async function getCurrentTournament() {
  const data = await fetchAPI('getTournamentsForLeague', { leagueId: LCK_LEAGUE_ID });
  const tournaments = data?.data?.leagues?.[0]?.tournaments || [];
  if (!tournaments.length) throw new Error('No tournaments found for LCK');

  const now = new Date().toISOString().slice(0, 10);
  // 진행 중 토너먼트 (오늘 날짜가 startDate~endDate 사이)
  const ongoing = tournaments.find(t =>
    t.startDate <= now && (!t.endDate || t.endDate >= now)
  );
  if (ongoing) return ongoing;

  // 없으면 가장 최근(엔드데이트 큰 순) 토너먼트
  tournaments.sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
  return tournaments[0];
}

// ─── Standings 시도: getStandings API → 비어있으면 직접 계산 ───
async function scrapeStandings() {
  const t = await getCurrentTournament();
  console.log(`▶ Tournament: ${t.slug || t.id} (${t.startDate} ~ ${t.endDate})`);

  // 1. getStandings 호출 시도
  try {
    const data = await fetchAPI('getStandings', { tournamentId: t.id });
    const stages = data?.data?.standings?.[0]?.stages || [];
    const sections = stages.flatMap(s => s.sections || []);
    const rankings = sections.flatMap(s => s.rankings || []);

    if (rankings.length >= 5) {
      // 정상 응답
      const list = [];
      for (const rank of rankings) {
        for (const team of (rank.teams || [])) {
          list.push({
            rank: list.length + 1,
            abbr: team.code,
            kor:  TEAM_KO[team.code] || team.name || team.code,
            color: TEAM_COLOR[team.code] || '#999999',
            wr: 0, w: 0, l: 0, gdm: 0,
            form: ['?','?','?','?','?'],
          });
        }
      }
      // W/L/wr/gdm/form은 매치 결과로 보강
      return await enrichStandingsFromMatches(t.id, list);
    }
  } catch (e) {
    console.warn(`  ⚠ getStandings 실패: ${e.message}`);
  }

  // 2. 폴백: 매치 결과로 직접 standings 계산
  console.log('  → 매치 결과로 직접 standings 계산');
  return await computeStandingsFromMatches(t.id);
}

// ─── 매치 결과로 W/L/gdm 보강 ───
async function enrichStandingsFromMatches(tournamentId, baseList) {
  const stats = await collectMatchStats(tournamentId);
  return baseList.map(t => {
    const s = stats[t.abbr];
    if (!s) return t;
    return {
      ...t,
      w: s.w,
      l: s.l,
      wr: (s.w + s.l) > 0 ? Math.round(s.w / (s.w + s.l) * 100) : 0,
      gdm: s.gdm,
      form: s.form.slice(-5),
    };
  });
}

// ─── 매치 결과로 standings 직접 계산 (getStandings가 비어있을 때) ───
async function computeStandingsFromMatches(tournamentId) {
  const stats = await collectMatchStats(tournamentId);
  const arr = Object.entries(stats).map(([code, s]) => ({
    abbr: code,
    kor:  TEAM_KO[code] || code,
    color: TEAM_COLOR[code] || '#999999',
    w: s.w, l: s.l,
    wr: (s.w + s.l) > 0 ? Math.round(s.w / (s.w + s.l) * 100) : 0,
    gdm: s.gdm,
    form: s.form.slice(-5),
  }));
  // 승수 → 득실차 순 정렬
  arr.sort((a, b) => (b.w - a.w) || (b.gdm - a.gdm));
  return arr.map((t, i) => ({ rank: i + 1, ...t }));
}

// ─── 매치 결과 집계 ───
async function collectMatchStats(tournamentId) {
  const data = await fetchAPI('getCompletedEvents', { tournamentId });
  const events = data?.data?.schedule?.events || [];

  const stats = {}; // abbr → { w, l, gw(획득세트), gl(잃은세트), form: [] }

  // 시간순 정렬 (form은 최신순으로)
  events.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  for (const e of events) {
    if (e.state !== 'completed') continue;
    const teams = e.match?.teams || [];
    if (teams.length !== 2) continue;
    const [a, b] = teams;
    const aWins = a.result?.gameWins || 0;
    const bWins = b.result?.gameWins || 0;
    if (aWins === 0 && bWins === 0) continue; // 결과 없음

    const winner = aWins > bWins ? a : b;
    const loser  = aWins > bWins ? b : a;
    const wKey = winner.code;
    const lKey = loser.code;
    if (!wKey || !lKey) continue;

    stats[wKey] = stats[wKey] || { w: 0, l: 0, gw: 0, gl: 0, form: [] };
    stats[lKey] = stats[lKey] || { w: 0, l: 0, gw: 0, gl: 0, form: [] };
    stats[wKey].w++;
    stats[lKey].l++;
    stats[wKey].gw += winner.result.gameWins || 0;
    stats[wKey].gl += loser.result.gameWins  || 0;
    stats[lKey].gw += loser.result.gameWins  || 0;
    stats[lKey].gl += winner.result.gameWins || 0;
    stats[wKey].form.push('W');
    stats[lKey].form.push('L');
  }

  // gdm = 세트 득실차
  for (const code in stats) {
    stats[code].gdm = stats[code].gw - stats[code].gl;
  }
  return stats;
}

// ─── 다가오는 경기 ───
async function scrapeMatches() {
  const data = await fetchAPI('getSchedule', { leagueId: LCK_LEAGUE_ID });
  const events = data?.data?.schedule?.events || [];
  const now = Date.now();
  const upcoming = events
    .filter(e => e.state === 'unstarted' && new Date(e.startTime).getTime() > now)
    .slice(0, 10);

  return upcoming.map(e => {
    const teams = e.match?.teams || [];
    const home = teams[0] || {};
    const away = teams[1] || {};
    const date = new Date(e.startTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    let dateLabel = '';
    if (diffDays === 0) dateLabel = '오늘';
    else if (diffDays === 1) dateLabel = '내일';
    else if (diffDays > 1 && diffDays <= 7) dateLabel = `${diffDays}일 후`;
    else dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

    return {
      date: dateLabel,
      time: date.toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul'
      }),
      home: home.code || '',
      away: away.code || '',
      homeColor: TEAM_COLOR[home.code] || '#999',
      awayColor: TEAM_COLOR[away.code] || '#999',
    };
  });
}

// ─── 메인 ───
async function main() {
  console.log('▶ Run lolesports API scraper\n');

  let standings = [], matches = [];
  let success = 0, total = 2;

  // standings
  try {
    standings = await scrapeStandings();
    if (standings.length >= 5) {
      fs.writeFileSync(
        path.join(DATA_DIR, 'standings.json'),
        JSON.stringify(standings, null, 2)
      );
      success++;
      console.log(`  ✓ standings.json 저장 (${standings.length}팀)`);
      console.log(`    1위: ${standings[0].kor} (${standings[0].w}W ${standings[0].l}L)`);
    } else {
      console.warn(`  ⚠ standings 데이터 부족 (${standings.length}팀), 저장 안함 (기존 파일 유지)`);
    }
  } catch (e) {
    console.error(`  ✗ standings 실패: ${e.message}`);
  }

  console.log();

  // matches
  try {
    matches = await scrapeMatches();
    if (matches.length >= 1) {
      fs.writeFileSync(
        path.join(DATA_DIR, 'matches.json'),
        JSON.stringify(matches, null, 2)
      );
      success++;
      console.log(`  ✓ matches.json 저장 (${matches.length}경기)`);
    } else {
      console.warn(`  ⚠ matches 없음, 저장 안함 (기존 파일 유지)`);
    }
  } catch (e) {
    console.error(`  ✗ matches 실패: ${e.message}`);
  }

  // updated.json 갱신
  const now = new Date();
  fs.writeFileSync(path.join(DATA_DIR, 'updated.json'), JSON.stringify({
    updatedAt: now.toISOString(),
    updatedAtKST: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    tournament: 'LCK 2026',
    success,
    total,
  }, null, 2));

  console.log(`\n=== 완료: ${success}/${total} ===`);
  if (success === 0) {
    console.error('❌ 모든 스크래핑 실패! (기존 데이터 유지됨)');
    process.exit(1);
  }
  console.log('✓ 자동 갱신 완료');
}

main().catch(e => {
  console.error('❌ 치명적 오류:', e);
  process.exit(1);
});
