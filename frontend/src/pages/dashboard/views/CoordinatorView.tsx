import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import { useMissions } from '../../../features/missions/MissionContext'
import type { RescueRequest } from '../../../features/missions/types'
import { InteractiveFloodMap } from '../../../features/map/InteractiveFloodMap'
import {
  Section,
  StatCard,
  StatusBadge,
  VulnerabilitiesBadges,
  WeatherAlertBanner,
  SEVERITY_CONFIG,
} from './shared'

import type { NavSection } from './navTypes'

export function CoordinatorView({ navSection = 'overview' }: { navSection?: NavSection }) {
  const {
    requests,
    teams,
    missions,
    incidentReports,
    hazardReports,
    assignMission,
    updateRequestStatus,
    updateMissionStatus,
    overrideRoute,
    updateRouteDelayExplanation,
    submitIncidentReport,
  } = useMissions()

  // Selection & Modal states
  const [selectedRequest, setSelectedRequest] = useState<RescueRequest | null>(requests[0] || null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [targetReqForAssign, setTargetReqForAssign] = useState<RescueRequest | null>(null)

  // Assignment form state
  const [selectedTeamId, setSelectedTeamId] = useState<string>('team-alpha')
  const [assignedRescuerCount, setAssignedRescuerCount] = useState<number>(4)
  const [attachMedicalUnit, setAttachMedicalUnit] = useState<boolean>(true)

  // Manual Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [overrideMissionId, setOverrideMissionId] = useState<string>('')
  const [overrideRouteChoice, setOverrideRouteChoice] = useState<string>('Gerardo St. Detour')
  const [overrideJustification, setOverrideJustification] = useState<string>('')
  const [overrideLiabilityAcknowledged, setOverrideLiabilityAcknowledged] = useState(false)

  // Incident Documentation Form Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [incidentMissionId, setIncidentMissionId] = useState<string>('')
  const [incidentOutcome, setIncidentOutcome] = useState<'Successful' | 'Partially Completed' | 'Rerouted' | 'Evacuated to Shelter'>('Successful')
  const [incidentCasualties, setIncidentCasualties] = useState<number>(0)
  const [incidentDelays, setIncidentDelays] = useState<string>('Overturned debris on Loyola St caused detour to Jhocson St (+4 mins).')
  const [incidentNotes, setIncidentNotes] = useState<string>('All 4 family members in stable condition at NU Evacuation Center.')
  const [incidentSuggestions, setIncidentSuggestions] = useState<string>('Pre-position additional inflatable rubber boats near España Blvd during monsoon peak.')


  // Dispatcher Route Delay & ETA Update tool
  const [delayMissionId, setDelayMissionId] = useState<string>('')
  const [delayEtaMinutes, setDelayEtaMinutes] = useState<number>(9)
  const [delayExplanation, setDelayExplanation] = useState<string>('')
  const [delaySentAlert, setDelaySentAlert] = useState(false)

  // Filter tabs — derived from navSection now; keep for modal-driven jumps
  const activeTab: 'queue' | 'missions' | 'incidents' =
    navSection === 'inquiries' ? 'queue'
    : navSection === 'missions' ? 'missions'
    : navSection === 'incidents' ? 'incidents'
    : 'queue'

  // Open Assign Modal
  function handleOpenAssign(req: RescueRequest) {
    setTargetReqForAssign(req)
    setAttachMedicalUnit(req.medicalNeeds)
    setSelectedTeamId(teams.find((t) => t.status === 'available')?.id || 'team-alpha')
    setShowAssignModal(true)
  }

  function handleConfirmAssignment() {
    if (!targetReqForAssign) return
    assignMission(
      targetReqForAssign.id,
      selectedTeamId,
      assignedRescuerCount,
      attachMedicalUnit,
    )
    setShowAssignModal(false)
    setTargetReqForAssign(null)
  }

  function handleOpenOverride(missionId: string) {
    setOverrideMissionId(missionId)
    setOverrideLiabilityAcknowledged(false)
    setOverrideJustification('')
    setShowOverrideModal(true)
  }

  function handleConfirmOverride() {
    if (!overrideLiabilityAcknowledged || !overrideJustification.trim()) return
    overrideRoute(overrideMissionId, overrideRouteChoice, overrideJustification)
    setShowOverrideModal(false)
  }

  function handleOpenIncidentModal(missionId: string) {
    setIncidentMissionId(missionId)
    setShowIncidentModal(true)
  }

  function handleSaveIncident(e: React.FormEvent) {
    e.preventDefault()
    const mis = missions.find((m) => m.id === incidentMissionId)
    const linkedReq = requests.find((r) => r.id === mis?.requestId)
    submitIncidentReport({
      missionId: incidentMissionId,
      requestId: linkedReq?.id || 'RQ-UNKNOWN',
      teamName: mis?.suggestedRoute.primary.name || 'Assigned Rescue Unit',
      outcome: incidentOutcome,
      evacuatedCount: linkedReq?.headcount || 4,
      casualtiesCount: incidentCasualties,
      delaysOrComplications: incidentDelays,
      operationalNotes: incidentNotes,
      futureSuggestions: incidentSuggestions,
      dispatcherName: 'Coordinator Elle / Ranee (Central Dispatch)',
    })
    setShowIncidentModal(false)
  }


  function handleSendDelayUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!delayExplanation.trim() || !delayMissionId) return
    updateRouteDelayExplanation(delayMissionId, delayEtaMinutes, delayExplanation, 'Central Dispatch')
    setDelaySentAlert(true)
    setDelayExplanation('')
    setTimeout(() => setDelaySentAlert(false), 5000)
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const activeMissionsList = missions.filter((m) => m.status !== 'completed')

  return (
    <div className="coordinator-view">
      <WeatherAlertBanner />

      {/* 1. Real-time Incoming Alert Bar */}
      {pendingRequests.length > 0 && (
        <div className="incoming-inquiry-alert-bar" role="alert">
          <div className="inquiry-alert-left">
            <span className="inquiry-pulse">
              <Icon name="alert" size={20} />
            </span>
            <div>
              <strong>
                {pendingRequests.length} INCOMING RESCUE INQUIRY WAITING FOR DISPATCH
              </strong>
              <p>
                Latest: <strong>{pendingRequests[0].id}</strong> ({pendingRequests[0].citizenName} ·{' '}
                {pendingRequests[0].severity.toUpperCase()} SEVERITY · {pendingRequests[0].location.address})
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAssign(pendingRequests[0])}
          >
            Review & Assign Now →
          </Button>
        </div>
      )}

      {/* OVERVIEW — Stats always visible on overview, alert bar everywhere */}
      {navSection === 'overview' && (
        <>
        <div className="stat-row">
          <StatCard
            label="Pending Dispatch"
            value={pendingRequests.length}
            icon="alert"
            accent={pendingRequests.length > 0}
            subtext="Requires immediate triage"
          />
          <StatCard
            label="Active Missions"
            value={activeMissionsList.length}
            icon="route"
            subtext="Under automated route oversight"
          />
          <StatCard
            label="Rescue Teams Ready"
            value={teams.filter((t) => t.status === 'available').length}
            icon="volunteers"
            subtext="1 Boat, 1 Truck, 1 Amphibious"
          />
          <StatCard
            label="Crowdsourced Hazards"
            value={hazardReports.length}
            icon="shield"
            subtext="Fed into routing cost function"
          />
        </div>

        </>
      )}

      {/* INQUIRIES — Rescue inquiry queue & detail inspector */}
      {activeTab === 'queue' && (
        <div className="dash-grid-2">
          {/* List of Requests */}
          <Section
            title="Citizen Rescue Inquiries"
            subtitle="Analyze incoming distress calls by severity tier and assign specialized rescue units."
          >
            <div className="item-list">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`item-card coord-req-card ${selectedRequest?.id === req.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedRequest(req)}
                >
                  <span className="item-card__icon">
                    <Icon name="alert" size={18} />
                  </span>
                  <div className="item-card__body">
                    <div className="item-card__head">
                      <span className="item-card__title">{req.id}</span>
                      <span className={`severity-tag severity-${req.severity}`}>
                        {req.severity}
                      </span>
                      {req.isAutoPulledProfile && (
                        <span className="badge-profile-pulled">Auto-Pulled Profile</span>
                      )}
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="item-card__meta">
                      <span>
                        <Icon name="pin" size={12} /> {req.location.address}
                      </span>
                      <span>👤 {req.headcount} people</span>
                      {req.medicalNeeds && (
                        <span style={{ color: 'var(--color-danger-text)', fontWeight: 600 }}>
                          🩺 Medical Needed
                        </span>
                      )}
                      <span>{req.submittedAt}</span>
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenAssign(req)
                      }}
                    >
                      Assign
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* 2. Inquiry Review & Processing Pane */}
          <Section
            title="Inquiry Detail Inspector"
            subtitle="Full telemetry, vulnerabilities breakdown, and situation analysis."
          >
            {selectedRequest ? (
              <div className="inspector-panel">
                <div className="inspector-header">
                  <div>
                    <h3>{selectedRequest.id} — {selectedRequest.citizenName}</h3>
                    <p className="inspector-phone">{selectedRequest.citizenPhone}</p>
                  </div>
                  <div className="inspector-tags">
                    <span className={`severity-tag severity-${selectedRequest.severity}`}>
                      {selectedRequest.severity.toUpperCase()} SEVERITY
                    </span>
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                </div>

                {selectedRequest.isAutoPulledProfile && (
                  <div className="fast-track-banner" style={{ margin: '14px 0' }}>
                    <Icon name="shield" size={18} />
                    <span>
                      <strong>High/Severe Severity Submission:</strong> Headcount, medical needs, and
                      vulnerabilities were auto-pulled from citizen's verified account profile.
                    </span>
                  </div>
                )}

                <div className="inspector-grid">
                  <div className="inspector-row">
                    <span className="inspector-label">Target Address</span>
                    <span className="inspector-value">{selectedRequest.location.address}</span>
                  </div>

                  {selectedRequest.location.landmark && (
                    <div className="inspector-row">
                      <span className="inspector-label">Landmark</span>
                      <span className="inspector-value">{selectedRequest.location.landmark}</span>
                    </div>
                  )}

                  {selectedRequest.location.houseDescription && (
                    <div className="inspector-row">
                      <span className="inspector-label">House Description</span>
                      <span className="inspector-value">{selectedRequest.location.houseDescription}</span>
                    </div>
                  )}

                  <div className="inspector-row">
                    <span className="inspector-label">Observed Flood Depth</span>
                    <span className="inspector-value font-mono">
                      {selectedRequest.floodDepth} ({SEVERITY_CONFIG[selectedRequest.severity]?.description || 'Critical'})
                    </span>
                  </div>

                  <div className="inspector-row">
                    <span className="inspector-label">Headcount & Vulnerabilities</span>
                    <span className="inspector-value">
                      <strong>{selectedRequest.headcount} Persons</strong>
                      <VulnerabilitiesBadges vulns={selectedRequest.vulnerabilities} />
                    </span>
                  </div>

                  <div className="inspector-row">
                    <span className="inspector-label">Medical Alerts</span>
                    <span
                      className="inspector-value"
                      style={{ color: selectedRequest.medicalNeeds ? 'var(--color-danger-text)' : 'inherit' }}
                    >
                      {selectedRequest.medicalNeeds
                        ? `🚨 YES: ${selectedRequest.medicalDetails || 'Urgent medical assistance requested'}`
                        : 'None reported'}
                    </span>
                  </div>
                </div>

                <div className="inspector-actions">
                  {selectedRequest.status === 'pending' && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => handleOpenAssign(selectedRequest)}
                    >
                      <Icon name="volunteers" size={18} />
                      <span>Assign Rescue Team</span>
                    </Button>
                  )}

                  {selectedRequest.status === 'assigned' && (
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'en-route')}
                    >
                      Mark Departed (En Route)
                    </Button>
                  )}

                  {selectedRequest.status === 'en-route' && (
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'arrived')}
                    >
                      Confirm Arrived at Scene
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="pin" size={32} />
                <p>Select any citizen inquiry from the left to inspect situation details and assign responders.</p>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* MISSIONS — Active missions & routing oversight */}
      {activeTab === 'missions' && (
        <div className="dash-grid-2">
          {/* Mission Tracking List */}
          <Section
            title="Mission Telemetry & Status Oversight"
            subtitle="Standard automated routing oversight with restricted manual override capability."
          >
            <div className="item-list">
              {missions.map((mis) => {
                const req = requests.find((r) => r.id === mis.requestId)
                return (
                  <div key={mis.id} className="item-card mission-coord-card">
                    <span className="item-card__icon">
                      <Icon name="boat" size={20} />
                    </span>
                    <div className="item-card__body">
                      <div className="item-card__head">
                        <span className="item-card__title">{mis.id} → {mis.requestId}</span>
                        <StatusBadge status={mis.status} />
                        {mis.isManualOverride && (
                          <span className="badge-manual-override">Manual Override Active</span>
                        )}
                      </div>
                      <div className="item-card__meta">
                        <span>📍 {req?.location.address}</span>
                        <span>🛣️ Active: <strong>{mis.activeRouteName}</strong></span>
                        <span>⏱️ ETA: {req?.eta || '5 mins'}</span>
                      </div>

                      {/* En Route Advisory Strip — visible only while mission is en-route */}
                      {mis.status === 'en-route' && (
                        <div className="mission-enroute-advisory-strip">
                          <div className="advisory-strip-header">
                            <span className="live-indicator-dot" />
                            <span className="advisory-strip-label">LIVE ROUTE ADVISORY</span>
                            <span className="advisory-strip-source">Central Dispatch · Routing Engine</span>
                          </div>
                          <p className="advisory-strip-message">
                            "{mis.routeDelayExplanation}"
                          </p>
                          <div className="advisory-strip-meta">
                            <span>⏱️ Arrival target: <strong>{mis.etaMinutes} min</strong></span>
                            <span>🛣️ Corridor: <strong>{mis.activeRouteName}</strong></span>
                          </div>
                        </div>
                      )}

                      {mis.overrideReason && (
                        <p className="override-note">
                          <strong>Override Justification:</strong> {mis.overrideReason}
                        </p>
                      )}
                    </div>

                    <div className="mission-coord-actions">
                      {mis.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="btn-warn-override"
                          onClick={() => handleOpenOverride(mis.id)}
                        >
                          Manual Override
                        </Button>
                      )}

                      {mis.status === 'arrived' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateMissionStatus(mis.id, 'completed')}
                        >
                          Mark Completed
                        </Button>
                      )}

                      {mis.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenIncidentModal(mis.id)}
                        >
                          Document Incident
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dispatcher Real-Time Route Delay & ETA Broadcaster */}
            <div className="dispatcher-delay-updater">
              <h5>🛣️ Real-Time Route Delay &amp; ETA Broadcaster</h5>
              <p>
                Push a live route delay explanation to both the Citizen App and the active Rescue Team. This message appears as a constant advisory on the En Route screen for both parties.
              </p>

              {delaySentAlert && (
                <div className="alert-banner-success" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  ✓ Route delay advisory pushed to Citizen and Rescue Team views!
                </div>
              )}

              {/* Quick Preset Messages */}
              <div className="delay-presets-grid">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>QUICK PRESETS:</span>
                {[
                  { label: '9 min · Loyola impassable → Jhocson alt', eta: 9, msg: 'Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and needs to head another alternative routes "Loyola St.". Proceeding via Jhocson St. Safe Corridor.' },
                  { label: '12 min · España overflow, taking Gerardo detour', eta: 12, msg: 'Rescue Team arrival: 12 minutes. España Blvd overflow (0.9m depth) forces rerouting via Gerardo St. Detour. All shortcuts submerged — navigating carefully.' },
                  { label: '15 min · Multiple road blockages, alternate corridor found', eta: 15, msg: 'Rescue Team arrival: 15 minutes. Multiple road blockages detected on primary and secondary routes. Unit is navigating via España North Access corridor. Stay on 2nd floor and signal with flashlight.' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setDelayExplanation(preset.msg)
                      setDelayEtaMinutes(preset.eta)
                      if (activeMissionsList[0]) setDelayMissionId(activeMissionsList[0].id)
                    }}
                  >
                    ⚡ {preset.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendDelayUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="field">
                  <label className="field__label">Target Mission ID</label>
                  <select
                    value={delayMissionId}
                    onChange={(e) => setDelayMissionId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">— Select active mission —</option>
                    {activeMissionsList.map((m) => (
                      <option key={m.id} value={m.id}>{m.id} → {m.requestId} ({m.status})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">Updated ETA (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={delayEtaMinutes}
                    onChange={(e) => setDelayEtaMinutes(parseInt(e.target.value, 10) || 9)}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Route Delay Explanation Message</label>
                  <textarea
                    rows={3}
                    placeholder='E.g., "Rescue Team arrival: 9 minutes. All possible shortcuts are flooded and needs to head another alternative routes &quot;Loyola St.&quot;."'
                    value={delayExplanation}
                    onChange={(e) => setDelayExplanation(e.target.value)}
                  />
                </div>
                <Button variant="primary" size="sm" type="submit">
                  <Icon name="route" size={15} /> Push Route Advisory to All Screens
                </Button>
              </form>
            </div>

          </Section>

          {/* Interactive Routing Oversight Map */}
          <Section
            title="Flood-Aware Routing Oversight"
            subtitle="Automated cost function excludes flooded streets (Loyola 1.4m) and maintains safe corridors."
          >
            <InteractiveFloodMap
              activeStage="en-route"
              showAlternatives
              routeExplanation={activeMissionsList[0]?.routeDelayExplanation}
              etaMinutes={activeMissionsList[0]?.etaMinutes}
            />
          </Section>
        </div>
      )}

      {/* INCIDENTS — Incident documentation & reporting */}
      {activeTab === 'incidents' && (
        <Section
          title="Incident Documentation & Post-Rescue Coordination"
          subtitle="Formal operational record of mission outcomes, casualties, complications, and future notes."
        >
          {incidentReports.length === 0 ? (
            <div className="empty-state">
              <Icon name="shield" size={32} />
              <p>No formal incident logs recorded yet. Document completed missions using the button below.</p>
            </div>
          ) : (
            <div className="incident-grid">
              {incidentReports.map((inc) => (
                <div key={inc.id} className="incident-card">
                  <div className="incident-card-head">
                    <div>
                      <span className="incident-id">{inc.id}</span>
                      <h4>Mission: {inc.missionId} (Request: {inc.requestId})</h4>
                    </div>
                    <span className="incident-outcome-badge">{inc.outcome}</span>
                  </div>

                  <div className="incident-metrics-row">
                    <span>👤 Evacuated: <strong>{inc.evacuatedCount}</strong></span>
                    <span>⚠️ Casualties: <strong>{inc.casualtiesCount}</strong></span>
                    <span>🕒 Documented: <strong>{inc.documentedAt}</strong></span>
                    <span>✍️ Officer: <strong>{inc.dispatcherName}</strong></span>
                  </div>

                  <div className="incident-section">
                    <span className="inc-sec-title">Delays & Complications</span>
                    <p>{inc.delaysOrComplications}</p>
                  </div>

                  <div className="incident-section">
                    <span className="inc-sec-title">Operational Notes & Medical Care</span>
                    <p>{inc.operationalNotes}</p>
                  </div>

                  <div className="incident-section">
                    <span className="inc-sec-title">Suggestions for Future Rescue Operations</span>
                    <p>{inc.futureSuggestions}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* TEAMS — Rescue fleet status */}
      {navSection === 'teams' && (
        <Section title="Rescue Fleet Status" subtitle="Overview of deployed and standby units in Sampaloc.">
          <div className="teams-grid">
            {teams.map((t) => (
              <div key={t.id} className="team-fleet-card">
                <div className="fleet-head">
                  <span className="fleet-name">{t.name}</span>
                  <span className={`fleet-status status-${t.status}`}>{t.status.toUpperCase()}</span>
                </div>
                <p className="fleet-type">{t.unitType} · {t.membersCount} Crew Members</p>
                <div className="fleet-details">
                  <span>Lead: {t.leadRescuer}</span>
                  <span>{t.hasMedicalUnit ? '🩺 Medical Unit Attached' : 'Standard First Aid'}</span>
                  <span className="font-mono">{t.contactPhone}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* MAP — Flood-aware routing oversight map */}
      {navSection === 'map' && (
        <Section
          title="Flood-Aware Routing Oversight"
          subtitle="Automated cost function excludes flooded streets (Loyola 1.4m) and maintains safe corridors."
        >
          <InteractiveFloodMap
            activeStage="en-route"
            showAlternatives
            routeExplanation={activeMissionsList[0]?.routeDelayExplanation}
            etaMinutes={activeMissionsList[0]?.etaMinutes}
          />
        </Section>
      )}

      {/* 3. RESCUE TEAM ASSIGNMENT MODAL */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Rescue Team & Personnel"
        subtitle={`Deploy response unit to Request ${targetReqForAssign?.id} (${targetReqForAssign?.location.address})`}
      >
        <div className="assign-modal-body">
          {targetReqForAssign?.medicalNeeds && (
            <div className="fast-track-banner" style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}>
              <Icon name="medical" size={20} />
              <span>
                <strong>Medical Emergency Flagged!</strong> Automated recommendation: Attach specialized flood medical unit.
              </span>
            </div>
          )}

          <div className="field">
            <label className="field__label">Select Available Rescue Team</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="form-select"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.unitType}) — Status: {t.status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label">Number of Rescuers Needed</label>
            <input
              type="number"
              min="2"
              max="10"
              value={assignedRescuerCount}
              onChange={(e) => setAssignedRescuerCount(parseInt(e.target.value, 10) || 2)}
            />
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={attachMedicalUnit}
              onChange={(e) => setAttachMedicalUnit(e.target.checked)}
            />
            <span className="field__label">Attach Dedicated Medical Unit / Paramedic</span>
          </label>

          <div className="modal-footer" style={{ padding: 0, marginTop: 14 }}>
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAssignment}>
              Confirm Dispatch Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. RESTRICTED MANUAL OVERRIDE MODAL WITH LIABILITY DISCLAIMER */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Restricted Action: Manual Route Override"
        subtitle="Manual routing intervention for Mission Dispatch."
      >
        <div className="override-modal-body">
          <div className="liability-warning-box">
            <div className="liability-header">
              <Icon name="warning" size={24} />
              <strong>LEGAL & SAFETY LIABILITY NOTICE</strong>
            </div>
            <p>
              You are manually overriding the automated flood-aware routing engine. Automated routing
              considers LiPAD/NOAH hydrodynamic flood models to avoid lethal water depths and currents.
            </p>
            <p>
              Dispatchers overriding this system must have verified ground observations and assume
              operational responsibility for responder and citizen safety.
            </p>
          </div>

          <div className="field">
            <label className="field__label">Select Override Route</label>
            <select
              value={overrideRouteChoice}
              onChange={(e) => setOverrideRouteChoice(e.target.value)}
              className="form-select"
            >
              <option value="Gerardo St. Detour">Gerardo St. Detour (0.26m water depth · 7 mins)</option>
              <option value="España North Access">España North Access (0.35m depth · 9 mins)</option>
              <option value="Direct High-Clearance Wading Path">Direct High-Clearance Wading Path (Rescuer judgment)</option>
            </select>
          </div>

          <div className="field">
            <label className="field__label">Mandatory Dispatch Justification</label>
            <textarea
              rows={3}
              required
              placeholder="State reason for manual override (e.g. Ground volunteer reports water receding on Gerardo St)..."
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
            />
          </div>

          <label className="checkbox-field" style={{ background: 'var(--border-subtle)', padding: 10, borderRadius: 8 }}>
            <input
              type="checkbox"
              checked={overrideLiabilityAcknowledged}
              onChange={(e) => setOverrideLiabilityAcknowledged(e.target.checked)}
            />
            <span className="field__label" style={{ fontSize: '0.82rem' }}>
              I confirm I have received field ground clearance and accept operational responsibility.
            </span>
          </label>

          <div className="modal-footer" style={{ padding: 0, marginTop: 14 }}>
            <Button variant="ghost" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="btn-danger-emergency"
              disabled={!overrideLiabilityAcknowledged || !overrideJustification.trim()}
              onClick={handleConfirmOverride}
            >
              Confirm Route Override
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. INCIDENT DOCUMENTATION MODAL */}
      <Modal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        title="Document Mission Incident & Outcome"
        subtitle="Mandatory reporting for post-rescue evaluation and AI routing dataset refinement."
      >
        <form onSubmit={handleSaveIncident} className="incident-form">
          <div className="field">
            <label className="field__label">Operational Outcome</label>
            <select
              value={incidentOutcome}
              onChange={(e) => setIncidentOutcome(e.target.value as any)}
              className="form-select"
            >
              <option value="Successful">Successful — All victims evacuated</option>
              <option value="Partially Completed">Partially Completed — Second wave needed</option>
              <option value="Rerouted">Rerouted — Alternate craft required</option>
              <option value="Evacuated to Shelter">Evacuated to Shelter directly</option>
            </select>
          </div>

          <div className="field">
            <label className="field__label">Casualties Count (if any)</label>
            <input
              type="number"
              min="0"
              value={incidentCasualties}
              onChange={(e) => setIncidentCasualties(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="field">
            <label className="field__label">Delays, Obstacles, or Route Complications</label>
            <textarea
              rows={2}
              value={incidentDelays}
              onChange={(e) => setIncidentDelays(e.target.value)}
              placeholder="E.g., Submerged transformer or stranded car forced reroute..."
            />
          </div>

          <div className="field">
            <label className="field__label">Operational Notes & Medical Outcomes</label>
            <textarea
              rows={2}
              value={incidentNotes}
              onChange={(e) => setIncidentNotes(e.target.value)}
              placeholder="E.g., Medical unit administered oxygen to senior citizen..."
            />
          </div>

          <div className="field">
            <label className="field__label">Suggestions for Future Rescue Operations</label>
            <textarea
              rows={2}
              value={incidentSuggestions}
              onChange={(e) => setIncidentSuggestions(e.target.value)}
              placeholder="Recommendations for team staging, equipment, or hazard maps..."
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: 14 }}>
            <Button variant="ghost" type="button" onClick={() => setShowIncidentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Incident Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
