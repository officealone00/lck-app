// LCK 2026 Rounds 1-2 폴백 데이터
// 스크래핑 실패 시 사용. gol.gg 2026.05.07 기준 실제 순위.
// 정기적으로 (월 1회) 손으로 업데이트해주면 좋음.

export const FALLBACK_STANDINGS = [
  { rank: 1, code: 'HLE', name: '한화생명e스포츠', fullName: 'Hanwha Life Esports', wins: 20, losses: 5,  winRate: 80, color: '#F37021', gameTime: '', gdm: 0 },
  { rank: 2, code: 'KT',  name: 'KT 롤스터',       fullName: 'KT Rolster',          wins: 17, losses: 6,  winRate: 74, color: '#FF0000', gameTime: '', gdm: 0 },
  { rank: 3, code: 'GEN', name: '젠지',            fullName: 'Gen.G',               wins: 17, losses: 8,  winRate: 68, color: '#AA8B56', gameTime: '', gdm: 0 },
  { rank: 4, code: 'T1',  name: 'T1',              fullName: 'T1',                  wins: 14, losses: 8,  winRate: 64, color: '#E2012D', gameTime: '', gdm: 0 },
  { rank: 5, code: 'DK',  name: '디플러스 기아',   fullName: 'Dplus KIA',           wins: 14, losses: 10, winRate: 58, color: '#1B1F3F', gameTime: '', gdm: 0 },
  { rank: 6, code: 'NS',  name: '농심 레드포스',   fullName: 'Nongshim RedForce',   wins: 11, losses: 12, winRate: 48, color: '#D62E36', gameTime: '', gdm: 0 },
  { rank: 7, code: 'BNK', name: 'BNK FEARX',       fullName: 'BNK FearX',           wins: 9,  losses: 14, winRate: 39, color: '#A8B5C0', gameTime: '', gdm: 0 },
  { rank: 8, code: 'BRO', name: 'OK저축은행 브리온', fullName: 'OK Wave Brion',     wins: 8,  losses: 15, winRate: 35, color: '#80C242', gameTime: '', gdm: 0 },
  { rank: 9, code: 'DRX', name: 'DRX',             fullName: 'DRX',                 wins: 6,  losses: 16, winRate: 27, color: '#1A78D2', gameTime: '', gdm: 0 },
  { rank:10, code: 'DN',  name: 'DN FREECS',       fullName: 'DN Freecs',           wins: 4,  losses: 18, winRate: 18, color: '#FE5000', gameTime: '', gdm: 0 },
];

export const FALLBACK_FAKER = {
  name: 'Faker',
  realName: '이상혁',
  team: 'T1',
  position: '미드',
  kda: 4.2,
  winRate: 64,
  championPool: ['아지르', '오리아나', '르블랑', '코르키', '아칼리'],
  recentChampions: [
    { name: '아지르', games: 8, winRate: 75, kda: 4.8 },
    { name: '오리아나', games: 6, winRate: 67, kda: 5.1 },
    { name: '르블랑', games: 4, winRate: 50, kda: 3.2 },
    { name: '코르키', games: 3, winRate: 67, kda: 4.5 },
  ],
};

export const FALLBACK_META = [
  { name: '아지르', pickRate: 78, banRate: 45, winRate: 56, role: '미드' },
  { name: '오리아나', pickRate: 65, banRate: 30, winRate: 54, role: '미드' },
  { name: '비에고', pickRate: 58, banRate: 52, winRate: 51, role: '정글' },
  { name: '자야', pickRate: 55, banRate: 25, winRate: 53, role: '원딜' },
  { name: '나미', pickRate: 52, banRate: 15, winRate: 55, role: '서폿' },
  { name: '오른', pickRate: 48, banRate: 35, winRate: 52, role: '탑' },
  { name: '아칼리', pickRate: 45, banRate: 60, winRate: 49, role: '미드' },
  { name: '카직스', pickRate: 42, banRate: 40, winRate: 50, role: '정글' },
  { name: '제리', pickRate: 40, banRate: 30, winRate: 51, role: '원딜' },
  { name: '레나타 글라스크', pickRate: 38, banRate: 20, winRate: 53, role: '서폿' },
];

export const FALLBACK_MATCHES = [
  { team1: 'HLE', team1Name: '한화생명e스포츠', team1Color: '#F37021', team2: 'T1',  team2Name: 'T1',           team2Color: '#E2012D', date: '', tab: '' },
  { team1: 'GEN', team1Name: '젠지',            team1Color: '#AA8B56', team2: 'KT',  team2Name: 'KT 롤스터',     team2Color: '#FF0000', date: '', tab: '' },
  { team1: 'DK',  team1Name: '디플러스 기아',   team1Color: '#1B1F3F', team2: 'NS',  team2Name: '농심 레드포스', team2Color: '#D62E36', date: '', tab: '' },
];
