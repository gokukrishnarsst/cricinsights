import type { FastPathIntent, RouteDecision, RoutePath } from './types.js';

const AI_PATH_SIGNALS =
  /\b(why|explain|analyze|analyse|predict|what if|how come|how (?:is|are|it|they) different|difference between|differ|tell me about|deep dive|insight|story|narrative|across seasons|over the years|compare.*across)\b/i;

const FORMAT_OR_LEAGUE_TOKEN =
  /\b(ipl|odi|t20i?|tests?|bbl|big bash|the hundred|psl|bpl|cpl|sa20|indian premier league)\b/i;

const LEAGUE_HINTS: Record<string, { leagueId: number; seasonId?: number }> = {
  ipl: { leagueId: 1 },
  'indian premier league': { leagueId: 1 },
  bbl: { leagueId: 5 },
  'big bash': { leagueId: 5 },
};

/**
 * Rule-based query classifier: routes simple factual lookups to Fast Path,
 * complex or ambiguous queries to the AI agent.
 */
export class SmartRouter {
  classify(query: string): RouteDecision {
    const text = query.trim();
    if (!text) {
      return decision('ai_path', 'unknown', 0, {});
    }

    const fixtureId = extractFixtureId(text);
    if (/\b(live|currently|right now|latest snapshot|last over)\b/i.test(text)) {
      return decision('fast_path', 'live_score', 0.9, {
        ...(fixtureId ? { fixture_id: fixtureId } : {}),
        ...extractTeamHint(text),
      });
    }

    if (isSimpleEntityLookup(text)) {
      return decision('fast_path', 'entity_lookup', 0.88, {
        query: extractEntitySearchQuery(text),
        entity_type: inferEntityType(text),
      });
    }

    if (/\b(ranking|rankings|rating|icc)\b/i.test(text)) {
      const format = extractFormat(text) ?? 'T20';
      return decision('fast_path', 'team_rankings', 0.9, {
        format_type: format,
        gender: /\bwomen|women's\b/i.test(text) ? 'women' : 'men',
        query: text,
      });
    }

    const fixtureTeam = extractTeamForFixtures(text);
    if (fixtureTeam) {
      return decision('fast_path', 'team_fixtures', 0.9, {
        team_name: fixtureTeam,
        limit: 10,
      });
    }

    const namedPlayer = extractExplicitPersonName(text);
    if (
      namedPlayer &&
      /\b(last|recent|match.by.match|innings|scorecard history|history)\b/i.test(text) &&
      /\b(stats|scores?|batting|bowling|innings|matches?|history)\b/i.test(text)
    ) {
      return decision('fast_path', 'player_match_history', 0.9, {
        name: namedPlayer,
        limit: extractRequestedLimit(text) ?? 10,
        ...extractLeagueHint(text),
      });
    }

    if (/\b(powerplay|power play|death overs?|middle overs?|over.by.over|phase|dismissal types?)\b/i.test(text)) {
      if (fixtureId) {
        return decision('fast_path', 'ball_analysis', 0.9, {
          fixture_id: fixtureId,
          query: text,
          ...extractLeagueHint(text),
          phase: inferPhase(text),
        });
      }
      return decision('ai_path', 'ball_analysis', 0.75, { query: text });
    }

    if (/\b(venue|ground|stadium)\b/i.test(text) && /\b(stats?|record|scoring|batting|bowling|average)\b/i.test(text)) {
      if (/\b(score|average|first[ -]innings)\b/i.test(text) && /\bbowling\b/i.test(text)) {
        return decision('ai_path', 'venue_stats', 0.8, { query: text });
      }
      const venueName = extractExplicitVenueName(text);
      if (venueName) {
        return decision('fast_path', 'venue_stats', 0.9, {
          venue_name: venueName,
          data_type: inferVenueDataType(text),
        });
      }
      return decision('ai_path', 'venue_stats', 0.7, { query: text });
    }

    if (/\b(trend|trends|over the years|year.on.year|season.on.season|changed|evolved)\b/i.test(text)) {
      return decision('ai_path', 'trend_analysis', 0.7, {
        query: text,
        entity_name: namedPlayer ?? undefined,
        ...extractLeagueHint(text),
      });
    }

    if (/\b(venue split|home and away|away record|performance by venue|opponent record|team performance)\b/i.test(text)) {
      return decision('ai_path', 'team_analytics', 0.7, {
        query: text,
        ...extractLeagueHint(text),
      });
    }

    // Format/league comparisons (IPL vs ODI) need multi-tool AI — never player_compare.
    // Checked before generic "how different" AI signals so intent stays dismissal_analysis.
    if (
      /\bvs\.?\b/i.test(text) &&
      countFormatOrLeagueMentions(text) >= 2
    ) {
      if (/\bdismissal/i.test(text)) {
        return decision('ai_path', 'dismissal_analysis', 0.9, {
          query: text,
          name: extractPlayerNameForDismissal(text) ?? undefined,
        });
      }
      return decision('ai_path', 'unknown', 0.85, { query: text });
    }

    if (AI_PATH_SIGNALS.test(text)) {
      return decision('ai_path', 'unknown', 0.85, { query: text });
    }

    if (fixtureId && /\b(lineup|playing xi|venue|officials?|umpires?|extras|weather|odds|over.by.over)\b/i.test(text)) {
      return decision('fast_path', 'match_context', 0.9, {
        fixture_id: fixtureId,
        query: text,
      });
    }

    if (/\b(scorecard|full score|ball.by.ball)\b/i.test(text) && fixtureId) {
      return decision('fast_path', 'match_scorecard', 0.9, { fixture_id: fixtureId });
    }

    if (/\b(scorecard|full score|ball.by.ball)\b/i.test(text)) {
      const matchContext = extractScorecardMatchContext(text);
      if (matchContext) {
        return decision('fast_path', 'match_scorecard', 0.92, matchContext);
      }
      return decision('ai_path', 'match_scorecard', 0.75, { query: text });
    }

    if (/\b(latest|last)\b.*\b(?:vs\.?|versus)\b/i.test(text)) {
      return decision('ai_path', 'match_context', 0.75, { query: text });
    }

    if (/\b(head.to.head|h2h)\b/i.test(text)) {
      const teamNames =
        extractPair(text, /\b(?:head.to.head|h2h)\b/i) ??
        extractVsPair(text);
      if (teamNames) {
        return decision('fast_path', 'head_to_head', 0.8, {
          team_a: teamNames[0],
          team_b: teamNames[1],
          ...extractLeagueHint(text),
        });
      }
      return decision('ai_path', 'head_to_head', 0.5, { query: text });
    }

    const compareMatch = text.match(
      /compare\s+(.+?)\s+(?:and|with|vs\.?|versus)\s+(.+)/i,
    );
    if (compareMatch) {
      const entityA = cleanComparisonEntity(compareMatch[1]);
      const entityB = cleanComparisonEntity(compareMatch[2]);
      if (
        looksLikeFormatOrLeague(entityA) ||
        looksLikeFormatOrLeague(entityB) ||
        looksLikeFormatOrLeague(compareMatch[2])
      ) {
        return decision('ai_path', 'unknown', 0.85, { query: text });
      }
      if (/\b(bowler|batsman|death|overs|matchup)\b/i.test(text)) {
        return decision('fast_path', 'matchup', 0.82, {
          entity_a: entityA,
          entity_b: entityB,
        });
      }
      return decision('fast_path', 'player_compare', 0.85, {
        entity_a: entityA,
        entity_b: entityB,
      });
    }

    const dismissalNameEarly = extractPlayerNameForDismissal(text);
    if (
      dismissalNameEarly &&
      /\b(dismissal|dismissals|how.*(out|dismissed)|got out|modes? of dismissal)\b/i.test(
        text,
      )
    ) {
      // Dismissal analysis needs bounded ball-by-ball work from the local MCP.
      return decision('ai_path', 'ball_analysis', 0.8, {
        player_name: dismissalNameEarly,
        query: text,
        ...extractLeagueHint(text),
      });
    }

    const vsMatch = text.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    if (vsMatch && isBareComparisonQuery(text)) {
      const entityA = cleanComparisonEntity(vsMatch[1]);
      const entityB = cleanComparisonEntity(vsMatch[2]);
      if (
        !looksLikeFormatOrLeague(entityA) &&
        !looksLikeFormatOrLeague(entityB) &&
        !looksLikeFormatOrLeague(vsMatch[2]) &&
        !/\bdismissal\b/i.test(text)
      ) {
        return decision('fast_path', 'player_compare', 0.75, {
          entity_a: entityA,
          entity_b: entityB,
        });
      }
    }

    if (/\b(leaderboard|top run|leading run scorers?|top wicket|orange cap|purple cap|most runs|most wickets)\b/i.test(text)) {
      const league = extractLeagueHint(text);
      if (league?.league_id) {
        return decision('fast_path', 'leaderboard', 0.8, {
          ...league,
          query: text,
          metric: inferLeaderboardMetric(text),
        });
      }
      const leagueName = extractCompetitionName(text);
      if (leagueName) {
        return decision('fast_path', 'leaderboard', 0.86, {
          league_name: leagueName,
          query: text,
          metric: inferLeaderboardMetric(text),
        });
      }
      return decision('ai_path', 'leaderboard', 0.55, { query: text });
    }

    if (/\b(who won|winner|champions?|title winners?)\b/i.test(text)) {
      const league = extractLeagueHint(text);
      if (league?.league_id) {
        return decision('fast_path', 'league_winner', 0.9, {
          ...league,
          query: text,
        });
      }
      return decision('ai_path', 'league_winner', 0.6, { query: text });
    }

    if (/\b(standings|points table|league table)\b/i.test(text)) {
      const league = extractLeagueHint(text);
      if (league?.league_id) {
        return decision('fast_path', 'league_standings', 0.82, {
          ...league,
          query: text,
        });
      }
      return decision('ai_path', 'league_standings', 0.55, { query: text });
    }

    const statsFor = text.match(
      /(?:stats|statistics|profile|career|batting|bowling)\s+(?:for|of)\s+(.+)/i,
    );
    if (statsFor && isLikelyPersonName(cleanEntity(statsFor[1]))) {
      return decision('fast_path', 'player_stats', 0.88, {
        name: cleanEntity(statsFor[1]),
        ...extractLeagueHint(text),
      });
    }

    if (namedPlayer && /\b(stats|statistics|profile|career|batting|bowling|performance)\b/i.test(text)) {
      return decision('fast_path', 'player_stats', 0.9, {
        name: namedPlayer,
        ...extractLeagueHint(text),
      });
    }

    const scoutName = extractPlayerNameForScout(text);
    if (
      scoutName &&
      /\b(strengths?|weaknesses?|strong points|areas to improve|scouting report|scout report)\b/i.test(
        text,
      )
    ) {
      return decision('fast_path', 'player_scout', 0.92, {
        name: scoutName,
        ...extractLeagueHint(text),
      });
    }

    const nameStats = text.match(/^(.+?)\s+(?:stats|statistics|profile|batting stats|bowling stats)$/i);
    if (nameStats) {
      return decision('fast_path', 'player_stats', 0.86, {
        name: cleanEntity(nameStats[1]),
        ...extractLeagueHint(text),
      });
    }

    const searchPlayer = text.match(/search(?:\s+for)?\s+player\s+(.+)/i);
    if (searchPlayer) {
      const name = cleanEntity(searchPlayer[1]);
      if (name.split(/\s+/).length >= 2) {
        return decision('fast_path', 'player_stats', 0.8, { name });
      }
      return decision('ai_path', 'player_stats', 0.6, { name, query: text });
    }

    if (/\b(player|batsman|bowler)\b/i.test(text) && text.length < 100) {
      return decision('ai_path', 'unknown', 0.65, { query: text });
    }

    return decision('ai_path', 'unknown', 0.5, { query: text });
  }
}

