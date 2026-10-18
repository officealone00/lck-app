// ─────────────────────────────────────────────────────────────────────────────
// LCK 자동 수집기 v5 (2026-10-18)
// 출처: Riot 공식 lolesports API + livestats 피드 + Data Dragon (모두 무료, 서버 불필요)
//
// v4 → v5 에서 고친 것
//   1. 순위: 3~5라운드 그룹(레전드/라이즈)을 한 줄로 이어 붙여 '1~10위'로 보여주던 문제
//      → 시즌 누적 전적(1~5라운드)으로 계산하고, 그룹을 따로 표시
//   2. 최근 폼이 전부 '?' 이던 문제 (완료 경기 목록에 state 필드가 없음) → 필터 제거
//   3. 시즌 결산(우승·준우승·3위, 플레이오프 결과) → season.json
//   4. 월즈(롤드컵) 일정·결과 중 LCK 팀 경기 → worlds.json, matches.json
//   5. 선수·페이커·메타 통계를 실제 경기 기록(livestats)으로 계산
//      (예전에는 손으로 넣은 고정 값이라 갱신되지 않았음)
//      경기별 결과는 scraper/cache/games.json 에 저장해 다음 실행 때 다시 받지 않아요.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../public/data');
const CACHE_DIR = path.resolve(__dirname, 'cache');
const GAME_CACHE = path.join(CACHE_DIR, 'games.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

const API = 'https://esports-api.lolesports.com/persisted/gw';
const FEED = 'https://feed.lolesports.com/livestats/v1';
const KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LCK_LEAGUE_ID = '98767991310872058';
const WORLDS_LEAGUE_ID = '98767975604431411';

// lolesports 약자 → 앱 약자
const CODE_MAP = { DPL: 'DK', HAN: 'BRO', BNK: 'BFX', KIW: 'KRX', DN: 'DNS' };
const normalizeCode = (code) => {
  if (!code) return code;
  const c = String(code).trim();
  return CODE_MAP[c] || c;
};

const TEAM_KO = {
  HLE: '한화생명e스포츠', GEN: '젠지', KT: 'KT 롤스터', T1: 'T1',
  DK: '디플러스 기아', BRO: '한진 브리온', BFX: 'BNK 피어엑스',
  NS: '농심 레드포스', KRX: '키움 DRX', DNS: 'DN 수퍼스',
};
// 어두운 배경에서도 보이도록 밝기를 맞춘 팀 색
const TEAM_COLOR = {
  HLE: '#F37021', GEN: '#C8A25B', KT: '#FF3B3B', T1: '#E2012D',
  DK: '#3FB6D9', BRO: '#3E9E62', BFX: '#FFCC00',
  NS: '#E0525A', KRX: '#4A7BF7', DNS: '#8E7CF0',
};
const LCK_CODES = new Set(Object.keys(TEAM_KO));

// 선수 한글 닉네임 (없으면 영문 그대로)
const NICK_KO = {
  Faker: '페이커', Chovy: '쵸비', Zeka: '제카', Keria: '케리아', Oner: '오너', Gumayusi: '구마유시',
  Zeus: '제우스', Kiin: '기인', Canyon: '캐니언', Ruler: '룰러', Duro: '듀로', Kanavi: '카나비',
  Delight: '딜라이트', ShowMaker: '쇼메이커', Lucid: '루시드', Aiming: '에이밍', Bdd: '비디디',
  Cuzz: '커즈', PerfecT: '퍼펙트', Peyz: '페이즈', Doran: '도란', Smash: '스매시', Siwoo: '시우',
  Teddy: '테디', Taeyoon: '태윤', GIDEON: '기드온', Ucal: '유칼', Viper: '바이퍼', Peanut: '피넛',
  Lehends: '리헨즈', Kingen: '킹겐', Morgan: '모건', Clozer: '클로저', Pyosik: '표식', Deft: '데프트',
  BeryL: '베릴', Effort: '에포트', Life: '라이프', Andil: '안딜', Croco: '크로코', DuDu: '두두',
  Sylvie: '실비', Bull: '불', Rascal: '라스칼', Willer: '윌러', Jiwoo: '지우', Kellin: '켈린',
};

const POS_KO = { top: 'TOP', jungle: 'JGL', mid: 'MID', bottom: 'AD', support: 'SPT' };
const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

function kstParts(d) {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return { m: k.getUTCMonth() + 1, day: k.getUTCDate(), w: WEEKDAY_KR[k.getUTCDay()], hh: k.getUTCHours(), mm: k.getUTCMinutes() };
}
const dateLabelKST = (d) => { const p = kstParts(d); return `${p.m}/${p.day}(${p.w})`; };
const timeLabelKST = (d) => { const p = kstParts(d); return `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`; };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAPI(endpoint, params = {}) {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('hl', 'ko-KR');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'x-api-key': KEY } });
      if (!res.ok) throw new Error(`${endpoint} HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === 2) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

async function fetchJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 204) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      const txt = await res.text();
      return txt ? JSON.parse(txt) : null;
    } catch (e) {
      if (i === 2) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

async function pLimit(items, n, fn) {
  const out = new Array(items.length);
  let idx = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try { out[i] = await fn(items[i], i); } catch (e) { out[i] = null; console.warn('  ⚠', e.message); }
    }
  }));
  return out;
}

// ─── 시즌 범위: 올해 정규시즌(2·3 스플릿 = 1~5라운드 + 플레이오프) ───
async function getSeasonTournaments() {
  const data = await fetchAPI('getTournamentsForLeague', { leagueId: LCK_LEAGUE_ID });
  const ts = data?.data?.leagues?.[0]?.tournaments || [];
  ts.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  const latestYear = (ts[0]?.slug.match(/(\d{4})/) || [])[1];
  // split_1 은 LCK컵(별도 대회)이라 시즌 순위에서 제외
  const season = ts.filter((t) => t.slug.includes(latestYear) && !/split_1_/.test(t.slug));
  season.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { year: Number(latestYear), tournaments: season, all: ts };
}

async function getCompletedEvents(tournamentId) {
  const data = await fetchAPI('getCompletedEvents', { tournamentId });
  return (data?.data?.schedule?.events || []).filter((e) => (e.match?.teams || []).length === 2);
}

const isRegular = (e) => /주\s*차/.test(e.blockName || '');

function matchResult(e) {
  const [a, b] = e.match.teams;
  const aw = a.result?.gameWins ?? 0;
  const bw = b.result?.gameWins ?? 0;
  if (aw === bw) return null;
  const A = normalizeCode(a.code), B = normalizeCode(b.code);
  return aw > bw ? { win: A, lose: B, ws: aw, ls: bw } : { win: B, lose: A, ws: bw, ls: aw };
}

// ─── 순위 ───
async function buildStandings(season, eventsByTournament) {
  const stats = {};
  const ensure = (c) => (stats[c] ||= { w: 0, l: 0, gw: 0, gl: 0, results: [] });

  const all = eventsByTournament.flat().sort((x, y) => x.startTime.localeCompare(y.startTime));
  for (const e of all) {
    const r = matchResult(e);
    if (!r || !LCK_CODES.has(r.win) || !LCK_CODES.has(r.lose)) continue;
    // 최근 폼은 플레이오프 포함 모든 경기
    ensure(r.win).results.push('W');
    ensure(r.lose).results.push('L');
    if (!isRegular(e)) continue;
    ensure(r.win).w++; ensure(r.lose).l++;
    stats[r.win].gw += r.ws; stats[r.win].gl += r.ls;
    stats[r.lose].gw += r.ls; stats[r.lose].gl += r.ws;
  }

  // 마지막 스플릿의 그룹(레전드/라이즈) 정보와 공식 순위 순서
  const last = season.tournaments.at(-1);
  const groupOf = {};
  const officialOrder = [];
  try {
    const st = await fetchAPI('getStandings', { tournamentId: last.id });
    for (const stage of st?.data?.standings?.[0]?.stages || []) {
      for (const sec of stage.sections || []) {
        if (!sec.rankings?.length) continue;
        const gname = sec.name || '';
        for (const r of sec.rankings) {
          for (const t of r.teams || []) {
            const c = normalizeCode(t.code);
            if (!LCK_CODES.has(c) || groupOf[c]) continue;
            groupOf[c] = /레전드|legend/i.test(gname) ? '레전드' : /라이즈|rise/i.test(gname) ? '라이즈' : gname;
            officialOrder.push(c);
          }
        }
      }
    }
  } catch (e) {
    console.warn('  ⚠ getStandings 실패:', e.message);
  }

  const teams = Object.keys(stats).filter((c) => LCK_CODES.has(c));
  const rows = teams.map((c) => {
    const s = stats[c];
    const games = s.w + s.l;
    const form = s.results.slice(-5);
    while (form.length < 5) form.unshift('?');
    return {
      rank: 0,
      abbr: c,
      kor: TEAM_KO[c] || c,
      color: TEAM_COLOR[c] || '#999999',
      w: s.w, l: s.l,
      wr: games ? Math.round((s.w / games) * 100) : 0,
      gdm: s.gw - s.gl,
      setW: s.gw, setL: s.gl,
      form,
      group: groupOf[c] || '',
    };
  });

  // 공식 순서(그룹별 순위)가 있으면 그대로, 없으면 승수 → 세트 득실
  const fallbackSort = (a, b) => (b.w - a.w) || (b.gdm - a.gdm);
  if (officialOrder.length >= rows.length) {
    rows.sort((a, b) => officialOrder.indexOf(a.abbr) - officialOrder.indexOf(b.abbr));
  } else {
    rows.sort(fallbackSort);
  }
  rows.forEach((r, i) => (r.rank = i + 1));
  const groupRank = {};
  for (const r of rows) {
    groupRank[r.group] = (groupRank[r.group] || 0) + 1;
    r.groupRank = groupRank[r.group];
  }

  // 공식 순서와 누적 전적이 어긋나면 경고 (데이터 이상 감지용)
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (a.group === b.group && a.w < b.w) console.warn(`  ⚠ 순위 확인 필요: ${a.abbr}(${a.w}승) 위에 ${b.abbr}(${b.w}승)`);
  }
  return rows;
}

// ─── 시즌 결산 (플레이오프) ───
function buildSeason(season, eventsByTournament, standings) {
  const last = season.tournaments.at(-1);
  const lastEvents = eventsByTournament.at(-1).slice().sort((x, y) => x.startTime.localeCompare(y.startTime));
  const post = lastEvents.filter((e) => !isRegular(e));
  const toRow = (e) => {
    const [a, b] = e.match.teams;
    const d = new Date(e.startTime);
    return {
      date: dateLabelKST(d), startTime: d.toISOString(), stage: e.blockName || '',
      home: normalizeCode(a.code), away: normalizeCode(b.code),
      homeScore: a.result?.gameWins ?? 0, awayScore: b.result?.gameWins ?? 0,
    };
  };
  const final = post.filter((e) => /결승/.test(e.blockName || '')).at(-1);
  const now = Date.now();
  const ended = last.endDate && new Date(last.endDate + 'T23:59:59+09:00').getTime() < now;

  let champion = null, runnerUp = null, third = null, finalScore = '';
  if (final) {
    const r = matchResult(final);
    if (r) { champion = r.win; runnerUp = r.lose; finalScore = `${r.ws}:${r.ls}`; }
    const beforeFinal = post.filter((e) => e !== final && !/결승/.test(e.blockName || '')).at(-1);
    const rb = beforeFinal && matchResult(beforeFinal);
    if (rb && rb.win === runnerUp) third = rb.lose;
  }
  return {
    year: season.year,
    title: `${season.year} LCK`,
    status: ended || champion ? 'ended' : 'ongoing',
    champion, runnerUp, third, finalScore,
    regularFirst: standings[0]?.abbr || null,
    playoffs: post.map(toRow),
  };
}

// ─── 월즈 ───
async function buildWorlds() {
  const tdata = await fetchAPI('getTournamentsForLeague', { leagueId: WORLDS_LEAGUE_ID });
  const ts = (tdata?.data?.leagues?.[0]?.tournaments || []).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  const cur = ts[0];
  if (!cur) return null;
  const year = Number((cur.slug.match(/(\d{4})/) || [])[1]);
  const sched = await fetchAPI('getSchedule', { leagueId: WORLDS_LEAGUE_ID });
  let events = sched?.data?.schedule?.events || [];
  events = events.filter((e) => (e.startTime || '') >= cur.startDate);
  const now = Date.now();

  const stages = [];
  for (const e of events) {
    const name = e.blockName || '';
    if (!stages.find((s) => s.name === name)) stages.push({ name, start: e.startTime });
  }
  const mapE = (e) => {
    const [a, b] = e.match?.teams || [];
    const d = new Date(e.startTime);
    return {
      id: e.match?.id || '',
      startTime: d.toISOString(), date: dateLabelKST(d), time: timeLabelKST(d),
      stage: e.blockName || '', state: e.state, bestOf: e.match?.strategy?.count || 1,
      home: normalizeCode(a?.code) || 'TBD', away: normalizeCode(b?.code) || 'TBD',
      homeName: a?.name || '', awayName: b?.name || '',
      homeScore: a?.result?.gameWins ?? null, awayScore: b?.result?.gameWins ?? null,
    };
  };
  const all = events.map(mapE);
  const lckInvolved = (m) => LCK_CODES.has(m.home) || LCK_CODES.has(m.away);
  const next = all.find((m) => m.state !== 'completed' && new Date(m.startTime).getTime() > now - 3 * 3600e3) || null;
  const lckTeams = [...new Set(all.flatMap((m) => [m.home, m.away]).filter((c) => LCK_CODES.has(c)))];
  return {
    year,
    title: `${year} 월드 챔피언십`,
    startDate: cur.startDate, endDate: cur.endDate,
    status: now < new Date(cur.startDate).getTime() ? 'upcoming' : (cur.endDate && now > new Date(cur.endDate + 'T23:59:59Z').getTime() ? 'ended' : 'ongoing'),
    stages,
    next,
    lckTeams,
    lckMatches: all.filter(lckInvolved),
  };
}

// ─── 경기 기록 (선수·챔피언 통계) ───
async function loadChampNames() {
  try {
    const versions = await fetchJson('https://ddragon.leagueoflegends.com/api/versions.json');
    const v = versions[0];
    const data = await fetchJson(`https://ddragon.leagueoflegends.com/cdn/${v}/data/ko_KR/champion.json`);
    const map = {};
    for (const c of Object.values(data.data)) map[c.id] = c.name;
    return map;
  } catch (e) {
    console.warn('  ⚠ 챔피언 한글 이름 실패:', e.message);
    return {};
  }
}

