import { useState, useEffect, useRef } from 'react';
import './App.css';
import BannerAd from './components/BannerAd';
import RewardedAd from './components/RewardedAd';
import { api, type TeamStanding, type FakerStats, type MetaChamp, type UpcomingMatch, type PlayerRanking } from './utils/api';
import {
  FALLBACK_STANDINGS,
  FALLBACK_FAKER,
  FALLBACK_META,
  FALLBACK_MATCHES,
  FALLBACK_PLAYERS,
} from './utils/fallback';

// 네이버 LCK 2026 LEGENDS TOP 8 + Faker (LCK Cup 2026)
// 1번(Chovy)은 무료, 나머지는 광고 시청 후 잠금 해제
const stars = [
  { id: 'chovy',   name: 'Chovy',   kor: '초비',     team: 'GEN', pos: 'MID', locked: false },
  { id: 'zeka',    name: 'Zeka',    kor: '제카',     team: 'HLE', pos: 'MID', locked: true },
  { id: 'teddy',   name: 'Teddy',   kor: '테디',     team: 'BRO', pos: 'AD',  locked: true },
  { id: 'aiming',  name: 'Aiming',  kor: '에이밍',   team: 'KT',  pos: 'AD',  locked: true },
  { id: 'keria',   name: 'Keria',   kor: '케리아',   team: 'T1',  pos: 'SPT', locked: true },
  { id: 'bdd',     name: 'Bdd',     kor: '비디디',   team: 'KT',  pos: 'MID', locked: true },
  { id: 'oner',    name: 'Oner',    kor: '오너',     team: 'T1',  pos: 'JGL', locked: true },
  { id: 'taeyoon', name: 'Taeyoon', kor: '태윤',     team: 'BFX', pos: 'AD',  locked: true },
  { id: 'faker',   name: 'FAKER',   kor: '페이커',   team: 'T1',  pos: 'MID', locked: true },
];

