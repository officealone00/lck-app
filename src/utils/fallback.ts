/**
 * 내장 데이터 (2026-10-18)
 * 빌드 시점의 public/data/*.json 을 그대로 넣어 둬요.
 * - 앱을 열자마자 이 데이터로 바로 그리고, 최신 데이터가 도착하면 바꿔요. (빈 화면·로딩 대기 없음)
 * - 네트워크가 안 될 때도 마지막으로 빌드된 실제 데이터를 보여줘요.
 */
import type { TeamStanding, PlayerStat, MetaChamp, UpcomingMatch, UpdatedMeta, SeasonSummary, WorldsInfo } from './api';
import standings from '../../public/data/standings.json';
import players from '../../public/data/players2.json';
import meta from '../../public/data/meta2.json';
import matches from '../../public/data/matches.json';
import updated from '../../public/data/updated.json';
import season from '../../public/data/season.json';
import worlds from '../../public/data/worlds.json';

export const FALLBACK_STANDINGS = standings as TeamStanding[];
export const FALLBACK_PLAYERS = players as PlayerStat[];
export const FALLBACK_META = meta as MetaChamp[];
export const FALLBACK_MATCHES = matches as UpcomingMatch[];
export const FALLBACK_UPDATED = updated as UpdatedMeta;
export const FALLBACK_SEASON = season as SeasonSummary;
export const FALLBACK_WORLDS = worlds as unknown as WorldsInfo;
