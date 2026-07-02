'use client';

import { useState } from 'react';
import { InsightDemo } from '../components/insight-demo';
import { features } from '../data/insight-examples';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const apiUrl =
      process.env.NEXT_PUBLIC_WAITLIST_API_URL ?? '/api/waitlist';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { message?: string };

      if (response.ok) {
        setStatus('success');
        setMessage("You're on the list! We'll be in touch.");
        setEmail('');
        return;
      }

      setStatus('error');
      setMessage(data.message ?? 'Something went wrong. Please try again.');
    } catch {
      setStatus('error');
      setMessage('Unable to connect. Please try again.');
    }
  }

  return (
    <>
      <div
        className="sticky top-0 z-50 border-b border-white/10 bg-navy/85 backdrop-blur-md"
        role="banner"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:gap-3 sm:text-left">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-light/30 bg-blue/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-light" aria-hidden />
              Coming Soon
            </span>
            <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden />
            <p className="text-center text-sm leading-snug text-frost/70 sm:text-left">
              Join the waitlist for{' '}
              <span className="font-medium text-white/90">early access</span>
            </p>
          </div>

          {status === 'success' ? (
            <p
              className="text-center text-sm font-medium text-sky sm:text-right"
              role="status"
            >
              {message}
            </p>
          ) : (
            <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
              <form
                onSubmit={handleSubmit}
                className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={status === 'loading'}
                  aria-label="Email address"
                  className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-light focus:outline-none focus:ring-1 focus:ring-blue-light disabled:opacity-60 sm:w-52"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="shrink-0 rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-light disabled:opacity-60"
                >
                  {status === 'loading' ? 'Joining…' : 'Notify Me'}
                </button>
              </form>
              {status === 'error' && message && (
                <p className="text-center text-xs text-red-300 sm:text-right" role="status">
                  {message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-animated relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="bg-orb bg-orb-a" />
        <div className="bg-orb bg-orb-b" />
        <div className="bg-orb bg-orb-c" />
        <div className="bg-grid absolute inset-0" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16 sm:px-10">
        <header className="mb-16 text-center">
          <h1
            className="mb-3 text-5xl font-bold tracking-tight text-white sm:text-6xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            CricInsights
          </h1>
          <p className="mx-auto max-w-xl text-sm font-medium uppercase tracking-[0.2em] text-frost/75 sm:text-base">
            Cricket, Decoded.
          </p>
        </header>

        <section className="mb-16 grid gap-4 sm:grid-cols-2 sm:items-stretch">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
            >
              <h2 className="mb-2 text-lg font-semibold text-blue-light">
                {feature.title}
              </h2>
              <p className="mb-4 shrink-0 text-sm leading-relaxed text-frost/75">
                {feature.description}
              </p>
              <div className="mt-auto">
                <InsightDemo
                exchanges={feature.exchanges}
                delayMs={index * 900}
                />
              </div>
            </article>
          ))}
        </section>

        <footer className="mt-auto space-y-2 pt-16 text-center text-sm text-frost/50">
          <p className="mb-3 text-[0.4rem] font-medium uppercase tracking-[0.25em] text-sky">
            Demo insights are AI-generated examples for illustration only and
            may not reflect live or verified statistics.
          </p>
          <p>© {new Date().getFullYear()} CricInsights. All rights reserved.</p>
        </footer>
      </main>
    </div>
    </>
  );
}