function TeamSelect({ teams, onSelect }: { teams: TeamStanding[]; onSelect: (abbr: string) => void }) {
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

function MyTeamPage({ teams, matches, myTeam, onChange, aiUnlocked, onAdRequest }: {
  teams: TeamStanding[];
  matches: UpcomingMatch[];
  myTeam: string;
  onChange: () => void;
  aiUnlocked: boolean;
  onAdRequest: (purpose: 'ai') => void;
}) {
  const team = teams.find(t => t.abbr === myTeam);

  if (!team) {
    return (
      <div className="page">
        <header className="header"><span className="season-badge">MY TEAM</span></header>
        <div className="content empty-state">
          <div className="empty-icon">★</div>
          <div className="empty-title">응원팀을 선택해주세요</div>
          <button className="select-cta" onClick={onChange}>팀 선택하기</button>
        </div>
      </div>
    );
  }

  const nextMatch = matches.find(m => m.home === team.abbr || m.away === team.abbr);
  const recentWins = team.form.filter(f => f === 'W').length;
  const aiPrediction = Math.min(95, Math.round(team.wr * 0.6 + recentWins * 8));

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
              <div className="mtsv" style={{color: team.gdm > 0 ? '#34D399' : '#F87171'}}>
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

        <BannerAd />

        {nextMatch && (
          <>
            <h3 className="sec">NEXT MATCH</h3>
            <div className="match-card">
              <div className="match-date">{nextMatch.date}{nextMatch.time ? ` · ${nextMatch.time} KST` : ''}</div>
              <div className="match-teams">
                <div className="mt-side">
                  <div className="mt-color" style={{background: nextMatch.homeColor || '#888'}} />
                  <div className="mt-abbr">{nextMatch.home}</div>
                </div>
                <div className="mt-vs">VS</div>
                <div className="mt-side">
                  <div className="mt-color" style={{background: nextMatch.awayColor || '#888'}} />
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
          {aiUnlocked ? (
            <>
              <div className="ai-result">{aiPrediction}%</div>
              <div className="ai-result-desc">최근 폼과 시즌 승률 기반</div>
            </>
          ) : (
            <>
              <div className="ai-desc">AI가 분석한 예상 승률<br/>광고 시청 후 확인</div>
              <button className="ad-btn small" onClick={() => onAdRequest('ai')}>
                ▶ 30초 광고 보고 예측 보기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HomePage({ teams }: { teams: TeamStanding[] }) {
  if (teams.length === 0) return null;
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
              <div className="gdm">GDM {top.gdm > 0 ? '+' : ''}{top.gdm}</div>
            </div>
          </div>
        </div>

        <BannerAd />

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

function StarsPage({ faker, players, playersUnlocked, onAdRequest }: {
  faker: FakerStats;
  players: PlayerRanking[];
  playersUnlocked: boolean;
  onAdRequest: (purpose: 'players') => void;
}) {
  const [active, setActive] = useState('chovy');
  const player = stars.find(s => s.id === active)!;
  const isLockedNow = player.locked && !playersUnlocked;

  // 페이커 외엔 PlayerRanking에서 매칭, 페이커는 FakerStats 사용
  const isFaker = player.id === 'faker';
  const ranking = !isFaker ? players.find(p => p.name.toLowerCase() === player.name.toLowerCase()) : null;

  // 표시용 stat (페이커는 wr/kda/csm, 다른 선수는 kda/킬관여율/세트수)
  const displayWr = isFaker ? `${faker.wr}%` : (ranking ? `${(ranking.kpRate * 100).toFixed(0)}%` : '-');
  const displayWrLabel = isFaker ? 'WIN RATE' : 'KILL %';
  const displayKda = isFaker ? faker.kda : (ranking?.kda ?? '-');
  const displayCs = isFaker ? faker.csm : (ranking?.sets ?? '-');
  const displayCsLabel = isFaker ? 'CS/MIN' : 'SETS';
  const displayRecord = isFaker
    ? `${faker.wins}승 ${faker.losses}패`
    : (ranking ? `${ranking.kills}K ${ranking.deaths}D ${ranking.assists}A` : '-');
  const displaySub = isFaker
    ? `${faker.games}경기 · GPM ${faker.gpm}`
    : (ranking ? `LEGENDS ${ranking.points}P · ${ranking.rank}위` : '-');

  return (
    <div className="page">
      <header className="header">
        <span className="season-badge">PRO PLAYERS</span>
        <span className="update-time">LCK 2026 LEGENDS</span>
      </header>

      <div className="player-tabs">
        {stars.map(s => (
          <button
            key={s.id}
            className={`pt ${active === s.id ? 'active' : ''} ${s.locked && !playersUnlocked ? 'locked' : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.locked && !playersUnlocked && <span className="lock-mini">▼</span>}
            {s.kor}
          </button>
        ))}
      </div>

      <div className="content" style={{paddingTop: 0}}>
        {isLockedNow ? (
          <div className="player-lock">
            <div className="lock-icon">▼</div>
            <div className="lock-title">{player.kor} 통계 잠금</div>
            <div className="lock-desc">광고 시청 후 24시간<br/>모든 선수 통계 무제한</div>
            <button className="ad-btn" onClick={() => onAdRequest('players')}>
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
                <div className="ksv gold">{displayWr}</div>
                <div className="ksl">{displayWrLabel}</div>
              </div>
              <div className="ks">
                <div className="ksv">{displayKda}</div>
                <div className="ksl">KDA</div>
              </div>
              <div className="ks">
                <div className="ksv">{displayCs}</div>
                <div className="ksl">{displayCsLabel}</div>
              </div>
            </div>
            <div className="record-line">
              <span>{displayRecord}</span>
              <span className="dim">{displaySub}</span>
            </div>

            <div style={{padding: '0 12px'}}>
              <BannerAd />
            </div>

            {isFaker && faker.champions.length > 0 && (
              <>
                <h3 className="sec">CHAMPION POOL</h3>
                <div className="champ-grid">
                  {faker.champions.map((c, i) => (
                    <div className={i === 0 ? 'champ featured' : 'champ'} key={c.eng + i}>
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
                    <span className="pb-val">{faker.champions[0]?.kda || '-'} · {faker.champions[0]?.eng || '-'}</span>
                  </div>
                  <div className="pb-row">
                    <span className="pb-label">총 게임수</span>
                    <span className="pb-val">{faker.games}경기</span>
                  </div>
                  <div className="pb-row">
                    <span className="pb-label">분당 골드</span>
                    <span className="pb-val">{faker.gpm} GPM</span>
                  </div>
                </div>
              </>
            )}

            {!isFaker && ranking && (
              <>
                <h3 className="sec">SEASON STATS</h3>
                <div className="pb-card">
                  <div className="pb-row">
                    <span className="pb-label">LEGENDS 순위</span>
                    <span className="pb-val">{ranking.rank}위 · {ranking.points}P</span>
                  </div>
                  <div className="pb-row">
                    <span className="pb-label">킬 / 데스 / 어시</span>
                    <span className="pb-val">{ranking.kills} / {ranking.deaths} / {ranking.assists}</span>
                  </div>
                  <div className="pb-row">
                    <span className="pb-label">킬관여율</span>
                    <span className="pb-val">{(ranking.kpRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="pb-row">
                    <span className="pb-label">출전 세트</span>
                    <span className="pb-val">{ranking.sets} 세트</span>
                  </div>
                  <div className="pb-row">
                    <span className="pb-label">평균 KDA</span>
                    <span className="pb-val">{ranking.kda}</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetaPage({ metaChamps }: { metaChamps: MetaChamp[] }) {
  const [sortBy, setSortBy] = useState<'pick' | 'ban' | 'wr'>('pick');

  const sortedChamps = [...metaChamps].sort((a, b) => {
    if (sortBy === 'pick') return b.pickRate - a.pickRate;
    if (sortBy === 'ban') return b.banRate - a.banRate;
    return b.wr - a.wr;
  });

  return (
    <div className="page">
      <header className="header">
        <span className="season-badge">META CHAMPIONS</span>
        <span className="update-time">이번 시즌</span>
      </header>
      <div className="content">
        <div className="meta-tabs">
          <button
            className={`meta-tab ${sortBy === 'pick' ? 'active' : ''}`}
            onClick={() => setSortBy('pick')}
          >
            픽률 TOP
          </button>
          <button
            className={`meta-tab ${sortBy === 'ban' ? 'active' : ''}`}
            onClick={() => setSortBy('ban')}
          >
            밴률 TOP
          </button>
          <button
            className={`meta-tab ${sortBy === 'wr' ? 'active' : ''}`}
            onClick={() => setSortBy('wr')}
          >
            승률 TOP
          </button>
        </div>

        {sortedChamps.map((c, i) => (
          <div className="meta-card" key={c.eng + i}>
            <div className="meta-rank">{i + 1}</div>
            <div className="meta-info">
              <div className="meta-name">{c.kor}</div>
              <div className="meta-sub">{c.eng}{c.role ? ` · ${c.role}` : ''}</div>
            </div>
            <div className="meta-bars">
              {sortBy === 'wr' ? (
                <>
                  <div className="meta-bar-row">
                    <span className="mbl">승</span>
                    <div className="bar-bg"><div className="bar-fill gold" style={{width: `${c.wr}%`}} /></div>
                    <span className="mbv">{c.wr}%</span>
                  </div>
                  <div className="meta-bar-row">
                    <span className="mbl">픽</span>
                    <div className="bar-bg"><div className="bar-fill" style={{width: `${c.pickRate}%`, background: '#B5BCD0'}} /></div>
                    <span className="mbv">{c.pickRate}%</span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        ))}

        <BannerAd />
      </div>
    </div>
  );
}

function ReportPage({ teams, metaChamps, reportUnlocked, onAdRequest }: {
  teams: TeamStanding[];
  metaChamps: MetaChamp[];
  reportUnlocked: boolean;
  onAdRequest: (purpose: 'report') => void;
}) {
  if (reportUnlocked) {
    const topPick = [...metaChamps].sort((a, b) => b.pickRate - a.pickRate)[0];
    const topBan = [...metaChamps].sort((a, b) => b.banRate - a.banRate)[0];

    return (
      <div className="page">
        <header className="header">
          <span className="season-badge">TEAM REPORT</span>
          <span className="update-time">전팀 심층 분석</span>
        </header>
        <div className="content">
          <h3 className="sec">메타 적합도 TOP 3</h3>
          {teams.slice(0, 3).map((t, i) => (
            <div className="card" key={t.rank}>
              <div className="num">{i + 1}</div>
              <div className="info">
                <div className="abbr">{t.abbr}</div>
                <div className="kor">{t.kor}</div>
              </div>
              <div className="right">
                <div className="wr">{Math.round(t.wr * 0.95)}%</div>
                <div className="rec">메타 점수</div>
              </div>
            </div>
          ))}

          <h3 className="sec">픽밴 인사이트</h3>
          <div className="pb-card">
            <div className="pb-row">
              <span className="pb-label">선픽 1티어</span>
              <span className="pb-val">{topPick ? `${topPick.kor} (${topPick.pickRate}%)` : '-'}</span>
            </div>
            <div className="pb-row">
              <span className="pb-label">우선 밴</span>
              <span className="pb-val">{topBan ? `${topBan.kor} (${topBan.banRate}%)` : '-'}</span>
            </div>
            <div className="pb-row">
              <span className="pb-label">시그니처</span>
              <span className="pb-val">{teams[0]?.abbr || '-'} / {topPick?.kor || '-'}</span>
            </div>
          </div>

          <BannerAd />

          <h3 className="sec">예상 플레이오프 진출</h3>
          {teams.slice(0, 6).map((t, i) => (
            <div className="card" key={t.rank}>
              <div className="num">{i + 1}</div>
              <div className="info">
                <div className="abbr">{t.abbr}</div>
                <div className="kor">{t.kor}</div>
              </div>
              <div className="right">
                <div className="wr" style={{color: '#34D399'}}>{Math.round(95 - i * 8)}%</div>
                <div className="rec">진출 확률</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
          <button className="ad-btn" onClick={() => onAdRequest('report')}>
            ▶ 30초 광고 보고 잠금 해제
          </button>
          <div className="ad-note">리워드 광고 · 앱 운영 후원</div>
        </div>
      </div>
    </div>
  );
}

type AdPurpose = 'ai' | 'players' | 'report' | null;

function App() {
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const [showSelect, setShowSelect] = useState(false);
  const [tab, setTab] = useState('myteam');

  // ─── 실시간 데이터 state ───
  const [teams, setTeams] = useState<TeamStanding[]>(FALLBACK_STANDINGS);
  const [faker, setFaker] = useState<FakerStats>(FALLBACK_FAKER);
  const [metaChamps, setMetaChamps] = useState<MetaChamp[]>(FALLBACK_META);
  const [matches, setMatches] = useState<UpcomingMatch[]>(FALLBACK_MATCHES);
  const [players, setPlayers] = useState<PlayerRanking[]>(FALLBACK_PLAYERS);

  const [aiUnlocked, setAiUnlocked] = useState(false);
  const [reportUnlocked, setReportUnlocked] = useState(false);
  const [playersUnlocked, setPlayersUnlocked] = useState(false);

  const [adPurpose, setAdPurpose] = useState<AdPurpose>(null);
  const rewardEarnedRef = useRef(false);

  useEffect(() => {
    // 응원팀 로드
    const saved = localStorage.getItem('lck_my_team');
    if (saved !== null) {
      setMyTeam(saved);
    } else {
      setShowSelect(true);
    }

    // 실시간 데이터 fetch (병렬)
    api.standings().then(setTeams).catch((e) => console.warn('[App] standings 로드 실패', e));
    api.faker().then(setFaker).catch((e) => console.warn('[App] faker 로드 실패', e));
    api.meta().then(setMetaChamps).catch((e) => console.warn('[App] meta 로드 실패', e));
    api.matches().then(setMatches).catch((e) => console.warn('[App] matches 로드 실패', e));
    api.players().then(setPlayers).catch((e) => console.warn('[App] players 로드 실패', e));
  }, []);

  const handleSelect = (abbr: string) => {
    localStorage.setItem('lck_my_team', abbr);
    setMyTeam(abbr);
    setShowSelect(false);
  };

  const handleAdRequest = (purpose: AdPurpose) => {
    rewardEarnedRef.current = false;
    setAdPurpose(purpose);
  };

  const handleReward = () => {
    rewardEarnedRef.current = true;
    if (adPurpose === 'ai') setAiUnlocked(true);
    if (adPurpose === 'players') setPlayersUnlocked(true);
    if (adPurpose === 'report') setReportUnlocked(true);
  };

  const handleAdClose = () => {
    setAdPurpose(null);
  };

  if (showSelect) {
    return <TeamSelect teams={teams} onSelect={handleSelect} />;
  }

  return (
    <div className="app">
      {tab === 'myteam' && (
        <MyTeamPage
          teams={teams}
          matches={matches}
          myTeam={myTeam || ''}
          onChange={() => setShowSelect(true)}
          aiUnlocked={aiUnlocked}
          onAdRequest={handleAdRequest}
        />
      )}
      {tab === 'home' && <HomePage teams={teams} />}
      {tab === 'stars' && (
        <StarsPage
          faker={faker}
          players={players}
          playersUnlocked={playersUnlocked}
          onAdRequest={handleAdRequest}
        />
      )}
      {tab === 'meta' && <MetaPage metaChamps={metaChamps} />}
      {tab === 'report' && (
        <ReportPage
          teams={teams}
          metaChamps={metaChamps}
          reportUnlocked={reportUnlocked}
          onAdRequest={handleAdRequest}
        />
      )}
      <nav className="tabbar">
        <button className={tab === 'myteam' ? 'tab active' : 'tab'} onClick={() => setTab('myteam')}>내 팀</button>
        <button className={tab === 'home' ? 'tab active' : 'tab'} onClick={() => setTab('home')}>순위</button>
        <button className={tab === 'stars' ? 'tab active' : 'tab'} onClick={() => setTab('stars')}>선수</button>
        <button className={tab === 'meta' ? 'tab active' : 'tab'} onClick={() => setTab('meta')}>메타</button>
        <button className={tab === 'report' ? 'tab active' : 'tab'} onClick={() => setTab('report')}>분석</button>
      </nav>

      {adPurpose !== null && (
        <RewardedAd
          onReward={handleReward}
          onClose={handleAdClose}
        />
      )}
    </div>
  );
}

export default App;
