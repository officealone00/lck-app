import { useState, useEffect } from 'react';
import './App.css';

const teams = [
  { rank: 1, abbr: 'KT', kor: 'KT 롤스터', wr: 89, w: 16, l: 2, gdm: 217, form: ['W','W','W','W','W'], color: '#FF0000' },
  { rank: 2, abbr: 'HLE', kor: '한화생명', wr: 78, w: 14, l: 4, gdm: 233, form: ['W','W','W','L','W'], color: '#F47B20' },
  { rank: 3, abbr: 'GEN', kor: '젠지', wr: 60, w: 9, l: 6, gdm: 146, form: ['W','L','W','W','L'], color: '#AA8B56' },
  { rank: 4, abbr: 'T1', kor: 'T1', wr: 57, w: 8, l: 6, gdm: -18, form: ['L','W','L','W','W'], color: '#E2012D' },
  { rank: 5, abbr: 'NS', kor: '농심 레드포스', wr: 56, w: 9, l: 7, gdm: 61, form: ['W','W','L','L','W'], color: '#F58220' },
  { rank: 6, abbr: 'DK', kor: '디플러스 기아', wr: 56, w: 9, l: 7, gdm: 45, form: ['L','W','W','L','W'], color: '#0072CE' },
  { rank: 7, abbr: 'BNK', kor: 'BNK 피어엑스', wr: 33, w: 5, l: 10, gdm: -119, form: ['L','L','W','L','L'], color: '#E31837' },
  { rank: 8, abbr: 'BRO', kor: '한진 브리온', wr: 24, w: 4, l: 13, gdm: -149, form: ['L','L','L','W','L'], color: '#102648' },
  { rank: 9, abbr: 'DRX', kor: '키움 DRX', wr: 24, w: 4, l: 13, gdm: -203, form: ['L','W','L','L','L'], color: '#1A4DBA' },
  { rank: 10, abbr: 'DN', kor: 'DN 숲퍼스', wr: 14, w: 2, l: 12, gdm: -285, form: ['L','L','L','L','W'], color: '#FFC629' },
];

const fakerChamps = [
  { kor: '라이즈', eng: 'Ryze', games: 5, wr: 60, kda: 4.4 },
  { kor: '아지르', eng: 'Azir', games: 3, wr: 100, kda: 3.5 },
  { kor: '갈리오', eng: 'Galio', games: 2, wr: 100, kda: 3.0 },
  { kor: '실라스', eng: 'Sylas', games: 1, wr: 100, kda: 7.5 },
  { kor: '오리아나', eng: 'Orianna', games: 1, wr: 100, kda: 11.5 },
  { kor: '아우로라', eng: 'Aurora', games: 1, wr: 100, kda: 6.3 },
];

const stars = [
  { id: 'faker', name: 'FAKER', kor: '페이커', team: 'T1', pos: 'MID', wr: 78.6, kda: 4.1, locked: false },
  { id: 'zeus', name: 'ZEUS', kor: '제우스', team: 'HLE', pos: 'TOP', wr: 72.5, kda: 3.8, locked: true },
  { id: 'showmaker', name: 'SHOWMAKER', kor: '쇼메이커', team: 'DK', pos: 'MID', wr: 65.0, kda: 3.2, locked: true },
  { id: 'canyon', name: 'CANYON', kor: '캐니언', team: 'GEN', pos: 'JUNGLE', wr: 68.3, kda: 4.5, locked: true },
  { id: 'ruler', name: 'RULER', kor: '룰러', team: 'GEN', pos: 'BOT', wr: 64.7, kda: 5.1, locked: true },
];

const metaChamps = [
  { kor: '바루스', eng: 'Varus', pickRate: 67, banRate: 45, wr: 58, role: '원딜' },
  { kor: '아지르', eng: 'Azir', pickRate: 54, banRate: 32, wr: 62, role: '미드' },
  { kor: '오리아나', eng: 'Orianna', pickRate: 48, banRate: 38, wr: 56, role: '미드' },
  { kor: '럼블', eng: 'Rumble', pickRate: 42, banRate: 50, wr: 51, role: '탑' },
  { kor: '카르마', eng: 'Karma', pickRate: 38, banRate: 33, wr: 54, role: '서폿' },
  { kor: '나미', eng: 'Nami', pickRate: 35, banRate: 12, wr: 60, role: '서폿' },
];

const upcomingMatches = [
  { date: '오늘', time: '17:00', home: 'T1', away: 'KT', homeColor: '#E2012D', awayColor: '#FF0000' },
  { date: '오늘', time: '20:00', home: 'GEN', away: 'HLE', homeColor: '#AA8B56', awayColor: '#F47B20' },
  { date: '내일', time: '17:00', home: 'DK', away: 'NS', homeColor: '#0072CE', awayColor: '#F58220' },
];

