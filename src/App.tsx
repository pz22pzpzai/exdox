const features = [
  {
    title: "Capture in seconds",
    text: "Snap receipts on the go and keep paperwork out of inbox chains and desk drawers.",
  },
  {
    title: "Review with confidence",
    text: "Give finance teams a clear, structured view of every claim before it reaches approval.",
  },
  {
    title: "Built to connect later",
    text: "The website stays lightweight on hosting while the wider Exdox platform can keep growing through AWS services.",
  },
];

const stats = [
  { label: "Expense admin", value: "-68%" },
  { label: "Claim turnaround", value: "2.4x" },
  { label: "Team adoption", value: "94%" },
];

export function App() {
  return (
    <div className="page-shell">
      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Expense capture for busy teams</p>
            <h1>Exdox turns receipts and claims into a cleaner workflow.</h1>
            <p className="lede">
              A fast TypeScript website for your new domain, ready to deploy by
              GitHub to Spaceship over FTP while the product keeps evolving on
              AWS behind the scenes.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="mailto:hello@exdox.co.uk">
                Book a demo
              </a>
              <a className="secondary-button" href="#features">
                See how it works
              </a>
            </div>
          </div>
          <div className="hero-panel" aria-label="Exdox highlights">
            <div className="panel-card panel-card-primary">
              <span>Live status</span>
              <strong>Ready for GitHub FTP deploys</strong>
              <p>Website updates can publish automatically whenever the repo changes.</p>
            </div>
            <div className="stats-grid">
              {stats.map((stat) => (
                <article className="panel-card stat-card" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="feature-strip" id="features">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="architecture-callout">
          <p className="eyebrow">Why this setup</p>
          <h2>TypeScript on the website, AWS for the heavier platform work.</h2>
          <p>
            This keeps the hosted site simple and reliable for Spaceship FTP
            deployments, while staying aligned with the TypeScript app and
            backend you already have.
          </p>
        </section>
      </main>
    </div>
  );
}