// 한 세트(게임)의 최종 기록: 시작 프레임 + 시작 70분 뒤 프레임(=종료 상태)
async function fetchGameRecord(gameId) {
  const first = await fetchJson(`${FEED}/window/${gameId}`);
  if (!first?.frames?.length) return null;
  const meta = first.gameMetadata;
  const t0 = new Date(first.frames[0].rfc460Timestamp).getTime();
  let f = null;
  for (const min of [70, 95]) {
    const t = new Date(Math.floor((t0 + min * 60000) / 10000) * 10000).toISOString();
    const end = await fetchJson(`${FEED}/window/${gameId}?startingTime=${t}`);
    f = end?.frames?.at(-1);
    if (f?.gameState === 'finished') break;
  }
  if (!f || f.gameState !== 'finished') return null;
  const side = (tm, md) => ({
    teamId: md.esportsTeamId,
    kills: tm.totalKills, towers: tm.towers, inhibitors: tm.inhibitors, gold: tm.totalGold,
    players: md.participantMetadata.map((p) => {
      const s = tm.participants.find((x) => x.participantId === p.participantId) || {};
      return { name: p.summonerName, champ: p.championId, role: p.role, k: s.kills || 0, d: s.deaths || 0, a: s.assists || 0, cs: s.creepScore || 0, gold: s.totalGold || 0 };
    }),
  });
  const blue = side(f.blueTeam, meta.blueTeamMetadata);
  const red = side(f.redTeam, meta.redTeamMetadata);
  return { gameId, patch: meta.patchVersion, blue, red };
}

