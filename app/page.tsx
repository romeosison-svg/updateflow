import Link from "next/link";

const heroActions = [
  {
    number: "1",
    owner: "Sarah",
    task: "Issue cutover comms to distribution list",
    due: "Sat 09:00"
  },
  {
    number: "2",
    owner: "Tom",
    task: "Confirm rollback owner is on-call through Sunday",
    due: "Fri EOD"
  },
  {
    number: "3",
    owner: "Priya",
    task: "Close out reporting defect ticket as deferred",
    due: "Mon"
  },
  {
    number: "4",
    owner: "James",
    task: "Schedule post go-live hypercare standup",
    due: "Mon AM"
  }
] as const;

const kickerColumns = [
  {
    kicker: "What you paste",
    title: "Anything from the meeting.",
    body: "Rough bullets, Copilot or Zoom summaries, Teams notes, your own scribbles. We don't mind the mess."
  },
  {
    kicker: "What you get",
    title: "Four documents, one input.",
    body: "Weekly update, action list, internal version, external version. All from the same notes."
  },
  {
    kicker: "Who it's for",
    title: "PMs who know what good looks like.",
    body: "Built for delivery PMs, programme managers, consultants. Not a summary. The update — written the way you'd write it."
  }
] as const;

export default function LandingPage() {
  return (
    <main className="bg-bg-paper text-text-ink">
      <header className="border-b border-ink px-14 py-3 mobile:px-4">
        <div className="flex items-center justify-between gap-4 mobile:flex-wrap mobile:gap-3">
          <div className="font-serif text-[22px] italic text-text-ink">The Updateflow</div>
          <div className="font-mono text-mono-caption uppercase tracking-[0.1em] text-text-muted mobile:order-3 mobile:w-full mobile:text-center">
            Vol. 1 · Issue 12 · For project managers
          </div>
          <div className="flex items-center gap-4 mobile:gap-2">
            <a className="font-sans text-[13px] text-text-ink-soft" href="#hero-document">
              Examples
            </a>
            <Link className="font-sans text-[13px] text-text-ink-soft" href="/app">
              Sign in
            </Link>
            <Link
              className="rounded bg-bg-accent px-[14px] py-[8px] font-sans text-[13px] font-medium text-text-accent-ink"
              href="/app"
            >
              Open →
            </Link>
          </div>
        </div>
      </header>

      <section className="px-14 pt-12 text-center mobile:px-4">
        <p className="font-mono text-mono-caption uppercase tracking-[0.16em] text-text-muted">
          ─── Friday afternoon, every week ───
        </p>
        <h1 className="mx-auto mt-6 max-w-[1100px] font-serif text-hero-brief font-normal leading-[0.92] tracking-[-0.02em] text-text-ink">
          <span className="block">The weekly update,</span>
          <span className="block italic">finally written.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[640px] font-sans text-[18px] leading-[1.55] text-text-ink-soft">
          Paste this week&apos;s notes. Get a send-ready update — plus action list,
          internal version, and external version — in about twenty seconds.
        </p>
        <div className="mt-8 flex justify-center gap-3 mobile:flex-col">
          <Link
            className="rounded bg-bg-accent px-[22px] py-[16px] font-sans text-[15px] font-medium text-text-accent-ink mobile:w-full"
            href="/app"
          >
            Write this week&apos;s update →
          </Link>
          <a
            className="rounded border border-border-line bg-transparent px-[22px] py-[14px] font-sans text-[14px] text-text-ink-soft mobile:w-full"
            href="#hero-document"
          >
            See an example
          </a>
        </div>
      </section>

      <section
        className="mx-auto mt-16 max-w-[1100px] rounded-sm border border-ink bg-bg-surface mobile:mx-4"
        id="hero-document"
      >
        <div className="flex items-center justify-between border-b border-border-line bg-bg-paper px-7 py-3 mobile:flex-col mobile:items-start mobile:gap-1 mobile:px-5">
          <span className="font-mono text-mono-caption uppercase tracking-[0.1em] text-text-muted">
            This week&apos;s edition · 28 Apr – 02 May
          </span>
          <span className="font-mono text-mono-caption text-text-muted">
            generated in 0:21
          </span>
        </div>
        <div className="grid grid-cols-[1.1fr_1fr] gap-8 p-8 mobile:grid-cols-1 mobile:gap-6 mobile:p-5">
          <div>
            <p className="mb-4 font-mono text-mono-caption uppercase tracking-[0.06em] text-text-muted">
              Weekly update
            </p>
            <p className="font-serif text-body-serif leading-[1.55] text-text-ink">
              Cutover preparation completed this week ahead of the planned Saturday
              window. Vendor environment sign-off, which had slipped earlier in the
              week, was secured on Wednesday and UAT entry criteria were agreed with QA,
              with one low-severity reporting defect deferred to post go-live. UAT
              commenced Thursday with the first round of test cases passing; cutover
              communications are drafted and ready to issue.
            </p>
          </div>
          <div className="border-l border-border-line pl-8 mobile:border-l-0 mobile:border-t mobile:border-border-line mobile:pl-0 mobile:pt-6">
            <p className="mb-4 font-mono text-mono-caption uppercase tracking-[0.06em] text-text-muted">
              Action list
            </p>
            <div className="grid gap-0">
              {heroActions.map((action) => (
                <div
                  key={action.number}
                  className="grid grid-cols-[20px_1fr_auto] items-start gap-3 border-b border-border-line-soft py-[10px] mobile:grid-cols-[18px_1fr_auto]"
                >
                  <span className="font-mono text-[12px] text-text-muted">
                    {action.number}
                  </span>
                  <p className="font-sans text-[14px] text-text-ink-soft mobile:text-[13px]">
                    <span className="font-semibold text-text-ink">{action.owner}</span>
                    {" · "}
                    {action.task}
                  </p>
                  <span className="text-right font-mono text-mono-caption text-text-muted">
                    {action.due}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 border-t border-border-line px-14 py-16 mobile:px-4 mobile:py-7">
        <div className="grid grid-cols-3 gap-10 mobile:flex mobile:flex-col">
          {kickerColumns.map((column, index) => (
            <article
              key={column.kicker}
              className="mobile:border-b mobile:border-border-line-soft mobile:py-[22px]"
            >
              <p className="font-mono text-mono-caption uppercase tracking-[0.08em] text-text-accent">
                {column.kicker}
              </p>
              <h3 className="my-[10px] font-serif text-kicker-h3 font-normal leading-[1.1] tracking-[-0.01em] text-text-ink">
                {column.title}
              </h3>
              <p className="font-sans text-[15px] leading-[1.6] text-text-ink-soft">
                {column.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-ink px-14 py-[100px] mobile:px-4 mobile:py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="font-serif text-display-72 font-normal leading-[1] text-text-ink mobile:text-display-44">
            Your turn.
          </h2>
          <p className="mx-auto max-w-[480px] font-sans text-[18px] leading-[1.55] text-text-ink-soft">
            Paste this week&apos;s notes. Get a clean weekly update and the supporting
            documents that usually take the rest of the afternoon.
          </p>
          <Link
            className="rounded bg-bg-accent px-[22px] py-[16px] font-sans text-[15px] font-medium text-text-accent-ink mobile:w-full"
            href="/app"
          >
            Write this week&apos;s update →
          </Link>
        </div>
      </section>

      <footer className="border-t border-border-line px-14 py-8 mobile:px-4 mobile:py-6">
        <div className="flex items-center justify-between gap-4 font-sans text-[12px] text-text-muted mobile:flex-col mobile:items-start">
          <span>© 2026 Updateflow.ai · Built for project managers</span>
          <span>Privacy · Terms · Status: ◯ all systems normal</span>
        </div>
      </footer>
    </main>
  );
}
