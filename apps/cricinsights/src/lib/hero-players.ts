import {
  getPlayerCareerStats,
  resolvePlayerByName,
} from '@cricket-ai/database';
import { resolvePlayerPhoto } from '@/lib/player-photo';
import { buildRatedCard } from '@/lib/scoring/engine';
import { careerStatsToAggregates } from '@/lib/scoring/aggregates';
import type { LeagueCode, PlayerProfile, RatedPlayerCard } from '@/types/cricket';

/** SportMonks league id for Indian Premier League in `master.leagues`. */
export const IPL_LEAGUE_ID = 1;

const HERO_DUEL_NAMES = ['Virat Kohli', 'Rohit Sharma'];

function inferRole(
  battingStyle: string | null,
  bowlingStyle: string | null,
): PlayerProfile['role'] {
  const bat = Boolean(battingStyle?.trim());
  const bowl = Boolean(bowlingStyle && bowlingStyle.length > 2);
  if (bat && bowl) return 'all-rounder';
  if (bowl) return 'bowler';
  return 'batter';
}

async function buildHeroCard(
  name: string,
  leagueId: number,
  leagueLabel: LeagueCode,
): Promise<RatedPlayerCard | null> {
  const player = await resolvePlayerByName(name);
  const stats = await getPlayerCareerStats(player.sportmonksId, undefined, leagueId);
  const aggregates = careerStatsToAggregates(stats, leagueId);
  if (!aggregates) {
    const allStats = await getPlayerCareerStats(player.sportmonksId);
    const fallbackAgg = careerStatsToAggregates(allStats);
    if (!fallbackAgg) return null;
    const profile: PlayerProfile = {
      id: player.sportmonksId,
      fullname: player.fullname,
      role: inferRole(player.battingstyle, player.bowlingstyle),
      battingStyle: player.battingstyle ?? undefined,
      bowlingStyle: player.bowlingstyle ?? undefined,
      league: leagueLabel,
      avatarUrl: resolvePlayerPhoto(
        player.imagePath,
        player.fullname,
        String(player.sportmonksId),
      ),
    };
    return buildRatedCard(profile, fallbackAgg, leagueLabel);
  }

  const leagueName =
    stats.find((row) => row.leagueId === leagueId)?.leagueName ?? 'IPL';

  const profile: PlayerProfile = {
    id: player.sportmonksId,
    fullname: player.fullname,
    role: inferRole(player.battingstyle, player.bowlingstyle),
    battingStyle: player.battingstyle ?? undefined,
    bowlingStyle: player.bowlingstyle ?? undefined,
    league: leagueLabel,
    team: leagueName,
    avatarUrl: resolvePlayerPhoto(
      player.imagePath,
      player.fullname,
      String(player.sportmonksId),
    ),
  };

  return buildRatedCard(profile, aggregates, leagueLabel);
}

export async function getHeroDuelCards(
  leagueId: number = IPL_LEAGUE_ID,
  leagueLabel: LeagueCode = 'IPL',
): Promise<[RatedPlayerCard | null, RatedPlayerCard | null]> {
  try {
    const cards = await Promise.all(
      HERO_DUEL_NAMES.map((name) => buildHeroCard(name, leagueId, leagueLabel)),
    );
    if (!cards[0] || !cards[1]) {
      return [null, null];
    }
    return [cards[0], cards[1]];
  } catch (error) {
    console.warn('[hero-players] Failed to load hero duel cards:', error);
    return [null, null];
  }
}

export async function getHeroSnapshotCard(
  leagueId: number = IPL_LEAGUE_ID,
  leagueLabel: LeagueCode = 'IPL',
): Promise<RatedPlayerCard | null> {
  const [first] = await getHeroDuelCards(leagueId, leagueLabel);
  return first;
}
