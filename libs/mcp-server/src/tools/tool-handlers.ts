import {
  getFixtureScorecard,
  getFixturesByLeague,
  getSeasonWinner,
  getFixturesByTeam,
  getHeadToHead,
  findFixturesByTeams,
  getBallAnalysis,
  getLiveMatchState,
  getMatchContext,
  getPlayerMatchHistory,
  getRankings,
  getTeamAnalytics,
  getTrends,
  getVenueStats,
  getLeaderboard,
  getPlayerById,
  getPlayerCareerStats,
  getPlayerMatchup,
  getReadPool,
  getStandings,
  getTeamById,
  getTeamRecentForm,
  getTeamSquad,
  searchCricketEntities,
  resolvePlayerByName,
  resolveTeamByName,
} from '@cricket-ai/database';
import type { Fixture, LeaderboardMetric } from '@cricket-ai/database';
import type {
  CompareEntitiesInput,
  GetFixturesInput,
  GetInsightInput,
  GetLeagueDataInput,
  GetMatchDataInput,
  GetPlayerStatsInput,
  GetTeamDataInput,
  GetBallAnalysisInput,
  GetLiveMatchStateInput,
  GetMatchContextInput,
  GetPlayerMatchHistoryInput,
  GetRankingsInput,
  GetTeamAnalyticsInput,
  GetTrendsInput,
  GetVenueStatsInput,
  SearchCricketEntitiesInput,
} from '../schemas/tool-schemas.js';

export async function handleGetPlayerStats(
  input: GetPlayerStatsInput,
): Promise<Record<string, unknown>> {
  let player =
    input.player_id !== undefined ? await getPlayerById(input.player_id) : null;

  if (!player && input.name) {
    player = await resolvePlayerByName(input.name);
  }

  if (!player) {
    throw new Error('Player not found');
  }

  if (input.position_id !== undefined && player.positionId !== input.position_id) {
    throw new Error(`Player ${player.fullname} does not match position_id ${input.position_id}`);
  }
  if (input.batting_style && player.battingstyle?.toLowerCase() !== input.batting_style.toLowerCase()) {
    throw new Error(`Player ${player.fullname} does not match batting_style ${input.batting_style}`);
  }
  if (input.bowling_style && player.bowlingstyle?.toLowerCase() !== input.bowling_style.toLowerCase()) {
    throw new Error(`Player ${player.fullname} does not match bowling_style ${input.bowling_style}`);
  }

  let careerStats = await getPlayerCareerStats(
    player.sportmonksId,
    input.format_type,
    input.league_id,
  );

  if (input.season_id !== undefined) {
    careerStats = careerStats.filter((s) => s.seasonId === input.season_id);
  }
  if (input.season_year !== undefined) {
    careerStats = careerStats.filter((s) => s.seasonName.includes(input.season_year ?? ''));
  }

  const totalRuns = careerStats.reduce(
    (sum, s) => sum + (s.battingRuns ?? 0),
    0,
  );
  const totalWickets = careerStats.reduce(
    (sum, s) => sum + (s.bowlingWickets ?? 0),
    0,
  );

  return {
    component: 'PlayerCard',
    data: {
      profile: player,
      careerStats,
      filters: {
        formatType: input.format_type ?? null,
        leagueId: input.league_id ?? null,
        seasonId: input.season_id ?? null,
      },
      highlights: {
        totalBattingRuns: totalRuns,
        totalBowlingWickets: totalWickets,
        seasonsTracked: careerStats.length,
      },
    },
  };
}

