export type InsightExchange = {
  question: string;
  answer: string;
};

export type FeatureInsight = {
  title: string;
  description: string;
  exchanges: InsightExchange[];
};

export const features: FeatureInsight[] = [
  {
    title: 'Player Comparisons',
    description:
      'Stack up batters and bowlers head-to-head with stats that matter.',
    exchanges: [
      {
        question: 'How does Kohli compare to Root in run chases since 2020?',
        answer:
          'Root averages 52.1 at 89 SR; Kohli 61.3 at 94 SR on similar required rates. Kohli converts more chases above 150.',
      },
      {
        question: 'Bumrah vs Starc in death overs in T20s since 2022?',
        answer:
          'Bumrah: 6.4 economy, 18.2 SR. Starc: 8.1 economy, 14.8 SR. Bumrah concedes fewer boundaries per over in overs 16-20.',
      },
      {
        question: 'Who finishes T20 innings better, Maxwell or Russell?',
        answer:
          'Russell strikes at 182 in the last 5 overs vs spin; Maxwell at 168 but with a lower dot-ball rate and fewer dismissals per 100 balls.',
      },
      {
        question: 'Compare Babar and Williamson in Tests since 2021.',
        answer:
          'Babar averages 47.8 with 12 hundreds; Williamson 54.2 with 8 hundreds. Williamson scores slightly faster against pace in Asia.',
      },
      {
        question: 'Gill vs Shaw as openers in ODIs for India?',
        answer:
          'Gill averages 58.4 as opener with 92 SR; Shaw 34.1 at 108 SR. Gill builds longer partnerships; Shaw scores faster in the first 10 overs.',
      },
    ],
  },
  {
    title: 'Team Analysis',
    description:
      'Understand form, strengths, and weaknesses across formats.',
    exchanges: [
      {
        question: 'Where is India strongest at home vs away right now?',
        answer:
          'India score 18% faster in death overs at home over the last 12 months, with spin taking 54% of middle-overs wickets.',
      },
      {
        question: 'What is England weakness in Tests since Bazball?',
        answer:
          'They lose 38% of wickets to spin in Asia and average 28.4 in the fourth innings when chasing above 250.',
      },
      {
        question: 'How does Australia perform chasing in day-night Tests?',
        answer:
          'Australia win 62% of D/N Tests at home but only 40% away. Their batters average 8 runs lower under lights in the second innings.',
      },
      {
        question: 'Which Pakistan lineup balance works best in T20s?',
        answer:
          'Lineups with 4 frontline bowlers and 2 spin options win 58% of games vs 44% with an extra batter, especially on slower pitches.',
      },
      {
        question: 'South Africa ODI form over the last 18 months?',
        answer:
          'They win 71% at home with Rabada and Nortje paired upfront. Away, middle-order collapses after the 30th over cost them 6 of 9 series.',
      },
    ],
  },
  {
    title: 'League Stats',
    description:
      'Dive into IPL, BBL, The Hundred, and international competitions.',
    exchanges: [
      {
        question: 'What decided IPL 2024 matches in the first six overs?',
        answer:
          'Teams batting first won 42% of games. A powerplay economy under 7.0 correlated with a 68% win rate.',
      },
      {
        question: 'Who were the most impactful BBL bowlers in 2024-25?',
        answer:
          'Abbott led with 24 wickets at 7.9 economy. Teams using him in the powerplay and death won 65% of matches.',
      },
      {
        question: 'Does batting first help in The Hundred?',
        answer:
          'Sides batting first won 52% of games overall, but 61% at venues with long boundaries square of the wicket.',
      },
      {
        question: 'Which IPL team improved most from 2023 to 2024?',
        answer:
          'Rajasthan climbed from 8th to 2nd with a death-bowling economy drop from 10.2 to 8.4 and a top-order average gain of 9 runs.',
      },
      {
        question: 'PSL vs IPL: how do run rates compare in middle overs?',
        answer:
          'PSL middle overs (7-15) average 8.1 RPO; IPL 8.6 RPO. PSL sees more spin usage (48% of overs) than IPL (41%).',
      },
    ],
  },
  {
    title: 'Ask Anything',
    description:
      'Natural-language questions answered with data-driven insights.',
    exchanges: [
      {
        question: 'Who has the best economy in T20 finals since 2019?',
        answer:
          'Rashid Khan leads qualified bowlers at 5.82 economy across 11 finals, with a strike rate of 14.2.',
      },
      {
        question: 'Which team collapses most after losing an early wicket in ODIs?',
        answer:
          'West Indies lose 4+ wickets before the 20th over in 31% of innings when falling behind in the first 10, highest among full members.',
      },
      {
        question: 'Best venue for high-scoring Test draws in the last 5 years?',
        answer:
          'The Oval and Sydney lead with 4 draws each above 600 combined runs, driven by flat decks and late-declaration patterns.',
      },
      {
        question: 'Do left-arm pacers get more LBW decisions in Tests?',
        answer:
          'Left-arm pace accounts for 22% of LBW dismissals vs 15% of overs bowled, a +7% uplift, strongest to right-hand batters.',
      },
      {
        question: 'Which batter scores fastest after a rain-reduced T20 target?',
        answer:
          'In DLS-adjusted chases under 120, Jos Buttler averages 48.2 at 156 SR, converting 68% of targets inside 15 overs.',
      },
    ],
  },
];