function decision(
  route: RoutePath,
  intent: FastPathIntent,
  confidence: number,
  params: Record<string, unknown>,
): RouteDecision {
  return { route, intent, confidence, params };
}

function extractTeamHint(text: string): Record<string, unknown> {
  const match = text.match(/(?:for|of|between|in|team)\s+([A-Za-z][A-Za-z .&'-]{2,50}?)(?:\s+(?:match|game|right|now|live)|\?|$)/i);
  return match?.[1] ? { team_name: cleanEntity(match[1]) } : {};
}

function extractEntitySearchQuery(text: string): string {
  return cleanEntity(text
    .replace(/^(search|find|lookup|list)\s+/i, '')
    .replace(/\b(players?|teams?|leagues?|seasons?|stages?|venues?|grounds?|officials?|umpires?|countries?)\b/gi, ' ')
    .replace(/\bin\b/gi, ' '));
}

function isSimpleEntityLookup(text: string): boolean {
  if (!/^(?:search|find|lookup|list)\b/i.test(text)) return false;
  if (!/\b(players?|teams?|leagues?|seasons?|stages?|venues?|grounds?|officials?|umpires?|countries?)\b/i.test(text)) {
    return false;
  }
  // Research requests often begin with "find" or "list", but they need
  // analysis rather than a raw entity list. Keep those on the AI path.
  return !/\b(analy[sz]e|summari[sz]e|performance|patterns?|captain|vice-captain|chased|recommend|prove|recent form|match data)\b/i.test(text);
}

function extractTeamForFixtures(text: string): string | null {
  const patterns = [
    /\bupcoming\s+([A-Z][A-Za-z .&'-]{1,50})\s+(?:fixtures?|matches?|games?)\b/i,
    /\b([A-Z][A-Za-z .&'-]{1,50}?)(?:['’]s?)?\s+(?:recent|upcoming|last)\s+(?:fixtures?|matches?|games?)(?:\s+and\s+results?)?\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const name = match?.[1]
      ? cleanEntity(match[1].replace(/^(?:list|show|give|find)\s+/i, ''))
      : '';
    if (isLikelyEntityName(name)) return name;
  }
  return null;
}

function extractExplicitPersonName(text: string): string | null {
  const patterns = [
    /(?:show|analy[sz]e|compare|give)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})(?:['’]s?)?\s+(?:career|last|recent|batting|bowling|performance|stats|statistics)/i,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})['’]s?\s+(?:career|last|recent|batting|bowling|performance|stats|statistics)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const name = match?.[1] ? cleanEntity(match[1]) : '';
    if (isLikelyPersonName(name)) return name;
  }
  return null;
}

function extractRequestedLimit(text: string): number | undefined {
  const match = text.match(/\b(?:last|latest|recent)\s+(\d{1,2})\b/i);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 1 && value <= 50 ? value : undefined;
}

function extractExplicitVenueName(text: string): string | null {
  const match = text.match(/\b(?:at|in)\s+([A-Z][A-Za-z .'-]{2,60}?)(?:\s+(?:stadium|ground))?(?:,|\?|\s+(?:what|which|how|is|are|was|were|does|do|first|average|stats?|record|scoring|batting|bowling)|$)/i);
  const name = match?.[1] ? cleanEntity(match[1]) : '';
  return isLikelyEntityName(name) ? name : null;
}

function cleanComparisonEntity(value: string): string {
  return cleanEntity(value)
    .replace(/['’]s\b.*$/i, '')
    .replace(/\s+\b(?:in|for|across|during)\b.*$/i, '')
    .replace(/\s+\b(?:batting|bowling|career|records?|stats?|statistics|performance)\b.*$/i, '')
    .trim();
}

function isBareComparisonQuery(text: string): boolean {
  return /^[A-Z][A-Za-z .'-]{1,50}\s+(?:vs\.?|versus)\s+[A-Z][A-Za-z .'-]{1,50}[?.!]?$/i.test(text);
}

function isLikelyPersonName(value: string): boolean {
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(value.trim());
}

function isLikelyEntityName(value: string): boolean {
  return /^[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z.&'-]*){0,4}$/.test(value.trim());
}

function inferEntityType(text: string): string {
  const value = text.toLowerCase();
  if (/venue|ground|stadium/.test(value)) return 'venue';
  if (/umpire|official|referee/.test(value)) return 'official';
  if (/league|tournament/.test(value)) return 'league';
  if (/season/.test(value)) return 'season';
  if (/stage|final|semi|qualifier|group/.test(value)) return 'stage';
  if (/team|club|franchise/.test(value)) return 'team';
  return 'player';
}

function extractFormat(text: string): string | undefined {
  const match = text.match(/\b(T20I?|ODI|Tests?|T10|100[- ]?Ball)\b/i);
  return match?.[1]?.replace(/tests?/i, 'Test').replace(/t20/i, 'T20').toUpperCase();
}

function inferPhase(text: string): string | undefined {
  if (/powerplay|power play/i.test(text)) return 'powerplay';
  if (/death/i.test(text)) return 'death';
  if (/middle/i.test(text)) return 'middle';
  return undefined;
}

function inferVenueDataType(text: string): string {
  if (/team|record/i.test(text)) return 'team_record';
  if (/batting/i.test(text)) return 'batting';
  if (/bowling/i.test(text)) return 'bowling';
  if (/score|average/i.test(text)) return 'score_patterns';
  return 'profile';
}

function looksLikeFormatOrLeague(value: string): boolean {
  const t = value.trim().toLowerCase().replace(/[?,.]+$/g, '');
  if (!t) return true;
  if (FORMAT_OR_LEAGUE_TOKEN.test(t) && t.split(/\s+/).length <= 4) {
    // "IPL" or "ODI , how it different" after clean may still start with format
    const withoutNoise = t
      .replace(/\b(how|it|is|are|they|different|difference|analysis|dismissal|in|the)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!withoutNoise || FORMAT_OR_LEAGUE_TOKEN.test(withoutNoise)) {
      return true;
    }
  }
  return /^(ipl|odi|t20i?|tests?|bbl)\b/.test(t);
}

function countFormatOrLeagueMentions(text: string): number {
  const matches = text.match(
    /\b(ipl|odi|t20i?|tests?|bbl|big bash|the hundred|psl|indian premier league)\b/gi,
  );
  return matches?.length ?? 0;
}

function cleanEntity(value: string): string {
  return value
    .replace(/\?.*$/, '')
    .replace(/\b(ipl|t20|odi|test|stats|please)\b/gi, '')
    .trim();
}

function extractPlayerNameForScout(text: string): string | null {
  const patterns = [
    /what are\s+(.+?)['’]s\s+(?:strengths|weaknesses)/i,
    /(?:strengths|weaknesses)[\s\w,]*?(?:for|of)\s+(.+?)(?:\s+in\s+|\?|$)/i,
    /^(.+?)\s+strengths?\s+and\s+weaknesses?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = cleanEntity(
        match[1].replace(/\s+in\s+(ipl|the hundred|bbl).*$/i, ''),
      );
      if (name.split(/\s+/).length >= 2) {
        return name;
      }
    }
  }

  return null;
}

function extractPlayerNameForDismissal(text: string): string | null {
  const patterns = [
    /^(.+?)\s+dismissal\s+analysis\b/i,
    /dismissal\s+analysis\s+(?:for|of)\s+(.+)/i,
    /(?:dismissals?|how\s+(?:is|was|does|did)\s+.+\s+(?:get\s+)?out)\s+(?:for|of)\s+(.+)/i,
    /^(.+?)\s+(?:dismissals?|modes?\s+of\s+dismissal)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = cleanEntity(
        match[1]
          .replace(/\s+in\s+(ipl|the hundred|bbl).*$/i, '')
          .replace(/\b(dismissal|analysis|ipl|t20)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
      if (name.split(/\s+/).length >= 2) {
        return name;
      }
    }
  }

  return null;
}

function extractFixtureId(text: string): number | undefined {
  const match = text.match(/\b(?:fixture|match|game)\s*#?(\d{1,10})\b/i);
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}

function extractScorecardMatchContext(text: string): Record<string, unknown> | null {
  const pair = text.match(
    /(?:scorecard|full score(?:card)?)\s+(?:for|of)\s+([A-Z][A-Za-z .&'-]{1,50}?)\s+(?:vs\.?|versus)\s+([A-Z][A-Za-z .&'-]{1,50}?)(?=\s+(?:in|at|during)\s+|[?.!]|$)/i,
  );
  const teamA = pair?.[1] ? cleanEntity(pair[1]) : '';
  const teamB = pair?.[2] ? cleanEntity(pair[2]) : '';
  if (!isLikelyEntityName(teamA) || !isLikelyEntityName(teamB)) {
    return null;
  }

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const leagueMatch = text.match(/\b(?:icc\s+)?(?:men'?s\s+|women'?s\s+)?t20\s+world\s+cup\b/i);
  return {
    team_a_name: teamA,
    team_b_name: teamB,
    ...(yearMatch ? { year: Number(yearMatch[0]) } : {}),
    ...(extractFormat(text) ? { match_format: extractFormat(text) } : {}),
    ...(leagueMatch ? { league_name: leagueMatch[0] } : {}),
  };
}

function extractVsPair(text: string): [string, string] | null {
  const pair = text.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+)/i);
  if (!pair) {
    return null;
  }
  const second = pair[2].replace(/\b(head.to.head|h2h)\b.*$/i, '').trim();
  return [cleanEntity(pair[1]), cleanEntity(second)];
}

function extractPair(text: string, after: RegExp): [string, string] | null {
  const tail = text.split(after).pop()?.trim();
  if (!tail) {
    return null;
  }
  const pair = tail.match(/(.+?)\s+(?:vs\.?|versus|and)\s+(.+)/i);
  if (!pair) {
    return null;
  }
  return [cleanEntity(pair[1]), cleanEntity(pair[2])];
}

function extractLeagueHint(text: string): Record<string, unknown> | null {
  const lower = text.toLowerCase();
  for (const [hint, ids] of Object.entries(LEAGUE_HINTS)) {
    if (lower.includes(hint)) {
      return {
        league_id: ids.leagueId,
        ...(ids.seasonId !== undefined ? { season_id: ids.seasonId } : {}),
      };
    }
  }
  const seasonMatch = text.match(/\bseason\s*(\d{4}|\d+)\b/i);
  if (seasonMatch) {
    return { season_hint: seasonMatch[1] };
  }
  return null;
}

function extractCompetitionName(text: string): string | null {
  const t20WorldCup = text.match(/\b(?:icc\s+)?(?:men'?s\s+|women'?s\s+)?t20\s+world\s+cup\b/i);
  if (t20WorldCup?.[0]) return t20WorldCup[0];

  const match = text.match(/\b(?:in|for|at)\s+(?:the\s+)?(?:(?:19|20)\d{2}\s+)?([A-Za-z][A-Za-z &'’-]{2,70}?)(?:[?.!]|$)/i);
  const name = match?.[1]?.trim() ?? '';
  return name && !/^(?:recent|last|next|this season)$/i.test(name) ? name : null;
}

function inferLeaderboardMetric(text: string): string {
  const lower = text.toLowerCase();
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