export async function handleGetTeamData(
  input: GetTeamDataInput,
): Promise<Record<string, unknown>> {
  const team = await getTeamById(input.team_id);
  if (!team) {
    throw new Error(`Team ${input.team_id} not found`);
  }

  switch (input.data_type) {
    case 'profile':
      return { component: 'TeamCard', data: { profile: team } };
    case 'squad': {
      if (input.season_id === undefined) {
        throw new Error('season_id is required for squad data');
      }
      const squad = await getTeamSquad(input.team_id, input.season_id);
      return {
        component: 'TeamSquad',
        data: { profile: team, seasonId: input.season_id, squad },
      };
    }
    case 'form': {
      const form = await getTeamRecentForm(input.team_id, input.form_limit ?? 5);
      return { component: 'TeamForm', data: { profile: team, form } };
    }
    case 'season_stats': {
      if (input.season_id === undefined || input.league_id === undefined) {
        throw new Error('league_id and season_id are required for season_stats');
      }
      const standings = await getStandings(input.league_id, input.season_id);
      const teamStanding = standings.find((s) => s.teamId === input.team_id);
      return {
        component: 'TeamSeasonStats',
        data: {
          profile: team,
          leagueId: input.league_id,
          seasonId: input.season_id,
          standing: teamStanding ?? null,
          table: standings,
        },
      };
    }
    default:
      throw new Error(`Unsupported data_type: ${input.data_type}`);
  }
}

export async function handleGetMatchData(
  input: GetMatchDataInput,
): Promise<Record<string, unknown>> {
  if (input.fixture_id !== undefined) {
    return {
      component: 'MatchDetail',
      data: { match: await buildMatchDetail(input.fixture_id) },
    };
  }

  if (input.team_id !== undefined) {
    const recent = await getFixturesByTeam(input.team_id, {
      limit: input.recent_limit ?? 1,
    });
    if (recent.length === 0) {
      throw new Error(`No fixtures found for team ${input.team_id}`);
    }
    const latest = recent[0];
    return {
      component: 'MatchDetail',
      data: {
        recentFixtures: recent,
        match: await buildMatchDetail(latest.sportmonksId),
      },
    };
  }

  if (input.team_a_name && input.team_b_name) {
    return buildMatchDetailFromContext(input);
  }

  throw new Error('Provide fixture_id, team_id, or both team_a_name and team_b_name');
}

async function buildMatchDetailFromContext(input: GetMatchDataInput) {
  let teamA;
  let teamB;
  try {
    [teamA, teamB] = await Promise.all([
      resolveTeamByName(input.team_a_name ?? ''),
      resolveTeamByName(input.team_b_name ?? ''),
    ]);
  } catch (error) {
    return matchLookupResult('not_found', {
      message: error instanceof Error ? error.message : 'A named team was not found in the database.',
      query: matchContextQuery(input),
    });
  }

  const fixtures = await findFixturesByTeams(
    teamA.sportmonksId,
    teamB.sportmonksId,
    {
      year: input.year,
      matchFormat: input.match_format,
      leagueName: input.league_name,
      limit: 5,
    },
  );

  if (fixtures.length === 0) {
    return matchLookupResult('not_found', {
      message: 'No fixture in the database matches the supplied teams and filters.',
      query: matchContextQuery(input),
      teams: [teamA.name, teamB.name],
    });
  }
  if (fixtures.length > 1) {
    return matchLookupResult('ambiguous', {
      message: 'More than one fixture matches. Add a year, competition, or fixture ID.',
      query: matchContextQuery(input),
      teams: [teamA.name, teamB.name],
      candidates: fixtures,
    });
  }

  const fixture = fixtures[0];
  return {
    component: 'MatchDetail',
    data: {
      match: await buildMatchDetail(fixture.sportmonksId),
      resolution: {
        status: 'found',
        query: matchContextQuery(input),
        teams: [teamA.name, teamB.name],
      },
    },
  };
}

function matchContextQuery(input: GetMatchDataInput) {
  return {
    teamAName: input.team_a_name ?? null,
    teamBName: input.team_b_name ?? null,
    year: input.year ?? null,
    matchFormat: input.match_format ?? null,
    leagueName: input.league_name ?? null,
  };
}

