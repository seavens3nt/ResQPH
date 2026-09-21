import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

const PHRASES = [
  'Flooded Communities',
  'Every Filipino Family',
  'Disaster Response Teams',
  'Controlled-Scenario Routes',
]

export function LandingPage() {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const phrase = PHRASES[phraseIdx]

    if (!deleting && charIdx === phrase.length) {
      const t = setTimeout(() => setDeleting(true), 1800)
      return () => clearTimeout(t)
    }
    if (deleting && charIdx === 0) {
      setDeleting(false)
      setPhraseIdx(i => (i + 1) % PHRASES.length)
      return
    }
    const t = setTimeout(
      () => setCharIdx(n => n + (deleting ? -1 : 1)),
      deleting ? 32 : 72,
    )
    return () => clearTimeout(t)
  }, [charIdx, deleting, phraseIdx])

  return (
    <div className="lp-root" aria-label="ResQPH">
      {/* Background */}
      <div className="lp-bg" aria-hidden="true">
        <img
          src="/philippine-flood-rescue.jpg"
          alt=""
          className="lp-bg-img"
          loading="eager"
          fetchPriority="high"
        />
        <div className="lp-bg-overlay" />
      </div>

      <main className="lp-content">
        {/* Brand title */}
        <h1 className="lp-title lp-anim-title">
          <span className="lp-title__resq">ResQ</span>
          <span className="lp-title__p">P</span>
          <span className="lp-title__h">H</span>
        </h1>

        {/* Typewriter line */}
        <div className="lp-typewriter lp-anim-tagline">
          <span className="lp-tw-prefix">Rescue Dispatch for </span>
          <span className="lp-tw-dynamic">
            <span className="lp-tw-text">{PHRASES[phraseIdx].slice(0, charIdx)}</span>
            <span className="lp-tw-cursor" aria-hidden="true">|</span>
          </span>
        </div>

        {/* Tagline */}
        <p className="lp-tagline lp-anim-tagline2">
          Academic rescue-coordination prototype —<br />
          simulated requests, U-Belt map scenarios,<br />
          and explainable flood-aware routes.
        </p>

        {/* CTAs */}
        <div className="lp-ctas lp-anim-ctas">
          <Link to="/signup" className="lp-btn lp-btn--primary">
            Get Started <span aria-hidden="true">›</span>
          </Link>
          <Link to="/login" className="lp-btn lp-btn--secondary">
            Log In
          </Link>
        </div>
      </main>
    </div>
  )
}