// 세트 승자 정하기
// livestats 피드에는 '누가 이겼는지'가 없어요. 그래서
//  1) 종료 시점 포탑·억제기·골드·킬 차이로 '이긴 쪽 같은 정도'를 점수로 만들고
//  2) 공식 경기 스코어(예: 2:1)와 '마지막 세트는 시리즈 승자가 이긴다'는 규칙을 만족하는
//     조합 중에서 점수 합이 가장 큰 조합을 고릅니다. → 스코어와 항상 일치해요.
function blueMargin(rec) {
  const b = rec.blue, r = rec.red;
  return (b.towers - r.towers) + 2 * (b.inhibitors - r.inhibitors) + (b.gold - r.gold) / 3000 + (b.kills - r.kills) / 10;
}
function assignWinners(recs, m) {
  // recs: 세트 번호 순서 (없는 세트는 null), m.score: {코드: 이긴 세트 수}
  const codes = Object.keys(m.score);
  const [W, L] = m.score[codes[0]] > m.score[codes[1]] ? [codes[0], codes[1]] : [codes[1], codes[0]];
  const need = { [W]: m.score[W], [L]: m.score[L] };
  const n = recs.length;
  let best = null, bestScore = -Infinity;
  for (let mask = 0; mask < 1 << n; mask++) {
    const cnt = { [W]: 0, [L]: 0 };
    let score = 0, valid = true;
    for (let i = 0; i < n; i++) {
      const rec = recs[i];
      if (!rec) continue;
      const winSide = mask & (1 << i) ? 'blue' : 'red';
      const code = m.teams[rec[winSide].teamId];
      if (!(code in cnt)) { valid = false; break; }
      cnt[code]++;
      const mg = blueMargin(rec);
      score += winSide === 'blue' ? mg : -mg;
      if (i === n - 1 && recs.length === m.games.length && code !== W) { valid = false; break; }
    }
    if (!valid || cnt[W] > need[W] || cnt[L] > need[L]) continue;
    if (recs.every(Boolean) && (cnt[W] !== need[W] || cnt[L] !== need[L])) continue;
    if (score > bestScore) { bestScore = score; best = mask; }
  }
  if (best === null) return recs.map((rec) => (rec ? (blueMargin(rec) >= 0 ? 'blue' : 'red') : null));
  return recs.map((rec, i) => (rec ? (best & (1 << i) ? 'blue' : 'red') : null));
}