function matchLookupResult(
  status: 'not_found' | 'ambiguous',
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    component: 'DataAvailability',
    data: { status, ...data },
  };
}

async function buildMatchDetail(fixtureId: number) {
  const scorecard = await getFixtureScorecard(fixtureId);
  if (!scorecard) {
    throw new Error(`Fixture ${fixtureId} not found`);
  }
  return scorecard;
}

export async function handleGetFixtures(
  input: GetFixturesInput,
): Promise<Record<string, unknown>> {
  let fixtures: Fixture[] = [];

  if (input.league_id !== undefined && input.season_id !== undefined) {
    fixtures = await getFixturesByLeague(
      input.league_id,
      input.season_id,
      input.status,
    );
  } else if (input.team_id !== undefined) {
    fixtures = await getFixturesByTeam(input.team_id, {
      leagueId: input.league_id,
      seasonId: input.season_id,
      status: input.status,
      limit: input.limit ?? 50,
      offset: input.offset,
    });
  } else {
    throw new Error('Provide league_id + season_id, or team_id to list fixtures');
  }

  if (input.date_from || input.date_to) {
    const fromMs = input.date_from
      ? Date.parse(input.date_from)
      : Number.NEGATIVE_INFINITY;
    const toMs = input.date_to
      ? Date.parse(input.date_to)
      : Number.POSITIVE_INFINITY;
    fixtures = fixtures.filter((f) => {
      if (!f.startingAt) return false;
      const ms = Date.parse(f.startingAt);
      return ms >= fromMs && ms <= toMs;
    });
  }

  if (input.stage_id !== undefined) {
    fixtures = fixtures.filter((fixture) => fixture.stageId === input.stage_id);
  }
  if (input.venue_id !== undefined) {
    fixtures = fixtures.filter((fixture) => fixture.venueId === input.venue_id);
  }
  if (input.match_format) {
    fixtures = fixtures.filter((fixture) =>
      fixture.matchFormat?.toLowerCase().includes(input.match_format?.toLowerCase() ?? '')
    );
  }

  if (input.limit !== undefined && input.team_id === undefined) {
    const offset = input.offset ?? 0;
    fixtures = fixtures.slice(offset, offset + input.limit);
  }

  return {
    component: 'FixtureList',
    data: { count: fixtures.length, filters: input, fixtures },
  };
}

export async function handleGetLeagueData(
  input: GetLeagueDataInput,
): Promise<Record<string, unknown>> {
  switch (input.data_type) {
    case 'season_winner': {
      const result = await getSeasonWinner(input.league_id, input.season_id);
      return {
        component: 'SeasonWinner',
        data: {
          leagueId: input.league_id,
          seasonId: input.season_id,
          winnerName: result?.winnerName ?? null,
          final: result?.fixture ?? null,
        },
      };
    }
    case 'standings': {
      const standings = await getStandings(input.league_id, input.season_id);
      return {
        component: 'StandingsTable',
        data: {
          leagueId: input.league_id,
          seasonId: input.season_id,
          standings,
        },
      };
    }
    case 'leaderboard': {
      const metric: LeaderboardMetric =
        input.leaderboard_metric ?? 'batting_runs';
      const entries = await getLeaderboard(
        input.league_id,
        input.season_id,
        metric,
      );
      return {
        component: 'Leaderboard',
        data: {
          leagueId: input.league_id,
          seasonId: input.season_id,
          metric,
          entries,
        },
      };
    }
    case 'fixtures': {
      const fixtures = await getFixturesByLeague(
        input.league_id,
        input.season_id,
        input.fixture_status,
      );
      const filteredFixtures = input.stage_id === undefined
        ? fixtures
        : fixtures.filter((fixture) => fixture.stageId === input.stage_id);
      return {
        component: 'FixtureList',
        data: { leagueId: input.league_id, seasonId: input.season_id, fixtures: filteredFixtures.slice(0, input.limit) },
      };
    }
    case 'season_overview':
    case 'stage_overview': {
      const [standings, topRuns, topWickets, fixtures] = await Promise.all([
        getStandings(input.league_id, input.season_id),
        getLeaderboard(input.league_id, input.season_id, 'batting_runs'),
        getLeaderboard(input.league_id, input.season_id, 'bowling_wickets'),
        getFixturesByLeague(input.league_id, input.season_id),
      ]);
      const filteredStandings = input.stage_id === undefined
        ? standings
        : standings.filter((standing) => standing.stageId === input.stage_id);
      const filteredFixtures = input.stage_id === undefined
        ? fixtures
        : fixtures.filter((fixture) => fixture.stageId === input.stage_id);
      return {
        component: input.data_type === 'stage_overview' ? 'LeagueStageOverview' : 'LeagueSeasonOverview',
        data: {
          leagueId: input.league_id,
          seasonId: input.season_id,
          stageId: input.stage_id ?? null,
          standings: filteredStandings,
          leaderboards: { topRuns, topWickets },
          fixtureCount: filteredFixtures.length,
          recentFixtures: filteredFixtures.slice(0, input.limit ?? 5),
        },
      };
    }
    default:
      throw new Error(`Unsupported data_type: ${input.data_type}`);
  }
}