// 응원팀 선택 화면
function TeamSelect({ onSelect }: { onSelect: (abbr: string) => void }) {
  return (
    <div className="select-page">
      <div className="select-hero">
        <div className="select-badge">WELCOME</div>
        <h1 className="select-title">응원하는 팀을<br/>선택해주세요</h1>
        <p className="select-desc">선택한 팀의 경기 일정과 분석을<br/>가장 먼저 받아보세요</p>
      </div>
      <div className="select-grid">
        {teams.map(t => (
          <button key={t.abbr} className="select-team" onClick={() => onSelect(t.abbr)}>
            <div className="select-color" style={{background: t.color}} />
            <div className="select-abbr">{t.abbr}</div>
            <div className="select-kor">{t.kor}</div>
          </button>
        ))}
      </div>
      <button className="select-skip" onClick={() => onSelect('')}>나중에 선택하기</button>
    </div>
  );
}

// 내 팀 페이지
function MyTeamPage({ myTeam, onChange }: { myTeam: string; onChange: () => void }) {
  const team = teams.find(t => t.abbr === myTeam);
  if (!team) {
    return (
      <div className="page">
        <header className="header">
          <span className="season-badge">MY TEAM</span>
        </header>
        <div className="content empty-state">
          <div className="empty-icon">★</div>
          <div className="empty-title">응원팀을 선택해주세요</div>
          <button className="select-cta" onClick={onChange}>팀 선택하기</button>
        </div>
      </div>
    );
  }
  const nextMatch = upcomingMatches.find(m => m.home === team.abbr || m.away === team.abbr);
  return (
    <div className="page">
      <header className="header">
        <span className="season-badge">MY TEAM</span>
        <button className="change-btn" onClick={onChange}>변경</button>
      </header>
      <div className="content">
        <div className="myteam-hero" style={{borderColor: team.color}}>
          <div className="myteam-color-bar" style={{background: team.color}} />
          <div className="myteam-rank">현재 {team.rank}위</div>
          <div className="myteam-abbr">{team.abbr}</div>
          <div className="myteam-kor">{team.kor}</div>
          <div className="myteam-stats">
            <div className="mts">
              <div className="mtsv gold">{team.wr}%</div>
              <div className="mtsl">승률</div>
            </div>
            <div className="mts">
              <div className="mtsv">{team.w}-{team.l}</div>
              <div className="mtsl">전적</div>
            </div>
            <div className="mts">
              <div className="mtsv" style={{color: team.gdm > 0 ? '#10B981' : '#EF4444'}}>
                {team.gdm > 0 ? '+' : ''}{team.gdm}
              </div>
              <div className="mtsl">GDM</div>
            </div>
          </div>
          <div className="myteam-form">
            <span className="form-label">최근 5경기</span>
            <div className="form">
              {team.form.map((f, i) => <span key={i} className={`dot lg ${f === 'W' ? 'win' : 'loss'}`} />)}
            </div>
          </div>
        </div>

        {/* 배너 광고 자리 */}
        <div className="ad-banner">
          <div className="ad-tag">AD</div>
          <div className="ad-text">광고 영역 · 320 x 50</div>
        </div>

        {nextMatch && (
          <>
            <h3 className="sec">NEXT MATCH</h3>
            <div className="match-card">
              <div className="match-date">{nextMatch.date} · {nextMatch.time} KST</div>
              <div className="match-teams">
                <div className="mt-side">
                  <div className="mt-color" style={{background: nextMatch.homeColor}} />
                  <div className="mt-abbr">{nextMatch.home}</div>
                </div>
                <div className="mt-vs">VS</div>
                <div className="mt-side">
                  <div className="mt-color" style={{background: nextMatch.awayColor}} />
                  <div className="mt-abbr">{nextMatch.away}</div>
                </div>
              </div>
              <div className="match-broadcast">치지직 · SOOP 중계</div>
            </div>
          </>
        )}

        <h3 className="sec">AI 우승 예측</h3>
        <div className="ai-card">
          <div className="ai-icon">◆</div>
          <div className="ai-title">{team.kor}의 이번 주 승률</div>
          <div className="ai-desc">AI가 분석한 예상 승률<br/>광고 시청 후 확인</div>
          <button className="ad-btn small">
            ▶ 30초 광고 보고 예측 보기
          </button>
        </div>
      </div>
    </div>
  );
}

