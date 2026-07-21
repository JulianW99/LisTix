import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const features = [
  { number: "01", title: "Inventory that stays clear", text: "Create, price and distribute every listing from one operational view." },
  { number: "02", title: "Sales without the scramble", text: "Track buyers, delivery states and transfer proofs from sale to completion." },
  { number: "03", title: "Payout intelligence", text: "Reconcile marketplace payouts, fees, margins and ROI without manual spreadsheets." },
  { number: "04", title: "Built for teams", text: "Invite operators, assign precise permissions and see who changed what." },
  { number: "05", title: "Marketplace synchronization", text: "Keep pricing and availability aligned across your connected sales channels." },
  { number: "06", title: "Tikey integration", text: "Connect Tikey to keep ticket data and operational workflows synchronized with LisTix." },
  { number: "07", title: "Operational support", text: "Reach the LisTix team directly through your dedicated Discord support channel." },
];

const marketplaces = [
  {
    name: "StubHub International",
    logo: "/marketplaces/stubhub-international.png",
    href: "https://www.stubhub.ie/",
    tone: "stubhub",
  },
  {
    name: "Ticombo",
    logo: "/marketplaces/ticombo.svg",
    href: "https://www.ticombo.com/",
    tone: "ticombo",
  },
  {
    name: "Ticket Evolution",
    logo: "/marketplaces/ticket-evolution.png",
    href: "https://www.ticketevolution.com/",
    tone: "ticket-evolution",
  },
  {
    name: "HelloTickets",
    logo: "/marketplaces/hellotickets.png",
    href: "https://www.hellotickets.com/",
    tone: "hellotickets",
  },
  {
    name: "SeatGeek",
    logo: "/marketplaces/seatgeek.png",
    href: "https://seatgeek.com/",
    tone: "seatgeek",
  },
];

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const revealItems = Array.from(page.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { root: page, rootMargin: "0px 0px -10%", threshold: 0.12 },
    );
    revealItems.forEach((item) => observer.observe(item));

    let frame = 0;
    const updateScrollMotion = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => page.style.setProperty("--landing-scroll", String(Math.min(page.scrollTop, 1800))));
    };
    page.addEventListener("scroll", updateScrollMotion, { passive: true });
    updateScrollMotion();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      page.removeEventListener("scroll", updateScrollMotion);
    };
  }, []);

  return <div className="landing-page" ref={pageRef}>
    <header className="landing-nav">
      <Link className="landing-brand" to="/" aria-label="LisTix home"><img src="/branding/listix-logo-orange.png" alt="LisTix" /></Link>
      <nav><a href="#features">Features</a><a href="#marketplaces">Marketplaces</a><a href="#security">Access</a></nav>
      <Link className="landing-login" to="/login">Login <span>↗</span></Link>
    </header>

    <main>
      <section className="landing-hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-copy" data-reveal="left">
          <p className="landing-kicker"><span />Ticket operations, finally connected</p>
          <h1>Every ticket.<br /><em>One clear system.</em></h1>
          <p className="hero-lead">LisTix brings listings, sales, delivery, payouts and your whole operations team into one focused workspace.</p>
          <div className="hero-actions"><Link className="hero-primary" to="/marketplace">See available events &amp; tickets</Link><Link className="hero-secondary" to="/login">Open your workspace →</Link></div>
          <div className="hero-trust"><span>Live inventory</span><span>Role-based access</span><span>Complete audit trail</span></div>
        </div>
        <div className="hero-visual">
          <div className="visual-glow" />
          <div className="visual-window" data-reveal="right">
            <div className="visual-bar"><span className="visual-logo"><img src="/branding/listix-icon-orange.png" alt="" /></span><span>Operations overview</span><i>Live</i></div>
            <div className="visual-stats"><article><small>Active listings</small><strong>248</strong><span>+18 this week</span></article><article><small>Gross sales</small><strong>€84.2k</strong><span>12.8% margin</span></article></div>
            <div className="visual-chart"><div className="chart-heading"><span>Revenue velocity</span><small>Last 30 days</small></div><div className="visual-chart-bars">{[38, 58, 46, 72, 63, 88, 78, 96, 84, 110, 102, 126].map((height, index) => <i key={index} style={{ height }} />)}</div></div>
            <div className="visual-row"><span className="event-dot" /><div><strong>Coldplay · Munich</strong><small>2 tickets · Block L1</small></div><b>Listed</b><em>€410</em></div>
            <div className="visual-row"><span className="event-dot purple" /><div><strong>Billie Eilish · New York</strong><small>2 tickets · Section 101</small></div><b>Sold</b><em>€770</em></div>
          </div>
        </div>
      </section>

      <section id="marketplaces" className="marketplace-section">
        <div className="marketplace-heading" data-reveal="up"><p>Connected selling channels</p><h2>Supported marketplaces</h2></div>
        <div className="marketplace-grid">
          {marketplaces.map((marketplace, index) => <a href={marketplace.href} target="_blank" rel="noreferrer" className={`marketplace-card ${marketplace.tone}`} key={marketplace.name} data-reveal="up" style={{ transitionDelay: `${index * 70}ms` }}>
            <span className="marketplace-logo-frame"><img src={marketplace.logo} alt={`${marketplace.name} logo`} loading="lazy" /></span>
            <strong>{marketplace.name}</strong><small>Connected workflow</small>
          </a>)}
        </div>
      </section>

      <section id="features" className="landing-features">
        <div className="section-intro" data-reveal="left"><p className="landing-kicker"><span />Built for ticket operators</p><h2>Less switching.<br />More control.</h2><p>Every part of the resale workflow is connected, traceable and ready for your team.</p></div>
        <div className="feature-grid">{features.map((feature, index) => <article key={feature.number} data-reveal={index % 2 ? "right" : "up"}><span>{feature.number}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
      </section>

      <section id="security" className="access-section" data-reveal="up">
        <div><p className="landing-kicker"><span />One workspace, the right access</p><h2>Move fast without losing accountability.</h2><p>Owners, administrators, managers, moderators and viewers each get exactly the access they need. Every important change is attributed and timestamped.</p><Link to="/login">Go to login →</Link></div>
        <div className="access-stack"><article><span>JM</span><div><strong>Jamie Morgan</strong><small>Administrator · Active now</small></div><b>Full access</b></article><article><span>TK</span><div><strong>Taylor Keller</strong><small>Moderator · 12 min ago</small></div><b>Operations</b></article><article><span>AR</span><div><strong>Alex Reed</strong><small>Viewer · Pending</small></div><b>Read only</b></article></div>
      </section>
    </main>

    <footer className="landing-footer"><Link className="landing-brand" to="/" aria-label="LisTix home"><img src="/branding/listix-logo-orange.png" alt="LisTix" /></Link><p>Ticket operations, built to scale.</p><Link to="/login">Login</Link></footer>
  </div>;
}
