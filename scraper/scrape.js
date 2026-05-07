// scraper/scrape.js
// LCK 데이터를 gol.gg에서 스크래핑 → public/data/*.json 저장
// GitHub Actions cron으로 매일 KST 01:00 자동 실행

const fs = require('fs');
const path = require('path');

// ============ 시즌 설정 (스플릿/시즌 변경 시 여기만 수정) ============
const TOURNAMENT_SLUG = 'LCK%202026%20Rounds%201-2';
const TOURNAMENT_DISPLAY = 'LCK 2026 Rounds 1-2';

// ============ 팀 메타 ============
const TEAM_META = {
  KT: { kor: 'KT 롤스터', color: '#FF0000' },
  HLE: { kor: '한화생명', color: '#F47B20' },
  GEN: { kor: '젠지', color: '#AA8B56' },
  T1: { kor: 'T1', color: '#E2012D' },
  NS: { kor: '농심 레드포스', color: '#F58220' },
  DK: { kor: '디플러스 기아', color: '#0072CE' },
  BNK: { kor: 'BNK 피어엑스', color: '#E31837' },
  BRO: { kor: '한진 브리온', color: '#102648' },
  DRX: { kor: '키움 DRX', color: '#1A4DBA' },
  DN: { kor: 'DN 숲퍼스', color: '#FFC629' },
};

// 페이커 player ID (안정적)
const FAKER_PLAYER_ID = 48;

// ============ 유틸 ============
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fetchHtml(url, attempt = 1) {
  console.log(`[fetch] ${url} (시도 ${attempt})`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    console.warn(`[fetch] 실패: ${e.message}`);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return fetchHtml(url, attempt + 1);
    }
    throw e;
  }
}