async function buildPlayerStats(eventsByTournament) {
  const cache = fs.existsSync(GAME_CACHE) ? JSON.parse(fs.readFileSync(GAME_CACHE, 'utf8')) : {};
  const events = eventsByTournament.flat();

  // 경기(매치) → 세트 ID 목록 (getEventDetails, 캐시되지 않은 매치만)
  const matchIds = events.map((e) => e.match?.id).filter(Boolean);
  const needDetails = matchIds.filter((id) => !cache[`m:${id}`]);
  console.log(`  세트 목록 조회: ${needDetails.length}경기 (캐시 ${matchIds.length - needDetails.length})`);
  await pLimit(needDetails, 4, async (id) => {
    const d = await fetchAPI('getEventDetails', { id });
    const m = d?.data?.event?.match;
    if (!m) return;
    const teamCode = Object.fromEntries((m.teams || []).map((t) => [t.id, normalizeCode(t.code)]));
    cache[`m:${id}`] = {
      teams: teamCode,
      score: Object.fromEntries((m.teams || []).map((t) => [normalizeCode(t.code), t.result?.gameWins ?? 0])),
      games: (m.games || []).filter((g) => g.state === 'completed').map((g) => g.id),
    };
  });

  const gameIds = matchIds.flatMap((id) => cache[`m:${id}`]?.games || []);
  const needGames = gameIds.filter((g) => !cache[`g:${g}`]);
  console.log(`  세트 기록 조회: ${needGames.length}세트 (캐시 ${gameIds.length - needGames.length})`);
  await pLimit(needGames, 4, async (g) => {
    const rec = await fetchGameRecord(g);
    if (rec) cache[`g:${g}`] = rec;
  });
  fs.writeFileSync(GAME_CACHE, JSON.stringify(cache));

  // 승자 결정 (공식 스코어와 일치하도록)
  let full = 0, partial = 0;
  const games = [];
  for (const id of matchIds) {
    const m = cache[`m:${id}`];
    if (!m || Object.keys(m.score).length !== 2) continue;
    const recs = m.games.map((g) => cache[`g:${g}`] || null);
    if (recs.every(Boolean)) full++; else partial++;
    const sides = assignWinners(recs, m);
    recs.forEach((rec, i) => rec && games.push({ rec, winSide: sides[i], teams: m.teams, verified: true }));
  }
  const ok = full, bad = partial;
  console.log(`  세트 기록: 전체 확보 ${full}경기 / 일부 누락 ${partial}경기`);

  const players = {};
  const champs = {};
  let totalGames = 0;
  for (const { rec, winSide, teams, verified } of games) {
    totalGames++;
    for (const sideName of ['blue', 'red']) {
      const sd = rec[sideName];
      const team = teams[sd.teamId];
      if (!LCK_CODES.has(team)) continue;
      const won = sideName === winSide;
      for (const p of sd.players) {
        const nick = p.name.replace(/^\S+\s+/, '').trim();
        const key = `${nick}`;
        const pl = (players[key] ||= { name: nick, team, pos: POS_KO[p.role] || p.role, games: 0, wins: 0, k: 0, d: 0, a: 0, teamKills: 0, champs: {} });
        pl.team = team; // 이적 시 마지막 소속
        pl.games++; if (won && verified) pl.wins++;
        pl.k += p.k; pl.d += p.d; pl.a += p.a; pl.teamKills += sd.kills;
        const ch = (pl.champs[p.champ] ||= { games: 0, wins: 0, k: 0, d: 0, a: 0 });
        ch.games++; if (won && verified) ch.wins++; ch.k += p.k; ch.d += p.d; ch.a += p.a;
        const c = (champs[p.champ] ||= { picks: 0, wins: 0 });
        c.picks++; if (won && verified) c.wins++;
      }
    }
  }
  return { players, champs, totalGames, verifiedRate: ok / Math.max(1, ok + bad) };
}

