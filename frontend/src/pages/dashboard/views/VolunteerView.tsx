import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import { useMissions } from '../../../features/missions/MissionContext'
import type { SeverityLevel } from '../../../features/missions/types'
import { InteractiveFloodMap } from '../../../features/map/InteractiveFloodMap'
import {
  EmergencyHotlinesModal,
  EmergencyPreparednessGuide,
  Section,
  VulnerabilitiesBadges,
  LocalizedForecastWidget,
  SEVERITY_CONFIG,
} from './shared'
import { EmergencyActionSection } from './citizen/EmergencyActionSection'
import type { NavSection } from './navTypes'

export function VolunteerView({
  navSection = 'overview',
  onNavigateTab,
}: {
  navSection?: NavSection
  onNavigateTab?: (section: NavSection) => void
}) {
  const {
    activeCitizenRequest,
    missions,
    submitHazardReport,
  } = useMissions()

  const [showHazardModal, setShowHazardModal] = useState(false)
  const [showHotlinesModal, setShowHotlinesModal] = useState(false)

  // Volunteer Hazard Form States
  const [hazardLocation, setHazardLocation] = useState('Loyola St. cor. Dalupan')
  const [hazardType, setHazardType] = useState<
    'Impassable Flood' | 'Blocked Road' | 'Submerged Obstacle' | 'Live Electrical Wire'
  >('Impassable Flood')
  const [hazardSeverity] = useState<SeverityLevel>('high')
  const [hazardSubmittedAlert, setHazardSubmittedAlert] = useState(false)

  function handleHazardSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitHazardReport({
      reporterName: 'Field Volunteer',
      locationName: hazardLocation,
      coordinates: [120.9955, 14.6052],
      hazardType,
      severity: hazardSeverity,
      floodDepth: SEVERITY_CONFIG[hazardSeverity].depth,
    })
    setShowHazardModal(false)
    setHazardSubmittedAlert(true)
    setTimeout(() => setHazardSubmittedAlert(false), 5000)
  }

  const activeReq = activeCitizenRequest
  const activeMission = missions.find((m) => m.requestId === activeReq?.id) || missions[0]
  const currentRouteExplanation =
    activeMission?.routeDelayExplanation ||
    'Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and team is using Jhocson St.'
  const currentEtaMinutes = activeMission?.etaMinutes || 9

  return (
    <div className="resq-citizen-workspace">
      <div className="volunteer-flow-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* ── 1. OVERVIEW TAB ─────────────────────────────────────────── */}
        {navSection === 'overview' && (
          <>
            {/* Weather Forecast */}
            <LocalizedForecastWidget />

            {/* Emergency Actions for Volunteer */}
            <EmergencyActionSection
              mode="volunteer"
              onRequestRescue={() => onNavigateTab?.('inquiries')}
              onReportHazard={() => setShowHazardModal(true)}
            />

            {hazardSubmittedAlert && (
              <div className="alert-banner-success" style={{ width: '100%' }}>
                <Icon name="check" size={18} />
                <span>
                  <strong>Hazard Report Logged.</strong> Central dispatch routing maps have been updated.
                </span>
              </div>
            )}

            {/* Volunteer Station Card */}
            <div className="modern-clean-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                  <Icon name="navigation" size={18} />
                </span>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Volunteer Station: Sampaloc Zone
                  </h3>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    14.6042 N · 120.9946 E
                  </span>
                </div>
              </div>

              <div style={{ padding: '3px 9px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Field Active</span>
              </div>
            </div>
          </>
        )}

        {/* ── 2. TRACK SOS TAB ────────────────────────────────────────── */}
        {navSection === 'inquiries' && (
          <div style={{ width: '100%' }}>
            <Section
              title="Active Citizen SOS Signals"
              subtitle="Live telemetry for verified citizen distress calls in Sampaloc."
            >
              {activeReq ? (
                <div className="modern-clean-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Location</span>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{activeReq.location.address}</strong>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Occupants & Priority</span>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block', margin: '2px 0 4px 0' }}>
                        {activeReq.headcount} Persons ({activeReq.severity.toUpperCase()})
                      </strong>
                      <VulnerabilitiesBadges vulns={activeReq.vulnerabilities} />
                    </div>
                  </div>

                  {/* Route Advisory */}
                  <div className="enroute-reroute-explanation-card">
                    <div className="reroute-header">
                      <span className="live-indicator-dot" />
                      <span className="reroute-title">ACTIVE DISPATCH ADVISORY</span>
                      <span className="reroute-source">Central Dispatch</span>
                    </div>
                    <p className="reroute-message">"{currentRouteExplanation}"</p>
                    <div className="reroute-eta-row">
                      <span>Target ETA: <strong>{currentEtaMinutes} mins</strong></span>
                      <span>Corridor: <strong>{activeMission?.activeRouteName || 'Jhocson St. Safe Corridor'}</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="modern-clean-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontWeight: 600, margin: 0 }}>No active SOS signals in this sector.</p>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── 3. MAP TAB ──────────────────────────────────────────────── */}
        {navSection === 'map' && (
          <div style={{ width: '100%' }}>
            <Section
              title="Volunteer Hazard & Flood Navigation Map"
              subtitle="Field tracking of impassable roads and active rescue watercraft."
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

      {/* HAZARD REPORT MODAL */}
      <Modal
        isOpen={showHazardModal}
        onClose={() => setShowHazardModal(false)}
        title="Submit Field Hazard Report"
        subtitle="Log local street flooding or impassable obstacles."
      >
        <form onSubmit={handleHazardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label className="profile-form__field">
            <span>Street Name / Landmark</span>
            <input
              type="text"
              required
              value={hazardLocation}
              onChange={(e) => setHazardLocation(e.target.value)}
            />
          </label>
          <label className="profile-form__field">
            <span>Hazard Type</span>
            <select
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value as any)}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a' }}
            >
              <option value="Impassable Flood">Impassable Flood</option>
              <option value="Blocked Road">Blocked Road</option>
              <option value="Submerged Obstacle">Submerged Obstacle</option>
              <option value="Live Electrical Wire">Live Electrical Wire</option>
            </select>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowHazardModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Hazard Report
            </Button>
          </div>
        </form>
      </Modal>

      <EmergencyHotlinesModal
        isOpen={showHotlinesModal}
        onClose={() => setShowHotlinesModal(false)}
      />
    </div>
  )
}
