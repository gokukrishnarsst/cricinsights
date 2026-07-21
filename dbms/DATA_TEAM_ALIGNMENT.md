# Data Team Diagram vs Live Database

> Compares the data team ER diagram (`cricket_ai_dev - cricket_ai_dev - matches.png`) with the **live** `matches` schema introspected from Aurora.
> **Live DB names win** for SQL and application code. Use this file to map design labels to production tables.

## Source of truth

| Source | Use for |
|--------|---------|
| Live introspection (`SCHEMA.md`, `DATA_DICTIONARY.json`) | Queries, migrations, sync scripts |
| Data team PNG | Conceptual layout, onboarding, discussions |
| This file | Translating between the two |

## `matches` schema — table mapping

| Data team diagram | Live DB table | Status | Notes |
|-------------------|---------------|--------|-------|
| `fixtures` | `matches.fixtures` | ✅ Match |  |
| `fixture_balls` | `matches.fixture_balls` | ✅ Match |  |
| `fixture_batting` | `matches.fixture_batting` | ✅ Match |  |
| `fixture_bowling` | `matches.fixture_bowling` | ✅ Match |  |
| `fixture_innings_runs` | `matches.fixture_inning_overs` | ⚠️ Alias (renamed in live DB) | Same role: runs/wickets per over |
| `fixture_lineups` | `matches.fixture_lineups` | ✅ Match |  |
| `fixture_odds` | `matches.fixture_odds` | ✅ Match |  |
| `fixture_runs` | `matches.fixture_runs` | ✅ Match |  |
| `fixture_scoreboards` | `matches.fixture_scoreboards` | ✅ Match |  |
| `fixtures_analysis` | — | ❌ Planned (not in live DB) | Post-match / AI analysis table — not deployed in live DB yet |
| `fixture_snapshots` | `matches.livescore_snapshots` | ⚠️ Alias (renamed in live DB) | Point-in-time live score snapshots |
| — | `matches.fixture_weather` | ➕ Live only (not on diagram) | Weather reports per fixture — in live DB, not on data team diagram |

## Structural alignment

Both diagrams use the same **hub-and-spoke** pattern:

```text
                    fixtures  (one row = one match)
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
fixture_lineups   fixture_batting      fixture_balls
fixture_bowling   fixture_runs         fixture_scoreboards
fixture_odds      fixture_inning_overs livescore_snapshots
                  fixture_weather
```

- Every child table links via `fixture_id` → `matches.fixtures.sportmonks_id`.
- `matches` is the **schema name**, not a table. The hub table is `fixtures`.

## Naming aliases (memorize these)

| Data team says | Live DB table |
|----------------|---------------|
| `fixture_innings_runs` | `matches.fixture_inning_overs` |
| `fixture_snapshots` | `matches.livescore_snapshots` |

## Not yet in production

| Data team table | Expected purpose |
|-----------------|------------------|
| `fixtures_analysis` | Post-match or AI analysis (`analysis_json` etc.) — **not created in live DB yet** |

## In production but not on data team diagram

| Live DB table | Purpose |
|---------------|---------|
| `matches.fixture_weather` | Weather report snapshots per fixture (`weather_json`) |

## Live `matches` tables (11)

- `matches.fixture_balls`
- `matches.fixture_batting`
- `matches.fixture_bowling`
- `matches.fixture_inning_overs`
- `matches.fixture_lineups`
- `matches.fixture_odds`
- `matches.fixture_runs`
- `matches.fixture_scoreboards`
- `matches.fixture_weather`
- `matches.fixtures`
- `matches.livescore_snapshots`

## Column detail

For full column lists see `SCHEMA.md` or `ER_DIAGRAM_MATCHES_FULL.mmd`. The data team PNG and the full Mermaid diagram should align on `fixtures` hub columns.
