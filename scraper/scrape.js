// ─────────────────────────────────────────────────────────────────────────────
// LCK 자동 스크래퍼 v2.3
// 데이터 소스: Leaguepedia Cargo API (lol.fandom.com/api.php)
//
// 4섹션 모두 자동화:
//   1) standings.json - 순위 + 최근 5경기 form + 분당 골드차(GDM)
//   2) matches.json   - 다음 경기 일정 (KST 변환)
//   3) faker.json     - Faker 선수 시즌 통계 + 챔피언 사용 기록
//   4) meta.json      - 토너먼트 픽/밴 메타 챔피언 통계
//
// v2.3 변경점:
//   - URL을 직접 빌드 (URLSearchParams 의존 제거 → 따옴표/공백 인코딩 일관)
//   - 토너먼트 후보를 직접 probe해서 실데이터 있는 것 자동 채택
//   - 첫 호출 본문을 그대로 출력 (Cargo 응답 직접 확인 가능)
//
// 토너먼트 결정 우선순위:
//   1. 환경변수 LCK_TOURNAMENT
//   2. TOURNAMENT_CANDIDATES 리스트를 순서대로 probe해서 데이터 있는 첫 항목
//   3. Tournaments 테이블 자동 검색 (League="LCK" + 연도 필터)
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수로 명시 지정 가능. 비어있으면 자동 해결.
const MANUAL_TOURNAMENT = process.env.LCK_TOURNAMENT || '';
const TARGET_YEAR = process.env.LCK_YEAR || '2026';

let TOURNAMENT = MANUAL_TOURNAMENT;
const FAKER_LINK = 'Faker'; // Leaguepedia 선수 페이지 링크 (보통 그냥 'Faker')

// 토너먼트 후보 - 위에서부터 시도해서 실데이터 있는 첫 항목을 채택.
// 시즌이 바뀌어도 이 리스트만 업데이트하면 됨.
const TOURNAMENT_CANDIDATES = [
  // 2026 Rounds 1-2 (현재 진행 중)
  'LCK 2026 Rounds 1-2',
  'LCK/2026 Season/Rounds 1-2',
  // 2026 Rounds 3-4 (다음)
  'LCK 2026 Rounds 3-4',
  'LCK/2026 Season/Rounds 3-4',
  // 2026 Road to MSI
  'LCK 2026 Road to MSI',
  'LCK/2026 Season/Road to MSI',
  // 2026 Cup
  'LCK Cup 2026',
  'LCK/2026 Season/Cup',
  // 2026 Playoffs
  'LCK 2026 Season Playoffs',
  'LCK/2026 Season/Season Playoffs',
];

const API_BASE = 'https://lol.fandom.com/api.php';
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// ─── 팀 메타 (Leaguepedia 영문명 → 앱 표시) ──────────────────────────────
const TEAM_META = {
  'Hanwha Life Esports':  { abbr: 'HLE', kor: '한화생명e스포츠',   color: '#F37021' },
  'KT Rolster':           { abbr: 'KT',  kor: 'KT 롤스터',         color: '#FF0000' },
  'Gen.G':                { abbr: 'GEN', kor: '젠지',              color: '#AA8B56' },
  'T1':                   { abbr: 'T1',  kor: 'T1',                color: '#E2012D' },
  'Dplus KIA':            { abbr: 'DK',  kor: '디플러스 기아',     color: '#1B1F3F' },
  'Nongshim RedForce':    { abbr: 'NS',  kor: '농심 레드포스',     color: '#D62E36' },
  'BNK FearX':            { abbr: 'BNK', kor: 'BNK FEARX',         color: '#A8B5C0' },
  'OK Wave Brion':        { abbr: 'BRO', kor: 'OK저축은행 브리온', color: '#80C242' },
  'OKSavingsBank Brion':  { abbr: 'BRO', kor: 'OK저축은행 브리온', color: '#80C242' },
  'DRX':                  { abbr: 'DRX', kor: 'DRX',               color: '#1A78D2' },
  'DN Freecs':            { abbr: 'DN',  kor: 'DN FREECS',         color: '#FE5000' },
  'DenAir Freecs':        { abbr: 'DN',  kor: 'DN FREECS',         color: '#FE5000' },
};

