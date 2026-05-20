// ─────────────────────────────────────────────────────────────────────────────
// LCK 자동 스크래핑 v4
// Riot 공식 lolesports API 사용
// 변경사항(v3 → v4):
//   1. 매치 일정 라벨: 상대 라벨("오늘/내일/N일 후") → 절대 날짜("5/21(목)")
//      이유: GitHub Actions 갱신이 밀리면 상대 라벨이 거짓말함
//   2. updated.json에 다음 자동 갱신 예정 시각도 함께 기록 (참고용)
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../public/data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const API = 'https://esports-api.lolesports.com/persisted/gw';
const KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LCK_LEAGUE_ID = '98767991310872058';

// lolesports API 약자 → 우리 앱 약자 변환
const CODE_MAP = {
  'DPL': 'DK',
  'HAN': 'BRO',
  'BNK': 'BFX',
  'KIW': 'KRX',
  'DN':  'DNS',
};

function normalizeCode(code) {
  if (!code) return code;
  const trimmed = String(code).trim();
  return CODE_MAP[trimmed] || trimmed;
}

const TEAM_KO = {
  'HLE': '한화생명e스포츠', 'GEN': '젠지', 'KT': 'KT 롤스터', 'T1': 'T1',
  'DK': '디플러스 기아', 'BRO': '한진 브리온', 'BFX': 'BNK FearX',
  'NS': '농심 레드포스', 'KRX': '키움 DRX', 'DNS': 'DN SOOPers',
};
const TEAM_COLOR = {
  'HLE': '#F37021', 'GEN': '#AA8B56', 'KT': '#FF0000', 'T1': '#E2012D',
  'DK': '#1B1F3F', 'BRO': '#2D5F3F', 'BFX': '#FFCC00',
  'NS': '#D62E36', 'KRX': '#FECB00', 'DNS': '#0099CC',
};

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

// KST 기준 절대 날짜 라벨 ("5/21(목)") 생성
function formatDateLabelKST(d) {
  // d는 Date 객체. KST(UTC+9)로 month/day/weekday 추출
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const w = WEEKDAY_KR[kst.getUTCDay()];
  return `${m}/${day}(${w})`;
}

function formatTimeLabelKST(d) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function fetchAPI(endpoint, params = {}) {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('hl', 'ko-KR');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'x-api-key': KEY } });
  if (!res.ok) throw new Error(`${endpoint} HTTP ${res.status}`);
  return res.json();
}

async function getCurrentTournament() {
  const data = await fetchAPI('getTournamentsForLeague', { leagueId: LCK_LEAGUE_ID });
  const tournaments = data?.data?.leagues?.[0]?.tournaments || [];
  if (!tournaments.length) throw new Error('No tournaments for LCK');
  const now = new Date().toISOString().slice(0, 10);
  const ongoing = tournaments.find(t =>
    t.startDate <= now && (!t.endDate || t.endDate >= now)
  );
  if (ongoing) return ongoing;
  tournaments.sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
  return tournaments[0];
}

function extractRecord(team, ranking) {
  const candidates = [team?.record, team?.results, team?.stats, ranking?.record, ranking?.stats, team, ranking];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    const w = c.wins ?? c.matchWins ?? c.gameWins ?? c.w;
    const l = c.losses ?? c.matchLosses ?? c.gameLosses ?? c.l;
    if (typeof w === 'number' && typeof l === 'number' && (w + l) > 0) {
      return { w, l };
    }
  }
  return null;
}

async function scrapeStandings() {
  const t = await getCurrentTournament();
  console.log(`▶ Tournament: ${t.slug || t.id} (${t.startDate} ~ ${t.endDate})`);

  let baseList = [];

  try {
    const data = await fetchAPI('getStandings', { tournamentId: t.id });
    const stages = data?.data?.standings?.[0]?.stages || [];
    const sections = stages.flatMap(s => s.sections || []);
    const rankings = sections.flatMap(s => s.rankings || []);

    if (rankings.length >= 5) {
      let rank = 1;
      for (const ranking of rankings) {
        for (const team of (ranking.teams || [])) {
          const code = normalizeCode(team.code);
          if (!code) continue;
          const record = extractRecord(team, ranking);
          baseList.push({
            rank: rank++,
            abbr: code,
            kor:  TEAM_KO[code] || team.name || code,
            color: TEAM_COLOR[code] || '#999999',
            wr: 0, w: 0, l: 0, gdm: 0,
            form: ['?','?','?','?','?'],
            ...(record ? { w: record.w, l: record.l, wr: Math.round(record.w / (record.w + record.l) * 100) } : {}),
          });
        }
      }
      const enriched = baseList.filter(t => t.w + t.l > 0).length;
      console.log(`  ✓ getStandings OK (${baseList.length}팀, W/L 보강: ${enriched}팀)`);
    }
  } catch (e) {
    console.warn(`  ⚠ getStandings 실패: ${e.message}`);
  }

  console.log(`  → 매치 결과로 form/gdm 보강`);
  const stats = await collectMatchStats(t.id);

  if (Object.keys(stats).length > 0) {
    if (baseList.length === 0) {
      baseList = Object.entries(stats).map(([code, s]) => ({
        rank: 0, abbr: code,
        kor: TEAM_KO[code] || code,
        color: TEAM_COLOR[code] || '#999999',
        w: s.w, l: s.l,
        wr: (s.w + s.l > 0) ? Math.round(s.w / (s.w + s.l) * 100) : 0,
        gdm: s.gdm, form: s.form.slice(-5),
      }));
      baseList.sort((a, b) => (b.w - a.w) || (b.gdm - a.gdm));
      baseList.forEach((t, i) => t.rank = i + 1);
    } else {
      for (const t of baseList) {
        const s = stats[t.abbr];
        if (s) {
          t.gdm = s.gdm;
          t.form = s.form.slice(-5);
          if (t.w + t.l === 0) {
            t.w = s.w; t.l = s.l;
            t.wr = (s.w + s.l > 0) ? Math.round(s.w / (s.w + s.l) * 100) : 0;
          }
        }
      }
    }
    console.log(`  ✓ 매치 보강 완료 (${Object.keys(stats).length}팀)`);
  } else {
    console.warn(`  ⚠ 매치 결과 0건`);
  }

  return baseList;
}

