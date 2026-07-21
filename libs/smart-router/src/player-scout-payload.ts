import { executeCricketTool } from '@cricket-ai/mcp-server';

export interface PlayerScoutPayload {
  component: 'PlayerScout';
  data: {
    stats: Record<string, unknown>;
    dismissal: Record<string, unknown> | null;
    filters: {
      name: string;
      leagueId?: number;
      formatType?: string;
    };
  };
}

/** Load local career stats for the scouting UI. */
export async function buildPlayerScoutPayload(params: {
  name: string;
  league_id?: unknown;
  format_type?: unknown;
}): Promise<PlayerScoutPayload> {
  const name = params.name.trim();
  const leagueId =
    params.league_id !== undefined ? Number(params.league_id) : undefined;
  const formatType =
    typeof params.format_type === 'string' ? params.format_type : undefined;

  const stats = await executeCricketTool('get_player_stats', {
    name,
    league_id: Number.isFinite(leagueId) ? leagueId : undefined,
    format_type: formatType,
  });

  return {
    component: 'PlayerScout',
    data: {
      stats,
      dismissal: null,
      filters: {
        name,
        ...(Number.isFinite(leagueId) ? { leagueId } : {}),
        ...(formatType ? { formatType } : {}),
      },
    },
  };
}
