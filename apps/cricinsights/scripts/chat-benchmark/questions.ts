export type BenchmarkLevel = 'easy' | 'moderate' | 'hard' | 'extreme';

export interface ChatBenchmarkQuestion {
  id: string;
  level: BenchmarkLevel;
  question: string;
}

/**
 * End-to-end browser/API benchmark catalog. Questions intentionally retain
 * natural phrasing so router and tool-planning regressions remain visible.
 */
export const CHAT_BENCHMARK_QUESTIONS: ChatBenchmarkQuestion[] = [
  { id: 'easy-ipl-winner', level: 'easy', question: 'Who won the 2024 IPL?' },
  { id: 'easy-kohli-career', level: 'easy', question: 'Show Virat Kohli’s career batting statistics.' },
  { id: 'easy-india-fixtures', level: 'easy', question: 'What are the upcoming India fixtures?' },
  { id: 'easy-odi-rankings', level: 'easy', question: 'Show the current ICC men’s ODI rankings.' },
  { id: 'easy-ipl-standings', level: 'easy', question: 'What is the IPL 2024 points table?' },

  { id: 'moderate-kohli-rohit-compare', level: 'moderate', question: 'Compare Virat Kohli and Rohit Sharma’s T20 batting records.' },
  { id: 'moderate-bumrah-ipl', level: 'moderate', question: 'Show Jasprit Bumrah’s bowling performance in IPL 2024.' },
  { id: 'moderate-india-australia', level: 'moderate', question: 'What was the result and key context of the latest India vs Australia match?' },
  { id: 'moderate-ipl-venue-scores', level: 'moderate', question: 'Which venues have the highest average first-innings scores in IPL 2024?' },
  { id: 'moderate-csk-recent', level: 'moderate', question: 'List Chennai Super Kings’ recent matches and results.' },
  { id: 'moderate-t20wc-run-scorers', level: 'moderate', question: 'Who were the leading run scorers in the 2024 T20 World Cup?' },
  { id: 'moderate-india-pakistan-scorecard', level: 'moderate', question: 'Find the full scorecard for India vs Pakistan in the 2024 T20 World Cup.' },

  { id: 'hard-kohli-last-ten', level: 'hard', question: 'Analyze Virat Kohli’s last 10 completed matches: runs, average, strike rate, and trend.' },
  { id: 'hard-mi-csk-ipl', level: 'hard', question: 'Compare Mumbai Indians and Chennai Super Kings in IPL 2024: wins, losses, batting, bowling, and net run rate.' },
  { id: 'hard-wankhede-conditions', level: 'hard', question: 'At Wankhede Stadium, what first-innings score is usually competitive, and which bowling style performs best?' },
  { id: 'hard-wickets-specific-match', level: 'hard', question: 'Show every wicket in a specific match, including batter, bowler, dismissal type, over, and score at dismissal.' },
  { id: 'hard-death-bowling', level: 'hard', question: 'Which players had the best death-over bowling performance in IPL 2024?' },
  { id: 'hard-ipl-chases', level: 'hard', question: 'Find teams that chased 180+ successfully in IPL 2024 and summarize the common patterns.' },
  { id: 'hard-pace-spin-split', level: 'hard', question: 'Compare a player’s performance against pace versus spin across their latest season.' },
  { id: 'hard-consistent-batter', level: 'hard', question: 'Identify the most consistent batter in a league using runs, average, strike rate, and match-to-match variation.' },

  { id: 'extreme-next-india-match', level: 'extreme', question: 'For the next India match, identify the venue, expected match context, India’s likely key players based on recent form, and the opponent’s biggest threats.' },
  { id: 'extreme-match-preview', level: 'extreme', question: 'Build a data-backed preview for an upcoming match: recent team form, head-to-head, venue trends, top batters, top bowlers, and a projected competitive score.' },
  { id: 'extreme-loss-investigation', level: 'extreme', question: 'Investigate why a team lost its last five matches: compare powerplay scoring, middle-over wickets, death bowling, and venue effects.' },
  { id: 'extreme-player-form', level: 'extreme', question: 'Analyze a player’s last 15 matches and explain whether their form decline is due to dismissal patterns, pace/spin weakness, venue conditions, or batting position.' },
  { id: 'extreme-fantasy-captains', level: 'extreme', question: 'Find the best fantasy-cricket captain and vice-captain candidates for a match using recent form, opponent matchups, venue stats, and expected role.' },
  { id: 'extreme-two-season-recommendation', level: 'extreme', question: 'Compare two teams across the last two seasons, then recommend which side has the stronger chance at a specific venue and explain the evidence.' },
  { id: 'extreme-turning-points', level: 'extreme', question: 'Reconstruct a match’s turning points from ball-by-ball data: decisive overs, partnerships, wickets, required-rate changes, and best individual spells.' },
  { id: 'extreme-underrated-allrounders', level: 'extreme', question: 'Identify underrated all-rounders in a competition using batting impact, bowling impact, consistency, and recent match trend.' },
  { id: 'extreme-ipl-final-plan', level: 'extreme', question: 'For an IPL final at a given venue, create a tactical plan: ideal XI balance, target score, powerplay strategy, middle-over matchup plan, and death-over bowlers.' },
  { id: 'extreme-india-left-arm-pace', level: 'extreme', question: 'I’m looking for the player who scored the most runs for India in recent T20 matches but struggled against left-arm pace. Find them, prove it with match data, and recommend an adjustment.' },
];
