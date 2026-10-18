import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import BannerAd from './components/BannerAd';
import RewardedAd, { preloadReportAd } from './components/RewardedAd';
import { useTossBackEvent } from './hooks/useTossBackEvent';
import WorldsPage from './components/WorldsPage';
import { ConfirmSheet } from './components/Sheet';
import { closeTopSheet } from './lib/sheetStack';
import { logEvent, requestReviewOnce, shareWithTossLink } from './utils/tossGrowth';
import {
  api,
  type TeamStanding,
  type MetaChamp,
  type UpcomingMatch,
  type PlayerStat,
  type UpdatedMeta,
  type SeasonSummary,
  type WorldsInfo,
  type WorldsMatch,
} from './utils/api';
import {
  FALLBACK_STANDINGS,
  FALLBACK_META,
  FALLBACK_MATCHES,
  FALLBACK_PLAYERS,
  FALLBACK_UPDATED,
  FALLBACK_SEASON,
  FALLBACK_WORLDS,
} from './utils/fallback';

/* ─────────────────────────────────────────────────────────────
 * LCK 순위 v2 (2026-10-18)
 * - 첫 화면 = 순위 (응원팀 선택 화면을 억지로 띄우지 않아요)
 * - 순위: 1~5라운드 누적 전적, 레전드/라이즈 그룹 구분
 * - 시즌 결산(우승·준우승·3위) + 월즈 일정/결과
 * - 선수·메타: 실제 경기 기록으로 계산한 값
 * - 광고: 보상형은 미리 불러 두고 버튼을 눌렀을 때만 재생
 * ───────────────────────────────────────────────────────────── */

