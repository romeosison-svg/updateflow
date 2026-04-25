import Link from "next/link";

const valueItems = [
  "Weekly update, ready to send",
  "Action list with owners and priorities",
  "Internal team update",
  "External stakeholder update",
  "RAID log, generated on demand"
] as const;

export default function LandingPage() {
  return (
    <main className="w-[min(960px,calc(100%_-_2rem))] mobile:w-[min(calc(100%_-_1rem),960px)] mx-auto pt-16 pb-20 mobile:pt-5 mobile:pb-8 grid gap-5">
      <section className="hero mb-0">
        <span className="inline-block mb-4 p-0 rounded-none bg-transparent border-0 text-accent text-[0.75rem] font-semibold tracking-[0.08em] uppercase font-sans">
          For project managers
        </span>
        <h1 className="m-0 max-w-[12ch] mobile:max-w-none text-[clamp(2.5rem,6vw,4.5rem)] leading-tight text-text font-bold">
          Your weekly update, written in seconds.
        </h1>
        <p className="mt-4 text-muted font-sans text-[1.05rem] leading-relaxed">
          Paste your notes from this week. Get a clear, send-ready weekly update
          instantly. Then add what you need — action list, stakeholder updates,
          RAID log — all from the same notes.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-6 mobile:grid mobile:grid-cols-1">
          <Link
            className="inline-flex items-center justify-center py-3 px-6 bg-gradient-to-b from-[#0f8080] to-[#0a5f63] text-white text-[0.9rem] font-medium tracking-[0.01em] border-0 rounded-input font-sans cursor-pointer transition-colors transition-shadow duration-200 no-underline shadow-[0_2px_6px_rgba(13,115,119,0.35)] hover:bg-accent-hover hover:shadow-[0_4px_12px_rgba(13,115,119,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2"
            href="/app"
          >
            Write my weekly update
          </Link>
          <a
            className="text-accent font-sans font-semibold text-[0.9rem] no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2"
            href="#example-outputs"
          >
            See a sample output
          </a>
        </div>

        <p className="mt-4 text-muted font-sans text-[0.88rem] leading-base">
          Works with rough notes, Copilot summaries, Zoom transcripts, or anything
          from the meeting.
        </p>

        <p className="mt-5 text-muted font-sans text-[0.88rem] leading-relaxed">
          Built for PMs who already know what good looks like, but have better things
          to do than draft it.
        </p>
      </section>

      <section
        className="bg-card border border-border border-t-2 border-t-[#0d7377]/20 rounded-card p-6 mobile:p-4 mobile:rounded-card grid gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200"
        id="example-outputs"
      >
        <h2 className="m-0 text-2xl font-semibold">
          One set of notes. Everything you need to communicate this week.
        </h2>
        <div className="grid grid-cols-2 mobile:grid-cols-1 gap-4">
          {valueItems.map((item) => (
            <div
              key={item}
              className="bg-card border border-border border-l-[3px] border-l-accent rounded-r-input rounded-l-none py-4 px-5 font-sans font-semibold text-base"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border border-border border-t-2 border-t-[#0d7377]/20 rounded-card p-6 mobile:p-4 mobile:rounded-card grid gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200">
        <h2 className="m-0 text-2xl font-semibold">Not a summary. A structured update, written the way a PM would write it.</h2>
        <p className="m-0 text-muted font-sans text-base leading-relaxed">
          Rough notes go in. A clear, professional weekly update comes out —
          formatted the way a delivery-focused PM would write it. Add stakeholder
          updates, actions, and RAID on demand from the same input.
        </p>
      </section>

      <section className="bg-card border border-border border-t-2 border-t-[#0d7377]/20 rounded-card p-6 mobile:p-4 mobile:rounded-card grid gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200">
        <h2 className="m-0 text-2xl font-semibold">See the difference</h2>
        <div className="grid grid-cols-2 mobile:grid-cols-1 gap-4">
          <div className="grid gap-3 p-4 border border-border rounded-card bg-card">
            <span className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-muted font-sans">
              Input
            </span>
            <p className="m-0 text-text font-sans text-base leading-relaxed">
              API integration delayed due to vendor dependency. QA team stretched. UAT planned for next week.
            </p>
          </div>
          <div className="grid gap-3 p-4 border border-border rounded-card bg-card">
            <span className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-accent font-sans">
              Output
            </span>
            <p className="m-0 text-text font-sans text-base leading-relaxed">
              API integration remains delayed due to a vendor dependency, placing the
              planned UAT start date at risk. Priority this week is securing confirmed
              delivery from the vendor and validating UAT environment readiness before
              the scheduled test window.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card border border-border border-t-2 border-t-[#0d7377]/20 rounded-card p-6 mobile:p-4 mobile:rounded-card flex flex-col items-center text-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200">
        <h2 className="m-0 text-2xl font-semibold">Paste your notes. Your weekly update, ready in seconds.</h2>
        <Link
          className="inline-flex items-center justify-center py-3 px-6 bg-gradient-to-b from-[#0f8080] to-[#0a5f63] text-white text-[0.9rem] font-medium tracking-[0.01em] border-0 rounded-input font-sans cursor-pointer transition-colors transition-shadow duration-200 no-underline shadow-[0_2px_6px_rgba(13,115,119,0.35)] hover:bg-accent-hover hover:shadow-[0_4px_12px_rgba(13,115,119,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 w-auto min-w-64"
          href="/app"
        >
          Open Updateflow
        </Link>
      </section>
    </main>
  );
}
