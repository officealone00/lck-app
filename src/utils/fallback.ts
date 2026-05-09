// ─────────────────────────────────────────────────────────────────────────────
// LCK 폴백 데이터 (네이버 e스포츠 공식 데이터 기반 - 2026 시즌 Rounds 1-2)
// 출처: https://game.naver.com/esports/record/lck/
// 정기적으로(주 1회) 손으로 업데이트하면 좋음.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TeamStanding,
  FakerStats,
  MetaChamp,
  UpcomingMatch,
  UpdatedMeta,
  PlayerRanking,
} from './api';

// 네이버 e스포츠 LCK 2026 정규시즌 Rounds 1-2 (10팀 풀리그)
export const FALLBACK_STANDINGS: TeamStanding[] = [
  { rank: 1,  abbr: 'HLE', kor: '한화생명e스포츠',  color: '#F37021', wr: 91, w: 10, l: 1,  gdm: 15,  form: ['W','W','W','W','W'] },
  { rank: 2,  abbr: 'GEN', kor: '젠지',             color: '#AA8B56', wr: 75, w: 9,  l: 3,  gdm: 11,  form: ['W','W','L','W','W'] },
  { rank: 3,  abbr: 'KT',  kor: 'KT 롤스터',        color: '#FF0000', wr: 75, w: 9,  l: 3,  gdm: 10,  form: ['W','L','W','W','W'] },
  { rank: 4,  abbr: 'T1',  kor: 'T1',               color: '#E2012D', wr: 64, w: 7,  l: 4,  gdm: 8,   form: ['L','W','W','W','L'] },
  { rank: 5,  abbr: 'DK',  kor: '디플러스 기아',    color: '#1B1F3F', wr: 55, w: 6,  l: 5,  gdm: 3,   form: ['W','L','W','L','W'] },
  { rank: 6,  abbr: 'BRO', kor: '한진 브리온',      color: '#2D5F3F', wr: 42, w: 5,  l: 7,  gdm: -2,  form: ['L','W','L','L','W'] },
  { rank: 7,  abbr: 'BFX', kor: 'BNK FearX',        color: '#FFCC00', wr: 33, w: 4,  l: 8,  gdm: -7,  form: ['L','L','W','L','L'] },
  { rank: 8,  abbr: 'NS',  kor: '농심 레드포스',    color: '#D62E36', wr: 33, w: 4,  l: 8,  gdm: -8,  form: ['L','L','L','W','L'] },
  { rank: 9,  abbr: 'KRX', kor: '키움 DRX',         color: '#FECB00', wr: 27, w: 3,  l: 8,  gdm: -10, form: ['L','L','W','L','L'] },
  { rank: 10, abbr: 'DNS', kor: 'DN SOOPers',       color: '#0099CC', wr: 8,  w: 1,  l: 11, gdm: -20, form: ['L','L','L','L','L'] },
];

// 네이버 e스포츠 LCK 2026 LEGENDS TOP 선수 랭킹
export const FALLBACK_PLAYERS: PlayerRanking[] = [
  { rank: 1, name: 'Chovy',   kor: '초비',     team: 'GEN', pos: 'MID', points: 600, kda: 5.45, kills: 113, deaths: 55, assists: 187, kpRate: 0.67, sets: 27 },
  { rank: 2, name: 'Zeka',    kor: '제카',     team: 'HLE', pos: 'MID', points: 400, kda: 7.81, kills: 143, deaths: 42, assists: 185, kpRate: 0.72, sets: 25 },
  { rank: 2, name: 'Teddy',   kor: '테디',     team: 'BRO', pos: 'AD',  points: 400, kda: 4.26, kills: 134, deaths: 61, assists: 126, kpRate: 0.67, sets: 26 },
  { rank: 4, name: 'Aiming',  kor: '에이밍',   team: 'KT',  pos: 'AD',  points: 300, kda: 6.08, kills: 140, deaths: 50, assists: 164, kpRate: 0.71, sets: 26 },
  { rank: 4, name: 'Keria',   kor: '케리아',   team: 'T1',  pos: 'SPT', points: 300, kda: 5.18, kills: 30,  deaths: 55, assists: 255, kpRate: 0.74, sets: 24 },
  { rank: 4, name: 'Bdd',     kor: '비디디',   team: 'KT',  pos: 'MID', points: 300, kda: 5.03, kills: 111, deaths: 58, assists: 181, kpRate: 0.68, sets: 26 },
  { rank: 4, name: 'Oner',    kor: '오너',     team: 'T1',  pos: 'JGL', points: 300, kda: 3.93, kills: 89,  deaths: 68, assists: 178, kpRate: 0.70, sets: 24 },
  { rank: 4, name: 'Taeyoon', kor: '태윤',     team: 'BFX', pos: 'AD',  points: 300, kda: 3.35, kills: 120, deaths: 83, assists: 158, kpRate: 0.73, sets: 26 },
  { rank: 9, name: 'Delight', kor: '딜라이트', team: 'HLE', pos: 'SPT', points: 200, kda: 5.49, kills: 30,  deaths: 63, assists: 316, kpRate: 0.76, sets: 25 },
];

// 페이커 LCK CUP 2026 통계 (네이버 LEGENDS 정규시즌 외)
export const FALLBACK_FAKER: FakerStats = {
  name: 'FAKER',
  kor: '페이커',
  team: 'T1',
  pos: 'MID',
  wr: 64,
  kda: 4.12,
  csm: 9.2,
  gpm: 428,
  games: 11,
  wins: 7,
  losses: 4,
  champions: [
    { kor: '아지르',   eng: 'Azir',     games: 4, wr: 75, kda: 5.2 },
    { kor: '오리아나', eng: 'Orianna',  games: 3, wr: 67, kda: 4.8 },
    { kor: '갈리오',   eng: 'Galio',    games: 2, wr: 50, kda: 3.1 },
    { kor: '실라스',   eng: 'Sylas',    games: 1, wr: 100, kda: 6.0 },
    { kor: '아우로라', eng: 'Aurora',   games: 1, wr: 0,   kda: 1.5 },
  ],
};

export const FALLBACK_META: MetaChamp[] = [
  { kor: '바루스',   eng: 'Varus',    pickRate: 67, banRate: 45, wr: 58, role: '원딜' },
  { kor: '아지르',   eng: 'Azir',     pickRate: 54, banRate: 32, wr: 62, role: '미드' },
  { kor: '오리아나', eng: 'Orianna',  pickRate: 48, banRate: 38, wr: 56, role: '미드' },
  { kor: '럼블',     eng: 'Rumble',   pickRate: 42, banRate: 50, wr: 51, role: '탑'  },
  { kor: '카르마',   eng: 'Karma',    pickRate: 38, banRate: 33, wr: 54, role: '서폿' },
  { kor: '나미',     eng: 'Nami',     pickRate: 35, banRate: 12, wr: 60, role: '서폿' },
];

export const FALLBACK_MATCHES: UpcomingMatch[] = [
  { date: '오늘',  time: '17:00', home: 'HLE', away: 'GEN', homeColor: '#F37021', awayColor: '#AA8B56' },
  { date: '오늘',  time: '20:00', home: 'T1',  away: 'KT',  homeColor: '#E2012D', awayColor: '#FF0000' },
  { date: '내일',  time: '17:00', home: 'DK',  away: 'BRO', homeColor: '#1B1F3F', awayColor: '#2D5F3F' },
];

export const FALLBACK_UPDATED: UpdatedMeta = {
  updatedAt: new Date().toISOString(),
  updatedAtKST: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
  tournament: 'LCK 2026 정규시즌',
  success: 0,
  total: 5,
};
