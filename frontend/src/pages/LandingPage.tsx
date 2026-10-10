import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Siren,
  Crosshair,
  GitFork,
  WifiSlash,
  ArrowUpRight,
  MapPin,
  ShieldCheck,
  CheckCircle,
  UsersThree,
  NavigationArrow,
} from '@phosphor-icons/react'
import './LandingPage.css'

export function LandingPage() {
  const [featuresVisible, setFeaturesVisible] = useState(false)
  const featuresRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturesVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (featuresRef.current) observer.observe(featuresRef.current)
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="al-page" aria-label="ResQPH Landing Page">
      {/* ─── Hero Wrapper with Flood Rescue Background ──────────── */}
      <div className="al-hero-shell">
        {/* Flood Rescue Hero Backdrop with lowered opacity */}
        <div className="al-hero-bg" aria-hidden="true">
          <img
            src="/philippine-flood-rescue.jpg"
            alt=""
            className="al-hero-bg-img"
          />
          <div className="al-hero-overlay" />
          <div className="al-hero-glow-blue" />
          <div className="al-hero-glow-red" />
        </div>

        {/* ─── Navbar ────────────────────────────────────────────── */}
        <header className="al-header">
          <div className="al-container al-header__inner">
            <Link to="/" className="al-brand" aria-label="ResQPH Home">
              <img
                src="/logo.png"
                alt="ResQPH Logo"
                className="al-brand__logo"
                width="34"
                height="34"
              />
              <span className="al-brand__name">
                ResQ<span className="al-brand__p">P</span><span className="al-brand__h">H</span>
              </span>
            </Link>

            <nav className="al-nav" aria-label="Primary Navigation">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="al-nav__link is-active"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => scrollTo('features')}
                className="al-nav__link"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollTo('features')}
                className="al-nav__link"
              >
                Routing
              </button>
            </nav>

            <div className="al-nav-actions">
              <Link to="/login" className="al-nav-login">
                Log In
              </Link>
              <Link to="/login" className="al-btn al-btn--primary">
                Get Started
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Hero Main Content ─────────────────────────────────── */}
        <section className="al-container al-hero-content">
          {/* Eyebrow Pill */}
          <div className="al-hero-pill">
            <span className="al-hero-pill__pulse" />
            <span>Flood Rescue Coordination · Sampaloc, Manila</span>
          </div>

          {/* Big Headline */}
          <h1 className="al-hero-title">
            Save Time & Lives
            <br />
            <span className="al-hero-title__sub">
              On Every Mission{' '}
              <span className="al-hero-title__icons">
                <NavigationArrow size={34} weight="fill" className="al-hero-icon al-hero-icon--nav" />
              </span>
            </span>
          </h1>

          <p className="al-hero-desc">
            ResQPH brings real-time SOS requests, rescuer tracking, and explainable flood-aware routes
            together for citizens and rescue teams across Sampaloc, Manila.
          </p>

          <div className="al-hero-cta">
            <Link to="/login" className="al-btn al-btn--hero">
              <span>Get Started</span>
              <span className="al-btn__circle-arrow">
                <ArrowUpRight size={16} weight="bold" />
              </span>
            </Link>
          </div>

          {/* ─── Floating Showcase Deck (3-Card Layout) ──────────── */}
          <div className="al-showcase-deck">
            {/* Left Card: Active Rescuers Stats */}
            <div className="al-deck-card al-deck-card--left">
              <div className="al-stat-card">
                <div className="al-stat-card__top">
                  <div>
                    <span className="al-stat-card__label">Active Rescuers</span>
                    <span className="al-stat-card__time">Sampaloc Live Pilot</span>
                  </div>
                  <span className="al-stat-badge">● Ready</span>
                </div>

                <div className="al-stat-card__metric">
                  <span className="al-stat-card__num">12 Teams</span>
                  <span className="al-stat-card__sublabel">Disaster response ready</span>
                </div>

                <div className="al-stat-card__footer">
                  <div className="al-stat-dot-wrap">
                    <span className="al-stat-dot" />
                    <span>Deployment: Alert Level 2</span>
                  </div>
                  <span className="al-mini-arrow">
                    <ArrowUpRight size={14} weight="bold" />
                  </span>
                </div>
              </div>

              {/* Floating notification snippets */}
              <div className="al-snippet-pill al-snippet-pill--1">
                <span className="al-snippet-icon al-snippet-icon--red">SOS</span>
                <span className="al-snippet-text">Gastambide St. · 4 citizens reported</span>
              </div>
              <div className="al-snippet-pill al-snippet-pill--2">
                <span className="al-snippet-icon al-snippet-icon--blue">MAP</span>
                <span className="al-snippet-text">Alpha Team En Route via Loyola</span>
              </div>
            </div>

            {/* Center Card: Main Scanner & Rescue Operations Card */}
            <div className="al-center-card">
              <div className="al-center-card__top-badge">
                <span>ResQPH A* Flood Routing</span>
              </div>

              <h3 className="al-center-card__title">
                Scanning <strong>180+</strong> Roads<br />In Real-Time
              </h3>

              <div className="al-center-card__gauge-row">
                <div className="al-gauge-circle">
                  <span className="al-gauge-num">96%</span>
                </div>
                <p className="al-gauge-text">
                  Safe passage probability for evacuation routes across Sampaloc, Manila.
                </p>
              </div>

              {/* Flood Rescue Action Media */}
              <div className="al-center-card__media">
                <img
                  src="/philippine-flood-rescue.jpg"
                  alt="Philippine flood rescue team in flood water"
                  className="al-center-card__img"
                />
                <div className="al-center-card__media-grad" />
                <div className="al-center-card__floating-proof">
                  <div className="al-avatar-stack">
                    <span className="al-avatar al-avatar--1">R1</span>
                    <span className="al-avatar al-avatar--2">R2</span>
                    <span className="al-avatar al-avatar--3">R3</span>
                  </div>
                  <div className="al-proof-text">
                    <strong>100% Deterministic Route</strong>
                    <span>Impassable flood edges excluded</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Clean Route Path Card */}
            <div className="al-deck-card al-deck-card--right">
              <div className="al-glass-card">
                <div className="al-glass-card__badge">
                  <CheckCircle size={15} weight="fill" />
                  <span>Safest Route Found</span>
                </div>

                <div className="al-glass-card__content">
                  <span className="al-glass-label">Optimal Mission Path</span>
                  <div className="al-glass-destination">
                    España Blvd → UST Evac
                  </div>
                  <div className="al-glass-eta">
                    ETA: <strong>8 mins</strong>
                    <span className="al-glass-tag">Flood-Free</span>
                  </div>
                  <p className="al-glass-note">
                    Avoided 0.6m flood depth on direct corridor using A* terrain rules in Sampaloc.
                  </p>
                </div>

                <div className="al-glass-card__footer">
                  <Link to="/login" className="al-glass-cta" aria-label="Open optimal route">
                    <ArrowUpRight size={18} weight="bold" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Capabilities Section ─────────────────────────────────── */}
      <section id="features" ref={featuresRef} className="al-features-section">
        <div className="al-container">
          <div className="al-features-header">
            <div className="al-features-pill">
              <span>Core Capabilities</span>
            </div>
            <h2 className="al-features-title">
              Flood-Aware Features, Rescue<br />
              Effortless With ResQPH
            </h2>
            <p className="al-features-subtitle">
              Enjoy seamless citizen reporting, explainable routing predictions,
              and coordinated field missions powered by ResQPH in Sampaloc, Manila.
            </p>
          </div>

          {/* 8 Cards Grid */}
          <div className={`al-features-grid ${featuresVisible ? 'is-visible' : ''}`}>
            {/* Card 1 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <Siren size={24} weight="fill" />
              </div>
              <h3 className="al-card-title">Real-Time Citizen SOS</h3>
              <p className="al-card-desc">
                Citizens submit GPS-pinned emergency requests with immediate validation
                and live status acknowledgement.
              </p>
            </div>

            {/* Card 2 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <GitFork size={24} weight="bold" />
              </div>
              <h3 className="al-card-title">Flood-Aware Routing</h3>
              <p className="al-card-desc">
                Deterministic A* pathfinding over Sampaloc road network that penalizes
                water-depth obstacles.
              </p>
            </div>

            {/* Card 3 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <Crosshair size={24} weight="bold" />
              </div>
              <h3 className="al-card-title">Live Rescue Tracking</h3>
              <p className="al-card-desc">
                Rescuers track active assignments in real time and monitor live mission progression
                from dispatch to safe completion.
              </p>
            </div>

            {/* Card 4 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <WifiSlash size={24} weight="bold" />
              </div>
              <h3 className="al-card-title">Offline Mission Access</h3>
              <p className="al-card-desc">
                Rescuers can cache mission plans and queue vital status updates
                during severe mobile signal blackouts.
              </p>
            </div>

            {/* Card 5 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <MapPin size={24} weight="fill" />
              </div>
              <h3 className="al-card-title">Sampaloc Focused Pilot</h3>
              <p className="al-card-desc">
                Custom road network extract tailored to historical flood scenarios
                across Sampaloc, Manila.
              </p>
            </div>

            {/* Card 6 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <ShieldCheck size={24} weight="bold" />
              </div>
              <h3 className="al-card-title">Explainable Route Cost</h3>
              <p className="al-card-desc">
                Transparent risk factor explanations for every computed path,
                ensuring responders understand route choices.
              </p>
            </div>

            {/* Card 7 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <UsersThree size={24} weight="bold" />
              </div>
              <h3 className="al-card-title">Two Dedicated Roles</h3>
              <p className="al-card-desc">
                Tailored workflows built specifically for Citizens requesting urgent flood help
                and Field Rescuers conducting operations.
              </p>
            </div>

            {/* Card 8 */}
            <div className="al-feature-card">
              <div className="al-card-icon-box">
                <CheckCircle size={24} weight="bold" />
              </div>
              <h3 className="al-card-title">Atomic State & Audit</h3>
              <p className="al-card-desc">
                Conflict-free mission updates with historical records preserved
                for rigorous emergency analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="al-footer">
        <div className="al-container al-footer__inner">
          <div className="al-brand" aria-label="ResQPH">
            <img
              src="/logo.png"
              alt="ResQPH Logo"
              className="al-brand__logo al-brand__logo--footer"
              width="30"
              height="30"
            />
            <span className="al-brand__name">
              ResQ<span className="al-brand__p">P</span><span className="al-brand__h">H</span>
            </span>
          </div>
          <p className="al-footer__tagline">
            Flood-aware emergency rescue coordination and routing system for Philippine communities.
          </p>
          <div className="al-footer__copy">
            © 2026 ResQPH · COM243 CCSFEN1L · Sampaloc, Manila, Philippines
          </div>
        </div>
      </footer>
    </div>
  )
}
