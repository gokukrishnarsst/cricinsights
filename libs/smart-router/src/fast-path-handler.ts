import { resolvePlayerByName, resolveTeamByName } from '@cricket-ai/database';
import { executeCricketTool } from '@cricket-ai/mcp-server';
import { buildPlayerScoutPayload } from './player-scout-payload.js';
import {
  extractSeasonYearFromText,
  resolveLeagueSeasonByName,
  resolveLeagueSeasonId,
} from './league-season-resolve.js';
import type { FastPathResult, RouteDecision } from './types.js';

/**
 * Execute a classified fast-path query via in-process MCP tool handlers.
 */
export async function executeFastPath(
  decision: RouteDecision,
): Promise<FastPathResult> {
  if (decision.route !== 'fast_path') {
    throw new Error('executeFastPath called with ai_path decision');
  }

  switch (decision.intent) {
    case 'player_stats': {
      const name = String(decision.params.name ?? '');
      if (!name) {
        throw new Error('player_stats requires a player name');
      }
      const payload = await executeCricketTool('get_player_stats', {
        name,
        league_id: decision.params.league_id,
        season_id: decision.params.season_id,
        format_type: decision.params.format_type,
      });
      return { intent: 'player_stats', toolName: 'get_player_stats', payload };
    }

    case 'player_scout': {
      const name = String(decision.params.name ?? '');
      if (!name) {
        throw new Error('player_scout requires a player name');
      }
      const payload = await buildPlayerScoutPayload({
        name,
        league_id: decision.params.league_id,
        format_type: decision.params.format_type,
      });
      return {
        intent: 'player_scout',
        toolName: 'player_scout',
        payload: payload as unknown as Record<string, unknown>,
      };
    }

    case 'player_compare': {
      const entityA = await resolvePlayerByName(String(decision.params.entity_a ?? ''));
      const entityB = await resolvePlayerByName(String(decision.params.entity_b ?? ''));
      const payload = await executeCricketTool('compare_entities', {
        comparison_type: 'player_vs_player',
        entity_a_id: entityA.sportmonksId,
        entity_b_id: entityB.sportmonksId,
        league_id: decision.params.league_id,
        format_type: decision.params.format_type,
      });
      return { intent: 'player_compare', toolName: 'compare_entities', payload };
    }

    case 'matchup': {
      const entityA = await resolvePlayerByName(String(decision.params.entity_a ?? ''));
      const entityB = await resolvePlayerByName(String(decision.params.entity_b ?? ''));
      const payload = await executeCricketTool('compare_entities', {
        comparison_type: 'batsman_vs_bowler',
        entity_a_id: entityA.sportmonksId,
        entity_b_id: entityB.sportmonksId,
        league_id: decision.params.league_id,
        format_type: decision.params.format_type,
      });
      return { intent: 'matchup', toolName: 'compare_entities', payload };
    }

    case 'league_standings': {
      const leagueId = decision.params.league_id;
      if (leagueId === undefined) {
        throw new Error(
          'league_standings fast path requires league_id (e.g. mention IPL in the query)',
        );
      }
      const queryText = String(decision.params.query ?? '');
      const seasonId = await resolveLeagueSeasonId(
        Number(leagueId),
        queryText,
        decision.params.season_id,
      );
      const payload = await executeCricketTool('get_league_data', {
        league_id: Number(leagueId),
        season_id: seasonId,
        data_type: 'standings',
      });
      return { intent: 'league_standings', toolName: 'get_league_data', payload };
    }

    case 'league_winner': {
      const leagueId = decision.params.league_id;
      if (leagueId === undefined) {
        throw new Error('league_winner fast path requires league_id');
      }
      const queryText = String(decision.params.query ?? '');
      const seasonId = await resolveLeagueSeasonId(
        Number(leagueId),
        queryText,
        decision.params.season_id,
      );
      const payload = await executeCricketTool('get_league_data', {
        league_id: Number(leagueId),
        season_id: seasonId,
        data_type: 'season_winner',
      });
      const data = (payload.data as Record<string, unknown> | undefined) ?? {};
      return {
        intent: 'league_winner',
        toolName: 'get_league_data',
        payload: {
          ...payload,
          data: {
            ...data,
            seasonYear: extractSeasonYearFromText(queryText) ?? null,
          },
        },
      };
    }

    case 'leaderboard': {
      const queryText = String(decision.params.query ?? '');
      const context = decision.params.league_id === undefined
        ? await resolveLeagueSeasonByName({
            leagueName: String(decision.params.league_name ?? ''),
            queryText,
            existingSeasonId: decision.params.season_id,
          })
        : {
            leagueId: Number(decision.params.league_id),
            seasonId: await resolveLeagueSeasonId(
              Number(decision.params.league_id),
              queryText,
              decision.params.season_id,
            ),
          };
      const metric =
        typeof decision.params.metric === 'string'
          ? decision.params.metric
          : inferLeaderboardMetric(queryText);
      const payload = await executeCricketTool('get_league_data', {
        league_id: context.leagueId,
        season_id: context.seasonId,
        data_type: 'leaderboard',
        leaderboard_metric: metric,
      });
      return { intent: 'leaderboard', toolName: 'get_league_data', payload };
    }

    case 'match_scorecard': {
      const fixtureId = decision.params.fixture_id;
      const payload = fixtureId === undefined
        ? await executeCricketTool('get_match_data', {
            team_a_name: decision.params.team_a_name,
            team_b_name: decision.params.team_b_name,
            year: decision.params.year,
            match_format: decision.params.match_format,
            league_name: decision.params.league_name,
          })
        : await executeCricketTool('get_match_data', {
            fixture_id: Number(fixtureId),
          });
      return { intent: 'match_scorecard', toolName: 'get_match_data', payload };
    }

    case 'team_fixtures': {
      const teamName = String(decision.params.team_name ?? '').trim();
      if (!teamName) {
        throw new Error('team_fixtures requires a team name');
      }
      const team = await resolveTeamByName(teamName);
      const payload = await executeCricketTool('get_fixtures', {
        team_id: team.sportmonksId,
        limit: Number(decision.params.limit ?? 10),
      });
      return { intent: 'team_fixtures', toolName: 'get_fixtures', payload };
    }

    case 'head_to_head': {
      const teamAName = String(decision.params.team_a ?? '');
      const teamBName = String(decision.params.team_b ?? '');
      if (!teamAName || !teamBName) {
        throw new Error('head_to_head requires team_a and team_b');
      }
      const [teamA, teamB] = await Promise.all([
        resolveTeamByName(teamAName),
        resolveTeamByName(teamBName),
      ]);
      const payload = await executeCricketTool('compare_entities', {
        comparison_type: 'team_vs_team',
        entity_a_id: teamA.sportmonksId,
        entity_b_id: teamB.sportmonksId,
        league_id: decision.params.league_id,
        limit: 20,
      });
      return { intent: 'head_to_head', toolName: 'compare_entities', payload };
    }

    case 'entity_lookup': {
      const payload = await executeCricketTool('search_cricket_entities', {
        entity_type: decision.params.entity_type ?? 'player',
        query: decision.params.query,
        limit: 10,
      });
      return { intent: 'entity_lookup', toolName: 'search_cricket_entities', payload };
    }

    case 'player_match_history': {
      const player = await resolvePlayerByName(String(decision.params.name ?? ''));
      const payload = await executeCricketTool('get_player_match_history', {
        player_id: player.sportmonksId,
        data_type: /bowling/i.test(String(decision.params.query ?? '')) ? 'bowling' : 'batting',
        league_id: decision.params.league_id,
        season_id: decision.params.season_id,
        limit: Number(decision.params.limit ?? 20),
      });
      return { intent: 'player_match_history', toolName: 'get_player_match_history', payload };
    }

    case 'match_context': {
      const fixtureId = decision.params.fixture_id;
      if (fixtureId === undefined) throw new Error('match_context requires fixture_id');
      const payload = await executeCricketTool('get_match_context', {
        fixture_id: Number(fixtureId),
        sections: ['summary', 'lineup', 'venue', 'officials', 'extras', 'overs', 'weather'],
      });
      return { intent: 'match_context', toolName: 'get_match_context', payload };
    }

    case 'ball_analysis': {
      let playerId = decision.params.player_id;
      if (playerId === undefined && decision.params.name) {
        const player = await resolvePlayerByName(String(decision.params.name));
        playerId = player.sportmonksId;
      }
      const payload = await executeCricketTool('get_ball_analysis', {
        fixture_id: decision.params.fixture_id,
        player_id: playerId,
        team_id: decision.params.team_id,
        league_id: decision.params.league_id,
        season_id: decision.params.season_id,
        analysis_type: 'phase',
        phase: decision.params.phase,
      });
      return { intent: 'ball_analysis', toolName: 'get_ball_analysis', payload };
    }

    case 'team_analytics': {
      const team = await resolveTeamByName(String(decision.params.team_name ?? ''));
      const payload = await executeCricketTool('get_team_analytics', {
        team_id: team.sportmonksId,
        data_type: decision.params.data_type ?? 'performance',
        league_id: decision.params.league_id,
        season_id: decision.params.season_id,
      });
      return { intent: 'team_analytics', toolName: 'get_team_analytics', payload };
    }

    case 'venue_stats': {
      const payload = await executeCricketTool('get_venue_stats', {
        venue_name: decision.params.venue_name,
        data_type: decision.params.data_type ?? 'profile',
      });
      return { intent: 'venue_stats', toolName: 'get_venue_stats', payload };
    }

    case 'team_rankings': {
      const payload = await executeCricketTool('get_rankings', {
        format_type: decision.params.format_type ?? 'T20',
        gender: decision.params.gender,
        limit: 10,
      });
      return { intent: 'team_rankings', toolName: 'get_rankings', payload };
    }

    case 'trend_analysis': {
      const entityType = /team|club|franchise/i.test(String(decision.params.query)) ? 'team' : 'player';
      const matches = await executeCricketTool('search_cricket_entities', {
        entity_type: entityType,
        query: decision.params.entity_name,
        limit: 1,
      });
      const entityId = (matches.data as { results?: Array<{ id?: number }> })?.results?.[0]?.id;
      if (entityId === undefined) throw new Error('Trend entity not found');
      const payload = await executeCricketTool('get_trends', {
        entity_type: entityType,
        entity_id: entityId,
        metric: /wicket/i.test(String(decision.params.query)) ? 'wickets' : 'runs',
        grain: 'season',
        league_id: decision.params.league_id,
      });
      return { intent: 'trend_analysis', toolName: 'get_trends', payload };
    }

    case 'live_score': {
      let teamId = decision.params.team_id;
      if (teamId === undefined && decision.params.team_name) {
        const team = await resolveTeamByName(String(decision.params.team_name));
        teamId = team.sportmonksId;
      }
      const payload = await executeCricketTool('get_live_match_state', {
        fixture_id: decision.params.fixture_id,
        team_id: teamId,
        include_recent_balls: true,
        recent_ball_limit: 6,
      });
      return { intent: 'live_score', toolName: 'get_live_match_state', payload };
    }

    default:
      throw new Error(`Unsupported fast-path intent: ${decision.intent}`);
  }
}

function inferLeaderboardMetric(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes('wicket') || lower.includes('purple')) {
    return 'bowling_wickets';
  }
  if (lower.includes('strike') || lower.includes('sr')) {
    return 'strike_rate';
  }
  if (lower.includes('economy')) {
    return 'economy_rate';
  }
  return 'batting_runs';
}
