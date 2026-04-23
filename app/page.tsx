import Link from "next/link";

const valueItems = [
  "A short status update you can send immediately",
  "A clear, structured action list",
  "A stakeholder-ready external update",
  "A detailed internal update",
  "An optional RAID log when you need it"
] as const;

export default function LandingPage() {
  return (
    <main className="page-shell landing-shell">
      <section className="hero landing-hero">
        <Link className="eyebrow eyebrow-link" href="/">
          Updateflow
        </Link>
        <h1>Turn messy notes or AI summaries into updates you can actually send</h1>
        <p>
          Updateflow gives PMs a clean, structured status update and action list in
          seconds, so you spend less time rewriting and more time sending.
        </p>

        <div className="landing-actions">
          <Link className="primary-button landing-link" href="/app">
            Try the app
          </Link>
          <a className="secondary-link" href="#example-outputs">
            See example outputs
          </a>
        </div>

        <p className="compatibility-line">
          Works with your notes or summaries from tools like Copilot, ChatGPT, or Zoom.
        </p>

        <p className="credibility-line">
          Built for PMs who already know what good looks like, but don&apos;t want to waste
          time drafting it from scratch.
        </p>
      </section>

      <section className="card landing-section" id="example-outputs">
        <h2>After every call, you leave with a strong first draft you can use straight away</h2>
        <div className="value-list">
          {valueItems.map((item) => (
            <div key={item} className="value-item">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="card landing-section">
        <h2>Not a summary. A starting point you can use.</h2>
        <p>
          Updateflow doesn&apos;t just summarise meetings. It turns rough notes into
          structured outputs a senior PM can actually use, without starting from a blank
          page.
        </p>
      </section>

      <section className="card landing-section">
        <h2>Stay in flow</h2>
        <p>
          After every meeting, Updateflow turns rough notes into usable outputs in
          seconds, so you can focus on judgement, prioritisation, and stakeholder
          management, not rewriting updates.
        </p>
      </section>

      <section className="card landing-section">
        <h2>See the difference</h2>
        <div className="demo-grid">
          <div className="demo-card">
            <span className="demo-label">Input</span>
            <p>API integration delayed due to vendor dependency. QA team stretched. UAT planned for next week.</p>
          </div>
          <div className="demo-card">
            <span className="demo-label">Output</span>
            <p>
              API integration is delayed due to a vendor dependency, creating a risk to the
              planned UAT start next week. Focus this week is on securing vendor delivery
              and confirming UAT environment readiness.
            </p>
          </div>
        </div>
      </section>

      <section className="card landing-section landing-cta">
        <h2>Start with your next meeting</h2>
        <Link className="primary-button landing-link" href="/app">
          Open Updateflow
        </Link>
      </section>
    </main>
  );
}
