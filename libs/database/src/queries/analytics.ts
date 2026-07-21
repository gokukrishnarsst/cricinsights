import { getReadPool } from '../client.js';

type QueryInput = Record<string, unknown>;
type Row = Record<string, unknown>;

const DEFAULT_LIMIT = 20;

function boundedLimit(value: unknown, max = 100, fallback = DEFAULT_LIMIT): number {
  const n = typeof value === 'number' && Number.isInteger(value) ? value : fallback;
  return Math.min(Math.max(n, 1), max);
}

function addFilter(
  conditions: string[],
  params: unknown[],
  sql: string,
  value: unknown,
): void {
  if (value !== undefined && value !== null && value !== '') {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  }
}

function dateFilters(
  conditions: string[],
  params: unknown[],
  column = 'f.starting_at',
  input: QueryInput,
): void {
  addFilter(conditions, params, `${column} >= ?::timestamptz`, input.date_from);
  addFilter(conditions, params, `${column} <= ?::timestamptz`, input.date_to);
}

function entitySearchFilter(
  conditions: string[],
  params: unknown[],
  columns: string[],
  input: QueryInput,
  idColumn: string,
): void {
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  if (query) {
    params.push(`%${query}%`);
    const parameter = `$${params.length}`;
    conditions.push(`(${columns.map((column) => `${column} ILIKE ${parameter}`).join(' OR ')})`);
  }
  if (input.entity_id !== undefined) {
    addFilter(conditions, params, `${idColumn} = ?`, input.entity_id);
  }
}

export interface EntitySearchInput extends QueryInput {
  entity_type: string;
  query?: string;
  entity_id?: number;
  league_id?: number;
  season_id?: number;
  limit?: number;
}

