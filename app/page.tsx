import Link from "next/link";

const valueItems = [
  "Status update - ready to send",
  "Action list with clear ownership and priority",
  "External stakeholder update",
  "Internal team update",
  "RAID log, generated on demand"
] as const;

export default function LandingPage() {
  return (
    <main className="w-[min(960px,calc(100%_-_2rem))] mobile:w-[min(calc(100%_-_1rem),960px)] mx-auto pt-16 pb-20 mobile:pt-5 mobile:pb-8 grid gap-5">
      <section className="mb-0">
        <span className="inline-block mb-4 p-0 rounded-none bg-transparent border-0 text-accent text-[0.75rem] font-semibold tracking-[0.08em] uppercase">
          For project managers
        </span>
        <h1 className="m-0 max-w-[12ch] mobile:max-w-none text-[clamp(2.5rem,6vw,4.5rem)] leading-tight text-text">
          From meeting notes to a full update pack in seconds.
        </h1>
        <p className="max-w-[52rem] mt-4 text-muted font-sans text-[1.05rem] leading-relaxed">
          Paste rough notes from any meeting. Get a complete update pack (status
          update, action list, stakeholder brief, and RAID log) so you can focus on
          judgement, not drafting.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-6 mobile:grid mobile:grid-cols-1">
          <Link
            className="inline-flex items-center justify-center py-3 px-6 bg-accent text-white text-[0.9rem] font-medium tracking-[0.01em] border-0 rounded-input font-sans cursor-pointer transition-colors duration-150 no-underline hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2"
            href="/app"
          >
            Generate your first update
          </Link>
          <a
            className="text-accent font-sans font-semibold no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2"
            href="#example-outputs"
          >
            See a sample output
          </a>
        </div>

        <p className="max-w-[52rem] mt-4 text-muted font-sans text-[0.9rem] leading-base">
          Works with any notes, Copilot summaries, Zoom transcripts, or ChatGPT output.
        </p>

        <p className="max-w-[52rem] mt-5 text-muted font-sans text-[0.98rem] leading-relaxed">
          Built for PMs who already know what good looks like, but have better things
          to do than draft it.
        </p>
      </section>

      <section
        className="bg-card border border-border rounded-card p-6 mobile:p-4 mobile:rounded-card grid gap-4"
        id="example-outputs"
      >
        <h2 className="m-0 text-[1.5rem]">
          After every meeting, you leave with a complete update pack, ready to review and send.
        </h2>
        <div className="grid grid-cols-2 mobile:grid-cols-1 gap-4">
          {valueItems.map((item) => (
            <div
              key={item}
              className="bg-card border border-border border-l-[3px] border-l-accent rounded-r-input rounded-l-none py-4 px-5 font-sans font-semibold"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border border-border rounded-card p-6 mobile:p-4 mobile:rounded-card grid gap-4">
        <h2 className="m-0 text-[1.5rem]">Not a summary. A structured update, ready to send.</h2>
        <p className="m-0 text-muted font-sans leading-relaxed">
          Rough notes go in. A structured update pack comes out, formatted the way a
          delivery-focused PM would write it, with the right sections, the right tone,
          and the right level of detail for each audience.
        </p>
      </section>

      <section className="bg-card border border-border rounded-card p-6 mobile:p-4 mobile:rounded-card grid gap-4">
        <h2 className="m-0 text-[1.5rem]">See the difference</h2>
        <div className="grid grid-cols-2 mobile:grid-cols-1 gap-4">
          <div className="grid gap-3 p-4 border border-border rounded-card bg-card">
            <span className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-muted font-sans">
              Input
            </span>
            <p className="m-0 text-text font-sans leading-relaxed">
              API integration delayed due to vendor dependency. QA team stretched. UAT planned for next week.
            </p>
          </div>
          <div className="grid gap-3 p-4 border border-border rounded-card bg-card">
            <span className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-accent font-sans">
              Output
            </span>
            <p className="m-0 text-text font-sans leading-relaxed">
              API integration remains delayed due to a vendor dependency, placing the
              planned UAT start date at risk. Priority this week is securing confirmed
              delivery from the vendor and validating UAT environment readiness before
              the scheduled test window.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-card p-6 mobile:p-4 mobile:rounded-card flex flex-col items-center text-center gap-4">
        <h2 className="m-0 text-[1.5rem]">One meeting. One update pack. No drafting.</h2>
        <Link
          className="inline-flex items-center justify-center py-3 px-6 bg-accent text-white text-[0.9rem] font-medium tracking-[0.01em] border-0 rounded-input font-sans cursor-pointer transition-colors duration-150 no-underline hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7377] focus-visible:ring-offset-2 w-auto min-w-64"
          href="/app"
        >
          Open Updateflow
        </Link>
      </section>
    </main>
  );
}