// ─── 챔피언 한글명 매핑 (자주 등장하는 것만, 누락은 영문 사용) ─────────────
const CHAMP_KOR = {
  Aatrox: '아트록스', Ahri: '아리', Akali: '아칼리', Akshan: '아크샨',
  Alistar: '알리스타', Amumu: '아무무', Anivia: '애니비아', Annie: '애니',
  Aphelios: '아펠리오스', Ashe: '애쉬', AurelionSol: '아우렐리온 솔', 'Aurelion Sol': '아우렐리온 솔',
  Aurora: '아우로라', Azir: '아지르', Bard: '바드', BelVeth: '벨베스', "Bel'Veth": '벨베스',
  Blitzcrank: '블리츠크랭크', Brand: '브랜드', Braum: '브라움', Briar: '브라이어',
  Caitlyn: '케이틀린', Camille: '카밀', Cassiopeia: '카시오페아', ChoGath: '초가스', "Cho'Gath": '초가스',
  Corki: '코르키', Darius: '다리우스', Diana: '다이애나', DrMundo: '문도 박사', 'Dr. Mundo': '문도 박사',
  Draven: '드레이븐', Ekko: '에코', Elise: '엘리스', Evelynn: '이블린', Ezreal: '이즈리얼',
  Fiddlesticks: '피들스틱', Fiora: '피오라', Fizz: '피즈', Galio: '갈리오', Gangplank: '갱플랭크',
  Garen: '가렌', Gnar: '나르', Gragas: '그라가스', Graves: '그레이브즈', Gwen: '그웬',
  Hecarim: '헤카림', Heimerdinger: '하이머딩거', Hwei: '흐웨이', Illaoi: '일라오이', Irelia: '이렐리아',
  Ivern: '아이번', Janna: '잔나', JarvanIV: '자르반 4세', 'Jarvan IV': '자르반 4세',
  Jax: '잭스', Jayce: '제이스', Jhin: '진', Jinx: '징크스', KaiSa: '카이사', "Kai'Sa": '카이사',
  Kalista: '칼리스타', Karma: '카르마', Karthus: '카서스', Kassadin: '카사딘', Katarina: '카타리나',
  Kayle: '케일', Kayn: '케인', Kennen: '케넨', KhaZix: '카직스', "Kha'Zix": '카직스',
  Kindred: '킨드레드', Kled: '클레드', KogMaw: '코그모', "Kog'Maw": '코그모', KSante: '크산테', "K'Sante": '크산테',
  LeBlanc: '르블랑', LeeSin: '리 신', 'Lee Sin': '리 신', Leona: '레오나', Lillia: '릴리아',
  Lissandra: '리산드라', Lucian: '루시안', Lulu: '룰루', Lux: '럭스', Malphite: '말파이트',
  Malzahar: '말자하', Maokai: '마오카이', MasterYi: '마스터 이', 'Master Yi': '마스터 이',
  Milio: '밀리오', MissFortune: '미스 포츈', 'Miss Fortune': '미스 포츈', Mordekaiser: '모르데카이저',
  Morgana: '모르가나', Naafiri: '나피리', Nami: '나미', Nasus: '나서스', Nautilus: '노틸러스',
  Neeko: '니코', Nidalee: '니달리', Nilah: '닐라', Nocturne: '녹턴', NunuWillump: '누누와 윌럼프',
  Olaf: '올라프', Orianna: '오리아나', Ornn: '오른', Pantheon: '판테온', Poppy: '뽀삐',
  Pyke: '파이크', Qiyana: '키아나', Quinn: '퀸', Rakan: '라칸', Rammus: '람머스',
  RekSai: '렉사이', "Rek'Sai": '렉사이', Rell: '렐', Renata: '레나타', RenataGlasc: '레나타 글라스크',
  'Renata Glasc': '레나타 글라스크', Renekton: '레넥톤', Rengar: '렝가', Riven: '리븐', Rumble: '럼블',
  Ryze: '라이즈', Samira: '사미라', Sejuani: '세주아니', Senna: '세나', Seraphine: '세라핀',
  Sett: '세트', Shaco: '샤코', Shen: '쉔', Shyvana: '쉬바나', Singed: '신지드',
  Sion: '사이온', Sivir: '시비르', Skarner: '스카너', Smolder: '스몰더', Sona: '소나',
  Soraka: '소라카', Swain: '스웨인', Sylas: '실라스', Syndra: '신드라', TahmKench: '탐 켄치',
  'Tahm Kench': '탐 켄치', Taliyah: '탈리야', Talon: '탈론', Taric: '타릭', Teemo: '티모',
  Thresh: '쓰레쉬', Tristana: '트리스타나', Trundle: '트런들', Tryndamere: '트린다미어',
  TwistedFate: '트위스티드 페이트', 'Twisted Fate': '트위스티드 페이트', Twitch: '트위치',
  Udyr: '우디르', Urgot: '우르곳', Varus: '바루스', Vayne: '베인', Veigar: '베이가',
  VelKoz: '벨코즈', "Vel'Koz": '벨코즈', Vex: '벡스', Vi: '바이', Viego: '비에고',
  Viktor: '빅토르', Vladimir: '블라디미르', Volibear: '볼리베어', Warwick: '워윅', Wukong: '오공',
  Xayah: '자야', Xerath: '제라스', XinZhao: '신 짜오', 'Xin Zhao': '신 짜오',
  Yasuo: '야스오', Yone: '요네', Yorick: '요릭', Yuumi: '유미', Zac: '자크',
  Zed: '제드', Zeri: '제리', Ziggs: '직스', Zilean: '질리언', Zoe: '조이', Zyra: '자이라',
};