export async function searchCricketEntities(input: EntitySearchInput): Promise<Row[]> {
  const pool = await getReadPool();
  const limit = boundedLimit(input.limit, 25, 10);
  const params: unknown[] = [];
  const conditions = ['1 = 1'];
  let select: string;
  let from: string;
  let searchColumns: string[];
  let idColumn: string;

  switch (input.entity_type) {
    case 'player':
      select = `p.sportmonks_id AS id, p.fullname AS name, p.firstname, p.lastname,
        p.position_id, pos.name AS position_name, p.battingstyle AS batting_style,
        p.bowlingstyle AS bowling_style, p.country_id`;
      from = `master.players p
        LEFT JOIN master.positions pos ON pos.sportmonks_id = p.position_id`;
      searchColumns = ['p.fullname', 'p.firstname', 'p.lastname'];
      conditions.push(`p.is_active = true`, `p.fullname NOT ILIKE 'Unknown player %'`);
      idColumn = 'p.sportmonks_id';
      break;
    case 'team':
      select = `t.sportmonks_id AS id, t.name, t.code, t.country_id, t.national_team`;
      from = 'master.teams t';
      searchColumns = ['t.name', 't.code'];
      conditions.push('t.is_active = true');
      idColumn = 't.sportmonks_id';
      break;
    case 'league':
      select = `l.sportmonks_id AS id, l.name, l.code, l.league_type, l.country_id`;
      from = 'master.leagues l';
      searchColumns = ['l.name', 'l.code'];
      conditions.push('l.is_active = true');
      idColumn = 'l.sportmonks_id';
      break;
    case 'season':
      select = `s.sportmonks_id AS id, s.name, s.code, s.league_id, l.name AS league_name`;
      from = 'master.seasons s JOIN master.leagues l ON l.sportmonks_id = s.league_id';
      searchColumns = ['s.name', 's.code', 'l.name'];
      conditions.push('s.is_active = true');
      addFilter(conditions, params, 's.league_id = ?', input.league_id);
      idColumn = 's.sportmonks_id';
      break;
    case 'stage':
      select = `st.sportmonks_id AS id, st.name, st.code, st.stage_type,
        st.league_id, st.season_id, st.has_standings`;
      from = 'master.stages st';
      searchColumns = ['st.name', 'st.code', 'st.stage_type'];
      addFilter(conditions, params, 'st.league_id = ?', input.league_id);
      addFilter(conditions, params, 'st.season_id = ?', input.season_id);
      idColumn = 'st.sportmonks_id';
      break;
    case 'venue':
      select = `v.sportmonks_id AS id, v.name, v.city, v.country_id,
        v.capacity, v.floodlight, v.image_path`;
      from = 'master.venues v';
      searchColumns = ['v.name', 'v.city'];
      conditions.push('v.is_active = true');
      idColumn = 'v.sportmonks_id';
      break;
    case 'official':
      select = `o.sportmonks_id AS id, o.fullname AS name, o.firstname, o.lastname,
        o.gender, o.country_id`;
      from = 'master.officials o';
      searchColumns = ['o.fullname', 'o.firstname', 'o.lastname'];
      conditions.push('o.is_active = true');
      idColumn = 'o.sportmonks_id';
      break;
    case 'country':
      select = `c.sportmonks_id AS id, c.name, c.continent_id, co.name AS continent_name`;
      from = `master.countries c
        LEFT JOIN master.continents co ON co.sportmonks_id = c.continent_id`;
      searchColumns = ['c.name'];
      conditions.push('c.is_active = true');
      idColumn = 'c.sportmonks_id';
      break;
    case 'position':
      select = 'p.sportmonks_id AS id, p.name';
      from = 'master.positions p';
      searchColumns = ['p.name'];
      idColumn = 'p.sportmonks_id';
      break;
    case 'continent':
      select = 'c.sportmonks_id AS id, c.name';
      from = 'master.continents c';
      searchColumns = ['c.name'];
      conditions.push('c.is_active = true');
      idColumn = 'c.sportmonks_id';
      break;
    default:
      throw new Error(`Unsupported entity_type: ${input.entity_type}`);
  }

  entitySearchFilter(conditions, params, searchColumns, input, idColumn);
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT ${select} FROM ${from}
     WHERE ${conditions.join(' AND ')}
     ORDER BY name NULLS LAST
     LIMIT $${params.length}`,
    params,
  );
  return rows as Row[];
}

export interface PlayerMatchHistoryInput extends QueryInput {
  player_id: number;
  data_type: 'batting' | 'bowling' | 'combined';
  league_id?: number;
  season_id?: number;
  format_type?: string;
  opponent_team_id?: number;
  venue_id?: number;
  limit?: number;
  offset?: number;
}

function matchFilters(input: QueryInput, params: unknown[], prefix = 'f'): string[] {
  const conditions = [`${prefix}.is_active = true`];
  addFilter(conditions, params, `${prefix}.league_id = ?`, input.league_id);
  addFilter(conditions, params, `${prefix}.season_id = ?`, input.season_id);
  addFilter(conditions, params, `${prefix}.match_format ILIKE ?`, input.format_type ? `%${input.format_type}%` : undefined);
  addFilter(conditions, params, `${prefix}.venue_id = ?`, input.venue_id);
  dateFilters(conditions, params, `${prefix}.starting_at`, input);
  if (input.opponent_team_id !== undefined) {
    params.push(input.opponent_team_id);
    conditions.push(`(f.localteam_id = $${params.length} OR f.visitorteam_id = $${params.length})`);
  }
  return conditions;
}

export async function getPlayerMatchHistory(input: PlayerMatchHistoryInput): Promise<Row> {
  const pool = await getReadPool();
  const limit = boundedLimit(input.limit, 100);
  const offset = Math.max(Number(input.offset ?? 0), 0);
  const result: Row = {};

  if (input.data_type === 'batting' || input.data_type === 'combined') {
    const params: unknown[] = [input.player_id];
    const filters = matchFilters(input, params);
    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT fb.fixture_id, f.starting_at AS match_date, l.name AS league_name,
          s.name AS season_name, f.match_format, t.name AS team_name,
          CASE WHEN f.localteam_id = fb.team_id THEN vt.name ELSE lt.name END AS opponent_name,
          v.name AS venue_name, fb.scoreboard, fb.runs_scored, fb.balls_faced,
          fb.fours, fb.sixes, fb.strike_rate, fb.fow_score, fb.fow_balls,
          (fb.batsman_out_id IS NOT NULL) AS was_dismissed
       FROM matches.fixture_batting fb
       JOIN matches.fixtures f ON f.sportmonks_id = fb.fixture_id
       JOIN master.leagues l ON l.sportmonks_id = f.league_id
       JOIN master.seasons s ON s.sportmonks_id = f.season_id
       JOIN master.teams t ON t.sportmonks_id = fb.team_id
       JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
       JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
       LEFT JOIN master.venues v ON v.sportmonks_id = f.venue_id
       WHERE fb.player_id = $1 AND ${filters.join(' AND ')}
       ORDER BY f.starting_at DESC NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    result.batting = rows;
  }

  if (input.data_type === 'bowling' || input.data_type === 'combined') {
    const params: unknown[] = [input.player_id];
    const filters = matchFilters(input, params);
    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT fb.fixture_id, f.starting_at AS match_date, l.name AS league_name,
          s.name AS season_name, f.match_format, t.name AS team_name,
          CASE WHEN f.localteam_id = fb.team_id THEN vt.name ELSE lt.name END AS opponent_name,
          v.name AS venue_name, fb.scoreboard, fb.overs, fb.maidens,
          fb.runs_conceded, fb.wickets, fb.wides, fb.noballs, fb.economy_rate
       FROM matches.fixture_bowling fb
       JOIN matches.fixtures f ON f.sportmonks_id = fb.fixture_id
       JOIN master.leagues l ON l.sportmonks_id = f.league_id
       JOIN master.seasons s ON s.sportmonks_id = f.season_id
       JOIN master.teams t ON t.sportmonks_id = fb.team_id
       JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
       JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
       LEFT JOIN master.venues v ON v.sportmonks_id = f.venue_id
       WHERE fb.player_id = $1 AND ${filters.join(' AND ')}
       ORDER BY f.starting_at DESC NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    result.bowling = rows;
  }

  return result;
}

export interface MatchContextInput extends QueryInput {
  fixture_id: number;
  sections?: string[];
}

export async function getMatchContext(input: MatchContextInput): Promise<Row> {
  const pool = await getReadPool();
  const sections = new Set(input.sections ?? [
    'summary', 'lineup', 'venue', 'officials', 'extras', 'overs', 'weather', 'odds', 'live_state',
  ]);
  const { rows: matchRows } = await pool.query(
    `SELECT f.sportmonks_id AS fixture_id, f.starting_at, f.status, f.is_live,
        f.match_format, f.round, f.note, f.league_id, l.name AS league_name,
        f.season_id, s.name AS season_name, f.stage_id, st.name AS stage_name,
        f.localteam_id, lt.name AS localteam_name, f.visitorteam_id, vt.name AS visitorteam_name,
        f.venue_id, v.name AS venue_name, v.city AS venue_city, v.capacity AS venue_capacity,
        v.floodlight AS venue_floodlight, f.toss_won_team_id, tw.name AS toss_won_team_name,
        f.winner_team_id, wt.name AS winner_team_name, f.elected, f.super_over, f.follow_on,
        f.first_umpire_id, u1.fullname AS first_umpire_name, f.second_umpire_id,
        u2.fullname AS second_umpire_name, f.tv_umpire_id, u3.fullname AS tv_umpire_name,
        f.referee_id, ref.fullname AS referee_name
     FROM matches.fixtures f
     JOIN master.leagues l ON l.sportmonks_id = f.league_id
     JOIN master.seasons s ON s.sportmonks_id = f.season_id
     LEFT JOIN master.stages st ON st.sportmonks_id = f.stage_id
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     LEFT JOIN master.venues v ON v.sportmonks_id = f.venue_id
     LEFT JOIN master.teams tw ON tw.sportmonks_id = f.toss_won_team_id
     LEFT JOIN master.teams wt ON wt.sportmonks_id = f.winner_team_id
     LEFT JOIN master.officials u1 ON u1.sportmonks_id = f.first_umpire_id
     LEFT JOIN master.officials u2 ON u2.sportmonks_id = f.second_umpire_id
     LEFT JOIN master.officials u3 ON u3.sportmonks_id = f.tv_umpire_id
     LEFT JOIN master.officials ref ON ref.sportmonks_id = f.referee_id
     WHERE f.sportmonks_id = $1`,
    [input.fixture_id],
  );
  if (matchRows.length === 0) throw new Error(`Fixture ${input.fixture_id} not found`);
  const result: Row = { match: matchRows[0] };

  const tasks: Promise<void>[] = [];
  if (sections.has('lineup')) tasks.push((async () => {
    const { rows } = await pool.query(
      `SELECT fl.team_id, t.name AS team_name, fl.player_id, p.fullname AS player_name,
          fl.is_captain, fl.is_wicketkeeper, fl.is_substitute
       FROM matches.fixture_lineups fl
       JOIN master.teams t ON t.sportmonks_id = fl.team_id
       LEFT JOIN master.players p ON p.sportmonks_id = fl.player_id
       WHERE fl.fixture_id = $1 ORDER BY fl.team_id, p.fullname`, [input.fixture_id]);
    result.lineup = rows;
  })());
  if (sections.has('extras')) tasks.push((async () => {
    const { rows } = await pool.query(
      `SELECT team_id, scoreboard, wides, noball_runs, noball_balls, byes, leg_byes,
          penalty, total_runs, overs, wickets
       FROM matches.fixture_scoreboards WHERE fixture_id = $1 ORDER BY team_id, scoreboard`,
      [input.fixture_id]);
    result.extras = rows;
  })());
  if (sections.has('overs')) tasks.push((async () => {
    const { rows } = await pool.query(
      `SELECT io.team_id, t.name AS team_name, io.scoreboard, io.over_number,
          io.runs_in_over, io.wickets_in_over, io.bowler_id, p.fullname AS bowler_name
       FROM matches.fixture_inning_overs io
       LEFT JOIN master.teams t ON t.sportmonks_id = io.team_id
       LEFT JOIN master.players p ON p.sportmonks_id = io.bowler_id
       WHERE io.fixture_id = $1 ORDER BY io.team_id, io.scoreboard, io.over_number`,
      [input.fixture_id]);
    result.overs = rows;
  })());
  if (sections.has('weather')) tasks.push((async () => {
    const { rows } = await pool.query(
      `SELECT report_sequence, weather_json, created_at FROM matches.fixture_weather
       WHERE fixture_id = $1 ORDER BY report_sequence`, [input.fixture_id]);
    result.weather = rows;
  })());
  if (sections.has('odds')) tasks.push((async () => {
    const { rows } = await pool.query(
      `SELECT odds_json, api_updated_at, created_at FROM matches.fixture_odds
       WHERE fixture_id = $1 ORDER BY created_at DESC`, [input.fixture_id]);
    result.odds = rows;
  })());
  if (sections.has('live_state')) tasks.push((async () => {
    const { rows } = await pool.query(
      `SELECT snapshot_at, status, is_live, payload_hash FROM matches.livescore_snapshots
       WHERE fixture_id = $1 ORDER BY snapshot_at DESC LIMIT 1`, [input.fixture_id]);
    result.liveState = rows[0] ?? null;
  })());
  await Promise.all(tasks);
  return result;
}

export interface BallAnalysisInput extends QueryInput {
  fixture_id?: number;
  team_id?: number;
  player_id?: number;
  league_id?: number;
  season_id?: number;
  analysis_type: string;
  phase?: string;
  scoreboard?: string;
  from_over?: number;
  to_over?: number;
  limit?: number;
}

function ballFilters(input: BallAnalysisInput, params: unknown[]): string[] {
  const conditions = ['f.is_active = true'];
  addFilter(conditions, params, 'b.fixture_id = ?', input.fixture_id);
  addFilter(conditions, params, 'b.team_id = ?', input.team_id);
  if (input.player_id !== undefined) {
    params.push(input.player_id);
    conditions.push(`(b.batsman_striker_id = $${params.length} OR b.batsman_scorer_id = $${params.length} OR b.bowler_id = $${params.length})`);
  }
  addFilter(conditions, params, 'f.league_id = ?', input.league_id);
  addFilter(conditions, params, 'f.season_id = ?', input.season_id);
  addFilter(conditions, params, 'f.match_format ILIKE ?', input.format_type ? `%${input.format_type}%` : undefined);
  addFilter(conditions, params, 'b.scoreboard = ?', input.scoreboard);
  if (input.from_over !== undefined) {
    params.push((input.from_over * 6) - 5);
    conditions.push(`b.ball_number >= $${params.length}`);
  }
  if (input.to_over !== undefined) {
    params.push(input.to_over * 6);
    conditions.push(`b.ball_number <= $${params.length}`);
  }
  if (input.phase) {
    const phase = input.phase === 'powerplay' ? 'b.ball_number <= 36' : input.phase === 'middle' ? 'b.ball_number BETWEEN 37 AND 90' : 'b.ball_number > 90';
    conditions.push(phase);
  }
  return conditions;
}

export async function getBallAnalysis(input: BallAnalysisInput): Promise<Row[]> {
  const pool = await getReadPool();
  const params: unknown[] = [];
  const filters = ballFilters(input, params);
  const limit = boundedLimit(input.limit, 100);
  let select: string;
  let group: string;
  let order: string;

  switch (input.analysis_type) {
    case 'over':
      select = `b.fixture_id, b.team_id, t.name AS team_name, b.scoreboard,
        FLOOR((b.ball_number - 1) / 6) + 1 AS over_number,
        COUNT(*) AS balls, COALESCE(SUM(so.runs), 0) AS runs,
        COUNT(*) FILTER (WHERE so.is_four) AS fours, COUNT(*) FILTER (WHERE so.is_six) AS sixes,
        COUNT(*) FILTER (WHERE b.batsman_out_id IS NOT NULL) AS wickets`;
      group = 'b.fixture_id, b.team_id, t.name, b.scoreboard, FLOOR((b.ball_number - 1) / 6) + 1';
      order = 'b.fixture_id, b.scoreboard, over_number';
      break;
    case 'phase':
      select = `b.fixture_id, b.team_id, t.name AS team_name,
        CASE WHEN b.ball_number <= 36 THEN 'powerplay' WHEN b.ball_number <= 90 THEN 'middle' ELSE 'death' END AS phase,
        COUNT(*) AS balls, COALESCE(SUM(so.runs), 0) AS runs,
        COUNT(*) FILTER (WHERE b.batsman_out_id IS NOT NULL) AS wickets,
        COUNT(*) FILTER (WHERE so.is_four) AS fours, COUNT(*) FILTER (WHERE so.is_six) AS sixes`;
      group = `b.fixture_id, b.team_id, t.name,
        CASE WHEN b.ball_number <= 36 THEN 'powerplay' WHEN b.ball_number <= 90 THEN 'middle' ELSE 'death' END`;
      order = 'b.fixture_id, phase';
      break;
    case 'batter':
      select = `b.batsman_striker_id AS player_id, p.fullname AS player_name,
        COUNT(*) AS balls, COALESCE(SUM(so.runs), 0) AS runs,
        COUNT(*) FILTER (WHERE so.is_four) AS fours, COUNT(*) FILTER (WHERE so.is_six) AS sixes,
        COUNT(*) FILTER (WHERE b.batsman_out_id = b.batsman_striker_id) AS dismissals`;
      group = 'b.batsman_striker_id, p.fullname';
      order = 'runs DESC';
      break;
    case 'bowler':
      select = `b.bowler_id AS player_id, p.fullname AS player_name,
        COUNT(*) AS balls, COALESCE(SUM(so.runs), 0) AS runs,
        COUNT(*) FILTER (WHERE b.batsman_out_id IS NOT NULL) AS wickets`;
      group = 'b.bowler_id, p.fullname';
      order = 'wickets DESC, runs';
      break;
    case 'dismissal':
      select = `fb.fixture_id, fb.player_id, p.fullname AS player_name,
        fb.wicket_outcome_id AS dismissal_type_id, COUNT(*) AS dismissals`;
      group = 'fb.fixture_id, fb.player_id, p.fullname, fb.wicket_outcome_id';
      order = 'dismissals DESC';
      const dismissalParams: unknown[] = [];
      const dismissalFilters = ['f.is_active = true'];
      addFilter(dismissalFilters, dismissalParams, 'fb.fixture_id = ?', input.fixture_id);
      addFilter(dismissalFilters, dismissalParams, 'f.league_id = ?', input.league_id);
      addFilter(dismissalFilters, dismissalParams, 'f.season_id = ?', input.season_id);
      addFilter(dismissalFilters, dismissalParams, 'fb.player_id = ?', input.player_id);
      const dismissalQuery = `SELECT ${select}
        FROM matches.fixture_batting fb
        JOIN matches.fixtures f ON f.sportmonks_id = fb.fixture_id
        LEFT JOIN master.players p ON p.sportmonks_id = fb.player_id
        WHERE ${dismissalFilters.join(' AND ')} AND fb.wicket_outcome_id IS NOT NULL
        GROUP BY ${group} ORDER BY ${order} LIMIT $${dismissalParams.length + 1}`;
      const dismissalResult = await pool.query(dismissalQuery, [...dismissalParams, limit]);
      return dismissalResult.rows as Row[];
    case 'partnership':
      select = `b.fixture_id, b.scoreboard, b.batsman_striker_id, ps.fullname AS striker_name,
        b.batsman_non_striker_id, pn.fullname AS non_striker_name,
        COUNT(*) AS balls, COALESCE(SUM(so.runs), 0) AS runs`;
      group = 'b.fixture_id, b.scoreboard, b.batsman_striker_id, ps.fullname, b.batsman_non_striker_id, pn.fullname';
      order = 'runs DESC';
      break;
    default:
      throw new Error(`Unsupported analysis_type: ${input.analysis_type}`);
  }

  const playerJoin = input.analysis_type === 'batter' || input.analysis_type === 'bowler'
    ? 'LEFT JOIN master.players p ON p.sportmonks_id = ' + (input.analysis_type === 'batter' ? 'b.batsman_striker_id' : 'b.bowler_id')
    : input.analysis_type === 'partnership'
      ? `LEFT JOIN master.players ps ON ps.sportmonks_id = b.batsman_striker_id
         LEFT JOIN master.players pn ON pn.sportmonks_id = b.batsman_non_striker_id`
      : '';
  const { rows } = await pool.query(
    `SELECT ${select} FROM matches.fixture_balls b
     JOIN matches.fixtures f ON f.sportmonks_id = b.fixture_id
     LEFT JOIN master.teams t ON t.sportmonks_id = b.team_id
     LEFT JOIN master.score_outcomes so ON so.sportmonks_id = b.score_outcome_id
     ${playerJoin}
     WHERE ${filters.join(' AND ')}
     GROUP BY ${group} ORDER BY ${order} LIMIT $${params.length + 1}`,
    [...params, limit],
  );
  return rows as Row[];
}

export interface TeamAnalyticsInput extends QueryInput {
  team_id: number;
  data_type: string;
  opponent_team_id?: number;
  venue_id?: number;
  league_id?: number;
  season_id?: number;
  limit?: number;
}

export async function getTeamAnalytics(input: TeamAnalyticsInput): Promise<Row[]> {
  const pool = await getReadPool();
  const params: unknown[] = [input.team_id];
  const conditions = ['f.is_active = true', '(f.localteam_id = $1 OR f.visitorteam_id = $1)'];
  addFilter(conditions, params, 'f.league_id = ?', input.league_id);
  addFilter(conditions, params, 'f.season_id = ?', input.season_id);
  addFilter(conditions, params, 'f.venue_id = ?', input.venue_id);
  dateFilters(conditions, params, 'f.starting_at', input);
  if (input.opponent_team_id !== undefined) {
    params.push(input.opponent_team_id);
    conditions.push(`(f.localteam_id = $${params.length} OR f.visitorteam_id = $${params.length})`);
  }
  let group: string;
  let select: string;
  switch (input.data_type) {
    case 'venue_split':
      select = `f.venue_id, v.name AS venue_name, v.city,
        COUNT(*) AS matches, COUNT(*) FILTER (WHERE f.winner_team_id = $1) AS wins,
        COUNT(*) FILTER (WHERE f.winner_team_id IS NOT NULL AND f.winner_team_id <> $1) AS losses,
        COUNT(*) FILTER (WHERE f.draw_noresult = true) AS draws`;
      group = 'f.venue_id, v.name, v.city';
      break;
    case 'opponent_split':
      select = `CASE WHEN f.localteam_id = $1 THEN f.visitorteam_id ELSE f.localteam_id END AS opponent_id,
        CASE WHEN f.localteam_id = $1 THEN vt.name ELSE lt.name END AS opponent_name,
        COUNT(*) AS matches, COUNT(*) FILTER (WHERE f.winner_team_id = $1) AS wins,
        COUNT(*) FILTER (WHERE f.winner_team_id IS NOT NULL AND f.winner_team_id <> $1) AS losses,
        COUNT(*) FILTER (WHERE f.draw_noresult = true) AS draws`;
      group = 'opponent_id, opponent_name';
      break;
    case 'head_to_head':
      if (input.opponent_team_id === undefined) throw new Error('opponent_team_id is required');
      select = `COUNT(*) AS matches, COUNT(*) FILTER (WHERE f.winner_team_id = $1) AS team_wins,
        COUNT(*) FILTER (WHERE f.winner_team_id = $${params.length}) AS opponent_wins,
        COUNT(*) FILTER (WHERE f.draw_noresult = true) AS draws`;
      group = 'f.league_id';
      break;
    case 'performance':
      select = `f.season_id, s.name AS season_name, COUNT(*) AS matches,
        COUNT(*) FILTER (WHERE f.winner_team_id = $1) AS wins,
        COUNT(*) FILTER (WHERE f.winner_team_id IS NOT NULL AND f.winner_team_id <> $1) AS losses,
        COUNT(*) FILTER (WHERE f.draw_noresult = true) AS draws`;
      group = 'f.season_id, s.name';
      break;
    default:
      throw new Error(`Unsupported data_type: ${input.data_type}`);
  }
  const limit = boundedLimit(input.limit, 100);
  const { rows } = await pool.query(
    `SELECT ${select} FROM matches.fixtures f
     LEFT JOIN master.venues v ON v.sportmonks_id = f.venue_id
     JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     LEFT JOIN master.seasons s ON s.sportmonks_id = f.season_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY ${group} ORDER BY matches DESC LIMIT $${params.length + 1}`,
    [...params, limit],
  );
  return rows as Row[];
}

export interface VenueStatsInput extends QueryInput {
  venue_id: number;
  data_type: string;
  team_id?: number;
  league_id?: number;
  season_id?: number;
  limit?: number;
}

export async function getVenueStats(input: VenueStatsInput): Promise<Row> {
  const pool = await getReadPool();
  const { rows: venueRows } = await pool.query(
    `SELECT sportmonks_id AS id, name, city, capacity, floodlight, image_path
     FROM master.venues WHERE sportmonks_id = $1`, [input.venue_id]);
  if (venueRows.length === 0) throw new Error(`Venue ${input.venue_id} not found`);
  const params: unknown[] = [input.venue_id];
  const conditions = ['f.is_active = true', 'f.venue_id = $1'];
  if (input.team_id !== undefined) {
    params.push(input.team_id);
    conditions.push(`(f.localteam_id = $${params.length} OR f.visitorteam_id = $${params.length})`);
  }
  addFilter(conditions, params, 'f.league_id = ?', input.league_id);
  addFilter(conditions, params, 'f.season_id = ?', input.season_id);
  const result: Row = { venue: venueRows[0] };
  const limit = boundedLimit(input.limit, 100);
  if (input.data_type === 'profile' || input.data_type === 'score_patterns') {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS matches, AVG(fr.score) FILTER (WHERE fr.inning = 1) AS average_first_innings,
          MAX(fr.score) AS highest_score, MIN(fr.score) AS lowest_score
       FROM matches.fixtures f LEFT JOIN matches.fixture_runs fr ON fr.fixture_id = f.sportmonks_id
       WHERE ${conditions.join(' AND ')}`, params);
    result.scorePatterns = rows[0];
  }
  if (input.data_type === 'profile' || input.data_type === 'team_record') {
    const { rows } = await pool.query(
      `SELECT t.sportmonks_id AS team_id, t.name AS team_name, COUNT(*) AS matches,
          COUNT(*) FILTER (WHERE f.winner_team_id = t.sportmonks_id) AS wins,
          COUNT(*) FILTER (WHERE f.winner_team_id IS NOT NULL AND f.winner_team_id <> t.sportmonks_id) AS losses
       FROM matches.fixtures f
       JOIN master.teams t ON t.sportmonks_id IN (f.localteam_id, f.visitorteam_id)
       WHERE ${conditions.join(' AND ')}${input.team_id !== undefined ? ` AND t.sportmonks_id = $${params.length}` : ''}
       GROUP BY t.sportmonks_id, t.name
       ORDER BY wins DESC LIMIT $${params.length + 1}`, [...params, limit]);
    result.teamRecord = rows;
  }
  if (input.data_type === 'batting' || input.data_type === 'bowling') {
    const table = input.data_type === 'batting' ? 'matches.fixture_batting' : 'matches.fixture_bowling';
    const metric = input.data_type === 'batting'
      ? 'SUM(x.runs_scored) AS runs, AVG(x.strike_rate) AS strike_rate, SUM(x.fours) AS fours, SUM(x.sixes) AS sixes'
      : 'SUM(x.wickets) AS wickets, SUM(x.runs_conceded) AS runs_conceded, AVG(x.economy_rate) AS economy_rate';
    const { rows } = await pool.query(
      `SELECT x.player_id, p.fullname AS player_name, COUNT(*) AS innings, ${metric}
       FROM ${table} x JOIN matches.fixtures f ON f.sportmonks_id = x.fixture_id
       LEFT JOIN master.players p ON p.sportmonks_id = x.player_id
       WHERE ${conditions.join(' AND ')} GROUP BY x.player_id, p.fullname
       ORDER BY ${input.data_type === 'batting' ? 'runs' : 'wickets'} DESC LIMIT $${params.length + 1}`,
      [...params, limit]);
    result[input.data_type] = rows;
  }
  return result;
}