export async function handleCompareEntities(
  input: CompareEntitiesInput,
): Promise<Record<string, unknown>> {
  switch (input.comparison_type) {
    case 'player_vs_player':
      return comparePlayers(input);
    case 'team_vs_team':
      return compareTeams(input);
    case 'batsman_vs_bowler':
      return compareBatsmanBowler(input);
    default:
      throw new Error(`Unsupported comparison_type: ${input.comparison_type}`);
  }
}

async function comparePlayers(input: CompareEntitiesInput) {
  const [playerA, playerB] = await Promise.all([
    getPlayerById(input.entity_a_id),
    getPlayerById(input.entity_b_id),
  ]);
  if (!playerA || !playerB) {
    throw new Error('One or both players not found');
  }

  const [statsA, statsB] = await Promise.all([
    getPlayerCareerStats(playerA.sportmonksId, input.format_type, input.league_id),
    getPlayerCareerStats(playerB.sportmonksId, input.format_type, input.league_id),
  ]);

  return {
    component: 'EntityComparison',
    data: {
      comparisonType: input.comparison_type,
      entityA: { profile: playerA, careerStats: statsA },
      entityB: { profile: playerB, careerStats: statsB },
      diff: {
        battingRuns: diffHighlight(
          sum(statsA, (s) => s.battingRuns),
          sum(statsB, (s) => s.battingRuns),
        ),
        bowlingWickets: diffHighlight(
          sum(statsA, (s) => s.bowlingWickets),
          sum(statsB, (s) => s.bowlingWickets),
        ),
      },
    },
  };
}

async function compareTeams(input: CompareEntitiesInput) {
  const [teamA, teamB, headToHead] = await Promise.all([
    getTeamById(input.entity_a_id),
    getTeamById(input.entity_b_id),
    getHeadToHead(input.entity_a_id, input.entity_b_id, input.limit ?? 20),
  ]);
  if (!teamA || !teamB) {
    throw new Error('One or both teams not found');
  }

  const teamAWins = headToHead.filter(
    (f) => f.winnerTeamId === teamA.sportmonksId,
  ).length;
  const teamBWins = headToHead.filter(
    (f) => f.winnerTeamId === teamB.sportmonksId,
  ).length;

  return {
    component: 'EntityComparison',
    data: {
      comparisonType: input.comparison_type,
      entityA: { profile: teamA },
      entityB: { profile: teamB },
      headToHead,
      diff: {
        teamAWins: diffHighlight(teamAWins, teamBWins),
        teamBWins: diffHighlight(teamBWins, teamAWins),
        matchesPlayed: headToHead.length,
      },
    },
  };
}