async function collectMatchStats(tournamentId) {
  const data = await fetchAPI('getCompletedEvents', { tournamentId });
  const events = data?.data?.schedule?.events || [];
  console.log(`  [DEBUG] completed events: ${events.length}건`);

  const stats = {};
  events.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  for (const e of events) {
    if (e.state !== 'completed') continue;
    const teams = e.match?.teams || [];
    if (teams.length !== 2) continue;
    const [a, b] = teams;

    const aWins = a.result?.gameWins ?? a.result?.wins ?? a.result?.score ?? 0;
    const bWins = b.result?.gameWins ?? b.result?.wins ?? b.result?.score ?? 0;
    const aOutcome = a.result?.outcome;
    const bOutcome = b.result?.outcome;

    let winner, loser;
    if (aWins > bWins) { winner = a; loser = b; }
    else if (bWins > aWins) { winner = b; loser = a; }
    else if (aOutcome === 'win') { winner = a; loser = b; }
    else if (bOutcome === 'win') { winner = b; loser = a; }
    else continue;

    const wKey = normalizeCode(winner.code);
    const lKey = normalizeCode(loser.code);
    if (!wKey || !lKey) continue;

    stats[wKey] = stats[wKey] || { w: 0, l: 0, gw: 0, gl: 0, form: [] };
    stats[lKey] = stats[lKey] || { w: 0, l: 0, gw: 0, gl: 0, form: [] };
    stats[wKey].w++;
    stats[lKey].l++;
    const wScore = winner.result?.gameWins ?? winner.result?.wins ?? winner.result?.score ?? 1;
    const lScore = loser.result?.gameWins  ?? loser.result?.wins  ?? loser.result?.score  ?? 0;
    stats[wKey].gw += wScore;
    stats[wKey].gl += lScore;
    stats[lKey].gw += lScore;
    stats[lKey].gl += wScore;
    stats[wKey].form.push('W');
    stats[lKey].form.push('L');
  }

  for (const code in stats) {
    stats[code].gdm = stats[code].gw - stats[code].gl;
  }
  return stats;
}

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
    const homeCode = normalizeCode(home.code) || '';
    const awayCode = normalizeCode(away.code) || '';
    const date = new Date(e.startTime);

    return {
      // v4: 절대 날짜 ("5/21(목)") — 갱신 밀려도 거짓말 안 함
      date: formatDateLabelKST(date),
      time: formatTimeLabelKST(date),
      // 정렬/필터용 ISO (앱에서 "지난 경기 자동 숨김" 등에 활용 가능)
      startTime: date.toISOString(),
      home: homeCode,
      away: awayCode,
      homeColor: TEAM_COLOR[homeCode] || '#999',
      awayColor: TEAM_COLOR[awayCode] || '#999',
    };
  });
}

async function main() {
  console.log('▶ Run lolesports API scraper v4 (절대 날짜)\n');

  let standings = [], matches = [];
  let success = 0, total = 2;

  try {
    standings = await scrapeStandings();
    if (standings.length >= 5) {
      fs.writeFileSync(path.join(DATA_DIR, 'standings.json'), JSON.stringify(standings, null, 2));
      success++;
      const top = standings[0];
      console.log(`\n  ✓ standings.json 저장 (${standings.length}팀)`);
      console.log(`    1위: ${top.kor} (${top.w}W ${top.l}L, ${top.wr}%, gdm ${top.gdm})`);
    } else {
      console.warn(`  ⚠ standings 부족 (${standings.length}팀)`);
    }
  } catch (e) {
    console.error(`  ✗ standings 실패: ${e.message}\n${e.stack}`);
  }

  console.log();

  try {
    matches = await scrapeMatches();
    if (matches.length >= 1) {
      fs.writeFileSync(path.join(DATA_DIR, 'matches.json'), JSON.stringify(matches, null, 2));
      success++;
      console.log(`  ✓ matches.json 저장 (${matches.length}경기)`);
      console.log(`    첫 경기: ${matches[0].date} ${matches[0].time} ${matches[0].home} vs ${matches[0].away}`);
    } else {
      console.warn(`  ⚠ matches 없음`);
    }
  } catch (e) {
    console.error(`  ✗ matches 실패: ${e.message}`);
  }

  const now = new Date();
  fs.writeFileSync(path.join(DATA_DIR, 'updated.json'), JSON.stringify({
    updatedAt: now.toISOString(),
    updatedAtKST: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    tournament: 'LCK 2026',
    success, total,
  }, null, 2));

  console.log(`\n=== 완료: ${success}/${total} ===`);
  if (success === 0) {
    console.error('❌ 모든 스크래핑 실패');
    process.exit(1);
  }
  console.log('✓ 자동 갱신 완료');
}

main().catch(e => {
  console.error('❌ 치명적 오류:', e);
  console.error(e.stack);
  process.exit(1);
});
