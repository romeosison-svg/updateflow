import Link from "next/link";

const valueItems = [
  "Status update — ready to send",
  "Action list with clear ownership and priority",
  "External stakeholder update",
  "Internal team update",
  "RAID log, generated on demand"
] as const;

export default function LandingPage() {
  return (
    <main className="page-shell landing-shell">
      <section className="hero landing-hero">
        <span className="eyebrow">For project managers</span>
        <h1>Meeting notes to a full update pack — in seconds.</h1>
        <p>
          Paste rough notes from any meeting. Get a complete update pack — status
          update, action list, stakeholder brief, and RAID log — so you can focus on
          judgement, not drafting.
        </p>

        <div className="landing-actions">
          <Link className="primary-button landing-link" href="/app">
            Generate your first update
          </Link>
          <a className="secondary-link" href="#example-outputs">
            See a sample output
          </a>
        </div>

        <p className="compatibility-line">
          Plugs into your existing workflow — works with any notes, Copilot summaries,
          Zoom transcripts, or ChatGPT output.
        </p>

        <p className="credibility-line">
          Built for PMs who already know what good looks like — but have better things
          to do than draft it.
        </p>
      </section>

      <section className="card landing-section" id="example-outputs">
        <h2>After every meeting, you leave with a complete update pack — ready to review and send.</h2>
        <div className="value-list">
          {valueItems.map((item) => (
            <div key={item} className="value-item">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="card landing-section">
        <h2>Not a summary. A structured update, ready to send.</h2>
        <p>
          Rough notes go in. A structured update pack comes out — formatted the way a
          delivery-focused PM would write it, with the right sections, the right tone,
          and the right level of detail for each audience.
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
              API integration remains delayed due to a vendor dependency, placing the
              planned UAT start date at risk. Priority this week is securing confirmed
              delivery from the vendor and validating UAT environment readiness before
              the scheduled test window.
            </p>
          </div>
        </div>
      </section>

      <section className="card landing-section landing-cta">
        <h2>One meeting. One update pack. No drafting.</h2>
        <Link className="primary-button landing-link" href="/app">
          Open Updateflow
        </Link>
      </section>
    </main>
  );
}