async function compareBatsmanBowler(input: CompareEntitiesInput) {
  const matchup = await getPlayerMatchup(
    input.entity_a_id,
    input.entity_b_id,
    input.league_id,
  );
  const [batsman, bowler] = await Promise.all([
    getPlayerById(input.entity_a_id),
    getPlayerById(input.entity_b_id),
  ]);
  if (!batsman || !bowler) {
    throw new Error('Batsman or bowler not found');
  }

  return {
    component: 'MatchupComparison',
    data: {
      comparisonType: input.comparison_type,
      batsman: { profile: batsman },
      bowler: { profile: bowler },
      matchup,
      diff: {
        strikeRate: {
          value: matchup.strikeRate,
          leader:
            matchup.strikeRate !== null && matchup.strikeRate >= 100
              ? 'batsman'
              : 'bowler',
        },
        dismissals: { value: matchup.dismissals, leader: 'bowler' },
      },
    },
  };
}

export async function handleGetInsight(
  input: GetInsightInput,
): Promise<Record<string, unknown>> {
  const pool = await getReadPool();

  try {
    const { rows } = await pool.query<{
      insight_type: string;
      insight_key: string;
      ui_manifest: unknown;
      narrative: string | null;
      computed_at: Date | string | null;
      expires_at: Date | string | null;
      view_count: number;
    }>(
      `SELECT insight_type, insight_key, ui_manifest, narrative,
              computed_at, expires_at, view_count
       FROM insights.pre_computed_insights
       WHERE insight_type = $1 AND insight_key = $2
         AND (expires_at IS NULL OR expires_at > now())
       LIMIT 1`,
      [input.insight_type, input.insight_key],
    );

    if (rows.length === 0) {
      throw new Error(
        `No insight found for type="${input.insight_type}" key="${input.insight_key}"`,
      );
    }

    const row = rows[0];
    await pool.query(
      `UPDATE insights.pre_computed_insights
       SET view_count = view_count + 1
       WHERE insight_type = $1 AND insight_key = $2`,
      [input.insight_type, input.insight_key],
    );

    return {
      component: 'InsightManifest',
      data: {
        insightType: row.insight_type,
        insightKey: row.insight_key,
        manifest:
          typeof row.ui_manifest === 'object' && row.ui_manifest !== null
            ? row.ui_manifest
            : { raw: row.ui_manifest },
        narrative: row.narrative,
        computedAt: row.computed_at ? String(row.computed_at) : null,
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        viewCount: row.view_count + 1,
        cached: true,
      },
    };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '42P01'
    ) {
      throw new Error(
        'insights.pre_computed_insights table is not available in this environment',
      );
    }
    throw error;
  }
}

function sum<T>(items: T[], pick: (item: T) => number | null): number {
  return items.reduce((acc, item) => acc + (pick(item) ?? 0), 0);
}

function diffHighlight(a: number, b: number) {
  return {
    a,
    b,
    delta: a - b,
    leader: a === b ? 'tie' : a > b ? 'a' : 'b',
  };
}

export async function handleSearchCricketEntities(
  input: SearchCricketEntitiesInput,
): Promise<Record<string, unknown>> {
  const results = await searchCricketEntities(input);
  return {
    component: 'EntitySearchResults',
    data: {
      entityType: input.entity_type,
      results,
      count: results.length,
      hasMore: results.length === (input.limit ?? 10),
    },
  };
}

