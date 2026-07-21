import { z } from 'zod';

export const sportmonksIdSchema = z.number().int().positive();

export const getPlayerStatsSchema = z.object({
  player_id: sportmonksIdSchema.optional(),
  name: z.string().min(1).optional(),
  format_type: z.string().optional(),
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  season_year: z.string().regex(/^\d{4}$/).optional(),
  position_id: sportmonksIdSchema.optional(),
  batting_style: z.string().optional(),
  bowling_style: z.string().optional(),
}).refine((v) => v.player_id !== undefined || v.name !== undefined, {
  message: 'Provide player_id or name',
});

export const getTeamDataSchema = z.object({
  team_id: sportmonksIdSchema,
  data_type: z.enum(['profile', 'squad', 'form', 'season_stats']),
  season_id: sportmonksIdSchema.optional(),
  league_id: sportmonksIdSchema.optional(),
  form_limit: z.number().int().min(1).max(20).optional(),
});

export const getMatchDataSchema = z.object({
  fixture_id: sportmonksIdSchema.optional(),
  team_id: sportmonksIdSchema.optional(),
  team_a_name: z.string().min(1).optional(),
  team_b_name: z.string().min(1).optional(),
  year: z.number().int().min(1800).max(2200).optional(),
  match_format: z.string().min(1).optional(),
  league_name: z.string().min(1).optional(),
  recent_limit: z.number().int().min(1).max(10).optional(),
}).refine((v) =>
  v.fixture_id !== undefined ||
  v.team_id !== undefined ||
  (v.team_a_name !== undefined && v.team_b_name !== undefined), {
  message: 'Provide fixture_id, team_id, or both team_a_name and team_b_name',
});

