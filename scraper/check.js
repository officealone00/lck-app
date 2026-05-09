// ─────────────────────────────────────────────────────────────────────────────
// Leaguepedia Cargo API 진단 스크립트
// scrape.js가 빈 결과를 받을 때 원인을 파악하기 위한 디버그 도구.
//
// 사용법: node scraper/check.js
//
// 4가지 시나리오를 순서대로 시도해서 어느 쿼리가 데이터를 돌려주는지 확인.
// 그 결과의 OverviewPage 값을 환경변수 LCK_TOURNAMENT로 지정하면 됨.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://lol.fandom.com/api.php';

async function query(label, params) {
  const url = `${API_BASE}?${new URLSearchParams(params).toString()}`;
  console.log(`\n━━━━ ${label} ━━━━`);
  console.log(`URL: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'lck-app-debug/1.0 (https://github.com/officealone00/lck-app)',
        'Accept': 'application/json',
      },
    });
    console.log(`HTTP ${res.status}`);
    if (!res.ok) {
      console.log(`   본문: ${(await res.text()).slice(0, 200)}`);
      return [];
    }
    const data = await res.json();
    if (data.error) {
      console.log(`   API 에러: ${JSON.stringify(data.error).slice(0, 300)}`);
      return [];
    }
    const rows = (data.cargoquery || []).map((r) => r.title);
    console.log(`   결과: ${rows.length}건`);
    rows.slice(0, 15).forEach((r, i) => {
      console.log(`     [${i + 1}] ${JSON.stringify(r)}`);
    });
    return rows;
  } catch (e) {
    console.log(`   네트워크 에러: ${e.message}`);
    return [];
  }
}

(async () => {
  console.log('🔬 Leaguepedia Cargo API 진단\n');

  // 시도 1: League/Year 등호로 LCK 2026 토너먼트
  await query('TEST 1: Tournaments where League="LCK" AND Year="2026"', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Tournaments',
    fields: 'OverviewPage,Name,League,Year,Split,DateStart',
    where: 'Tournaments.League="LCK" AND Tournaments.Year="2026"',
    order_by: 'Tournaments.DateStart DESC',
    limit: '20',
  });

  // 시도 2: League만으로 (Year 필드명이 다를 가능성)
  await query('TEST 2: Tournaments where League="LCK" (가장 최근 30개)', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Tournaments',
    fields: 'OverviewPage,Name,Year,Split,DateStart',
    where: 'Tournaments.League="LCK"',
    order_by: 'Tournaments.DateStart DESC',
    limit: '30',
  });

  // 시도 3: 정확한 OverviewPage 등호 매칭
  await query('TEST 3: Standings where OverviewPage="LCK 2026 Rounds 1-2"', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Standings',
    fields: 'OverviewPage,Team,Place',
    where: 'Standings.OverviewPage="LCK 2026 Rounds 1-2"',
    limit: '20',
  });

  // 시도 4: URL 형식 OverviewPage 시도
  await query('TEST 4: Standings where OverviewPage="LCK/2026 Season/Rounds 1-2"', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Standings',
    fields: 'OverviewPage,Team,Place',
    where: 'Standings.OverviewPage="LCK/2026 Season/Rounds 1-2"',
    limit: '20',
  });

  // 시도 5: API 살아있는지 매우 단순한 쿼리 (Champions 테이블)
  await query('TEST 5: API 응답성 (Champions 테이블 1건만)', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Champions',
    fields: 'Name',
    limit: '1',
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('진단 완료. 결과가 있는 TEST의 OverviewPage 값을 사용하세요.');
  console.log('TEST 5조차 0건이면 Cargo API 자체가 차단/장애 상태입니다.');
})();
