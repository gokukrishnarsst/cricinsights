/**
 * Machine-readable UI schema embedded in the agent system prompt.
 * Keep in sync with src/types/generative-ui.ts
 */
export const UI_SCHEMA_FOR_PROMPT = `
## Generative UI — return visual components in the "ui" array

Always prefer 1–3 visual components over long prose. Final answer MUST be one JSON object:
{ "text": "short analyst summary", "ui": [ ...components ] }

### Component catalog

1. player_card — FIFA-style player card
   { "type": "player_card", "card": <RatedPlayerCard from get_player_profile.profile or get_player_stats.card> }

2. comparison_card — head-to-head (REQUIRED for "X vs Y")
   { "type": "comparison_card", "comparison": <full compare_players tool result>, "insights": ["optional extra bullets"] }

3. league_comparison — IPL vs other league metrics
   { "type": "league_comparison", "data": <compare_leagues tool result> }

4. stats_table — batting/bowling numbers
   { "type": "stats_table", "title": "IPL Batting", "headers": ["Metric","Value"], "rows": [["Runs",947],["SR",138.7]] }

5. bar_comparison — ranked players or metrics
   { "type": "bar_comparison", "title": "Top ratings", "metric": "Overall", "values": [{"label":"Kohli","value":61}] }

6. radar_chart — multi-stat shape
   { "type": "radar_chart", "title": "Stat profile", "data": [{"label":"BAT","value":40},{"label":"PWR","value":61}] }

7. insight_card — analyst callout (limitations, caveats, key takeaway)
   { "type": "insight_card", "title": "Data note", "content": "...", "severity": "info"|"warning"|"success" }

8. venue_insights — ground analysis
   { "type": "venue_insights", "venue": {...}, "summary": {...}, "topBatters": [...], "topBowlers": [...] }

9. phase_breakdown — powerplay/middle/death splits
   { "type": "phase_breakdown", "title": "Phase splits", "phases": [{"phase":"powerplay","runs":265,"balls":178,"strikeRate":148.9}] }

10. data_scope — transparency banner when tools return limitations
    { "type": "data_scope", "scope": "Indian Premier League (silver)", "limitations": ["..."], "source": "database" }

11. strengths_gaps — scouting report
    { "type": "strengths_gaps", "intelligence": <get_player_intelligence result> }

12. career_stats — international career
    { "type": "career_stats", "career": <get_player_career result> }

### When to use which component
| User intent | Tools | UI components |
|-------------|-------|---------------|
| Compare two players | search_players → compare_players | comparison_card + optional insight_card |
| Player stats / profile | search_players → get_player_stats | player_card + stats_table or phase_breakdown |
| League style | compare_leagues | league_comparison + data_scope if fallback |
| Venue analysis | get_venue_insights | venue_insights |
| Rankings / top N | get_top_performers | bar_comparison |
| Scouting | get_player_intelligence | strengths_gaps + player_card |

NEVER embed empty component shells — omit "comparison" key if missing; hydration will attach tool payloads.
Respond ONLY with valid JSON (no markdown fences) for the final message.
`.trim();