export interface RankingsInput extends QueryInput {
  format_type: string;
  gender?: string;
  team_id?: number;
  limit?: number;
}

export async function getRankings(input: RankingsInput): Promise<Row[]> {
  const pool = await getReadPool();
  const params: unknown[] = [input.format_type];
  const conditions = ['r.format_type ILIKE $1'];
  addFilter(conditions, params, 'r.gender = ?', input.gender);
  addFilter(conditions, params, 'r.team_id = ?', input.team_id);
  params.push(boundedLimit(input.limit, 50, 10));
  const { rows } = await pool.query(
    `SELECT r.position, r.team_id, t.name AS team_name, t.code AS team_code,
        r.points, r.rating, r.format_type, r.gender, r.api_updated_at
     FROM master.team_rankings r JOIN master.teams t ON t.sportmonks_id = r.team_id
     WHERE ${conditions.join(' AND ')} ORDER BY r.position NULLS LAST LIMIT $${params.length}`,
    params,
  );
  return rows as Row[];
}

export interface TrendsInput extends QueryInput {
  entity_type: string;
  entity_id: number;
  metric: string;
  grain: string;
  league_id?: number;
  format_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export async function getTrends(input: TrendsInput): Promise<Row[]> {
  const pool = await getReadPool();
  const limit = boundedLimit(input.limit, 60, 20);
  const params: unknown[] = [input.entity_id];
  const conditions: string[] = [];
  let source: string;
  let period: string;
  let value: string;
  switch (input.entity_type) {
    case 'player':
      source = 'master.player_career_stats pcs JOIN master.seasons s ON s.sportmonks_id = pcs.season_id';
      period = input.grain === 'season' ? 's.name' : 's.name';
      value = ({
        runs: 'SUM(pcs.batting_runs)', wickets: 'SUM(pcs.bowling_wickets)',
        average: 'AVG(pcs.batting_average)', strike_rate: 'AVG(pcs.batting_strike_rate)',
        economy: 'AVG(pcs.bowling_economy_rate)',
      } as Record<string, string>)[input.metric] ?? 'SUM(pcs.batting_runs)';
      conditions.push('pcs.player_id = $1');
      addFilter(conditions, params, 's.league_id = ?', input.league_id);
      addFilter(conditions, params, 'pcs.format_type ILIKE ?', input.format_type);
      break;
    case 'team':
      source = 'matches.fixtures f JOIN master.seasons s ON s.sportmonks_id = f.season_id';
      period = input.grain === 'season' ? 's.name' : `DATE_TRUNC('${input.grain === 'month' ? 'month' : 'day'}', f.starting_at)`;
      value = input.metric === 'win_rate'
        ? `AVG(CASE WHEN f.winner_team_id = $1 THEN 1.0 ELSE 0.0 END)`
        : 'COUNT(*)::numeric';
      conditions.push('(f.localteam_id = $1 OR f.visitorteam_id = $1)', 'f.is_active = true');
      addFilter(conditions, params, 'f.league_id = ?', input.league_id);
      addFilter(conditions, params, 'f.match_format ILIKE ?', input.format_type);
      dateFilters(conditions, params, 'f.starting_at', input);
      break;
    case 'league':
      source = 'matches.fixtures f JOIN master.seasons s ON s.sportmonks_id = f.season_id';
      period = input.grain === 'season' ? 's.name' : `DATE_TRUNC('${input.grain === 'month' ? 'month' : 'day'}', f.starting_at)`;
      value = 'COUNT(*)::numeric';
      conditions.push('f.league_id = $1', 'f.is_active = true');
      dateFilters(conditions, params, 'f.starting_at', input);
      break;
    case 'venue':
      source = 'matches.fixtures f';
      period = input.grain === 'season' ? 'f.season_id' : `DATE_TRUNC('${input.grain === 'month' ? 'month' : 'day'}', f.starting_at)`;
      value = 'COUNT(*)::numeric';
      conditions.push('f.venue_id = $1', 'f.is_active = true');
      addFilter(conditions, params, 'f.league_id = ?', input.league_id);
      dateFilters(conditions, params, 'f.starting_at', input);
      break;
    default:
      throw new Error(`Unsupported entity_type: ${input.entity_type}`);
  }
  const { rows } = await pool.query(
    `SELECT ${period} AS period, ${value} AS value
     FROM ${source} WHERE ${conditions.join(' AND ')}
     GROUP BY ${period} ORDER BY ${period} LIMIT $${params.length + 1}`,
    [...params, limit],
  );
  return rows as Row[];
}

export interface LiveMatchStateInput extends QueryInput {
  fixture_id?: number;
  team_id?: number;
  include_recent_balls?: boolean;
  recent_ball_limit?: number;
}

export async function getLiveMatchState(input: LiveMatchStateInput): Promise<Row> {
  const pool = await getReadPool();
  const params: unknown[] = [];
  const conditions = ['f.is_active = true'];
  if (input.fixture_id !== undefined) addFilter(conditions, params, 'f.sportmonks_id = ?', input.fixture_id);
  else if (input.team_id !== undefined) {
    addFilter(conditions, params, '(f.localteam_id = ? OR f.visitorteam_id = ?)', input.team_id);
    params.push(input.team_id);
    conditions[conditions.length - 1] = `(f.localteam_id = $${params.length - 1} OR f.visitorteam_id = $${params.length})`;
  } else throw new Error('Provide fixture_id or team_id');
  const { rows: matches } = await pool.query(
    `SELECT f.sportmonks_id AS fixture_id, f.starting_at, f.status, f.is_live,
        f.localteam_id, lt.name AS localteam_name, f.visitorteam_id, vt.name AS visitorteam_name,
        l.name AS league_name, s.name AS season_name
     FROM matches.fixtures f JOIN master.teams lt ON lt.sportmonks_id = f.localteam_id
     JOIN master.teams vt ON vt.sportmonks_id = f.visitorteam_id
     LEFT JOIN master.leagues l ON l.sportmonks_id = f.league_id
     LEFT JOIN master.seasons s ON s.sportmonks_id = f.season_id
     WHERE ${conditions.join(' AND ')} ORDER BY f.starting_at DESC NULLS LAST LIMIT 1`, params);
  if (matches.length === 0) throw new Error('No matching live fixture found');
  const fixtureId = Number(matches[0].fixture_id);
  const [{ rows: snapshots }, { rows: innings }] = await Promise.all([
    pool.query(`SELECT snapshot_at, status, is_live, payload_hash FROM matches.livescore_snapshots
      WHERE fixture_id = $1 ORDER BY snapshot_at DESC LIMIT 1`, [fixtureId]),
    pool.query(`SELECT fr.team_id, t.name AS team_name, fr.inning, fr.score, fr.wickets, fr.overs
      FROM matches.fixture_runs fr LEFT JOIN master.teams t ON t.sportmonks_id = fr.team_id
      WHERE fr.fixture_id = $1 ORDER BY fr.inning`, [fixtureId]),
  ]);
  const result: Row = { match: matches[0], snapshot: snapshots[0] ?? null, innings };
  if (input.include_recent_balls) {
    const limit = boundedLimit(input.recent_ball_limit, 36, 6);
    const { rows } = await pool.query(
      `SELECT b.ball_number, b.scoreboard, ps.fullname AS striker_name,
          pb.fullname AS bowler_name, so.name AS outcome_name, so.runs AS runs
       FROM matches.fixture_balls b
       LEFT JOIN master.players ps ON ps.sportmonks_id = b.batsman_striker_id
       LEFT JOIN master.players pb ON pb.sportmonks_id = b.bowler_id
       LEFT JOIN master.score_outcomes so ON so.sportmonks_id = b.score_outcome_id
       WHERE b.fixture_id = $1 ORDER BY b.ball_number DESC LIMIT $2`, [fixtureId, limit]);
    result.recentBalls = rows.reverse();
  }
  return result;
}
