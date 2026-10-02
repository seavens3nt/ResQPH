import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import { useMissions } from '../../../features/missions/MissionContext'
import type { SeverityLevel } from '../../../features/missions/types'
import { useMyRescueRequests } from '../../../features/requests/hooks'
import { InteractiveFloodMap } from '../../../features/map/InteractiveFloodMap'
import {
  EmergencyHotlinesModal,
  EmergencyPreparednessGuide,
  Section,
  LocalizedForecastWidget,
} from './shared'
import type { NavSection } from './navTypes'
// API-backed citizen request flow (Issue #17)
import { RequestForm } from './citizen/RequestForm'
import { RequestStatusView } from './citizen/RequestStatusView'
import { PrototypeNotice } from './citizen/PrototypeNotice'
import type { FloodLevel } from '../../../features/requests/types'

const SOS_TRIAGE_TO_FLOOD_LEVEL: Record<SeverityLevel, FloodLevel> = {
  low: 'low',
  'low-moderate': 'low',
  moderate: 'moderate',
  high: 'high',
  severe: 'high',
}

function SampleRescueTrackingPreview() {
  const steps = [
    { label: 'Received', state: 'is-complete' },
    { label: 'Assigned', state: 'is-complete' },
    { label: 'En route', state: 'is-current' },
    { label: 'Arrived', state: '' },
  ]

  return (
    <section className="sample-rescue-tracking" aria-label="Sample rescue tracking preview" data-testid="sample-rescue-tracking">
      <div className="sample-rescue-tracking__header">
        <div>
          <p className="sample-rescue-tracking__eyebrow">Sample scenario · not a live request</p>
          <h3>Rescue tracking preview</h3>
        </div>
        <span className="sample-rescue-tracking__id">SAMPLE-001</span>
      </div>
      <p className="sample-rescue-tracking__description">
        Example progress only. This preview is not connected to a submitted request or dispatch.
      </p>
      <div className="sample-rescue-tracking__steps" aria-label="Sample request progress">
        {steps.map((step, index) => (
          <div className={`sample-rescue-tracking__step ${step.state}`} key={step.label}>
            <span className="sample-rescue-tracking__step-index" aria-hidden="true">{index + 1}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <div className="sample-rescue-tracking__details">
        <div className="sample-rescue-tracking__detail">
          <span>Location</span>
          <strong>Sanitized U-Belt pilot location</strong>
        </div>
        <div className="sample-rescue-tracking__detail">
          <span>Reported water level</span>
          <strong>Waist-deep · sample value</strong>
        </div>
        <div className="sample-rescue-tracking__detail">
          <span>Assigned team</span>
          <strong>Rescue Team Alpha · sample only</strong>
        </div>
        <div className="sample-rescue-tracking__detail">
          <span>Team leader contact · sample</span>
          <strong>09XX XXX XXXX</strong>
        </div>
      </div>
      <p className="sample-rescue-tracking__note">No ETA shown; this is illustrative tracking data only.</p>
    </section>
  )
}

export function CitizenView({
  navSection = 'overview',
  onNavigateTab,
}: {
  navSection?: NavSection
  onNavigateTab?: (section: NavSection) => void
}) {
  const {
    activeCitizenRequest,
    missions,
    teams,
    cancelRescueRequest,
  } = useMissions()

  const [showSosTriage, setShowSosTriage] = useState(false)
  const [showHotlinesModal, setShowHotlinesModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const [stepA_severity, setStepA_severity] = useState<SeverityLevel>('moderate')

  // API-backed request state (Issue #17)
  // Keep only the selected ID locally. The request list query recovers persisted
  // requests after refresh/remount, and the detail query remains authoritative.
  const [selectedApiRequestId, setSelectedApiRequestId] = useState<string | null>(null)
  const [showApiRequestForm, setShowApiRequestForm] = useState(false)
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null)
  const [sosReportedFloodLevel, setSosReportedFloodLevel] = useState<FloodLevel>('unknown')

  const {
    data: requestList,
    isLoading: isRequestListLoading,
    isError: isRequestListError,
    refetch: refetchRequestList,
  } = useMyRescueRequests(navSection === 'inquiries')

  const recoveredRequest =
    requestList?.items.find((request) => !['completed', 'cancelled'].includes(request.status)) ??
    requestList?.items[0]
  const apiRequestId = selectedApiRequestId ?? recoveredRequest?.id ?? null
  // Kept as an explicit migration guard until the old MissionContext citizen
  // panel is removed with the remaining prototype dashboard cleanup.
  const showLegacyMockTracking: boolean = false

  const activeReq = activeCitizenRequest
  const activeCitizenTeam = activeReq?.assignedTeamId
    ? teams.find((team) => team.id === activeReq.assignedTeamId)
    : undefined
  const assignedLeaderPhone = activeCitizenTeam?.contactPhone ?? undefined
  const assignedLeaderTel = assignedLeaderPhone && /^[+\d\s()-]+$/.test(assignedLeaderPhone) && assignedLeaderPhone.replace(/\D/g, '').length >= 10
    ? `tel:${assignedLeaderPhone.replace(/[^+\d]/g, '')}`
    : undefined
  const activeMission = missions.find((m) => m.requestId === activeReq?.id) || missions[0]
  const currentRouteExplanation =
    activeMission?.routeDelayExplanation ||
    'The controlled scenario marks the direct shortcut impassable. The team is using the recommended corridor.'
  const currentEtaMinutes = activeMission?.etaMinutes || 6

  function handleSosDispatch() {
    setShowSosTriage(true)
  }

  function continueFromFloodTriage() {
    setSosReportedFloodLevel(SOS_TRIAGE_TO_FLOOD_LEVEL[stepA_severity])
    setCreatedRequestId(null)
    setShowSosTriage(false)
    setShowApiRequestForm(true)
  }

  return (
    <div className="resq-citizen-workspace citizen-view">
      <div className="citizen-flow-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {navSection === 'overview' && (
          <div className="overview-container">

            <LocalizedForecastWidget />
            {/* Location & GPS Status Bar */}
            <div className="modern-clean-card" style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                  <Icon name="navigation" size={18} />
                </span>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Sanitized address, Jhocson St., U-Belt pilot
                  </h3>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    14.6042 N · 120.9946 E
                  </span>
                </div>
              </div>

              <div style={{ padding: '3px 9px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#86efac', textTransform: 'uppercase' }}>Demo Location</span>
              </div>
            </div>

            {/* Main SOS Trigger Hero */}
            <div className="modern-clean-card" style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.25rem' }}>
              <div className="glowing-emergency-pill">
                <span className="glowing-red-dot-live" />
                <span>Prototype Emergency Channel</span>
              </div>

              <button
                type="button"
                className="sos-button-neat"
                onClick={handleSosDispatch}
                aria-label="REQUEST EMERGENCY RESCUE"
              >
                <span style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1 }}>SOS</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.9, letterSpacing: '0.04em', marginTop: '4px' }}>DISPATCH</span>
              </button>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-tertiary)', maxWidth: '380px', margin: 0 }}>
                Submits sanitized location and household details to the prototype coordinator workflow.
              </p>

              <button
                type="button"
                style={{ background: 'var(--surface-elevated)', padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={() => setShowHotlinesModal(true)}
              >
                <Icon name="phone" size={14} style={{ color: '#dc2626' }} />
                <span>Direct 911 Hotline</span>
              </button>
            </div>

            {/* Nearest Responders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Simulated Responders
                </h3>
                <button
                  type="button"
                  style={{ border: 'none', background: 'transparent', color: '#dc2626', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => onNavigateTab?.('map')}
                >
                  <span>Team location</span>
                  <Icon name="arrow-up-right" size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { name: 'Rescue Team Alpha', distance: 'Controlled fixture', eta: 'No live ETA' },
                  { name: 'Rescue Boat 4', distance: 'Controlled fixture', eta: 'No live ETA' },
                ].map((responder) => (
                  <div key={responder.name} className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#dc2626' }}>
                        <Icon name="map-fold" size={18} />
                      </span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{responder.name}</strong>
                        <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{responder.distance}</span>
                      </div>
                    </div>

                    <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-elevated)', padding: '3px 8px', borderRadius: '6px' }}>
                      {responder.eta}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Controlled scenario notices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Scenario Notices
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Simulated data</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fca5a5', background: 'rgba(220,38,38,0.2)', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>Critical</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>2 MIN AGO</span>
                  </div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Controlled flood scenario active</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>U-Belt pilot · synthetic scenario values</span>
                </div>

                <div className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fde68a', background: 'rgba(245,158,11,0.2)', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>Warning</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>18 MIN AGO</span>
                  </div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Heavy-rain demonstration condition</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Not a live or official weather warning</span>
                </div>

                <div className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#86efac', background: 'rgba(34,197,94,0.2)', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>Advisory</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>41 MIN AGO</span>
                  </div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Evacuation center at 70% capacity</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Concepcion Elementary School</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── INQUIRIES TAB (RESCUE TRACKING) ─────────────────────────── */}
        {navSection === 'inquiries' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* ── Prototype role simulation notice ────────────────── */}
            <PrototypeNotice variant="role" />

            {/* ── API-backed request tracking (authoritative) ──────── */}
            {apiRequestId && (
              <Section
                title="Active Rescue Tracking"
                subtitle="Authoritative status from the API. Controlled scenario data — not live dispatch."
              >
                {/* Success confirmation after first submission */}
                {createdRequestId === apiRequestId && (
                  <div
                    role="status"
                    aria-live="polite"
                    data-testid="submission-success"
                    style={{
                      marginBottom: '0.75rem',
                      padding: '0.7rem 0.9rem',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: '#14532d',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span aria-hidden="true">✓</span>
                    <div>
                      <strong>Request submitted.</strong> Your request ID is{' '}
                      <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{apiRequestId}</code>.
                      The current status below comes from the API. No response time is guaranteed.
                    </div>
                  </div>
                )}
                <RequestStatusView
                  requestId={apiRequestId}
                  onCancelled={() => setCreatedRequestId(null)}
                />
              </Section>
            )}

            {!apiRequestId && isRequestListLoading && (
              <Section title="Rescue Tracking" subtitle="Loading your authoritative rescue-request state.">
                <div role="status" aria-live="polite" aria-busy="true" className="modern-clean-card" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                  Loading your rescue requests…
                </div>
              </Section>
            )}

            {!apiRequestId && isRequestListError && (
              <Section title="Rescue Tracking" subtitle="The request list could not be loaded from the API.">
                <div role="alert" className="modern-clean-card" style={{ padding: '1.5rem', textAlign: 'center', color: '#7f1d1d' }}>
                  <p>Unable to load your rescue requests. No local mock request is being shown as persisted.</p>
                  <Button variant="outline" size="sm" onClick={() => void refetchRequestList()}>
                    Retry
                  </Button>
                </div>
                <SampleRescueTrackingPreview />
              </Section>
            )}

            {!apiRequestId && !isRequestListLoading && !isRequestListError && (
              <Section title="Rescue Tracking" subtitle="No persisted rescue request was returned by the API.">
                <div className="modern-clean-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontWeight: 600, margin: '0 0 1rem' }}>No rescue requests found.</p>
                  <Button variant="primary" size="sm" onClick={() => onNavigateTab?.('overview')}>
                    Start a rescue request
                  </Button>
                </div>
                <SampleRescueTrackingPreview />
              </Section>
            )}

            {/* Legacy MissionContext tracking is intentionally disabled here.
                Citizen status must come only from the authoritative request API. */}
            {showLegacyMockTracking && (activeReq ? (
              <Section
                title={`Active Rescue Tracking: ${activeReq.id}`}
                subtitle="Prototype status sequence using controlled scenario data."
                action={
                  activeReq.status === 'pending' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancelModal(true)}
                    >
                      Cancel request
                    </Button>
                  ) : null
                }
              >
                <div className="modern-clean-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Multi-Stage Stepper */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                    {[
                      { stage: 'pending', num: '1', title: 'Pending Dispatch' },
                      { stage: 'assigned', num: '2', title: 'Rescuer Assigned' },
                      { stage: 'en-route', num: '3', title: 'En Route' },
                      { stage: 'arrived', num: '4', title: 'Arrived at Area' },
                      { stage: 'completed', num: '5', title: 'Rescued' },
                    ].map((s, idx) => {
                      const stages = ['pending', 'assigned', 'en-route', 'arrived', 'completed']
                      const currentIdx = stages.indexOf(activeReq.status)
                      const isPast = idx <= currentIdx
                      const isCurrent = activeReq.status === s.stage

                      return (
                        <div
                          key={s.stage}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            opacity: isPast ? 1 : 0.45,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isCurrent ? '#dc2626' : isPast ? 'rgba(255,255,255,0.85)' : 'var(--surface-elevated)',
                                color: isPast ? '#120808' : 'var(--text-tertiary)',
                              }}
                            >
                              {s.num}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#dc2626' : 'var(--text-primary)' }}>
                              {s.title}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Request summary info */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Location</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{activeReq.location.address}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Occupants</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{activeReq.headcount} Persons</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Flood Severity</span>
                      <strong style={{ color: '#f87171' }}>{activeReq.severity.toUpperCase()} ({activeReq.floodDepth})</strong>
                    </div>
                  </div>

                  {activeCitizenTeam && activeReq.status !== 'pending' && (
                    <div
                      className="modern-clean-card"
                      style={{ padding: '0.9rem 1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
                    >
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                          Assigned team: {activeCitizenTeam.name} ({activeCitizenTeam.unitType})
                        </strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Team leader: {activeReq.assignedTeamName || activeCitizenTeam.leadRescuer || 'Not assigned'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          Simulated team contact for this prototype. X characters mask the number.
                        </span>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                        Contact: {assignedLeaderPhone || 'No leader contact assigned'}
                      </span>
                      {assignedLeaderTel ? (
                        <a href={assignedLeaderTel} aria-label={`Call team leader ${activeReq.assignedTeamName ?? activeCitizenTeam.leadRescuer}`}>
                          Call team leader
                        </a>
                      ) : (
                        <span aria-disabled="true" title="This sanitized prototype contact uses X placeholders, so it cannot place a call.">
                          Calling unavailable in simulation
                        </span>
                      )}
                    </div>
                  )}

                  {/* En route advisory card */}
                  <div className="enroute-reroute-explanation-card">
                    <div className="reroute-header">
                      <span className="live-indicator-dot" />
                      <span className="reroute-title">SIMULATED ROUTE & DELAY ADVISORY</span>
                      <span className="reroute-source">Prototype Coordinator & Routing Engine</span>
                    </div>
                    <p className="reroute-message">"{currentRouteExplanation}"</p>
                    <div className="reroute-eta-row">
                      <span>Arrival Target: <strong>{currentEtaMinutes} minutes</strong></span>
                      <span>Corridor: <strong>{activeMission?.activeRouteName || 'Jhocson St. Recommended Corridor'}</strong></span>
                    </div>
                  </div>

                  {/* Prototype status-update timeline */}
                  {activeMission?.liveStatusUpdates && activeMission.liveStatusUpdates.length > 0 && (
                    <div className="live-updates-timeline">
                      <span className="timeline-title">Prototype Status Log</span>
                      <ul className="timeline-list">
                        {activeMission.liveStatusUpdates.slice(0, 4).map((upd) => (
                          <li key={upd.id} className="timeline-item">
                            <span className="upd-time font-mono">{upd.time}</span>
                            <span className="upd-author">[{upd.author}]</span>
                            <span className="upd-msg">{upd.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </Section>
            ) : (
              <Section title="Rescue Tracking" subtitle="Prototype status tracking for your rescue request.">
                <div className="modern-clean-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontWeight: 600, margin: 0 }}>No active rescue requests.</p>
                </div>
              </Section>
            ))}
          </div>
        )}

        {/* ── MAP TAB ─────────────────────────────────────────────────── */}
        {navSection === 'map' && (
          <div style={{ width: '100%' }}>
            <Section
              title="Rescue Team Location"
              subtitle="Sample team position and route relative to the sanitized target; not live GPS tracking."
            >
              <InteractiveFloodMap
                activeStage={activeReq ? (activeReq.status as any) : 'en-route'}
                showAlternatives
                selectedRoute="primary"
                routeExplanation={currentRouteExplanation}
                etaMinutes={currentEtaMinutes}
              />
              <div className="hazard-map__preparedness" style={{ marginTop: '1.25rem' }}>
                <EmergencyPreparednessGuide />
              </div>
            </Section>
          </div>
        )}

      </div>

      {/* API REQUEST FORM MODAL (Issue #17 — connects to POST /rescue-requests) */}
      <Modal
        isOpen={showApiRequestForm}
        onClose={() => setShowApiRequestForm(false)}
        title="Submit rescue request"
        subtitle="Connects to the API. Controlled scenario data — not a real emergency dispatch."
      >
        <RequestForm
          key={sosReportedFloodLevel}
          initialFloodLevel={sosReportedFloodLevel}
          onSuccess={(record) => {
            setSelectedApiRequestId(record.id)
            setCreatedRequestId(record.id)
            setShowApiRequestForm(false)
            onNavigateTab?.('inquiries')
          }}
          onCancel={() => setShowApiRequestForm(false)}
        />
      </Modal>

      {/* MULTI-STAGE TRIAGE MODAL */}
      <Modal
        isOpen={showSosTriage}
        onClose={() => setShowSosTriage(false)}
        title="SOS Dispatch — Flood Triage"
        subtitle="Choose the reported flood severity before adding request details."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
                Step A — How severe is the flooding at your location?
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'low', depth: 'Ankle-deep (0.1–0.2m)', desc: 'Road passable, minor gutter water' },
                  { key: 'low-moderate', depth: 'Knee-deep (0.2–0.4m)', desc: 'High vehicles only' },
                  { key: 'moderate', depth: 'Waist-deep (0.5–0.9m)', desc: 'Vehicle stall risk' },
                  { key: 'high', depth: 'Chest-deep (1.0–1.4m)', desc: 'Impassable, boat needed' },
                  { key: 'severe', depth: 'Overhead / Fast Current (>1.5m)', desc: 'Critical structural threat' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStepA_severity(s.key as SeverityLevel)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: `1px solid ${stepA_severity === s.key ? '#ef4444' : '#2d3748'}`,
                      background: stepA_severity === s.key ? 'rgba(239, 68, 68, 0.12)' : '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#f1f5f9', display: 'block' }}>{s.depth}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.desc}</span>
                    </div>
                    {stepA_severity === s.key && (
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '1rem' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <Button variant="ghost" onClick={() => setShowSosTriage(false)}>Cancel</Button>
                <Button variant="primary" onClick={continueFromFloodTriage}>Continue to request details</Button>
              </div>
            </div>
        </div>
      </Modal>


      {/* CANCEL CONFIRMATION MODAL */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Rescue Request?"
        subtitle="This removes your request from the active dispatch queue."
      >
        <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
          Are you sure you want to cancel this distress request? If you are in immediate danger, please keep the request active or call 911.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setShowCancelModal(false)}>Keep Active</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (activeReq) cancelRescueRequest(activeReq.id)
              setShowCancelModal(false)
            }}
          >
            Yes, Cancel Request
          </Button>
        </div>
      </Modal>

      <EmergencyHotlinesModal
        isOpen={showHotlinesModal}
        onClose={() => setShowHotlinesModal(false)}
      />
    </div>
  )
}
