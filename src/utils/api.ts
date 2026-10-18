/**
 * LCK 데이터 API
 * GitHub repo의 public/data/*.json을 jsdelivr CDN으로 불러옵니다.
 * - 재시도: 최대 3회 (지수 백오프)
 * - 타임아웃: 8초
 * - 폴백 CDN: jsdelivr 장애 시 raw.githubusercontent
 * - 최종 폴백: 내장 기본 데이터 (빈 화면 방지)
 */

import {
  FALLBACK_STANDINGS,
  FALLBACK_META,
  FALLBACK_MATCHES,
  FALLBACK_UPDATED,
  FALLBACK_PLAYERS,
  FALLBACK_SEASON,
  FALLBACK_WORLDS,
} from './fallback';

const CONFIG = {
  githubUser: 'officealone00',
  repo: 'lck-app',
  branch: 'main',
};

function cdnUrl(path: string): string {
  const { githubUser, repo, branch } = CONFIG;
  return `https://cdn.jsdelivr.net/gh/${githubUser}/${repo}@${branch}/${path}`;
}

function cdnUrlBackup(path: string): string {
  const { githubUser, repo, branch } = CONFIG;
  return `https://raw.githubusercontent.com/${githubUser}/${repo}/${branch}/${path}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithRetry<T>(path: string, fallback: T): Promise<T> {
  const buster = Math.floor(Date.now() / (10 * 60 * 1000));
  const primary = `${cdnUrl(path)}?v=${buster}`;
  const backup = `${cdnUrlBackup(path)}?v=${buster}`;

  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetchWithTimeout(primary);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`[api] jsdelivr 시도 ${i + 1} 실패: ${path}`, e);
    }
    if (i < 2) await sleep(500 * Math.pow(2, i));
  }

  try {
    const res = await fetchWithTimeout(backup);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`[api] raw 폴백 실패: ${path}`, e);
  }

  console.warn(`[api] 모든 요청 실패, 내장 폴백 사용: ${path}`);
  return fallback;
}

// ─── 타입 정의 (2026-10-18 v5 데이터) ──────────────────────────────
export interface TeamStanding {
  rank: number;
  abbr: string;
  kor: string;
  color: string;
  wr: number;
  w: number;
  l: number;
  gdm: number; // 세트 득실
  setW?: number;
  setL?: number;
  form: string[];
  group?: string; // '레전드' | '라이즈'
  groupRank?: number;
}

export interface ChampStat {
  kor: string;
  eng: string;
  games: number;
  wr: number;
  kda: number;
}

export interface PlayerStat {
  rank: number;
  name: string;
  kor: string;
  team: string;
  pos: string;
  games: number;
  wins: number;
  losses: number;
  wr: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  kpRate: number;
  champions: ChampStat[];
}

export interface MetaChamp {
  kor: string;
  eng: string;
  picks: number;
  pickRate: number;
  wr: number;
}

export interface UpcomingMatch {
  league?: string;
  stage?: string;
  date: string;
  time?: string;
  startTime?: string;
  home: string;
  away: string;
  homeColor?: string;
  awayColor?: string;
}

export interface UpdatedMeta {
  updatedAt: string;
  updatedAtKST: string;
  tournament: string;
  success: number;
  total: number;
}

export interface PlayoffMatch {
  date: string;
  startTime: string;
  stage: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

export interface SeasonSummary {
  year: number;
  title: string;
  status: 'ended' | 'ongoing';
  champion: string | null;
  runnerUp: string | null;
  third: string | null;
  finalScore: string;
  regularFirst: string | null;
  playoffs: PlayoffMatch[];
}

export interface WorldsMatch {
  id: string;
  startTime: string;
  stage: string;
  state: string;
  bestOf: number;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface WorldsInfo {
  year: number;
  title: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  startDate: string;
  endDate: string;
  stages: { name: string; start: string }[];
  next: WorldsMatch | null;
  lckTeams: string[];
  lckMatches: WorldsMatch[];
}

// ─── 월즈 실시간 (Riot 공식 lolesports API, 무료·CORS 허용) ──────────────
// 월즈는 미국 시간대라 새벽에 끝나요. 수집기(하루 몇 번)보다 빨리 보여주려고 직접 불러와요.
const LOL_API = 'https://esports-api.lolesports.com/persisted/gw';
const LOL_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const WORLDS_LEAGUE_ID = '98767975604431411';
const CODE_MAP: Record<string, string> = { DPL: 'DK', HAN: 'BRO', BNK: 'BFX', KIW: 'KRX', DN: 'DNS' };
const LCK = new Set(['HLE', 'GEN', 'KT', 'T1', 'DK', 'BRO', 'BFX', 'NS', 'KRX', 'DNS']);
const norm = (c?: string) => (c ? CODE_MAP[c] || c : 'TBD');

async function getLiveWorlds(base: WorldsInfo): Promise<WorldsInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${LOL_API}/getSchedule?hl=ko-KR&leagueId=${WORLDS_LEAGUE_ID}`, {
      headers: { 'x-api-key': LOL_KEY },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const events: any[] = (data?.data?.schedule?.events || []).filter((e: any) => (e.startTime || '') >= base.startDate);
    if (!events.length) return base;
    const all: WorldsMatch[] = events.map((e: any) => {
      const [a, b] = e.match?.teams || [];
      return {
        id: e.match?.id || '',
        startTime: e.startTime,
        stage: e.blockName || '',
        state: e.state,
        bestOf: e.match?.strategy?.count || 1,
        home: norm(a?.code),
        away: norm(b?.code),
        homeName: a?.name || '',
        awayName: b?.name || '',
        homeScore: a?.result?.gameWins ?? null,
        awayScore: b?.result?.gameWins ?? null,
      };
    });
    const now = Date.now();
    const stages: { name: string; start: string }[] = [];
    for (const m of all) if (!stages.find((s) => s.name === m.stage)) stages.push({ name: m.stage, start: m.startTime });
    return {
      ...base,
      stages,
      next: all.find((m) => m.state !== 'completed' && new Date(m.startTime).getTime() > now - 3 * 3600e3) || null,
      lckTeams: [...new Set(all.flatMap((m) => [m.home, m.away]).filter((c) => LCK.has(c)))],
      lckMatches: all.filter((m) => LCK.has(m.home) || LCK.has(m.away)),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── API ──────────────────────────────
export const api = {
  standings: () => fetchJsonWithRetry<TeamStanding[]>('public/data/standings.json', FALLBACK_STANDINGS),
  meta: () => fetchJsonWithRetry<MetaChamp[]>('public/data/meta2.json', FALLBACK_META),
  matches: () => fetchJsonWithRetry<UpcomingMatch[]>('public/data/matches.json', FALLBACK_MATCHES),
  updated: () => fetchJsonWithRetry<UpdatedMeta>('public/data/updated.json', FALLBACK_UPDATED),
  players: () => fetchJsonWithRetry<PlayerStat[]>('public/data/players2.json', FALLBACK_PLAYERS),
  season: () => fetchJsonWithRetry<SeasonSummary>('public/data/season.json', FALLBACK_SEASON),
  worlds: async (): Promise<WorldsInfo> => {
    const base = await fetchJsonWithRetry<WorldsInfo>('public/data/worlds.json', FALLBACK_WORLDS);
    try {
      return await getLiveWorlds(base);
    } catch (e) {
      console.warn('[api] 월즈 실시간 조회 실패 → 저장 데이터 사용', e);
      return base;
    }
  },
};
