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
  FALLBACK_FAKER,
  FALLBACK_META,
  FALLBACK_MATCHES,
  FALLBACK_UPDATED,
  FALLBACK_PLAYERS,
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

// ─── 타입 정의 ──────────────────────────────
export interface TeamStanding {
  rank: number;
  abbr: string;
  kor: string;
  color: string;
  wr: number;
  w: number;
  l: number;
  gdm: number;
  form: string[];
}

export interface FakerChamp {
  kor: string;
  eng: string;
  games: number;
  wr: number;
  kda: number;
}

export interface FakerStats {
  name: string;
  kor: string;
  team: string;
  pos: string;
  wr: number;
  kda: number;
  csm: number;
  gpm: number;
  games: number;
  wins: number;
  losses: number;
  champions: FakerChamp[];
}

export interface MetaChamp {
  kor: string;
  eng: string;
  pickRate: number;
  banRate: number;
  wr: number;
  role: string;
}

export interface UpcomingMatch {
  date: string;
  time?: string;
  home: string;
  away: string;
  homeColor?: string;
  awayColor?: string;
  score?: string;
}

export interface UpdatedMeta {
  updatedAt: string;
  updatedAtKST: string;
  tournament: string;
  success: number;
  total: number;
}

export interface PlayerRanking {
  rank: number;
  name: string;        // 영문 닉 (e.g., 'Chovy')
  kor: string;         // 한글 (e.g., '초비')
  team: string;        // 팀 약자 (e.g., 'GEN')
  pos: string;         // 포지션 (MID/AD/SPT/JGL/TOP)
  points: number;      // 네이버 LEGENDS 포인트
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  kpRate: number;      // 킬관여율 (0~1)
  sets: number;        // 출전세트수
}

// ─── API ──────────────────────────────
export const api = {
  standings: () =>
    fetchJsonWithRetry<TeamStanding[]>('public/data/standings.json', FALLBACK_STANDINGS),
  faker: () =>
    fetchJsonWithRetry<FakerStats>('public/data/faker.json', FALLBACK_FAKER),
  meta: () =>
    fetchJsonWithRetry<MetaChamp[]>('public/data/meta.json', FALLBACK_META),
  matches: () =>
    fetchJsonWithRetry<UpcomingMatch[]>('public/data/matches.json', FALLBACK_MATCHES),
  updated: () =>
    fetchJsonWithRetry<UpdatedMeta>('public/data/updated.json', FALLBACK_UPDATED),
  players: () =>
    fetchJsonWithRetry<PlayerRanking[]>('public/data/players.json', FALLBACK_PLAYERS),
};
