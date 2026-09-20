import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import { useMissions } from '../../../features/missions/MissionContext'
import { SAVED_CITIZEN_PROFILE } from '../../../features/missions/mockData'
import type { SeverityLevel } from '../../../features/missions/types'
import { InteractiveFloodMap } from '../../../features/map/InteractiveFloodMap'
import {
  EmergencyHotlinesModal,
  EmergencyPreparednessGuide,
  Section,
  LocalizedForecastWidget,
  LocationStatusCard,
  SEVERITY_CONFIG,
} from './shared'
import type { NavSection } from './navTypes'

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
    createRescueRequest,
    cancelRescueRequest,
  } = useMissions()

  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showHotlinesModal, setShowHotlinesModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(null)

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepA_severity, setStepA_severity] = useState<SeverityLevel>('moderate')
  const [locationAddress, setLocationAddress] = useState('Brgy. Tumana, Marikina City')
  const [locationError, setLocationError] = useState('')

  const activeReq = activeCitizenRequest
  const activeMission = missions.find((m) => m.requestId === activeReq?.id) || missions[0]
  const currentRouteExplanation =
    activeMission?.routeDelayExplanation ||
    'All possible shortcuts are flooded. Rescue team is en route via safe corridor.'
  const currentEtaMinutes = activeMission?.etaMinutes || 6

  function handleStartRequest(serviceName?: string) {
    if (serviceName) setSelectedService(serviceName)
    setCurrentStepIndex(0)
    setShowRequestForm(true)
    setLocationError('')
  }

  function handleSubmitRequest() {
    if (!locationAddress.trim()) {
      setLocationError('Enter location before submitting.')
      return
    }

    const isFastTrack = stepA_severity === 'high' || stepA_severity === 'severe'

    createRescueRequest({
      citizenName: SAVED_CITIZEN_PROFILE.name,
      citizenPhone: SAVED_CITIZEN_PROFILE.phone,
      severity: stepA_severity,
      branchTaken: isFastTrack ? 3 : 1,
      location: {
        address: locationAddress.trim(),
        coordinates: [121.0912, 14.6532],
      },
      headcount: SAVED_CITIZEN_PROFILE.headcount,
      vulnerabilities: SAVED_CITIZEN_PROFILE.vulnerabilities,
      medicalNeeds: selectedService === 'Medical Aid' || isFastTrack,
      floodDepth: SEVERITY_CONFIG[stepA_severity].depth,
      isAutoPulledProfile: isFastTrack,
    })

    setShowRequestForm(false)
  }

  const isBranch3 = stepA_severity === 'high' || stepA_severity === 'severe'

  return (
    <div className="resq-citizen-workspace">
      <div className="citizen-flow-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* Weather Forecast */}
        <LocalizedForecastWidget />

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {navSection === 'overview' && (
          <div className="citizen-overview-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Location & GPS Status Bar */}
            <LocationStatusCard
              title="Brgy. Tumana, Marikina City"
              coordinates="14.6532 N · 121.0912 E"
              statusLabel="GPS Lock"
            />

            {/* Main SOS Trigger Hero */}
            <div className="modern-clean-card" style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.25rem' }}>
              <div className="glowing-emergency-pill">
                <span className="glowing-red-dot-live" />
                <span>Emergency Channel Active</span>
              </div>

              <button
                type="button"
                className="sos-button-neat"
                onClick={() => handleStartRequest('Emergency SOS')}
                aria-label="REQUEST EMERGENCY RESCUE"
              >
                <span style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1 }}>SOS</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.9, letterSpacing: '0.04em', marginTop: '4px' }}>DISPATCH</span>
              </button>

              <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '380px', margin: 0 }}>
                Transmits your GPS location and household details to the nearest rescue team.
              </p>

              <button
                type="button"
                style={{ background: '#ffffff', padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={() => setShowHotlinesModal(true)}
              >
                <Icon name="phone" size={14} style={{ color: '#dc2626' }} />
                <span>Direct 911 Hotline</span>
              </button>
            </div>

            {/* Request Assistance Services Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Request Assistance
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>4 Services Available</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {[
                  { name: 'Flood Rescue', tag: 'Boat Team', icon: 'shield' },
                  { name: 'Evacuation', tag: 'Transport', icon: 'map-fold' },
                  { name: 'Medical Aid', tag: 'First Response', icon: 'heart' },
                  { name: 'Relief Goods', tag: 'Supplies', icon: 'package' },
                ].map((service) => (
                  <button
                    key={service.name}
                    type="button"
                    className="neu-red-card"
                    style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer', textAlign: 'left', background: '#ffffff' }}
                    onClick={() => handleStartRequest(service.name)}
                  >
                    <div style={{ color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      <Icon name={service.icon as any} size={20} />
                    </div>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{service.name}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{service.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nearest Responders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Nearest Responders
                </h3>
                <button
                  type="button"
                  style={{ border: 'none', background: 'transparent', color: '#dc2626', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => onNavigateTab?.('map')}
                >
                  <span>Hazard map</span>
                  <Icon name="arrow-up-right" size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { name: 'Rescue Team Alpha', distance: '1.2 km away', eta: 'ETA 6 min' },
                  { name: 'Coast Guard Boat 4', distance: '3.4 km away', eta: 'ETA 11 min' },
                ].map((responder) => (
                  <div key={responder.name} className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#dc2626' }}>
                        <Icon name="map-fold" size={18} />
                      </span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a' }}>{responder.name}</strong>
                        <span className="font-mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>{responder.distance}</span>
                      </div>
                    </div>

                    <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                      {responder.eta}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Live Alerts
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Auto-updating</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>Critical</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>2 MIN AGO</span>
                  </div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Marikina River past 2nd alarm</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Barangay Tumana · rising 0.4 m/hr</span>
                </div>

                <div className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>Warning</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>18 MIN AGO</span>
                  </div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Typhoon Signal No. 2 raised</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Metro Manila · sustained 95 km/h</span>
                </div>

                <div className="neu-red-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>Advisory</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>41 MIN AGO</span>
                  </div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Evacuation center at 70% capacity</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Concepcion Elementary School</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── INQUIRIES TAB (RESCUE TRACKING) ─────────────────────────── */}
        {navSection === 'inquiries' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Quick Action Bar in Inquiries */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => handleStartRequest()}
              >
                <Icon name="alert" size={18} />
                <span>REQUEST EMERGENCY RESCUE</span>
              </Button>
              <Button variant="outline" onClick={() => setShowHotlinesModal(true)}>
                <Icon name="phone" size={16} />
                <span>Emergency Hotlines (911)</span>
              </Button>
            </div>

            {activeReq ? (
              <Section
                title={`Active Rescue Tracking: ${activeReq.id}`}
                subtitle="Real-time multi-stage status and automated flood-aware tracking."
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
                                background: isCurrent ? '#dc2626' : isPast ? '#0f172a' : '#e2e8f0',
                                color: isPast ? '#ffffff' : '#64748b',
                              }}
                            >
                              {s.num}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#dc2626' : '#0f172a' }}>
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
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Location</span>
                      <strong style={{ color: '#0f172a' }}>{activeReq.location.address}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Occupants</span>
                      <strong style={{ color: '#0f172a' }}>{activeReq.headcount} Persons</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Flood Severity</span>
                      <strong style={{ color: '#dc2626' }}>{activeReq.severity.toUpperCase()} ({activeReq.floodDepth})</strong>
                    </div>
                  </div>

                  {/* En route advisory card */}
                  <div className="enroute-reroute-explanation-card">
                    <div className="reroute-header">
                      <span className="live-indicator-dot" />
                      <span className="reroute-title">REAL-TIME ROUTE & DELAY ADVISORY</span>
                      <span className="reroute-source">Central Dispatch & Routing Engine</span>
                    </div>
                    <p className="reroute-message">"{currentRouteExplanation}"</p>
                    <div className="reroute-eta-row">
                      <span>Arrival Target: <strong>{currentEtaMinutes} minutes</strong></span>
                      <span>Corridor: <strong>{activeMission?.activeRouteName || 'Jhocson St. Safe Corridor'}</strong></span>
                    </div>
                  </div>

                  {/* Live Updates Timeline */}
                  {activeMission?.liveStatusUpdates && activeMission.liveStatusUpdates.length > 0 && (
                    <div className="live-updates-timeline">
                      <span className="timeline-title">Live Dispatch Log</span>
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
              <Section title="Rescue Tracking" subtitle="Real-time status tracking for your rescue request.">
                <div className="modern-clean-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontWeight: 600, margin: 0 }}>No active rescue requests.</p>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ── MAP TAB ─────────────────────────────────────────────────── */}
        {navSection === 'map' && (
          <div style={{ width: '100%' }}>
            <Section title="Flood-Aware Rescue Map" subtitle="Live visualization of active mission route and hazard updates.">
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

      {/* MULTI-STAGE TRIAGE MODAL */}
      <Modal
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        title={selectedService ? `Request ${selectedService}` : 'Emergency Rescue Request'}
        subtitle="Priority triage for flood-affected households."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {currentStepIndex === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
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
                      border: `1px solid ${stepA_severity === s.key ? '#dc2626' : '#e2e8f0'}`,
                      background: stepA_severity === s.key ? 'rgba(220, 38, 38, 0.05)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{s.depth}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.desc}</span>
                    </div>
                    {stepA_severity === s.key && (
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <Button variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setCurrentStepIndex(1)}>Continue to Step B</Button>
              </div>
            </div>
          )}

          {currentStepIndex === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isBranch3 ? (
                <div style={{ padding: '0.85rem 1rem', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: 700, fontSize: '0.88rem' }}>
                    <Icon name="shield" size={18} />
                    <span>FAST-TRACK EMERGENCY RESCUE ACTIVATED</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#3b82f6', margin: '4px 0 0 0' }}>
                    Because severity is {stepA_severity.toUpperCase()}, verified profile data has been attached.
                  </p>
                </div>
              ) : null}

              {isBranch3 && (
                <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    Auto-Attached Citizen Profile Data
                  </span>
                  <span style={{ color: '#475569' }}>
                    4 persons (1 Infant, 1 Senior Citizen)
                  </span>
                </div>
              )}

              {locationError && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>{locationError}</p>}

              <label className="profile-form__field">
                <span>Step B — Confirm Your Location</span>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => {
                    setLocationAddress(e.target.value)
                    setLocationError('')
                  }}
                  placeholder="Street name, barangay, landmark"
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '0.5rem' }}>
                <Button variant="ghost" onClick={() => setCurrentStepIndex(0)}>← Back to Triage</Button>
                <Button variant="primary" onClick={handleSubmitRequest}>
                  SUBMIT EMERGENCY RESCUE REQUEST
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* CANCEL CONFIRMATION MODAL */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Rescue Request?"
        subtitle="This removes your request from the active dispatch queue."
      >
        <p style={{ fontSize: '0.88rem', color: '#475569', margin: '0 0 1.25rem 0' }}>
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
