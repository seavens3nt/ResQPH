import { useQuery } from '@tanstack/react-query'
import { getApiHealth } from './api/health'
import './App.css'

const modules = [
  {
    title: 'Rescue coordination',
    description: 'Citizen requests, dispatcher assignments, and rescuer mission updates.',
  },
  {
    title: 'Flood-aware routing',
    description: 'Explainable route costs using road, flood, elevation, and risk information.',
  },
  {
    title: 'Connectivity awareness',
    description: 'Cached mission details, stale-data indicators, and queued synchronization.',
  },
]

function App() {
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: getApiHealth,
  })

  const apiState = healthQuery.isPending
    ? { label: 'Checking API', tone: 'pending' }
    : healthQuery.isError
      ? { label: 'API unavailable', tone: 'offline' }
      : { label: 'API connected', tone: 'online' }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="ResQPH home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>ResQPH</span>
        </a>
        <span className={`status status--${apiState.tone}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {apiState.label}
        </span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Academic engineering prototype</p>
        <h1 id="page-title">Flood-aware rescue coordination</h1>
        <p className="intro-copy">
          A shared operational surface for rescue requests, mission assignments,
          geographic context, and explainable route recommendations.
        </p>
      </section>

      <section className="module-grid" aria-label="Planned system modules">
        {modules.map((module, index) => (
          <article className="module-card" key={module.title}>
            <span className="module-number" aria-hidden="true">0{index + 1}</span>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
          </article>
        ))}
      </section>

      <aside className="prototype-notice">
        <strong>Scope notice</strong>
        <span>
          ResQPH does not provide official flood forecasts or guarantee that a road is safe.
        </span>
      </aside>
    </main>
  )
}

export default App