const kda = (k, d, a) => Math.round(((k + a) / Math.max(1, d)) * 100) / 100;

// ─── main ───
async function main() {
  console.log('▶ LCK 수집기 v5\n');
  const results = {};
  const save = (name, data) => fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2));

  const season = await getSeasonTournaments();
  console.log(`▶ 시즌 ${season.year}: ${season.tournaments.map((t) => t.slug).join(', ')}`);
  const eventsByTournament = [];
  for (const t of season.tournaments) eventsByTournament.push(await getCompletedEvents(t.id));
  console.log(`  완료 경기: ${eventsByTournament.map((e) => e.length).join(' + ')}`);

  // 1) 순위
  let standings = [];
  try {
    standings = await buildStandings(season, eventsByTournament);
    if (standings.length >= 8) {
      save('standings.json', standings);
      results.standings = true;
      console.log(`  ✓ standings.json — ${standings.map((s) => `${s.rank}.${s.abbr}(${s.w}-${s.l},${s.form.join('')})`).join(' ')}`);
    }
  } catch (e) { console.error('  ✗ standings', e); }

  // 2) 시즌 결산
  try {
    const s = buildSeason(season, eventsByTournament, standings);
    save('season.json', s);
    results.season = true;
    console.log(`  ✓ season.json — 우승 ${s.champion} (${s.finalScore}) 준우승 ${s.runnerUp} 3위 ${s.third}`);
  } catch (e) { console.error('  ✗ season', e); }

  // 3) 월즈 + 다음 경기
  let worlds = null;
  try {
    worlds = await buildWorlds();
    if (worlds) {
      save('worlds.json', worlds);
      results.worlds = true;
      console.log(`  ✓ worlds.json — ${worlds.title} ${worlds.status}, LCK 팀 ${worlds.lckTeams.join(',') || '대진 발표 전'}, 다음 ${worlds.next?.stage} ${worlds.next?.date} ${worlds.next?.time}`);
    }
  } catch (e) { console.error('  ✗ worlds', e); }

  try {
    const lckSched = await fetchAPI('getSchedule', { leagueId: LCK_LEAGUE_ID });
    const now = Date.now();
    const upcoming = (lckSched?.data?.schedule?.events || [])
      .filter((e) => e.state === 'unstarted' && new Date(e.startTime).getTime() > now)
      .map((e) => ({ e, league: 'LCK' }));
    const worldsUp = (worlds?.lckMatches || []).filter((m) => m.state !== 'completed');
    const matches = [
      ...upcoming.slice(0, 10).map(({ e }) => {
        const [a, b] = e.match?.teams || [];
        const d = new Date(e.startTime);
        const h = normalizeCode(a?.code) || '', w = normalizeCode(b?.code) || '';
        return { league: 'LCK', stage: e.blockName || '', date: dateLabelKST(d), time: timeLabelKST(d), startTime: d.toISOString(), home: h, away: w, homeColor: TEAM_COLOR[h] || '#999', awayColor: TEAM_COLOR[w] || '#999' };
      }),
      ...worldsUp.map((m) => ({ league: 'WORLDS', stage: m.stage, date: m.date, time: m.time, startTime: m.startTime, home: m.home, away: m.away, homeColor: TEAM_COLOR[m.home] || '#888', awayColor: TEAM_COLOR[m.away] || '#888' })),
    ].sort((x, y) => x.startTime.localeCompare(y.startTime));
    save('matches.json', matches);
    results.matches = true;
    console.log(`  ✓ matches.json — ${matches.length}경기`);
  } catch (e) { console.error('  ✗ matches', e); }

  // 4) 선수·챔피언 통계
  try {
    const champKo = await loadChampNames();
    const { players, champs, totalGames, verifiedRate } = await buildPlayerStats(eventsByTournament);
    if (totalGames > 20 && verifiedRate > 0.7) {
      const list = Object.values(players).filter((p) => p.games >= 10).map((p) => {
        const champList = Object.entries(p.champs).sort((a, b) => b[1].games - a[1].games).slice(0, 5)
          .map(([id, c]) => ({ kor: champKo[id] || id, eng: id, games: c.games, wr: Math.round((c.wins / c.games) * 100), kda: kda(c.k, c.d, c.a) }));
        return {
          name: p.name, kor: NICK_KO[p.name] || p.name, team: p.team, pos: p.pos,
          games: p.games, wins: p.wins, losses: p.games - p.wins,
          wr: Math.round((p.wins / p.games) * 100),
          kda: kda(p.k, p.d, p.a), kills: p.k, deaths: p.d, assists: p.a,
          kpRate: Math.round(((p.k + p.a) / Math.max(1, p.teamKills)) * 100) / 100,
          champions: champList,
        };
      });
      // 순위 = KDA 순 (출전 10세트 이상)
      list.sort((a, b) => b.kda - a.kda);
      const ranked = list.map((p, i) => ({ rank: i + 1, ...p }));
      // 새 형식은 players2.json / meta2.json 에 저장 (이미 출시된 이전 버전 앱이 읽는 players.json·meta.json·faker.json 은 건드리지 않아요)
      save('players2.json', ranked);
      const faker = ranked.find((p) => p.name.toLowerCase() === 'faker');
      const metaGamesBase = totalGames; // 세트 수 (한 세트에 각 팀이 챔피언 1개씩)
      const meta = Object.entries(champs).filter(([, c]) => c.picks >= 5).map(([id, c]) => ({
        kor: champKo[id] || id, eng: id,
        picks: c.picks,
        pickRate: Math.round((c.picks / metaGamesBase) * 100),
        wr: Math.round((c.wins / c.picks) * 100),
      })).sort((a, b) => b.picks - a.picks).slice(0, 20);
      save('meta2.json', meta);
      results.players = true;
      console.log(`  ✓ players2.json ${ranked.length}명, meta2.json ${meta.length}개 (세트 ${totalGames}, 승자검증 ${(verifiedRate * 100).toFixed(0)}%)`);
      console.log(`    KDA 1위 ${ranked[0]?.name} ${ranked[0]?.kda} / 페이커 ${faker?.games}세트 ${faker?.wins}승 KDA ${faker?.kda}`);
    } else {
      console.warn(`  ⚠ 선수 통계 건너뜀 (세트 ${totalGames}, 검증 ${verifiedRate})`);
    }
  } catch (e) { console.error('  ✗ players', e); }

  const now = new Date();
  save('updated.json', {
    updatedAt: now.toISOString(),
    updatedAtKST: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    tournament: `LCK ${season.year}`,
    success: Object.keys(results).length, total: 5,
  });
  console.log(`\n=== 완료: ${Object.keys(results).join(', ')} ===`);
  if (!results.standings) process.exit(1);
}

main().catch((e) => {
  console.error('❌ 치명적 오류:', e);
  process.exit(1);
});
