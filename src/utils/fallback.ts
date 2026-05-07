// 네트워크 실패 시 사용되는 내장 폴백 데이터

import type {
  TeamStanding,
  FakerStats,
  MetaChamp,
  UpcomingMatch,
  UpdatedMeta,
} from './api';

export const FALLBACK_STANDINGS: TeamStanding[] = [
  { rank: 1, abbr: 'KT', kor: 'KT 롤스터', color: '#FF0000', wr: 89, w: 16, l: 2, gdm: 217, form: ['W','W','W','W','W'] },
  { rank: 2, abbr: 'HLE', kor: '한화생명', color: '#F47B20', wr: 78, w: 14, l: 4, gdm: 233, form: ['W','W','W','L','W'] },
  { rank: 3, abbr: 'GEN', kor: '젠지', color: '#AA8B56', wr: 60, w: 9, l: 6, gdm: 146, form: ['W','L','W','W','L'] },
  { rank: 4, abbr: 'T1', kor: 'T1', color: '#E2012D', wr: 57, w: 8, l: 6, gdm: -18, form: ['L','W','L','W','W'] },
  { rank: 5, abbr: 'NS', kor: '농심 레드포스', color: '#F58220', wr: 56, w: 9, l: 7, gdm: 61, form: ['W','W','L','L','W'] },
  { rank: 6, abbr: 'DK', kor: '디플러스 기아', color: '#0072CE', wr: 56, w: 9, l: 7, gdm: 45, form: ['L','W','W','L','W'] },
  { rank: 7, abbr: 'BNK', kor: 'BNK 피어엑스', color: '#E31837', wr: 33, w: 5, l: 10, gdm: -119, form: ['L','L','W','L','L'] },
  { rank: 8, abbr: 'BRO', kor: '한진 브리온', color: '#102648', wr: 24, w: 4, l: 13, gdm: -149, form: ['L','L','L','W','L'] },
  { rank: 9, abbr: 'DRX', kor: '키움 DRX', color: '#1A4DBA', wr: 24, w: 4, l: 13, gdm: -203, form: ['L','W','L','L','L'] },
  { rank: 10, abbr: 'DN', kor: 'DN 숲퍼스', color: '#FFC629', wr: 14, w: 2, l: 12, gdm: -285, form: ['L','L','L','L','W'] },
];

export const FALLBACK_FAKER: FakerStats = {
  name: 'FAKER',
  kor: '페이커',
  team: 'T1',
  pos: 'MID',
  wr: 78.6,
  kda: 4.1,
  csm: 9.1,
  gpm: 433,
  games: 14,
  wins: 11,
  losses: 3,
  champions: [
    { kor: '라이즈', eng: 'Ryze', games: 5, wr: 60, kda: 4.4 },
    { kor: '아지르', eng: 'Azir', games: 3, wr: 100, kda: 3.5 },
    { kor: '갈리오', eng: 'Galio', games: 2, wr: 100, kda: 3.0 },
    { kor: '실라스', eng: 'Sylas', games: 1, wr: 100, kda: 7.5 },
    { kor: '오리아나', eng: 'Orianna', games: 1, wr: 100, kda: 11.5 },
    { kor: '아우로라', eng: 'Aurora', games: 1, wr: 100, kda: 6.3 },
  ],
};

export const FALLBACK_META: MetaChamp[] = [
  { kor: '바루스', eng: 'Varus', pickRate: 67, banRate: 45, wr: 58, role: '원딜' },
  { kor: '아지르', eng: 'Azir', pickRate: 54, banRate: 32, wr: 62, role: '미드' },
  { kor: '오리아나', eng: 'Orianna', pickRate: 48, banRate: 38, wr: 56, role: '미드' },
  { kor: '럼블', eng: 'Rumble', pickRate: 42, banRate: 50, wr: 51, role: '탑' },
  { kor: '카르마', eng: 'Karma', pickRate: 38, banRate: 33, wr: 54, role: '서폿' },
  { kor: '나미', eng: 'Nami', pickRate: 35, banRate: 12, wr: 60, role: '서폿' },
];

export const FALLBACK_MATCHES: UpcomingMatch[] = [
  { date: '오늘', time: '17:00', home: 'T1', away: 'KT', homeColor: '#E2012D', awayColor: '#FF0000' },
  { date: '오늘', time: '20:00', home: 'GEN', away: 'HLE', homeColor: '#AA8B56', awayColor: '#F47B20' },
  { date: '내일', time: '17:00', home: 'DK', away: 'NS', homeColor: '#0072CE', awayColor: '#F58220' },
];

export const FALLBACK_UPDATED: UpdatedMeta = {
  updatedAt: new Date().toISOString(),
  updatedAtKST: '폴백 데이터',
  tournament: 'LCK 2026 Rounds 1-2',
  success: 0,
  total: 4,
};
