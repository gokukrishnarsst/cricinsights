import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Database,
  Flame,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Timer,
  TrendingUp,
  UserSearch,
  Users,
  Zap,
} from 'lucide-react';
import { HeroDuelStack } from '@/components/landing/HeroDuelStack';
import { LeagueMetricBars } from '@/components/landing/LeagueMetricBars';
import {
  getHeroDuelCards,
} from '@/lib/hero-players';
import { getLeagueComparisonForLanding } from '@/lib/league-data';

export const dynamic = 'force-dynamic';

const CURATED = [
  {
    title: 'Kohli intelligence',
    subtitle:
      'Strengths, gaps, phase impact & elite benchmarks from verified data.',
    prompt: "What are Virat Kohli's strengths and weaknesses in IPL?",
    icon: Swords,
    tint: 'text-rose',
    span: 'lg:col-span-2',
  },
  {
    title: 'Bumrah career',
    subtitle: 'Test, ODI, T20I & IPL — full format breakdown.',
    prompt: 'Show Jasprit Bumrah Test ODI T20I and IPL career stats',
    icon: Timer,
    tint: 'text-accent-2',
    span: '',
  },
  {
    title: 'Abhishek powerplay',
    subtitle: 'SR 171+ — the fastest among IPL run-milestone batters.',
    prompt: "What are Abhishek Sharma's strengths in powerplay IPL?",
    icon: Zap,
    tint: 'text-gold',
    span: '',
  },
  {
    title: 'IPL vs other leagues',
    subtitle: 'Boundary %, run rates, chase success — league battle from DB.',
    prompt: 'Compare IPL vs Big Bash key metrics',
    icon: TrendingUp,
    tint: 'text-emerald',
    span: '',
  },
  {
    title: 'Top run scorers',
    subtitle: 'Leaderboards and orange-cap races from live standings.',
    prompt: 'IPL top run scorers leaderboard',
    icon: Target,
    tint: 'text-accent-hi',
    span: '',
  },
  {
    title: 'Rohit vs Sanju',
    subtitle: 'MI legend vs RR captain — contrasting keeper-batter styles.',
    prompt: 'Compare Rohit Sharma and Sanju Samson IPL',
    icon: Flame,
    tint: 'text-rose',
    span: 'lg:col-span-2',
  },
];

const PRO_FEATURES = [
  {
    icon: UserSearch,
    title: 'Strengths & Gaps',
    text: 'Top strengths and development areas per player, backed by evidence from real match data.',
  },
  {
    icon: LineChart,
    title: 'Phase Breakdown',
    text: 'Powerplay, middle and death-over impact — see where a player wins or leaks runs.',
  },
  {
    icon: Users,
    title: 'Elite Benchmarking',
    text: 'Percentile rankings against same-role players in the league, not vague averages.',
  },
];