// 포지션 한글
const ROLE_KOR = {
  Top: '탑', Jungle: '정글', Middle: '미드', Mid: '미드', Bot: '원딜', ADC: '원딜', Support: '서폿',
};

// ─── 유틸 ──────────────────────────────────────────────────────────────
function korChamp(eng) {
  if (!eng) return '';
  return CHAMP_KOR[eng] || eng;
}

// 글로벌 호출 간격 - 모든 fetchJson 사이 최소 2초 (rate limit 회피)
let _lastFetchTime = 0;
const MIN_CALL_GAP_MS = 2000;

async function fetchJson(url, retries = 3, debug = false) {
  // 직전 호출에서 최소 간격이 안 지났으면 그만큼 기다림
  if (_lastFetchTime > 0) {
    const elapsed = Date.now() - _lastFetchTime;
    if (elapsed < MIN_CALL_GAP_MS) {
      await new Promise((r) => setTimeout(r, MIN_CALL_GAP_MS - elapsed));
    }
  }
  _lastFetchTime = Date.now();

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'lck-app/2.3 (https://github.com/officealone00/lck-app)',
          'Accept': 'application/json',
        },
      });
      if (debug) console.log(`    [debug] HTTP ${res.status} ${res.statusText}`);
      if (!res.ok) {
        const body = await res.text();
        if (debug) console.log(`    [debug] body: ${body.slice(0, 300)}`);
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      if (debug) console.log(`    [debug] body 앞부분: ${text.slice(0, 400)}`);
      const data = JSON.parse(text);

      // Leaguepedia rate limit 응답 처리 (HTTP 200으로 오는 application-level 에러)
      if (data && data.error && data.error.code === 'ratelimited') {
        const waitSec = 60;
        console.log(`    ⏳ Cargo rate limit. ${waitSec}초 대기 후 재시도 (${i + 1}/${retries})`);
        if (i === retries - 1) return data; // 마지막 시도면 에러 그대로 반환
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        _lastFetchTime = Date.now();
        continue;
      }
      return data;
    } catch (e) {
      console.log(`    재시도 ${i + 1}/${retries}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

// 호출 간 의도적 간격 (rate limit 회피 - 보조용)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CALL_DELAY_MS = 3000;

// URL을 직접 빌드 - URLSearchParams의 따옴표/공백 인코딩 차이를 제거.
// 모든 값을 명시적 encodeURIComponent로 처리.
function buildCargoUrl(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return `${API_BASE}?${parts.join('&')}`;
}

let _firstCallLogged = false;

// Cargo API 페이지네이션 헬퍼 (rate limit 회피용 호출 간 sleep 포함)
async function cargoQueryAll(table, fields, where, orderBy = '', perPage = 500, maxPages = 2) {
  const all = [];
  for (let page = 0; page < maxPages; page++) {
    if (page > 0 || all.length > 0) await sleep(CALL_DELAY_MS);

    const offset = page * perPage;
    const url = buildCargoUrl({
      action: 'cargoquery',
      format: 'json',
      tables: table,
      fields,
      where,
      order_by: orderBy,
      limit: String(perPage),
      offset: String(offset),
    });

    // 첫 호출에 한해서 응답 본문 일부를 콘솔에 그대로 노출
    const debug = !_firstCallLogged;
    if (debug) {
      _firstCallLogged = true;
      console.log(`    [debug 첫 호출] ${url}`);
    }

    const data = await fetchJson(url, 3, debug);
    if (data && data.error) {
      console.log(`    Cargo API 에러: ${JSON.stringify(data.error).slice(0, 200)}`);
      break;
    }
    const rows = (data && data.cargoquery) || [];
    all.push(...rows.map((r) => r.title));
    if (rows.length < perPage) break;
  }
  return all;
}

// 후보 OverviewPage 값을 직접 시도해서 실데이터 있는 첫 항목 반환
async function probeCandidate(candidate) {
  const url = buildCargoUrl({
    action: 'cargoquery',
    format: 'json',
    tables: 'Standings',
    fields: 'OverviewPage,Team,Place',
    where: `Standings.OverviewPage="${candidate}"`,
    limit: '5',
  });
  try {
    const data = await fetchJson(url, 2, false);
    const rows = (data && data.cargoquery) || [];
    return rows.length;
  } catch (e) {
    return -1; // 에러
  }
}

// ─── 1. 순위 (form + GDM 포함) ─────────────────────────────────────────
async function scrapeStandings() {
  console.log('\n[1/4] 순위 데이터 수집');

  // 기본 순위
  const standingsRows = await cargoQueryAll(
    'Standings',
    'Team,Place,WinSeries,LossSeries,WinGames,LossGames',
    `Standings.OverviewPage="${TOURNAMENT}"`,
    'Standings.Place ASC',
    50,
    1
  );
  if (standingsRows.length === 0) {
    console.log('    ⚠️  Standings 비어있음');
    return null;
  }

  // 게임 단위 결과 (form 계산용) - 시간순 정렬
  let gameRows = [];
  try {
    gameRows = await cargoQueryAll(
      'ScoreboardGames',
      'Team1,Team2,Winner,DateTime_UTC,Gamelength_Number,Team1Gold,Team2Gold',
      `ScoreboardGames.OverviewPage="${TOURNAMENT}"`,
      'ScoreboardGames.DateTime_UTC ASC',
      500,
      2
    );
    console.log(`    ScoreboardGames ${gameRows.length}경기`);
  } catch (e) {
    console.log(`    ScoreboardGames 실패 (form/gdm 0으로 채움): ${e.message}`);
  }

  // 팀별 form / GDM 집계
  const teamStats = {}; // fullName -> { form: [], goldDiffs: [] }
  for (const g of gameRows) {
    const t1 = g.Team1, t2 = g.Team2;
    const winner = parseInt(g.Winner, 10); // 1 or 2
    if (!t1 || !t2 || (winner !== 1 && winner !== 2)) continue;

    const t1Gold = parseFloat(g.Team1Gold) || 0;
    const t2Gold = parseFloat(g.Team2Gold) || 0;
    const lengthMin = parseFloat(g['Gamelength Number'] || g.Gamelength_Number) || 0;

    if (!teamStats[t1]) teamStats[t1] = { form: [], goldDiffs: [] };
    if (!teamStats[t2]) teamStats[t2] = { form: [], goldDiffs: [] };

    teamStats[t1].form.push(winner === 1 ? 'W' : 'L');
    teamStats[t2].form.push(winner === 2 ? 'W' : 'L');

    if (lengthMin > 0 && t1Gold > 0 && t2Gold > 0) {
      teamStats[t1].goldDiffs.push((t1Gold - t2Gold) / lengthMin);
      teamStats[t2].goldDiffs.push((t2Gold - t1Gold) / lengthMin);
    }
  }

  const teams = standingsRows
    .map((t) => {
      const fullName = t.Team || '';
      const meta = TEAM_META[fullName] || {
        abbr: fullName.substring(0, 3).toUpperCase(),
        kor: fullName,
        color: '#888888',
      };
      const w = parseInt(t.WinGames, 10) || 0;
      const l = parseInt(t.LossGames, 10) || 0;
      const total = w + l;
      const wr = total > 0 ? Math.round((w / total) * 100) : 0;

      const stat = teamStats[fullName] || { form: [], goldDiffs: [] };
      const last5 = stat.form.slice(-5);
      const avgGdm = stat.goldDiffs.length > 0
        ? Math.round(stat.goldDiffs.reduce((s, x) => s + x, 0) / stat.goldDiffs.length)
        : 0;

      return {
        rank: parseInt(t.Place, 10) || 0,
        abbr: meta.abbr,
        kor: meta.kor,
        color: meta.color,
        wr,
        w,
        l,
        gdm: avgGdm,
        form: last5.length > 0 ? last5 : ['-', '-', '-', '-', '-'],
      };
    })
    .filter((t) => t.rank > 0)
    .sort((a, b) => a.rank - b.rank);

  console.log(`    ✅ ${teams.length}팀`);
  return teams;
}

// ─── 2. 매치 (KST 라벨/시각) ───────────────────────────────────────────
async function scrapeMatches() {
  console.log('\n[2/4] 다가오는 경기 수집');

  const rows = await cargoQueryAll(
    'MatchSchedule',
    'Team1,Team2,DateTime_UTC,Winner,Tab,Team1Score,Team2Score',
    `MatchSchedule.OverviewPage="${TOURNAMENT}"`,
    'MatchSchedule.DateTime_UTC ASC',
    500,
    1
  );
  if (rows.length === 0) {
    console.log('    ⚠️  MatchSchedule 비어있음');
    return null;
  }

  const now = new Date();
  const todayKst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  todayKst.setHours(0, 0, 0, 0);

  const out = [];
  for (const t of rows) {
    const dateStr = t['DateTime UTC'] || t.DateTime_UTC;
    if (!dateStr || !t.Team1 || !t.Team2) continue;

    const matchUtc = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(matchUtc.getTime())) continue;
    if (matchUtc <= now) continue;

    const m1 = TEAM_META[t.Team1];
    const m2 = TEAM_META[t.Team2];
    if (!m1 || !m2) continue;

    // KST 변환
    const kstStr = matchUtc.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    const kstDate = new Date(kstStr);
    const kstMidnight = new Date(kstDate);
    kstMidnight.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((kstMidnight - todayKst) / 86400000);

    let dateLabel;
    if (dayDiff === 0) dateLabel = '오늘';
    else if (dayDiff === 1) dateLabel = '내일';
    else if (dayDiff === 2) dateLabel = '모레';
    else dateLabel = `${kstDate.getMonth() + 1}/${kstDate.getDate()}`;

    const hh = String(kstDate.getHours()).padStart(2, '0');
    const mm = String(kstDate.getMinutes()).padStart(2, '0');

    out.push({
      date: dateLabel,
      time: `${hh}:${mm}`,
      home: m1.abbr,
      away: m2.abbr,
      homeColor: m1.color,
      awayColor: m2.color,
    });

    if (out.length >= 8) break;
  }

  console.log(`    ✅ ${out.length}경기`);
  return out;
}

// ─── 3. Faker 통계 ─────────────────────────────────────────────────────
async function scrapeFaker() {
  console.log('\n[3/4] Faker 시즌 통계 수집');

  // ScoreboardPlayers: Faker가 출전한 모든 게임의 KDA/CS/Gold/챔피언/승패
  const where =
    `ScoreboardPlayers.OverviewPage="${TOURNAMENT}"` +
    ` AND ScoreboardPlayers.Link="${FAKER_LINK}"`;
  const rows = await cargoQueryAll(
    'ScoreboardPlayers=SP, ScoreboardGames=SG',
    [
      'SP.Champion=Champion',
      'SP.Kills=Kills',
      'SP.Deaths=Deaths',
      'SP.Assists=Assists',
      'SP.CS=CS',
      'SP.Gold=Gold',
      'SP.PlayerWin=Win',
      'SG.Gamelength_Number=GameLength',
    ].join(','),
    where + ' AND SP.GameId=SG.GameId',
    'SP.DateTime_UTC ASC',
    500,
    2
  );

  if (rows.length === 0) {
    // 폴백: ScoreboardGames join 없이 ScoreboardPlayers만
    console.log('    조인 쿼리 실패, 단일 테이블로 재시도');
    const simpleRows = await cargoQueryAll(
      'ScoreboardPlayers',
      'Champion,Kills,Deaths,Assists,CS,Gold,PlayerWin,Gamelength_Number',
      where,
      'ScoreboardPlayers.DateTime_UTC ASC',
      500,
      2
    );
    if (simpleRows.length === 0) {
      console.log('    ⚠️  Faker 데이터 없음');
      return null;
    }
    rows.push(
      ...simpleRows.map((r) => ({
        Champion: r.Champion,
        Kills: r.Kills,
        Deaths: r.Deaths,
        Assists: r.Assists,
        CS: r.CS,
        Gold: r.Gold,
        Win: r.PlayerWin,
        GameLength: r['Gamelength Number'] || r.Gamelength_Number,
      }))
    );
  }

  const games = rows.length;
  let wins = 0;
  let totalK = 0, totalD = 0, totalA = 0, totalCs = 0, totalGold = 0, totalLen = 0;
  const champStats = {}; // eng -> { games, wins, k, d, a }

  for (const r of rows) {
    const winFlag = String(r.Win || '').toLowerCase();
    const isWin = winFlag === 'yes' || winFlag === '1' || winFlag === 'true';
    if (isWin) wins++;

    const k = parseFloat(r.Kills) || 0;
    const d = parseFloat(r.Deaths) || 0;
    const a = parseFloat(r.Assists) || 0;
    const cs = parseFloat(r.CS) || 0;
    const gold = parseFloat(r.Gold) || 0;
    const len = parseFloat(r.GameLength) || 0;

    totalK += k; totalD += d; totalA += a;
    totalCs += cs; totalGold += gold; totalLen += len;

    const champ = r.Champion || 'Unknown';
    if (!champStats[champ]) champStats[champ] = { games: 0, wins: 0, k: 0, d: 0, a: 0 };
    const cs2 = champStats[champ];
    cs2.games++;
    if (isWin) cs2.wins++;
    cs2.k += k; cs2.d += d; cs2.a += a;
  }

  const losses = games - wins;
  const wr = games > 0 ? Math.round((wins / games) * 1000) / 10 : 0;
  const kda = totalD > 0
    ? Math.round(((totalK + totalA) / totalD) * 10) / 10
    : Math.round((totalK + totalA) * 10) / 10;
  const csm = totalLen > 0 ? Math.round((totalCs / totalLen) * 10) / 10 : 0;
  const gpm = totalLen > 0 ? Math.round(totalGold / totalLen) : 0;

  const champions = Object.entries(champStats)
    .map(([eng, s]) => ({
      kor: korChamp(eng),
      eng,
      games: s.games,
      wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      kda: s.d > 0
        ? Math.round(((s.k + s.a) / s.d) * 10) / 10
        : Math.round((s.k + s.a) * 10) / 10,
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 6);

  const out = {
    name: 'FAKER',
    kor: '페이커',
    team: 'T1',
    pos: 'MID',
    wr,
    kda,
    csm,
    gpm,
    games,
    wins,
    losses,
    champions,
  };

  console.log(`    ✅ ${games}경기 ${wins}승 ${losses}패 / 챔프 ${champions.length}종`);
  return out;
}

// ─── 4. 메타 챔피언 (픽/밴) ────────────────────────────────────────────
// ScoreboardGames의 Team1Picks/Team2Picks/Team1Bans/Team2Bans (List of String) 사용.
// PicksAndBansS7 테이블보다 더 안정적 (form/GDM 계산과 동일한 소스).
async function scrapeMeta() {
  console.log('\n[4/4] 메타 챔피언 수집 (ScoreboardGames)');

  const pbRows = await cargoQueryAll(
    'ScoreboardGames',
    'Team1,Team2,Winner,Team1Picks,Team2Picks,Team1Bans,Team2Bans',
    `ScoreboardGames.OverviewPage="${TOURNAMENT}"`,
    'ScoreboardGames.DateTime_UTC ASC',
    500,
    2
  );

  if (pbRows.length === 0) {
    console.log('    ⚠️  ScoreboardGames 비어있음');
    return null;
  }

  const totalGames = pbRows.length;
  const champStats = {}; // eng -> { picks, bans, wins }

  const splitChamps = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

  for (const row of pbRows) {
    const winner = parseInt(row.Winner, 10); // 1 or 2

    const t1Picks = splitChamps(row.Team1Picks);
    const t2Picks = splitChamps(row.Team2Picks);
    const t1Bans = splitChamps(row.Team1Bans);
    const t2Bans = splitChamps(row.Team2Bans);

    const tally = (eng, kind, isWin) => {
      if (!champStats[eng]) champStats[eng] = { picks: 0, bans: 0, wins: 0 };
      champStats[eng][kind]++;
      if (kind === 'picks' && isWin) champStats[eng].wins++;
    };

    for (const c of t1Picks) tally(c, 'picks', winner === 1);
    for (const c of t2Picks) tally(c, 'picks', winner === 2);
    for (const c of t1Bans) tally(c, 'bans', false);
    for (const c of t2Bans) tally(c, 'bans', false);
  }

  // 상위 챔피언 추출 (P+B 합산 기준)
  const champArr = Object.entries(champStats)
    .map(([eng, s]) => ({
      kor: korChamp(eng),
      eng,
      pickRate: totalGames > 0 ? Math.round((s.picks / totalGames) * 100) : 0,
      banRate: totalGames > 0 ? Math.round((s.bans / totalGames) * 100) : 0,
      wr: s.picks > 0 ? Math.round((s.wins / s.picks) * 100) : 0,
      role: '',
      _score: s.picks + s.bans,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 12)
    .map(({ _score, ...c }) => c);

  console.log(`    ✅ ${totalGames}경기 / 메타 챔프 ${champArr.length}종`);
  return champArr;
}

// ─── 토너먼트 자동 해결 ─────────────────────────────────────────────────
async function resolveTournament() {
  if (TOURNAMENT) {
    console.log(`📌 환경변수로 지정된 TOURNAMENT: "${TOURNAMENT}"`);
    return true;
  }

  console.log(`🔍 토너먼트 후보 probe (실데이터 있는 OverviewPage 자동 채택)`);

  // 1단계: 후보 리스트를 순서대로 probe
  for (const cand of TOURNAMENT_CANDIDATES) {
    const n = await probeCandidate(cand);
    const tag = n > 0 ? '✓' : (n === 0 ? '·' : 'x');
    console.log(`   ${tag} "${cand}" → ${n >= 0 ? n + '건' : '에러'}`);
    if (n > 0) {
      TOURNAMENT = cand;
      console.log(`\n✅ 채택: "${TOURNAMENT}"\n`);
      return true;
    }
  }

  // 2단계: Tournaments 테이블 동적 검색 (League 등호)
  console.log('\n   후보 모두 실패. Tournaments 테이블 직접 검색...');
  let rows = [];
  try {
    rows = await cargoQueryAll(
      'Tournaments',
      'OverviewPage,Year,Split,DateStart',
      'Tournaments.League="LCK"',
      'Tournaments.DateStart DESC',
      30, 1
    );
  } catch (e) {
    console.log(`   League="LCK" 쿼리 에러: ${e.message}`);
  }

  if (rows.length > 0) {
    // TARGET_YEAR과 매칭
    const matching = rows.filter((r) => {
      const y = String(r.Year || '');
      const ds = String(r.DateStart || '');
      return y === TARGET_YEAR || ds.startsWith(TARGET_YEAR);
    });
    console.log(`\n   Tournaments 테이블 LCK 항목: ${rows.length}개 (${TARGET_YEAR}: ${matching.length}개)`);
    rows.slice(0, 15).forEach((r) => {
      const start = (r.DateStart || '').slice(0, 10);
      console.log(`     "${r.OverviewPage}"  Year=${r.Year}  ${start}`);
    });

    // 매칭된 것 중 가장 최근 시작된 것 시도
    const target = matching[0] || rows[0];
    if (target && target.OverviewPage) {
      const n = await probeCandidate(target.OverviewPage);
      console.log(`\n   "${target.OverviewPage}" probe → ${n >= 0 ? n + '건' : '에러'}`);
      if (n > 0) {
        TOURNAMENT = target.OverviewPage;
        console.log(`\n✅ 채택: "${TOURNAMENT}"\n`);
        return true;
      }
    }
  }

  return false;
}

// ─── 자가 진단 (resolveTournament 실패 시) ─────────────────────────────
async function suggestTournamentNames() {
  console.log('\n💡 디버깅: API 응답 직접 확인');

  // Cargo API 자체 살아있는지 확인 (Champions 1건)
  console.log('\n   [살아있음 체크] Champions 테이블 1건');
  try {
    const url = buildCargoUrl({
      action: 'cargoquery', format: 'json',
      tables: 'Champions', fields: 'Name', limit: '1',
    });
    const data = await fetchJson(url, 1, true);
    const n = (data && data.cargoquery || []).length;
    console.log(`   → ${n}건`);
    if (n === 0) {
      console.log('\n   ⚠️ Cargo API 자체가 빈 응답. 한국 IP 차단 또는 Leaguepedia 장애 가능.');
      console.log('      대안: Liquipedia로 데이터 소스 변경 필요.');
      return;
    }
  } catch (e) {
    console.log(`   에러: ${e.message}`);
    return;
  }

  // 최근 LCK 토너먼트 일반 조회
  console.log('\n   [참고] Standings에 데이터가 있는 최근 LCK 토너먼트들');
  try {
    const url = buildCargoUrl({
      action: 'cargoquery', format: 'json',
      tables: 'Standings,Tournaments',
      fields: 'Standings.OverviewPage=op,Standings.Team=team',
      where: 'Tournaments.League="LCK"',
      join_on: 'Standings.OverviewPage=Tournaments.OverviewPage',
      group_by: 'Standings.OverviewPage',
      order_by: 'Tournaments.DateStart DESC',
      limit: '15',
    });
    const data = await fetchJson(url, 1, false);
    const rows = (data && data.cargoquery) || [];
    if (rows.length === 0) {
      console.log('   결과 0건. League="LCK" 조건 자체가 매칭 안됨.');
    } else {
      rows.forEach((r) => console.log(`     "${r.title.op}"`));
    }
  } catch (e) {
    console.log(`   에러: ${e.message}`);
  }
}

// ─── 메인 ──────────────────────────────────────────────────────────────
(async () => {
  console.log(`🏆 LCK Scraper v2.3`);

  // 1단계: TOURNAMENT 자동 해결 (수동 지정시 그대로 사용)
  const resolved = await resolveTournament();
  if (!resolved) {
    console.log('\n❌ 토너먼트 자동 해결 실패');
    await suggestTournamentNames();
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const tasks = [
    { name: 'standings', file: 'standings.json', fn: scrapeStandings, minLen: 5 },
    { name: 'matches',   file: 'matches.json',   fn: scrapeMatches,   minLen: 1 },
    { name: 'faker',     file: 'faker.json',     fn: scrapeFaker,     minLen: 1 },
    { name: 'meta',      file: 'meta.json',      fn: scrapeMeta,      minLen: 3 },
  ];

  let success = 0;
  for (const t of tasks) {
    try {
      const result = await t.fn();
      const len = Array.isArray(result) ? result.length : (result ? 1 : 0);
      if (result && len >= t.minLen) {
        fs.writeFileSync(
          path.join(DATA_DIR, t.file),
          JSON.stringify(result, null, 2)
        );
        success++;
      } else {
        console.log(`    ⚠️  ${t.name} 저장 안함 (기존 파일 유지)`);
      }
    } catch (e) {
      console.log(`    ❌ ${t.name} 에러: ${e.message}`);
    }
  }

  // 갱신 시각은 항상 기록
  fs.writeFileSync(
    path.join(DATA_DIR, 'updated.json'),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        updatedAtKST: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        tournament: TOURNAMENT,
        success,
        total: tasks.length,
      },
      null,
      2
    )
  );

  console.log(`\n=== 완료: ${success}/${tasks.length} ===`);
  if (success === 0) {
    console.log('❌ 모든 스크래핑 실패!');
    console.log(`   현재 TOURNAMENT 값: "${TOURNAMENT}"`);
    await suggestTournamentNames();
    process.exit(1);
  }
  console.log('✅ 정상 완료');
})();