export const getFixturesSchema = z.object({
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  team_id: sportmonksIdSchema.optional(),
  stage_id: sportmonksIdSchema.optional(),
  venue_id: sportmonksIdSchema.optional(),
  match_format: z.string().optional(),
  status: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getLeagueDataSchema = z.object({
  league_id: sportmonksIdSchema,
  season_id: sportmonksIdSchema,
  data_type: z.enum([
    'standings',
    'leaderboard',
    'fixtures',
    'season_winner',
    'season_overview',
    'stage_overview',
  ]),
  leaderboard_metric: z
    .enum([
      'batting_runs',
      'batting_wickets',
      'bowling_wickets',
      'strike_rate',
      'economy_rate',
      'net_run_rate',
    ])
    .optional(),
  fixture_status: z.string().optional(),
  stage_id: sportmonksIdSchema.optional(),
  stage_type: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const compareEntitiesSchema = z.object({
  comparison_type: z.enum([
    'player_vs_player',
    'team_vs_team',
    'batsman_vs_bowler',
  ]),
  entity_a_id: sportmonksIdSchema,
  entity_b_id: sportmonksIdSchema,
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  format_type: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const getInsightSchema = z.object({
  insight_type: z.string().min(1),
  insight_key: z.string().min(1),
});

export const searchCricketEntitiesSchema = z.object({
  entity_type: z.enum([
    'player', 'team', 'league', 'season', 'stage', 'venue',
    'official', 'country', 'position', 'continent',
  ]),
  query: z.string().min(1).optional(),
  entity_id: sportmonksIdSchema.optional(),
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  limit: z.number().int().min(1).max(25).optional(),
});

export const getPlayerMatchHistorySchema = z.object({
  player_id: sportmonksIdSchema.optional(),
  player_name: z.string().min(1).optional(),
  data_type: z.enum(['batting', 'bowling', 'combined']),
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  format_type: z.string().min(1).optional(),
  opponent_team_id: sportmonksIdSchema.optional(),
  venue_id: sportmonksIdSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
}).refine((v) => v.player_id !== undefined || v.player_name !== undefined, {
  message: 'Provide player_id or player_name',
});

export const getMatchContextSchema = z.object({
  fixture_id: sportmonksIdSchema,
  sections: z.array(z.enum([
    'summary', 'lineup', 'venue', 'officials', 'extras', 'overs',
    'weather', 'odds', 'live_state',
  ])).min(1).max(9).optional(),
});

export const getBallAnalysisSchema = z.object({
  fixture_id: sportmonksIdSchema.optional(),
  team_id: sportmonksIdSchema.optional(),
  player_id: sportmonksIdSchema.optional(),
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  format_type: z.string().min(1).optional(),
  analysis_type: z.enum(['over', 'phase', 'batter', 'bowler', 'dismissal', 'partnership']),
  phase: z.enum(['powerplay', 'middle', 'death']).optional(),
  scoreboard: z.string().min(1).optional(),
  from_over: z.number().int().min(1).optional(),
  to_over: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
}).refine((v) => v.fixture_id !== undefined || v.team_id !== undefined || v.player_id !== undefined || v.league_id !== undefined || v.season_id !== undefined, {
  message: 'Provide at least one scope filter',
});

export const getTeamAnalyticsSchema = z.object({
  team_id: sportmonksIdSchema.optional(),
  team_name: z.string().min(1).optional(),
  data_type: z.enum(['venue_split', 'opponent_split', 'head_to_head', 'performance']),
  opponent_team_id: sportmonksIdSchema.optional(),
  venue_id: sportmonksIdSchema.optional(),
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
}).refine((v) => v.team_id !== undefined || v.team_name !== undefined, {
  message: 'Provide team_id or team_name',
});

export const getVenueStatsSchema = z.object({
  venue_id: sportmonksIdSchema.optional(),
  venue_name: z.string().min(1).optional(),
  data_type: z.enum(['profile', 'team_record', 'score_patterns', 'batting', 'bowling']),
  team_id: sportmonksIdSchema.optional(),
  league_id: sportmonksIdSchema.optional(),
  season_id: sportmonksIdSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
}).refine((v) => v.venue_id !== undefined || v.venue_name !== undefined, {
  message: 'Provide venue_id or venue_name',
});

export const getRankingsSchema = z.object({
  format_type: z.string().min(1),
  gender: z.enum(['men', 'women', 'mixed']).optional(),
  team_id: sportmonksIdSchema.optional(),
  team_name: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const getTrendsSchema = z.object({
  entity_type: z.enum(['player', 'team', 'league', 'venue']),
  entity_id: sportmonksIdSchema,
  metric: z.enum(['runs', 'wickets', 'average', 'strike_rate', 'economy', 'win_rate', 'score']),
  grain: z.enum(['season', 'month', 'date']),
  league_id: sportmonksIdSchema.optional(),
  format_type: z.string().min(1).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(60).optional(),
});

export const getLiveMatchStateSchema = z.object({
  fixture_id: sportmonksIdSchema.optional(),
  team_id: sportmonksIdSchema.optional(),
  include_recent_balls: z.boolean().optional(),
  recent_ball_limit: z.number().int().min(1).max(36).optional(),
}).refine((v) => v.fixture_id !== undefined || v.team_id !== undefined, {
  message: 'Provide fixture_id or team_id',
});

export type GetPlayerStatsInput = z.infer<typeof getPlayerStatsSchema>;
export type GetTeamDataInput = z.infer<typeof getTeamDataSchema>;
export type GetMatchDataInput = z.infer<typeof getMatchDataSchema>;
export type GetFixturesInput = z.infer<typeof getFixturesSchema>;
export type GetLeagueDataInput = z.infer<typeof getLeagueDataSchema>;
export type CompareEntitiesInput = z.infer<typeof compareEntitiesSchema>;
export type GetInsightInput = z.infer<typeof getInsightSchema>;
export type SearchCricketEntitiesInput = z.infer<typeof searchCricketEntitiesSchema>;
export type GetPlayerMatchHistoryInput = z.infer<typeof getPlayerMatchHistorySchema>;
export type GetMatchContextInput = z.infer<typeof getMatchContextSchema>;
export type GetBallAnalysisInput = z.infer<typeof getBallAnalysisSchema>;
export type GetTeamAnalyticsInput = z.infer<typeof getTeamAnalyticsSchema>;
export type GetVenueStatsInput = z.infer<typeof getVenueStatsSchema>;
export type GetRankingsInput = z.infer<typeof getRankingsSchema>;
export type GetTrendsInput = z.infer<typeof getTrendsSchema>;
export type GetLiveMatchStateInput = z.infer<typeof getLiveMatchStateSchema>;
