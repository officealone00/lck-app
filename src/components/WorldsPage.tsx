/**
 * 월즈(롤드컵) 탭 (2026-10-18)
 * - 단계 진행, 다음 경기, 전체 일정·결과(한국 시간), 팀별 현재 전적은 무료
 * - "LCK 대표팀 상세"는 [광고 보고 …] → "짧은 광고를 볼까요?" 시트 → [광고 보기]를 눌러야만 광고가 나와요
 */
import { useMemo, useState } from 'react';
import BannerAd from './BannerAd';
import { LCK_CODES, type PlayerStat, type TeamStanding, type WorldsInfo, type WorldsMatch } from '../utils/api';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function kst(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600e3);
  return {
    day: `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEK[d.getUTCDay()]})`,
    time: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
  };
}

export default function WorldsPage({
  worlds,
  teams,
  players,
  unlocked,
  onAdRequest,
}: {
  worlds: WorldsInfo;
  teams: TeamStanding[];
  players: PlayerStat[];
  unlocked: boolean;
  onAdRequest: () => void;
}) {
  const [onlyLck, setOnlyLck] = useState(false);
  const all = worlds.allMatches ?? worlds.lckMatches;
  const now = Date.now();
  const color = (c: string) => teams.find((t) => t.abbr === c)?.color;
  // LCK 팀은 한글 이름, 해외 팀은 짧으면 이름·길면 약자 (줄바꿈 방지)
  const nameOf = (c: string, n: string) => teams.find((t) => t.abbr === c)?.kor ?? (n && n.length <= 8 ? n : c);

  const stageNames = worlds.stages.map((s) => s.name);
  const currentStage = [...worlds.stages].reverse().find((s) => new Date(s.start).getTime() <= now)?.name;

  // 지난 경기는 최근 순으로 조금만, 앞으로 경기는 날짜순
  const shown = useMemo(() => {
    const list = all.filter((m) => (onlyLck ? LCK_CODES.has(m.home) || LCK_CODES.has(m.away) : true));
    const done = list.filter((m) => m.state === 'completed').slice(-8);
    const rest = list.filter((m) => m.state !== 'completed').slice(0, 16);
    return [...done, ...rest];
  }, [all, onlyLck]);

  const groups = useMemo(() => {
    const g: { day: string; items: WorldsMatch[] }[] = [];
    for (const m of shown) {
      const d = kst(m.startTime).day;
      if (!g.length || g[g.length - 1].day !== d) g.push({ day: d, items: [] });
      g[g.length - 1].items.push(m);
    }
    return g;
  }, [shown]);

  const next = worlds.next;
  const recs = Object.entries(worlds.records ?? {}).sort((a, b) => b[1].w - b[1].l - (a[1].w - a[1].l) || b[1].w - a[1].w);
  const lckTeams = worlds.lckTeams.length ? worlds.lckTeams : [];

  return (
    <div className="page">
      <div className="page-title">
        <h1>🌏 {worlds.title}</h1>
        <span className="updated">한국 시간</span>
      </div>

      {stageNames.length > 0 && (
        <div className="w-stages">
          {stageNames.map((n) => {
            const idx = stageNames.indexOf(n);
            const cur = stageNames.indexOf(currentStage ?? '');
            return (
              <span key={n} className={`w-stage ${n === currentStage ? 'now' : idx < cur ? 'done' : ''}`}>
                {n}
              </span>
            );
          })}
        </div>
      )}

      {next && next.home !== 'TBD' && (
        <div className="w-next">
          <small>다음 경기 · {next.stage} · {next.bestOf}판 {Math.ceil(next.bestOf / 2)}선승</small>
          <div className="vs">
            <span>{teams.find((t) => t.abbr === next.home)?.kor ?? next.homeName ?? next.home}</span>
            <em>vs</em>
            <span>{teams.find((t) => t.abbr === next.away)?.kor ?? next.awayName ?? next.away}</span>
          </div>
          <p>{kst(next.startTime).day} {kst(next.startTime).time}</p>
        </div>
      )}

      {recs.length > 0 && (
        <>
          <h3 className="sec">지금 단계 팀별 전적</h3>
          <div className="w-rec">
            {recs.map(([code, r]) => (
              <div key={code} className={LCK_CODES.has(code) ? 'lck' : ''}>
                <span style={{ color: color(code) }}>{nameOf(code, r.name)}</span>
                <b>
                  {r.w}승 {r.l}패
                </b>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="sec">일정 · 결과</h3>
      <div className="w-filter">
        <button className={!onlyLck ? 'on' : ''} onClick={() => setOnlyLck(false)}>
          전체
        </button>
        <button className={onlyLck ? 'on' : ''} onClick={() => setOnlyLck(true)}>
          LCK 팀만
        </button>
      </div>
      {groups.length === 0 && <div className="wc-note">{onlyLck ? 'LCK 팀은 스위스 스테이지부터 나와요. 대진이 정해지면 바로 보여드려요.' : '일정을 불러오고 있어요'}</div>}
      {groups.map((g) => (
        <div key={g.day}>
          <div className="w-day">{g.day}</div>
          {g.items.every((m) => m.home === 'TBD') ? (
            <div className="w-row">
              <span className="w-time">{kst(g.items[0].startTime).time}~</span>
              <span className="w-teams">
                <span className="lose">{g.items.length}경기 · 대진 발표 전</span>
              </span>
              <span className="w-tag">{g.items[0].stage}</span>
            </div>
          ) : g.items.map((m) => {
            const done = m.state === 'completed';
            const live = m.state === 'inProgress';
            const hw = done && (m.homeScore ?? 0) > (m.awayScore ?? 0);
            const aw = done && (m.awayScore ?? 0) > (m.homeScore ?? 0);
            const lck = LCK_CODES.has(m.home) || LCK_CODES.has(m.away);
            const tbd = m.home === 'TBD';
            return (
              <div key={m.id + m.startTime} className={`w-row ${lck ? 'lck' : ''}`}>
                <span className="w-time">{kst(m.startTime).time}</span>
                <span className="w-teams">
                  {tbd ? (
                    <span className="lose">대진 발표 전</span>
                  ) : (
                    <>
                      <b className={aw ? 'lose' : ''} style={{ color: aw ? undefined : color(m.home) }}>{nameOf(m.home, m.homeName)}</b>
                      <span className="w-score">{done || live ? `${m.homeScore ?? 0} : ${m.awayScore ?? 0}` : 'vs'}</span>
                      <b className={hw ? 'lose' : ''} style={{ color: hw ? undefined : color(m.away) }}>{nameOf(m.away, m.awayName)}</b>
                    </>
                  )}
                </span>
                <span className={`w-tag ${live ? 'live' : ''}`}>{live ? '진행 중' : m.stage}</span>
              </div>
            );
          })}
        </div>
      ))}

      <h3 className="sec">🇰🇷 LCK 대표팀 상세</h3>
      <div className="card list-card lockable">
        {unlocked ? (
          <div style={{ padding: 12 }}>
            {(lckTeams.length ? lckTeams : teams.slice(0, 4).map((t) => t.abbr)).map((code) => {
              const t = teams.find((x) => x.abbr === code);
              const roster = players.filter((p) => p.team === code).sort((a, b) => b.kda - a.kda);
              const champs = new Map<string, number>();
              roster.forEach((p) => p.champions.slice(0, 3).forEach((c) => champs.set(c.kor, (champs.get(c.kor) ?? 0) + c.games)));
              const top = [...champs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
              const rec = worlds.records?.[code];
              return (
                <div key={code} className="w-team-card">
                  <h4 style={{ color: t?.color }}>{t?.kor ?? code}</h4>
                  <p>
                    LCK 정규시즌 {t ? `${t.rank}위 · ${t.w}승 ${t.l}패 · 세트 득실 ${t.gdm > 0 ? '+' : ''}${t.gdm}` : '기록 없음'}
                    {rec ? ` · 월즈 ${rec.w}승 ${rec.l}패` : ''}
                  </p>
                  {roster.length > 0 && (
                    <p>
                      KDA 상위: {roster.slice(0, 2).map((p) => `${p.kor !== p.name ? p.kor : p.name}(${p.pos}) ${p.kda}`).join(' · ')}
                    </p>
                  )}
                  {top.length > 0 && <p>자주 고른 챔피언: {top.map(([k]) => k).join(', ')}</p>}
                </div>
              );
            })}
            {!lckTeams.length && <p className="foot-note">월즈 대진이 정해지기 전이라 LCK 상위 4팀을 보여드려요.</p>}
          </div>
        ) : (
          <div className="lock-box">
            <div className="lock-title">월즈에 나간 LCK 팀의 시즌 성적 · 핵심 선수 · 주력 챔피언</div>
            <button className="ad-btn" onClick={onAdRequest}>
              광고 보고 LCK 대표팀 보기
            </button>
            <div className="ad-note">한 번 보면 24시간 동안 열려 있어요</div>
          </div>
        )}
      </div>

      <div style={{ margin: '16px 0' }}>
        <BannerAd />
      </div>
      <p className="foot-note">라이엇 게임즈 공식 e스포츠 일정으로 보여드려요. 결과를 예측하지 않아요.</p>
    </div>
  );
}