// 순위 페이지
function HomePage() {
  const top = teams[0];
  const rest = teams.slice(1);
  return (
    <div className="page">
      <header className="header">
        <span className="season-badge">2026 ROUNDS 1-2</span>
        <span className="update-time">방금 업데이트</span>
      </header>
      <div className="content">
        <div className="card-first">
          <div className="crown">★ 1ST PLACE</div>
          <div className="team-big">
            <div className="abbr-big">{top.abbr}</div>
            <div className="kor-big">{top.kor}</div>
          </div>
          <div className="first-stats">
            <div className="wr-big">{top.wr}<span>%</span></div>
            <div className="record-stack">
              <div className="record-big">{top.w}W {top.l}L</div>
              <div className="gdm">GDM +{top.gdm}</div>
            </div>
          </div>
        </div>

        {/* 1위 아래 배너 광고 - 시선 집중 위치 */}
        <div className="ad-banner">
          <div className="ad-tag">AD</div>
          <div className="ad-text">광고 영역 · 320 x 50</div>
        </div>

        {rest.map(t => (
          <div className="card" key={t.rank}>
            <div className="num">{t.rank}</div>
            <div className="info">
              <div className="abbr">{t.abbr}</div>
              <div className="kor">{t.kor}</div>
              <div className="form">
                {t.form.map((f, i) => <span key={i} className={`dot ${f === 'W' ? 'win' : 'loss'}`} />)}
              </div>
            </div>
            <div className="right">
              <div className="wr">{t.wr}%</div>
              <div className="rec">{t.w}W {t.l}L</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 스타 선수 페이지
function StarsPage() {
  const [active, setActive] = useState('faker');
  const player = stars.find(s => s.id === active)!;
  return (
    <div className="page">
      <header className="header">
        <span className="season-badge">PRO PLAYERS</span>
        <span className="update-time">LCK CUP 2026</span>
      </header>

      {/* 선수 선택 탭 */}
      <div className="player-tabs">
        {stars.map(s => (
          <button
            key={s.id}
            className={`pt ${active === s.id ? 'active' : ''} ${s.locked ? 'locked' : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.locked && <span className="lock-mini">▼</span>}
            {s.kor}
          </button>
        ))}
      </div>

      <div className="content" style={{paddingTop: 0}}>
        {player.locked ? (
          <div className="player-lock">
            <div className="lock-icon">▼</div>
            <div className="lock-title">{player.kor} 통계 잠금</div>
            <div className="lock-desc">광고 시청 후 24시간<br/>모든 선수 통계 무제한</div>
            <button className="ad-btn">
              ▶ 30초 광고 보고 잠금 해제
            </button>
            <div className="ad-note">리워드 광고 · 앱 운영 후원</div>
          </div>
        ) : (
          <>
            <div className="hero">
              <div className="team-tag">{player.team} · {player.pos} LANE</div>
              <div className="hero-name">{player.name}</div>
              <div className="real-name">{player.kor}</div>
            </div>
            <div className="key-stats">
              <div className="ks">
                <div className="ksv gold">{player.wr}%</div>
                <div className="ksl">WIN RATE</div>
              </div>
              <div className="ks">
                <div className="ksv">{player.kda}</div>
                <div className="ksl">KDA</div>
              </div>
              <div className="ks">
                <div className="ksv">9.1</div>
                <div className="ksl">CSM</div>
              </div>
            </div>
            <div className="record-line">
              <span>11승 3패</span>
              <span className="dim">14경기 · GPM 433</span>
            </div>

            {/* 페이커 페이지 배너 광고 */}
            <div className="ad-banner" style={{margin: '12px'}}>
              <div className="ad-tag">AD</div>
              <div className="ad-text">광고 영역 · 320 x 50</div>
            </div>

            <h3 className="sec">CHAMPION POOL</h3>
            <div className="champ-grid">
              {fakerChamps.map((c, i) => (
                <div className={i === 0 ? 'champ featured' : 'champ'} key={i}>
                  <div className="champ-kor">{c.kor}</div>
                  <div className="champ-eng">{c.eng}</div>
                  <div className="champ-bottom">
                    <span className="games">{c.games}경기</span>
                    <span className="kda-val">KDA {c.kda}</span>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="sec">PERSONAL BEST</h3>
            <div className="pb-card">
              <div className="pb-row">
                <span className="pb-label">최고 KDA</span>
                <span className="pb-val">5/0/5 · Ryze</span>
              </div>
              <div className="pb-row">
                <span className="pb-label">상대</span>
                <span className="pb-val">vs KT Rolster</span>
              </div>
              <div className="pb-row">
                <span className="pb-label">최고 DPM</span>
                <span className="pb-val">1205 · Ryze</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 메타 챔프 페이지
function MetaPage() {
  return (
    <div className="page">
      <header className="header">
        <span className="season-badge">META CHAMPIONS</span>
        <span className="update-time">이번 시즌</span>
      </header>
      <div className="content">
        <div className="meta-tabs">
          <button className="meta-tab active">픽률 TOP</button>
          <button className="meta-tab">밴률 TOP</button>
          <button className="meta-tab">승률 TOP</button>
        </div>

        {metaChamps.map((c, i) => (
          <div className="meta-card" key={i}>
            <div className="meta-rank">{i + 1}</div>
            <div className="meta-info">
              <div className="meta-name">{c.kor}</div>
              <div className="meta-sub">{c.eng} · {c.role}</div>
            </div>
            <div className="meta-bars">
              <div className="meta-bar-row">
                <span className="mbl">픽</span>
                <div className="bar-bg"><div className="bar-fill gold" style={{width: `${c.pickRate}%`}} /></div>
                <span className="mbv">{c.pickRate}%</span>
              </div>
              <div className="meta-bar-row">
                <span className="mbl">밴</span>
                <div className="bar-bg"><div className="bar-fill red" style={{width: `${c.banRate}%`}} /></div>
                <span className="mbv">{c.banRate}%</span>
              </div>
            </div>
          </div>
        ))}

        {/* 메타 페이지 하단 배너 */}
        <div className="ad-banner">
          <div className="ad-tag">AD</div>
          <div className="ad-text">광고 영역 · 320 x 50</div>
        </div>
      </div>
    </div>
  );
}

// 분석 리포트 페이지 (잠금)
function ReportPage() {
  return (
    <div className="page">
      <header className="header">
        <span className="season-badge">TEAM REPORT</span>
        <span className="update-time">전팀 심층 분석</span>
      </header>
      <div className="lock-content">
        <div className="lock-blur">
          <div className="content">
            <div className="card-first">
              <div className="crown">▣ ANALYSIS</div>
              <div className="abbr-big">T1</div>
              <div className="first-stats">
                <div className="wr-big">57<span>%</span></div>
              </div>
            </div>
            <div className="card"><div className="num">M1</div><div className="info"><div className="abbr">VARUS</div></div></div>
            <div className="card"><div className="num">M2</div><div className="info"><div className="abbr">RUMBLE</div></div></div>
            <div className="card"><div className="num">M3</div><div className="info"><div className="abbr">ASHE</div></div></div>
          </div>
        </div>
        <div className="lock-overlay">
          <div className="lock-icon">▼</div>
          <div className="lock-title">팀 분석 리포트</div>
          <div className="lock-desc">
            메타 챔프 · 픽밴 패턴<br/>
            잘 쓰는 챔프 · 예상 순위<br/>
            10팀 모두 24시간 무제한
          </div>
          <button className="ad-btn">
            ▶ 30초 광고 보고 잠금 해제
          </button>
          <div className="ad-note">리워드 광고 · 앱 운영 후원</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const [showSelect, setShowSelect] = useState(false);
  const [tab, setTab] = useState('myteam');

  useEffect(() => {
    const saved = localStorage.getItem('lck_my_team');
    if (saved !== null) {
      setMyTeam(saved);
    } else {
      setShowSelect(true);
    }
  }, []);

  const handleSelect = (abbr: string) => {
    localStorage.setItem('lck_my_team', abbr);
    setMyTeam(abbr);
    setShowSelect(false);
  };

  if (showSelect) {
    return <TeamSelect onSelect={handleSelect} />;
  }

  return (
    <div className="app">
      {tab === 'myteam' && <MyTeamPage myTeam={myTeam || ''} onChange={() => setShowSelect(true)} />}
      {tab === 'home' && <HomePage />}
      {tab === 'stars' && <StarsPage />}
      {tab === 'meta' && <MetaPage />}
      {tab === 'report' && <ReportPage />}
      <nav className="tabbar">
        <button className={tab === 'myteam' ? 'tab active' : 'tab'} onClick={() => setTab('myteam')}>내 팀</button>
        <button className={tab === 'home' ? 'tab active' : 'tab'} onClick={() => setTab('home')}>순위</button>
        <button className={tab === 'stars' ? 'tab active' : 'tab'} onClick={() => setTab('stars')}>선수</button>
        <button className={tab === 'meta' ? 'tab active' : 'tab'} onClick={() => setTab('meta')}>메타</button>
        <button className={tab === 'report' ? 'tab active' : 'tab'} onClick={() => setTab('report')}>분석</button>
      </nav>
    </div>
  );
}

export default App;