export async function handleGetPlayerMatchHistory(
  input: GetPlayerMatchHistoryInput,
): Promise<Record<string, unknown>> {
  const player = input.player_id !== undefined
    ? await getPlayerById(input.player_id)
    : await resolvePlayerByName(input.player_name ?? '');
  if (!player || player.fullname.startsWith('Unknown player ')) {
    throw new Error('Player not found');
  }
  const history = await getPlayerMatchHistory({ ...input, player_id: player.sportmonksId });
  return {
    component: 'PlayerMatchHistory',
    data: {
      player: { id: player.sportmonksId, name: player.fullname },
      ...history,
      scope: {
        leagueId: input.league_id ?? null,
        seasonId: input.season_id ?? null,
        formatType: input.format_type ?? null,
        venueId: input.venue_id ?? null,
      },
    },
  };
}

export async function handleGetMatchContext(
  input: GetMatchContextInput,
): Promise<Record<string, unknown>> {
  const context = await getMatchContext(input);
  return { component: 'MatchContext', data: context };
}

export async function handleGetBallAnalysis(
  input: GetBallAnalysisInput,
): Promise<Record<string, unknown>> {
  const summaries = await getBallAnalysis(input);
  return {
    component: 'BallAnalysis',
    data: {
      analysisType: input.analysis_type,
      summaries,
      scope: {
        fixtureId: input.fixture_id ?? null,
        teamId: input.team_id ?? null,
        playerId: input.player_id ?? null,
        leagueId: input.league_id ?? null,
        seasonId: input.season_id ?? null,
        phase: input.phase ?? null,
      },
      coverage: { rowsReturned: summaries.length, isSampled: false },
    },
  };
}

export async function handleGetTeamAnalytics(
  input: GetTeamAnalyticsInput,
): Promise<Record<string, unknown>> {
  const team = input.team_id !== undefined
    ? await getTeamById(input.team_id)
    : await resolveTeamByName(input.team_name ?? '');
  if (!team) throw new Error('Team not found');
  const splits = await getTeamAnalytics({ ...input, team_id: team.sportmonksId });
  return {
    component: 'TeamAnalytics',
    data: {
      team: { id: team.sportmonksId, name: team.name },
      dataType: input.data_type,
      splits,
      scope: { leagueId: input.league_id ?? null, seasonId: input.season_id ?? null },
    },
  };
}

export async function handleGetVenueStats(
  input: GetVenueStatsInput,
): Promise<Record<string, unknown>> {
  let venueId = input.venue_id;
  if (venueId === undefined) {
    const matches = await searchCricketEntities({
      entity_type: 'venue', query: input.venue_name, limit: 1,
    });
    venueId = Number(matches[0]?.id);
  }
  if (!venueId) throw new Error('Venue not found');
  const data = await getVenueStats({ ...input, venue_id: venueId });
  return { component: 'VenueStats', data: { dataType: input.data_type, ...data } };
}

export async function handleGetRankings(
  input: GetRankingsInput,
): Promise<Record<string, unknown>> {
  let teamId = input.team_id;
  if (teamId === undefined && input.team_name) {
    const team = await resolveTeamByName(input.team_name);
    teamId = team.sportmonksId;
  }
  const rows = await getRankings({ ...input, team_id: teamId });
  return {
    component: 'RankingsTable',
    data: {
      formatType: input.format_type,
      gender: input.gender ?? null,
      rows,
      sourceStatus: 'master.team_rankings',
      isDataPending: rows.length === 0,
    },
  };
}

export async function handleGetTrends(
  input: GetTrendsInput,
): Promise<Record<string, unknown>> {
  const points = await getTrends(input);
  return {
    component: 'TrendChart',
    data: {
      entity: { type: input.entity_type, id: input.entity_id },
      metric: input.metric,
      grain: input.grain,
      points,
      coverage: { pointsReturned: points.length },
    },
  };
}

export async function handleGetLiveMatchState(
  input: GetLiveMatchStateInput,
): Promise<Record<string, unknown>> {
  const data = await getLiveMatchState(input);
  return {
    component: 'LiveMatchState',
    data: {
      ...data,
      freshness: {
        snapshotAt: (data.snapshot as { snapshot_at?: unknown } | null)?.snapshot_at ?? null,
      },
    },
  };
}