function extractRows(html, tableHint) {
  const tableMatch = html.match(
    new RegExp(`<table[^>]*${tableHint}[^>]*>([\\s\\S]*?)</table>`, 'i')
  );
  if (!tableMatch) return [];
  const tbody = tableMatch[1];
  const rows = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRegex.exec(tbody)) !== null) {
    const cells = [];
    const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g;
    let cm;
    while ((cm = cellRegex.exec(m[1])) !== null) {
      const text = cm[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(text);
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function parseInt2(s) {
  const n = parseInt(String(s).replace(/[^\d-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function parseFloat2(s) {
  const n = parseFloat(String(s).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function matchTeamAbbr(teamName) {
  const u = teamName.toUpperCase();
  if (u.includes('KT')) return 'KT';
  if (u.includes('HANWHA') || u.includes('HLE')) return 'HLE';
  if (u.includes('GEN.G') || u.includes('GEN G') || u.includes('GENG') || u.includes('GEN ')) return 'GEN';
  if (u.includes('T1') || u.includes('SK TELECOM')) return 'T1';
  if (u.includes('NONGSHIM') || u.includes('NS ') || u.includes('NS_')) return 'NS';
  if (u.includes('DPLUS') || u.includes('DAMWON') || u.includes('DK ')) return 'DK';
  if (u.includes('BNK') || u.includes('FEARX') || u.includes('FEAR X')) return 'BNK';
  if (u.includes('BRION') || u.includes('BRO ')) return 'BRO';
  if (u.includes('DRX')) return 'DRX';
  if (u.includes('DNF') || u.includes('SOOPERS') || u.includes('DN ')) return 'DN';
  return null;
}

// ============ 1. 순위표 ============
async function scrapeStandings() {
  const url = `https://gol.gg/tournament/tournament-ranking/${TOURNAMENT_SLUG}/`;
  const html = await fetchHtml(url);
  const rows = extractRows(html, 'class="table_list');

  const standings = [];
  for (const cells of rows) {
    if (cells.length < 5) continue;
    const teamName = cells[0];
    if (!teamName || teamName.toLowerCase() === 'team') continue;

    const abbr = matchTeamAbbr(teamName);
    if (!abbr) continue;

    const w = parseInt2(cells[2] || cells[1]);
    const l = parseInt2(cells[3] || cells[2]);
    const total = w + l;
    const wr = total > 0 ? Math.round((w / total) * 100) : 0;
    const gdmRaw = cells.find((c) => /^-?\d{2,4}$/.test(c)) || '0';
    const gdm = parseInt2(gdmRaw);

    standings.push({
      abbr,
      kor: TEAM_META[abbr].kor,
      color: TEAM_META[abbr].color,
      w,
      l,
      wr,
      gdm,
      form: ['W', 'W', 'W', 'W', 'W'], // 별도 스크래핑 필요 - v1.2
    });
  }

  standings.sort((a, b) => b.wr - a.wr || b.w - a.w);
  standings.forEach((t, i) => (t.rank = i + 1));

  return standings;
}

// ============ 2. 매치 일정/결과 ============
async function scrapeMatches() {
  const url = `https://gol.gg/tournament/tournament-matchlist/${TOURNAMENT_SLUG}/`;
  let html;
  try {
    html = await fetchHtml(url);
  } catch (e) {
    console.warn('[matches] 페이지 fetch 실패');
    return [];
  }

  const rows = extractRows(html, 'class="table_list');
  const matches = [];

  for (const cells of rows) {
    if (cells.length < 4) continue;
    const dateStr = cells[0];
    if (!dateStr || dateStr.toLowerCase().includes('date')) continue;

    const homeAbbr = matchTeamAbbr(cells[1] || '');
    const awayAbbr = matchTeamAbbr(cells[3] || cells[2] || '');

    matches.push({
      date: dateStr,
      time: '',
      home: homeAbbr || cells[1] || '',
      away: awayAbbr || cells[3] || cells[2] || '',
      homeColor: homeAbbr ? TEAM_META[homeAbbr].color : '#888',
      awayColor: awayAbbr ? TEAM_META[awayAbbr].color : '#888',
      score: cells[2] || '',
    });
  }

  return matches.slice(0, 20);
}

// ============ 3. 페이커 통계 ============
async function scrapeFaker() {
  const url = `https://gol.gg/players/player-stats/${FAKER_PLAYER_ID}/season-ALL/split-ALL/tournament-${TOURNAMENT_SLUG}/champion-ALL/`;
  let html;
  try {
    html = await fetchHtml(url);
  } catch (e) {
    console.warn('[faker] 페이지 fetch 실패');
    return null;
  }

  const stats = {
    name: 'FAKER',
    kor: '페이커',
    team: 'T1',
    pos: 'MID',
    wr: 0,
    kda: 0,
    csm: 0,
    gpm: 0,
    games: 0,
    wins: 0,
    losses: 0,
    champions: [],
  };

  const wrMatch = html.match(/Win rate[\s\S]{0,80}?(\d+\.?\d*)\s*%/i);
  if (wrMatch) stats.wr = parseFloat2(wrMatch[1]);

  const kdaMatch = html.match(/KDA[\s\S]{0,80}?(\d+\.?\d+)/i);
  if (kdaMatch) stats.kda = parseFloat2(kdaMatch[1]);

  const csmMatch =
    html.match(/CS\/min[\s\S]{0,80}?(\d+\.?\d+)/i) ||
    html.match(/CSM[\s\S]{0,80}?(\d+\.?\d+)/i);
  if (csmMatch) stats.csm = parseFloat2(csmMatch[1]);

  const gpmMatch = html.match(/GPM[\s\S]{0,80}?(\d+)/i);
  if (gpmMatch) stats.gpm = parseInt2(gpmMatch[1]);

  const gamesMatch = html.match(/(\d+)\s*games/i);
  if (gamesMatch) stats.games = parseInt2(gamesMatch[1]);

  if (stats.games > 0 && stats.wr > 0) {
    stats.wins = Math.round((stats.wr / 100) * stats.games);
    stats.losses = stats.games - stats.wins;
  }

  // 챔프풀
  const champTableRows = extractRows(html, 'champion');
  for (const cells of champTableRows.slice(0, 8)) {
    if (cells.length < 3) continue;
    const champName = cells[0];
    if (!champName || champName.length > 20 || /^\d/.test(champName)) continue;

    const games = parseInt2(cells[1] || '0');
    const kda = parseFloat2(cells[3] || cells[2] || '0');
    if (games > 0) {
      stats.champions.push({
        kor: champName,
        eng: champName,
        games,
        kda,
        wr: 50,
      });
    }
  }

  return stats;
}

// ============ 4. 메타 챔프 ============
async function scrapeMeta() {
  const url = `https://gol.gg/champion/list/season-ALL/split-ALL/tournament-${TOURNAMENT_SLUG}/`;
  let html;
  try {
    html = await fetchHtml(url);
  } catch (e) {
    console.warn('[meta] 페이지 fetch 실패');
    return [];
  }

  const rows = extractRows(html, 'class="table_list');
  const champs = [];

  for (const cells of rows) {
    if (cells.length < 5) continue;
    const champName = cells[0];
    if (!champName || champName.toLowerCase() === 'champion') continue;
    if (/^\d/.test(champName)) continue;

    const picks = parseInt2(cells[1] || '0');
    const wr = parseFloat2(cells[3] || '0');
    const banRate = parseFloat2(cells[5] || cells[4] || '0');

    if (picks === 0) continue;

    champs.push({
      kor: champName,
      eng: champName,
      picks,
      wr,
      banRate,
      pickRate: 0,
      role: '',
    });
  }

  champs.sort((a, b) => b.picks - a.picks);
  const maxPicks = champs[0]?.picks || 1;
  champs.forEach((c) => {
    c.pickRate = Math.round((c.picks / maxPicks) * 100);
  });

  return champs.slice(0, 20);
}

// ============ 메인 ============
async function main() {
  ensureDir(OUTPUT_DIR);

  const updatedAt = new Date().toISOString();
  const updatedAtKST = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  let success = 0;
  const total = 4;

  try {
    const standings = await scrapeStandings();
    if (standings.length >= 6) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'standings.json'),
        JSON.stringify(standings, null, 2)
      );
      console.log(`✅ standings.json (${standings.length}팀)`);
      success++;
    } else {
      console.warn(`⚠️ standings 데이터 부족 (${standings.length}팀) - 기존 파일 유지`);
    }
  } catch (e) {
    console.error('❌ standings 실패:', e.message);
  }

  try {
    const matches = await scrapeMatches();
    if (matches.length > 0) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'matches.json'),
        JSON.stringify(matches, null, 2)
      );
      console.log(`✅ matches.json (${matches.length}경기)`);
      success++;
    } else {
      console.warn('⚠️ matches 0건 - 기존 파일 유지');
    }
  } catch (e) {
    console.error('❌ matches 실패:', e.message);
  }

  try {
    const faker = await scrapeFaker();
    if (faker && faker.wr > 0) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'faker.json'),
        JSON.stringify(faker, null, 2)
      );
      console.log(`✅ faker.json (WR ${faker.wr}%, KDA ${faker.kda})`);
      success++;
    } else {
      console.warn('⚠️ faker 데이터 무효 - 기존 파일 유지');
    }
  } catch (e) {
    console.error('❌ faker 실패:', e.message);
  }

  try {
    const meta = await scrapeMeta();
    if (meta.length >= 5) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'meta.json'),
        JSON.stringify(meta, null, 2)
      );
      console.log(`✅ meta.json (${meta.length}챔프)`);
      success++;
    } else {
      console.warn(`⚠️ meta 데이터 부족 (${meta.length}챔프) - 기존 파일 유지`);
    }
  } catch (e) {
    console.error('❌ meta 실패:', e.message);
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'updated.json'),
    JSON.stringify(
      {
        updatedAt,
        updatedAtKST,
        tournament: TOURNAMENT_DISPLAY,
        success,
        total,
      },
      null,
      2
    )
  );

  console.log(`\n=== 완료: ${success}/${total} ===`);

  if (success === 0) {
    console.error('모든 스크래핑 실패!');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