type Tab = 'rank' | 'worlds' | 'myteam' | 'players' | 'meta';
type AdPurpose = 'report' | 'players' | 'worlds' | null;

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function kstLabel(iso?: string, withTime = true): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  if (isNaN(d.getTime())) return '';
  const base = `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEK[d.getUTCDay()]})`;
  if (!withTime) return base;
  return `${base} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
function updatedLabel(u: UpdatedMeta | null): string {
  if (!u?.updatedAt) return '';
  return `${kstLabel(u.updatedAt)} 기준`;
}

const UNLOCK_MS = 24 * 3600 * 1000;
function isUnlocked(key: string): boolean {
  try {
    const t = Number(localStorage.getItem(key) || 0);
    return Date.now() - t < UNLOCK_MS;
  } catch {
    return false;
  }
}
function saveUnlock(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* noop */
  }
}

const teamName = (teams: TeamStanding[], abbr?: string | null) =>
  (abbr && teams.find((t) => t.abbr === abbr)?.kor) || abbr || '';
const teamColor = (teams: TeamStanding[], abbr?: string | null) =>
  (abbr && teams.find((t) => t.abbr === abbr)?.color) || '#5B6178';

function FormDots({ form, large = false }: { form: string[]; large?: boolean }) {
  if (!form.some((f) => f === 'W' || f === 'L')) return null;
  return (
    <span className={`form ${large ? 'lg' : ''}`} aria-label={`최근 5경기 ${form.join(' ')}`}>
      {form.map((f, i) => (
        <span key={i} className={`dot ${f === 'W' ? 'win' : f === 'L' ? 'loss' : 'unknown'}`}>
          {large ? (f === 'W' ? '승' : f === 'L' ? '패' : '') : ''}
        </span>
      ))}
    </span>
  );
}

/* ───────────── 시즌 결산 / 월즈 카드 ───────────── */
function SeasonCard({ season, teams }: { season: SeasonSummary; teams: TeamStanding[] }) {
  if (season.status !== 'ended' || !season.champion) return null;
  return (
    <section className="season-card" style={{ ['--champ' as string]: teamColor(teams, season.champion) }}>
      <div className="sc-label">{season.year} LCK 시즌 종료</div>
      <div className="sc-champ">
        <span className="sc-trophy" aria-hidden>🏆</span>
        {teamName(teams, season.champion)} 우승
      </div>
      <div className="sc-sub">
        결승 {teamName(teams, season.champion)} {season.finalScore} {teamName(teams, season.runnerUp)}
        {season.third ? ` · 3위 ${teamName(teams, season.third)}` : ''}
      </div>
    </section>
  );
}

function WorldsCard({ worlds, teams, myTeam }: { worlds: WorldsInfo; teams: TeamStanding[]; myTeam?: string }) {
  if (worlds.status === 'ended') return null;
  const now = Date.now();
  const upcomingStage = worlds.stages.find((s) => new Date(s.start).getTime() > now);
  const currentStage = [...worlds.stages].reverse().find((s) => new Date(s.start).getTime() <= now);
  const lck = worlds.lckMatches;
  const recent = lck.filter((m) => m.state === 'completed').slice(-3).reverse();
  const upcoming = lck.filter((m) => m.state !== 'completed').slice(0, 4);
  const mine = myTeam ? lck.filter((m) => m.home === myTeam || m.away === myTeam) : [];

  return (
    <section className="worlds-card">
      <div className="wc-head">
        <span className="wc-title">🌏 {worlds.title}</span>
        <span className="wc-state">{worlds.status === 'upcoming' ? '개막 전' : '진행 중'}</span>
      </div>
      {currentStage && worlds.status === 'ongoing' && <div className="wc-line">지금: {currentStage.name}</div>}
      {upcomingStage && (
        <div className="wc-line strong">
          다음: {upcomingStage.name} · {kstLabel(upcomingStage.start)} 시작
        </div>
      )}
      {lck.length === 0 ? (
        <div className="wc-note">LCK 팀 대진은 조 추첨이 끝나면 여기에 바로 표시돼요.</div>
      ) : (
        <div className="wc-list">
          {(mine.length ? mine.slice(-4) : [...recent, ...upcoming]).map((m) => (
            <WorldsRow key={m.id + m.startTime} m={m} teams={teams} />
          ))}
        </div>
      )}
      <div className="wc-foot">시간은 한국 시간이에요. 경기가 끝나면 결과가 바로 반영돼요.</div>
    </section>
  );
}

function WorldsRow({ m, teams }: { m: WorldsMatch; teams: TeamStanding[] }) {
  const done = m.state === 'completed';
  const live = m.state === 'inProgress';
  const label = (c: string, n: string) => (teams.find((t) => t.abbr === c) ? c : n || c);
  return (
    <div className="wc-row">
      <span className="wc-date">{done ? kstLabel(m.startTime, false) : kstLabel(m.startTime)}</span>
      <span className="wc-teams">
        <b style={{ color: teamColor(teams, m.home) }}>{label(m.home, m.homeName)}</b>
        {done || live ? ` ${m.homeScore ?? 0} : ${m.awayScore ?? 0} ` : ' vs '}
        <b style={{ color: teamColor(teams, m.away) }}>{label(m.away, m.awayName)}</b>
      </span>
      <span className={`wc-badge ${live ? 'live' : ''}`}>{live ? '진행 중' : m.stage}</span>
    </div>
  );
}

/* ───────────── 순위 탭 ───────────── */
function RankPage({
  teams, season, worlds, updated, myTeam, onPickTeam,
}: {
  teams: TeamStanding[];
  season: SeasonSummary;
  worlds: WorldsInfo;
  updated: UpdatedMeta | null;
  myTeam: string;
  onPickTeam: () => void;
}) {
  const groups = useMemo(() => {
    const g: { name: string; rows: TeamStanding[] }[] = [];
    for (const t of teams) {
      const name = t.group || '';
      let cur = g.find((x) => x.name === name);
      if (!cur) g.push((cur = { name, rows: [] }));
      cur.rows.push(t);
    }
    return g;
  }, [teams]);

  return (
    <div className="page">
      <div className="page-title">
        <h1>{season.year} LCK 순위</h1>
        <span className="updated">{updatedLabel(updated)}</span>
      </div>

      <SeasonCard season={season} teams={teams} />
      <WorldsCard worlds={worlds} teams={teams} myTeam={myTeam} />

      {!myTeam && (
        <button className="pick-cta" onClick={onPickTeam}>
          <span>
            <b>응원팀을 골라 보세요</b>
            <br />
            우리 팀 시즌 성적과 선수 기록을 모아 볼 수 있어요
          </span>
          <span className="pick-arrow" aria-hidden>›</span>
        </button>
      )}

      {groups.map((g, gi) => (
        <section key={g.name || gi} className="group">
          {g.name && (
            <div className="group-head">
              <span className={`group-tag ${g.name === '레전드' ? 'legend' : 'rise'}`}>{g.name} 그룹</span>
            </div>
          )}
          <div className="rank-list">
            {g.rows.map((t) => (
              <div className={`rank-row ${t.abbr === myTeam ? 'mine' : ''}`} key={t.abbr}>
                <span className="r-num">{t.rank}</span>
                <span className="r-bar" style={{ background: t.color }} />
                <span className="r-info">
                  <span className="r-name">
                    {t.kor}
                    {season.champion === t.abbr && <span className="r-crown">우승</span>}
                    {t.abbr === myTeam && <span className="r-mine">내 팀</span>}
                  </span>
                  <FormDots form={t.form} />
                </span>
                <span className="r-right">
                  <span className="r-rec">{t.w}승 {t.l}패</span>
                  <span className={`r-gd ${t.gdm > 0 ? 'pos' : t.gdm < 0 ? 'neg' : ''}`}>
                    세트 {t.gdm > 0 ? '+' : ''}{t.gdm}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {gi === 0 && <BannerAd />}
        </section>
      ))}

      <p className="foot-note">
        1~5라운드 누적 전적이에요. 3라운드부터 레전드·라이즈 그룹으로 나뉘어요.
        <br />
        최근 5경기는 플레이오프까지 포함해요. 출처: LoL Esports 공식 데이터
      </p>
    </div>
  );
}

/* ───────────── 팀 선택 ───────────── */
function TeamPicker({ teams, current, onSelect, onClose }: {
  teams: TeamStanding[]; current: string; onSelect: (abbr: string) => void; onClose?: () => void;
}) {
  return (
    <div className="picker">
      <h2 className="picker-title">응원하는 팀을 골라 주세요</h2>
      <p className="picker-desc">언제든 다시 바꿀 수 있어요</p>
      <div className="picker-grid">
        {teams.map((t) => (
          <button key={t.abbr} className={`picker-team ${current === t.abbr ? 'on' : ''}`} onClick={() => onSelect(t.abbr)}>
            <span className="pt-bar" style={{ background: t.color }} />
            <span className="pt-abbr">{t.abbr}</span>
            <span className="pt-kor">{t.kor}</span>
          </button>
        ))}
      </div>
      {onClose && (
        <button className="text-btn" onClick={onClose}>
          닫기
        </button>
      )}
    </div>
  );
}

/* ───────────── 내 팀 탭 ───────────── */
function teamSeasonResult(abbr: string, season: SeasonSummary): string {
  if (season.status !== 'ended') return '';
  if (season.champion === abbr) return '🏆 우승';
  if (season.runnerUp === abbr) return '🥈 준우승';
  if (season.third === abbr) return '🥉 3위';
  const mine = season.playoffs.filter((m) => m.home === abbr || m.away === abbr);
  if (!mine.length) return '포스트시즌 진출 실패';
  const last = mine[mine.length - 1];
  const won = (last.home === abbr ? last.homeScore : last.awayScore) > (last.home === abbr ? last.awayScore : last.homeScore);
  return won ? `${last.stage} 진출` : `${last.stage}에서 탈락`;
}

function MyTeamPage({
  teams, players, season, worlds, matches, myTeam, reportUnlocked, onChangeTeam, onAdRequest,
}: {
  teams: TeamStanding[];
  players: PlayerStat[];
  season: SeasonSummary;
  worlds: WorldsInfo;
  matches: UpcomingMatch[];
  myTeam: string;
  reportUnlocked: boolean;
  onChangeTeam: () => void;
  onAdRequest: (p: AdPurpose) => void;
}) {
  const team = teams.find((t) => t.abbr === myTeam);
  useEffect(() => {
    if (team && !reportUnlocked) preloadReportAd();
  }, [team, reportUnlocked]);

  if (!team) return null;

  const result = teamSeasonResult(team.abbr, season);
  const nextMatch = matches.find((m) => m.home === team.abbr || m.away === team.abbr);
  const myPlayoffs = season.playoffs.filter((m) => m.home === team.abbr || m.away === team.abbr);
  const roster = players.filter((p) => p.team === team.abbr).sort((a, b) => b.games - a.games).slice(0, 7);
  const inWorlds = worlds.lckTeams.includes(team.abbr);

  const champAgg: Record<string, { kor: string; games: number }> = {};
  for (const p of roster) for (const c of p.champions) {
    (champAgg[c.eng] ||= { kor: c.kor, games: 0 }).games += c.games;
  }
  const topChamps = Object.values(champAgg).sort((a, b) => b.games - a.games).slice(0, 5);

  const share = () => {
    logEvent('share_click', { team: team.abbr });
    void shareWithTossLink({
      path: 'intoss://lck-app',
      message: `${season.year} LCK ${team.kor} — 정규시즌 ${team.rank}위 (${team.w}승 ${team.l}패)${result ? `, 최종 ${result.replace(/^\S+\s/, '')}` : ''}\nLCK 순위에서 우리 팀 기록 보기`,
    });
  };

  return (
    <div className="page">
      <div className="page-title">
        <h1>내 팀</h1>
        <button className="chip-btn" onClick={onChangeTeam}>팀 바꾸기</button>
      </div>

      <section className="team-hero" style={{ ['--tc' as string]: team.color }}>
        <div className="th-top">
          <span className="th-abbr">{team.abbr}</span>
          {team.kor !== team.abbr && <span className="th-kor">{team.kor}</span>}
        </div>
        {result && <div className="th-result">{season.year} 시즌 최종 {result}</div>}
        <div className="th-stats">
          <div><b>{team.rank}위</b><span>{team.group ? `정규 · ${team.group}` : "정규시즌"}</span></div>
          <div><b>{team.w}승 {team.l}패</b><span>승률 {team.wr}%</span></div>
          <div><b className={team.gdm >= 0 ? 'pos' : 'neg'}>{team.gdm > 0 ? '+' : ''}{team.gdm}</b><span>세트 득실</span></div>
        </div>
        <div className="th-form">
          <span>최근 5경기</span>
          <FormDots form={team.form} large />
        </div>
        <button className="share-btn" onClick={share}>우리 팀 성적 공유하기</button>
      </section>

      <h3 className="sec">다음 경기</h3>
      <div className="card info-card">
        {nextMatch ? (
          <>
            <div className="ic-main">
              {nextMatch.league === 'WORLDS' ? '월즈 ' : ''}{nextMatch.stage} · {kstLabel(nextMatch.startTime) || `${nextMatch.date} ${nextMatch.time ?? ''}`}
            </div>
            <div className="ic-sub">
              {teamName(teams, nextMatch.home)} vs {teamName(teams, nextMatch.away)}
            </div>
          </>
        ) : inWorlds ? (
          <div className="ic-main">월즈 다음 경기 일정이 나오면 바로 알려 드려요</div>
        ) : (
          <>
            <div className="ic-main">{season.year} 시즌 일정이 모두 끝났어요</div>
            <div className="ic-sub">
              {worlds.status !== 'ended' ? '지금은 월즈가 열리고 있어요. 순위 탭에서 일정을 볼 수 있어요.' : '다음 시즌 일정이 나오면 여기에 표시돼요.'}
            </div>
          </>
        )}
      </div>

      {myPlayoffs.length > 0 && (
        <>
          <h3 className="sec">포스트시즌 기록</h3>
          <div className="card list-card">
            {myPlayoffs.map((m) => {
              const mine = m.home === team.abbr ? m.homeScore : m.awayScore;
              const opp = m.home === team.abbr ? m.awayScore : m.homeScore;
              const oppAbbr = m.home === team.abbr ? m.away : m.home;
              return (
                <div className="po-row" key={m.startTime}>
                  <span className="po-date">{m.date}</span>
                  <span className="po-stage">{m.stage}</span>
                  <span className="po-vs">vs {teamName(teams, oppAbbr)}</span>
                  <span className={`po-score ${mine > opp ? 'win' : 'loss'}`}>{mine}:{opp} {mine > opp ? '승' : '패'}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <BannerAd />

      <h3 className="sec">우리 팀 선수 기록</h3>
      <div className="card list-card lockable">
        {roster.length === 0 && <div className="empty">선수 기록을 준비하고 있어요</div>}
        {roster.map((p, i) => {
          const locked = !reportUnlocked && i >= 1;
          return (
            <div className={`pl-row ${locked ? 'blur' : ''}`} key={p.name} aria-hidden={locked}>
              <span className="pl-pos">{p.pos}</span>
              <span className="pl-name">{p.kor !== p.name ? `${p.kor}` : p.name}<small>{p.kor !== p.name ? p.name : ''}</small></span>
              <span className="pl-stat"><b>KDA {p.kda}</b><small>{p.games}세트 · 승률 {p.wr}%</small></span>
              <span className="pl-champ">{p.champions[0]?.kor ?? ''}</span>
            </div>
          );
        })}
        {!reportUnlocked && roster.length > 1 && (
          <div className="lock-box">
            <div className="lock-title">주전 {roster.length}명 전체 기록과 주력 챔피언</div>
            <button className="ad-btn" onClick={() => onAdRequest('report')}>광고 보고 전체 보기</button>
            <div className="ad-note">한 번 보면 24시간 동안 열려 있어요</div>
          </div>
        )}
      </div>

      {reportUnlocked && topChamps.length > 0 && (
        <>
          <h3 className="sec">우리 팀이 많이 고른 챔피언</h3>
          <div className="champ-chips">
            {topChamps.map((c) => (
              <span className="champ-chip" key={c.kor}>{c.kor} <small>{c.games}</small></span>
            ))}
          </div>
        </>
      )}
      <p className="foot-note">{season.year} 정규시즌·플레이오프 경기 기록으로 계산했어요.</p>
    </div>
  );
}

/* ───────────── 선수 탭 ───────────── */
const POS_FILTER = ['전체', 'TOP', 'JGL', 'MID', 'AD', 'SPT'] as const;
const FREE_PLAYERS = 10;

function PlayersPage({ players, teams, unlocked, onAdRequest }: {
  players: PlayerStat[]; teams: TeamStanding[]; unlocked: boolean; onAdRequest: (p: AdPurpose) => void;
}) {
  const [pos, setPos] = useState<(typeof POS_FILTER)[number]>('전체');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!unlocked) preloadReportAd();
  }, [unlocked]);

  const faker = players.find((p) => p.name.toLowerCase() === 'faker');
  const list = players.filter((p) => pos === '전체' || p.pos === pos);

  return (
    <div className="page">
      <div className="page-title">
        <h1>선수 기록</h1>
        <span className="updated">KDA 순 · 10세트 이상</span>
      </div>

      {faker && (
        <section className="faker-card">
          <div className="fk-label">페이커 {new Date().getFullYear()} 시즌</div>
          <div className="fk-stats">
            <div><b>{faker.games}</b><span>세트</span></div>
            <div><b>{faker.wr}%</b><span>승률</span></div>
            <div><b>{faker.kda}</b><span>KDA</span></div>
            <div><b>{Math.round(faker.kpRate * 100)}%</b><span>킬 관여</span></div>
          </div>
          <div className="fk-champs">
            {faker.champions.slice(0, 3).map((c) => (
              <span key={c.eng}>{c.kor} {c.games}판 {c.wr}%</span>
            ))}
          </div>
        </section>
      )}

      <div className="chips" role="tablist" aria-label="포지션">
        {POS_FILTER.map((p) => (
          <button key={p} role="tab" aria-selected={pos === p} className={`chip ${pos === p ? 'on' : ''}`} onClick={() => setPos(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="card list-card">
        {list.map((p, i) => {
          const locked = !unlocked && i >= FREE_PLAYERS;
          if (locked && i > FREE_PLAYERS + 2) return null;
          const isOpen = open === p.name && !locked;
          return (
            <div key={p.name} className={`pr ${locked ? 'blur' : ''}`} aria-hidden={locked}>
              <button className="pr-row" onClick={() => !locked && setOpen(isOpen ? null : p.name)} disabled={locked}>
                <span className="pr-rank">{i + 1}</span>
                <span className="pr-bar" style={{ background: teamColor(teams, p.team) }} />
                <span className="pr-name">
                  {p.kor}
                  <small>{p.team} · {p.pos}</small>
                </span>
                <span className="pr-kda">
                  <b>{p.kda}</b>
                  <small>승률 {p.wr}%</small>
                </span>
              </button>
              {isOpen && (
                <div className="pr-detail">
                  <div>{p.games}세트 {p.wins}승 · K/D/A {p.kills}/{p.deaths}/{p.assists} · 킬 관여 {Math.round(p.kpRate * 100)}%</div>
                  <div className="pr-champs">
                    {p.champions.map((c) => (
                      <span key={c.eng}>{c.kor} {c.games}판 · {c.wr}% · KDA {c.kda}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!unlocked && list.length > FREE_PLAYERS && (
          <div className="lock-box">
            <div className="lock-title">{list.length - FREE_PLAYERS}명 더 있어요</div>
            <button className="ad-btn" onClick={() => onAdRequest('players')}>광고 보고 전체 순위 보기</button>
            <div className="ad-note">한 번 보면 24시간 동안 열려 있어요</div>
          </div>
        )}
      </div>
      <BannerAd />
      <p className="foot-note">선수를 누르면 많이 쓴 챔피언이 보여요. 정규시즌·플레이오프 기록 기준이에요.</p>
    </div>
  );
}

/* ───────────── 메타 탭 ───────────── */
function MetaPage({ meta }: { meta: MetaChamp[] }) {
  const [sortBy, setSortBy] = useState<'pick' | 'wr'>('pick');
  const sorted = [...meta].sort((a, b) => (sortBy === 'pick' ? b.picks - a.picks : b.wr - a.wr || b.picks - a.picks));
  const maxPick = Math.max(1, ...meta.map((m) => m.pickRate));
  return (
    <div className="page">
      <div className="page-title">
        <h1>많이 쓴 챔피언</h1>
      </div>
      <div className="chips" role="tablist" aria-label="정렬">
        <button role="tab" aria-selected={sortBy === 'pick'} className={`chip ${sortBy === 'pick' ? 'on' : ''}`} onClick={() => setSortBy('pick')}>많이 고른 순</button>
        <button role="tab" aria-selected={sortBy === 'wr'} className={`chip ${sortBy === 'wr' ? 'on' : ''}`} onClick={() => setSortBy('wr')}>승률 순</button>
      </div>
      <div className="card list-card">
        {sorted.map((c, i) => (
          <div className="meta-row" key={c.eng}>
            <span className="mr-rank">{i + 1}</span>
            <span className="mr-name">{c.kor}<small>{c.picks}번 선택</small></span>
            <span className="mr-bars">
              <span className="mr-line"><em>선택</em><span className="bar"><span style={{ width: `${(c.pickRate / maxPick) * 100}%` }} /></span><b>{c.pickRate}%</b></span>
              <span className="mr-line"><em>승률</em><span className="bar"><span className={c.wr >= 50 ? 'good' : 'bad'} style={{ width: `${c.wr}%` }} /></span><b>{c.wr}%</b></span>
            </span>
          </div>
        ))}
      </div>
      <BannerAd />
      <p className="foot-note">선택률 = 전체 세트 중 그 챔피언이 나온 비율이에요. 5번 이상 나온 챔피언만 보여요.</p>
    </div>
  );
}

/* ───────────── 앱 ───────────── */
function App() {
  const [myTeam, setMyTeam] = useState<string>(() => {
    try {
      return localStorage.getItem('lck_my_team') || '';
    } catch {
      return '';
    }
  });
  const [tab, setTab] = useState<Tab>('rank');
  const [picking, setPicking] = useState(false);

  const [teams, setTeams] = useState<TeamStanding[]>(FALLBACK_STANDINGS);
  const [players, setPlayers] = useState<PlayerStat[]>(FALLBACK_PLAYERS);
  const [meta, setMeta] = useState<MetaChamp[]>(FALLBACK_META);
  const [matches, setMatches] = useState<UpcomingMatch[]>(FALLBACK_MATCHES);
  const [updated, setUpdated] = useState<UpdatedMeta | null>(FALLBACK_UPDATED);
  const [season, setSeason] = useState<SeasonSummary>(FALLBACK_SEASON);
  const [worlds, setWorlds] = useState<WorldsInfo>(FALLBACK_WORLDS);

  const [reportUnlocked, setReportUnlocked] = useState(() => isUnlocked('lck_unlock_report'));
  const [playersUnlocked, setPlayersUnlocked] = useState(() => isUnlocked('lck_unlock_players'));
  const [worldsUnlocked, setWorldsUnlocked] = useState(() => isUnlocked('lck_unlock_worlds'));
  const [adPurpose, setAdPurpose] = useState<AdPurpose>(null);
  // 광고 전에 꼭 물어보기 (2026-10-18): 버튼 → "짧은 광고를 볼까요?" → [광고 보기]를 눌러야만 광고
  const [askPurpose, setAskPurpose] = useState<AdPurpose>(null);
  const requestAd = (p: AdPurpose) => {
    preloadReportAd();
    setAskPurpose(p);
  };

  useEffect(() => {
    // 새 형식(setW 포함)일 때만 반영 — CDN에 남은 예전 형식 데이터로 덮어쓰지 않도록
    api.standings().then((d) => Array.isArray(d) && d.length >= 8 && typeof d[0]?.setW === 'number' && setTeams(d)).catch(() => {});
    api.players().then((d) => Array.isArray(d) && d.length && Array.isArray(d[0]?.champions) && setPlayers(d)).catch(() => {});
    api.meta().then((d) => Array.isArray(d) && d.length && typeof d[0]?.picks === 'number' && setMeta(d)).catch(() => {});
    api.matches().then((d) => Array.isArray(d) && setMatches(d)).catch(() => {});
    api.updated().then(setUpdated).catch(() => {});
    api.season().then((d) => d?.year && Array.isArray(d.playoffs) && setSeason(d)).catch(() => {});
    api.worlds().then((d) => d?.year && Array.isArray(d.stages) && setWorlds(d)).catch(() => {});
  }, []);

  // 월즈 탭에 들어오면 보상형 광고를 미리 불러 둬요
  useEffect(() => {
    if (tab === 'worlds' && !worldsUnlocked) preloadReportAd();
  }, [tab, worldsUnlocked]);

  // 탭 이동 기록 — 뒤로가기 시 이전 탭으로
  const historyRef = useRef<Tab[]>([]);
  const goTab = (next: Tab) => {
    if (next === tab) return;
    historyRef.current.push(tab);
    setTab(next);
    window.scrollTo(0, 0);
  };

  // 토스 내비게이션 바 뒤로가기 / 안드로이드 뒤로가기
  useTossBackEvent(() => {
    if (adPurpose) return true; // 광고 진행 중에는 무시
    if (closeTopSheet()) return true; // 열린 시트부터 닫기
    if (picking) {
      setPicking(false);
      return true;
    }
    const prev = historyRef.current.pop();
    if (prev) {
      setTab(prev);
      return true;
    }
    return false; // 첫 화면 → 미니앱 종료
  });

  const selectTeam = (abbr: string) => {
    try {
      localStorage.setItem('lck_my_team', abbr);
    } catch {
      /* noop */
    }
    setMyTeam(abbr);
    setPicking(false);
    logEvent('team_selected', { team: abbr });
    if (tab !== 'myteam') goTab('myteam');
  };

  const handleReward = () => {
    if (adPurpose === 'report') {
      saveUnlock('lck_unlock_report');
      setReportUnlocked(true);
      logEvent('report_unlocked', { team: myTeam });
    }
    if (adPurpose === 'players') {
      saveUnlock('lck_unlock_players');
      setPlayersUnlocked(true);
      logEvent('report_unlocked', { kind: 'players' });
    }
    if (adPurpose === 'worlds') {
      saveUnlock('lck_unlock_worlds');
      setWorldsUnlocked(true);
      logEvent('report_unlocked', { kind: 'worlds' });
    }
    setTimeout(() => requestReviewOnce('lck-review-asked'), 4000);
  };

  const showPicker = picking || (tab === 'myteam' && !myTeam);

  return (
    <div className="app">
      {showPicker ? (
        <TeamPicker teams={teams} current={myTeam} onSelect={selectTeam} onClose={picking ? () => setPicking(false) : undefined} />
      ) : (
        <>
          {tab === 'rank' && (
            <RankPage teams={teams} season={season} worlds={worlds} updated={updated} myTeam={myTeam} onPickTeam={() => setPicking(true)} />
          )}
          {tab === 'myteam' && (
            <MyTeamPage
              teams={teams}
              players={players}
              season={season}
              worlds={worlds}
              matches={matches}
              myTeam={myTeam}
              reportUnlocked={reportUnlocked}
              onChangeTeam={() => setPicking(true)}
              onAdRequest={requestAd}
            />
          )}
          {tab === 'players' && <PlayersPage players={players} teams={teams} unlocked={playersUnlocked} onAdRequest={requestAd} />}
          {tab === 'meta' && <MetaPage meta={meta} />}
          {tab === 'worlds' && (
            <WorldsPage worlds={worlds} teams={teams} players={players} unlocked={worldsUnlocked} onAdRequest={() => requestAd('worlds')} />
          )}
        </>
      )}

      <nav className="tabbar" aria-label="메뉴">
        {([
          ['rank', '순위'],
          ['worlds', '월즈'],
          ['myteam', '내 팀'],
          ['players', '선수'],
          ['meta', '챔피언'],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            className={tab === k && !picking ? 'tab active' : 'tab'}
            aria-current={tab === k ? 'page' : undefined}
            onClick={() => {
              setPicking(false);
              goTab(k);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <ConfirmSheet
        open={askPurpose !== null}
        desc={
          askPurpose === 'worlds'
            ? '짧은 광고를 끝까지 보면\nLCK 대표팀 상세를 24시간 동안 볼 수 있어요.'
            : askPurpose === 'players'
              ? '짧은 광고를 끝까지 보면\n선수 전체 순위를 24시간 동안 볼 수 있어요.'
              : '짧은 광고를 끝까지 보면\n우리 팀 전체 기록을 24시간 동안 볼 수 있어요.'
        }
        onClose={() => setAskPurpose(null)}
        onConfirm={() => {
          const p = askPurpose;
          setAskPurpose(null);
          setAdPurpose(p);
        }}
      />

      {adPurpose !== null && <RewardedAd onReward={handleReward} onClose={() => setAdPurpose(null)} />}
    </div>
  );
}

export default App;