export default async function HomePage() {
  const [league, heroPair] = await Promise.all([
    getLeagueComparisonForLanding().catch(() => null),
    getHeroDuelCards().catch(() => [null, null] as const),
  ]);

  const [heroA, heroB] = heroPair;
  const heroSnapshot = heroA;
  const preview = league?.metrics.slice(0, 4) ?? [];
  const leagueAShort = league?.leagueAShort ?? 'IPL';
  const leagueBShort = league?.leagueBShort ?? 'League B';

  return (
    <div className="relative">
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div className="animate-fade-up">
        

          <h1 className="font-display text-[clamp(3.2rem,7vw,5.4rem)] font-black leading-[0.92] tracking-tight">
            CRICKET
            <br />
            <span className="gradient-text">INTELLIGENCE</span>
            <br />
            GROUNDED IN DATA
          </h1>

          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            Player intelligence, role-aware comparisons, phase analytics, and
            league benchmarks — professional-grade insight for fans, coaches, and
            scouts. Every stat traceable to the database.
          </p>

          <form action="/chat" className="group mt-9 max-w-xl">
            <div className="glass flex items-center gap-3 rounded-2xl p-2 pl-5 transition-all duration-300 focus-within:border-accent-2/50 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,.25),0_0_50px_-12px_rgba(34,211,238,.4)]">
              <Search
                size={18}
                className="shrink-0 text-ink-faint transition group-focus-within:text-accent-2"
              />
              <input
                name="q"
                placeholder="Compare Kohli and Rohit in IPL..."
                className="h-11 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-mute"
              />
              <button
                type="submit"
                className="shine flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-accent to-[#2563eb] px-5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,.6)] transition hover:-translate-y-px active:translate-y-0"
              >
                Ask AI
                <ArrowRight size={15} />
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {['Kohli vs Rohit', 'IPL leaderboard', 'Best death bowlers'].map(
              (chip) => (
                <Link
                  key={chip}
                  href={`/chat?q=${encodeURIComponent(chip)}`}
                  className="rounded-full border border-line bg-card px-4 py-1.5 text-[13px] text-ink-soft shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-accent-2/40 hover:text-ink"
                >
                  {chip}
                </Link>
              ),
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            {[
              { icon: Database, text: 'Every number from the database' },
              { icon: ShieldCheck, text: 'Role-aware analysis' },
              { icon: Users, text: 'For fans, coaches & scouts' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 text-[13px] font-medium text-ink-faint"
              >
                <span className="team-logo-3d inline-flex text-accent-2/80">
                  <Icon size={15} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        {league && preview.length > 0 && (
          <div className="animate-fade-up d-2 mx-auto hidden w-full max-w-[440px] lg:block">
            <div className="panel relative overflow-hidden p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(70% 90% at 50% 0%, rgba(34,211,238,.09), transparent 60%)',
                }}
              />
              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <div className="eyebrow">Live League Pulse</div>
                  <span className="rounded-full border border-emerald/30 bg-emerald/[0.08] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald">
                    From the DB
                  </span>
                </div>

                <LeagueMetricBars
                  metrics={preview}
                  leagueAShort={leagueAShort}
                  leagueBShort={leagueBShort}
                />

                {heroSnapshot && (
                  <div
                    className="card-3d-hover animate-float mt-6 rounded-xl border border-line bg-surface-2/60 p-4"
                    style={{ perspective: '1200px' }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                        Player Snapshot
                      </span>
                      <Link
                        href="/chat?q=Virat%20Kohli%20IPL%20stats"
                        className="flex items-center gap-1 text-[12px] font-semibold text-accent-2 transition hover:text-accent-hi"
                      >
                        Full intelligence
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroSnapshot.player.avatarUrl}
                        alt={heroSnapshot.player.fullname}
                        className="team-logo-3d h-11 w-11 rounded-full border border-line object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-[15px] font-bold tracking-wide text-ink">
                          {heroSnapshot.player.fullname.toUpperCase()}
                        </div>
                        <div className="text-[12px] text-ink-soft">
                          {heroSnapshot.player.team ??
                            heroSnapshot.player.league ??
                            'IPL'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl font-black text-gold">
                          {heroSnapshot.overall}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                          Overall
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {[
                        {
                          label: 'Matches',
                          value: heroSnapshot.aggregates.matches,
                        },
                        { label: 'Runs', value: heroSnapshot.aggregates.runs },
                        {
                          label: 'SR',
                          value: Math.round(heroSnapshot.aggregates.strikeRate),
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-lg border border-line bg-card px-2 py-2"
                        >
                          <div className="font-mono text-[15px] font-bold tabular-nums text-ink">
                            {s.value}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="eyebrow mb-2">Pre-Generated Insights</div>
            <h2 className="font-display text-4xl font-black">START EXPLORING</h2>
          </div>
          <Link
            href="/chat"
            className="group flex items-center gap-1 text-sm font-semibold text-accent-2 transition hover:text-accent-hi"
          >
            Open chat
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CURATED.map((item, i) => (
            <Link
              key={item.title}
              href={`/chat?q=${encodeURIComponent(item.prompt)}`}
              className={`panel panel-hover card-3d-hover animate-fade-up d-${(i % 6) + 1} group flex flex-col justify-between p-6 ${item.span}`}
            >
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2 transition-colors group-hover:border-accent-2/40">
                  <item.icon size={19} className={item.tint} />
                </div>
                <h3 className="font-display text-xl font-bold tracking-wide">
                  {item.title.toUpperCase()}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {item.subtitle}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1 text-[13px] font-semibold text-ink-faint transition-colors group-hover:text-accent-2">
                Ask this
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {league && preview.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="panel relative overflow-hidden p-8 md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 100% at 0% 50%, rgba(59,130,246,.1), transparent 60%), radial-gradient(60% 100% at 100% 50%, rgba(34,211,238,.08), transparent 60%)',
              }}
            />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
              <div className="animate-fade-up">
                <div className="eyebrow mb-2 !text-gold">League Battle</div>
                <h2 className="font-display text-5xl font-black leading-[0.95]">
                  {leagueAShort}
                  <span className="mx-3 text-2xl text-ink-mute">vs</span>
                  <span className="gradient-text">{leagueBShort}</span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
                  {league.summary}
                </p>
                <Link
                  href="/compare/leagues"
                  className="shine mt-7 inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.08] px-5 py-3 text-sm font-bold text-gold transition-all duration-200 hover:-translate-y-px hover:bg-gold/[0.14] active:translate-y-0"
                >
                  Full comparison
                  <ArrowRight size={15} />
                </Link>
              </div>

              <div className="animate-fade-up d-2">
                <LeagueMetricBars
                  metrics={preview}
                  leagueAShort={leagueAShort}
                  leagueBShort={leagueBShort}
                  animateDelivery
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-8 animate-fade-up">
          <div className="eyebrow mb-2 !text-emerald">Professional Tools</div>
          <h2 className="font-display text-4xl font-black">
            FOR COACHES <span className="gradient-text">&amp; SCOUTS</span>
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Player intelligence that answers the questions that matter: how good
            is this player, where do they win, and what are they lacking — with
            evidence, not opinions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PRO_FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`panel animate-fade-up d-${i + 1} p-6`}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2">
                <f.icon size={19} className="text-emerald" />
              </div>
              <h3 className="font-display text-xl font-bold tracking-wide">
                {f.title.toUpperCase()}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {f.text}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/chat?q=player%20intelligence"
          className="shine animate-fade-up d-4 mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald/40 bg-emerald/[0.08] px-5 py-3 text-sm font-bold text-emerald transition-all duration-200 hover:-translate-y-px hover:bg-emerald/[0.14] active:translate-y-0"
        >
          <UserSearch size={16} />
          Open Player Intelligence
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="panel relative overflow-hidden p-8 md:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 100% at 100% 0%, rgba(212,175,55,.08), transparent 60%)',
            }}
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="animate-fade-up">
              <div className="eyebrow mb-2 !text-gold">
                And When It&apos;s Worth Sharing
              </div>
              <h2 className="font-display text-[clamp(2.2rem,4.5vw,3.2rem)] font-black leading-[0.95]">
                EXPORT ANY INSIGHT
                <br />
                <span className="gold-text">AS A CARD.</span>
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
                Every comparison and player profile can be exported as a
                print-quality trading card — same trusted numbers, timeline-ready
                visuals. The data does the talking; the card makes it travel.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/chat"
                  className="shine flex items-center gap-2 rounded-xl bg-gradient-to-b from-accent to-[#2563eb] px-6 py-3 text-[15px] font-bold text-white shadow-[0_0_0_1px_rgba(59,130,246,.4),0_14px_36px_-10px_rgba(59,130,246,.7)] transition-all duration-200 hover:-translate-y-px active:translate-y-0"
                >
                  <Sparkles size={16} />
                  Ask the AI
                </Link>
                <Link
                  href="/compare/players"
                  className="flex items-center gap-2 rounded-xl border border-line bg-card px-6 py-3 text-[15px] font-semibold text-ink-soft shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-accent-2/40 hover:text-ink active:translate-y-0"
                >
                  <Swords size={16} />
                  Start a duel
                </Link>
              </div>
            </div>

            {heroA && heroB && <HeroDuelStack heroA={heroA} heroB={heroB} />}
          </div>
        </div>
      </section>
    </div>
  );
}
