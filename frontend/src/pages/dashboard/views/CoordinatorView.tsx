import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import { useMissions } from '../../../features/missions/MissionContext'
import type { RescueRequest } from '../../../features/missions/types'
import { InteractiveFloodMap } from '../../../features/map/InteractiveFloodMap'
import './coordinator/CoordinatorPendingQueue.css'
import { CoordinatorAssignModal } from './coordinator/CoordinatorAssignModal'
import { CreateRescueTeamTab } from './coordinator/CreateRescueTeamTab'
import type { ApiRescueRequestSummary } from '../../../api/assignments'
import {
  EmptyState,
  Section,
  StatCard,
  StatusBadge,
  VulnerabilitiesBadges,
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
    overrideRoute,
  } = useMissions()

  // Selection & Modal states
  const [selectedRequest, setSelectedRequest] = useState<RescueRequest | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [targetReqForAssign, setTargetReqForAssign] = useState<RescueRequest | null>(null)

  // API-backed assignment modal state (Phase 2 real API path)
  const [showApiAssignModal, setShowApiAssignModal] = useState(false)
  const [apiTargetRequest, setApiTargetRequest] = useState<ApiRescueRequestSummary | null>(null)

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

  const [selectedMapMissionId, setSelectedMapMissionId] = useState(
    missions.find((mission) => !['completed', 'cancelled'].includes(mission.status))?.id ?? '',
  )

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
    setSelectedRequest({
      ...targetReqForAssign,
      status: 'assigned',
      assignedTeamId: selectedTeamId,
      assignedTeamName: teams.find((team) => team.id === selectedTeamId)?.name,
    })
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


  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const activeMissionsList = missions.filter((m) => m.status !== 'completed')
  const selectedMapMission = missions.find((m) => m.id === selectedMapMissionId) ?? activeMissionsList[0]
  const selectedMapRequest = requests.find((r) => r.id === selectedMapMission?.requestId)
  const selectedMapTeam = teams.find((t) => t.id === selectedMapMission?.teamId)
  const inspectorRequest = requests.find((request) => request.id === selectedRequest?.id) ?? null

  return (
    <div className="coordinator-view">
      {/* OVERVIEW — Stats and summary */}
      {navSection === 'overview' && (
        <div className="coordinator-overview-stack">
          <Section
            title="Dispatch Overview"
            subtitle="Real-time operational summary of emergency response in the U-Belt pilot zone."
          >
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
          </Section>

          <Section
            title="Active Responses"
            subtitle="Field units currently deployed across monitored flood corridors."
          >
            <div className="item-list">
              {activeMissionsList.map((mis) => {
                const req = requests.find((r) => r.id === mis.requestId)
                const team = teams.find((t) => t.id === mis.teamId)
                return (
                  <div key={mis.id} className="item-card mission-coord-card">
                    <span className="item-card__icon">
                      <Icon name="boat" size={20} />
                    </span>
                    <div className="item-card__body">
                      <div className="item-card__head">
                        <span className="item-card__title">{mis.id} → {mis.requestId}</span>
                        <StatusBadge status={mis.status} />
                      </div>
                      <div className="item-card__meta">
                        <span>📍 {req?.location.address}</span>
                        <span>👥 Unit: <strong>{team?.name || mis.teamId}</strong></span>
                        <span>🛣️ Corridor: <strong>{mis.activeRouteName}</strong></span>
                        <span>⏱️ ETA: {mis.etaMinutes} mins</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </div>
      )}

      {/* INQUIRIES — Rescue inquiry queue & detail inspector */}
      {navSection === 'inquiries' && (
        <div className="dash-grid-2 coord-inquiries-grid">
          <Section
            title="Rescue Request Queue"
            subtitle="Analyze incoming distress calls by severity tier and assign specialized rescue units."
          >
            <div className="coord-queue-section-inner">
              <h3 className="section-inner-title" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Citizen Rescue Inquiries
              </h3>
              <div className="coord-queue">
                <div className="coord-queue__header">
                  <span className="coord-queue__count">
                    {pendingRequests.length} pending request{pendingRequests.length === 1 ? '' : 's'}
                  </span>
                </div>
                {pendingRequests.length > 0 ? (
                  <div className="item-list" role="list" aria-label="Pending rescue requests">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        role="listitem"
                        className={`item-card coord-req-card ${selectedRequest?.id === request.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedRequest(request)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setSelectedRequest(request)
                        }}
                        aria-selected={selectedRequest?.id === request.id}
                      >
                        <span className="item-card__icon"><Icon name="alert" size={18} /></span>
                        <div className="item-card__body">
                          <div className="item-card__head">
                            <span className="item-card__title">{request.id}</span>
                            <span className={`severity-tag severity-${request.severity}`}>{request.severity}</span>
                          </div>
                          <div className="item-card__meta">
                            <span><Icon name="pin" size={12} /> {request.location.address}</span>
                            <span>{request.headcount} people</span>
                            {request.medicalNeeds && <span className="coord-req-medical">Medical needed</span>}
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleOpenAssign(request)
                          }}
                        >
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="shield"
                    title="No pending requests"
                    description="Unassigned demo rescue requests will appear here when available."
                  />
                )}
              </div>
            </div>
          </Section>

          {/* 2. Inquiry Review & Processing Pane */}
          <Modal
            isOpen={Boolean(inspectorRequest)}
            onClose={() => setSelectedRequest(null)}
            title="Inquiry Detail Inspector"
            subtitle="Sanitized request details, vulnerabilities, and controlled-scenario context."
            maxWidth="1040px"
          >
            {inspectorRequest ? (
              <div className="inspector-panel">
                <div className="inspector-header">
                  <div>
                    <h3>{inspectorRequest.id} — {inspectorRequest.citizenName}</h3>
                    <p className="inspector-phone">{inspectorRequest.citizenPhone}</p>
                  </div>
                  <div className="inspector-tags">
                    <span className={`severity-tag severity-${inspectorRequest.severity}`}>
                      {inspectorRequest.severity.toUpperCase()} SEVERITY
                    </span>
                    <StatusBadge status={inspectorRequest.status} />
                  </div>
                </div>

                {inspectorRequest.isAutoPulledProfile && (
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
                    <span className="inspector-value">{inspectorRequest.location.address}</span>
                  </div>

                  {inspectorRequest.location.landmark && (
                    <div className="inspector-row">
                      <span className="inspector-label">Landmark</span>
                      <span className="inspector-value">{inspectorRequest.location.landmark}</span>
                    </div>
                  )}

                  {inspectorRequest.location.houseDescription && (
                    <div className="inspector-row">
                      <span className="inspector-label">House Description</span>
                      <span className="inspector-value">{inspectorRequest.location.houseDescription}</span>
                    </div>
                  )}

                  <div className="inspector-row">
                    <span className="inspector-label">Observed Flood Depth</span>
                    <span className="inspector-value font-mono">
                      {inspectorRequest.floodDepth} ({SEVERITY_CONFIG[inspectorRequest.severity]?.description || 'Critical'})
                    </span>
                  </div>

                  <div className="inspector-row">
                    <span className="inspector-label">Headcount & Vulnerabilities</span>
                    <span className="inspector-value">
                      <strong>{inspectorRequest.headcount} Persons</strong>
                      <VulnerabilitiesBadges vulns={inspectorRequest.vulnerabilities} />
                    </span>
                  </div>

                  <div className="inspector-row">
                    <span className="inspector-label">Medical Alerts</span>
                    <span
                      className="inspector-value"
                      style={{ color: inspectorRequest.medicalNeeds ? 'var(--color-danger-text)' : 'inherit' }}
                    >
                      {inspectorRequest.medicalNeeds
                        ? `🚨 YES: ${inspectorRequest.medicalDetails || 'Urgent medical assistance requested'}`
                        : 'None reported'}
                    </span>
                  </div>
                </div>

                <div className="inspector-actions">
                  {inspectorRequest.status === 'assigned' && (
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(inspectorRequest.id, 'en-route')}
                    >
                      Mark Departed (En Route)
                    </Button>
                  )}

                  {inspectorRequest.status === 'en-route' && (
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(inspectorRequest.id, 'arrived')}
                    >
                      Confirm Arrived at Scene
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </Modal>
        </div>
      )}

      {/* MISSIONS — Active missions & routing oversight */}
      {false && navSection === 'missions' && (
        <div className="dash-grid-2">
          {/* Mission Tracking List */}
          <Section
            title="Active Responses"
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

                      {mis.status === 'arrived' && <span className="dispatcher-ticket__report">Awaiting rescuer field report</span>}
                    </div>
                  </div>
                )
              })}
            </div>

          </Section>

          {/* Interactive Routing Oversight Map */}
          <Section
            title="Flood-Aware Routing Oversight"
            subtitle="Rule-based costs exclude an impassable controlled-scenario edge and recommend an eligible corridor."
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
      {navSection === 'incidents' && (
        <div className="coordinator-incidents-stack">
          <Section
            title="Completed Tickets"
            subtitle="Archive of finalized rescue operations and dispatched teams."
          >
            <div className="completed-tickets-list">
              {missions
                .filter((m) => m.status === 'completed' || m.id === 'MSN-0038' || m.id === 'MSN-0036' || m.id === 'MSN-0034')
                .map((m) => (
                  <div key={m.id} className="completed-ticket-card" style={{ padding: '1rem', background: 'var(--surface-raised)', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{m.id}</strong> · Request: {m.requestId}
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status: Resolved · Evacuation Successful</p>
                    </div>
                    <span className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>Completed</span>
                  </div>
                ))}
            </div>
          </Section>

          <Section
            title="Incident Transactions"
            subtitle="A chronological ledger of completed rescue reports and their recorded outcomes."
          >
            {incidentReports.length === 0 ? (
              <EmptyState
                icon="report"
                title="No field reports yet"
                description="Reports will appear here after an assigned team submits its mission completion notes."
              />
            ) : (
              <div className="incident-transaction-list" role="list" aria-label="Incident report transactions">
                {incidentReports.map((inc) => (
                  <article key={inc.id} className="incident-transaction" role="listitem">
                    <div className="incident-transaction__main">
                      <div className="incident-transaction__identity">
                        <span className="incident-id">{inc.id}</span>
                        <span className="incident-outcome-badge">{inc.outcome}</span>
                      </div>
                      <div className="incident-transaction__fields">
                        <div><span>Mission / Request</span><strong>{inc.missionId} / {inc.requestId}</strong></div>
                        <div><span>Recorded</span><strong>{inc.documentedAt}</strong></div>
                        <div><span>Reported by</span><strong>{inc.reportedBy}</strong></div>
                        <div><span>People evacuated</span><strong>{inc.evacuatedCount}</strong></div>
                        <div><span>Casualties</span><strong>{inc.casualtiesCount}</strong></div>
                      </div>
                    </div>

                    <details className="incident-transaction__details">
                      <summary>View report details</summary>
                      <div className="incident-transaction__notes">
                        <div><span>Delays &amp; complications</span><p>{inc.delaysOrComplications}</p></div>
                        <div><span>Operational notes &amp; medical care</span><p>{inc.operationalNotes}</p></div>
                        <div><span>Suggestions for future operations</span><p>{inc.futureSuggestions}</p></div>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* TEAMS — Rescue team roster management */}
      {navSection === 'teams' && <CreateRescueTeamTab />}

      {/* MAP — Flood-aware routing oversight map */}
      {navSection === 'map' && (
        <div className="dispatcher-map-workspace">
          <Section
            title="Citizen Rescue Operation Route"
            subtitle="Select an active dispatch to inspect its assigned unit, destination, and controlled-scenario route."
          >
            {activeMissionsList.length > 0 ? (
              <>
                <label className="dispatcher-operation-picker">
                  <span>Active rescue operation</span>
                  <select
                    value={selectedMapMission?.id ?? ''}
                    onChange={(event) => setSelectedMapMissionId(event.target.value)}
                    aria-label="Select active rescue operation"
                  >
                    {activeMissionsList.map((mission) => (
                      <option key={mission.id} value={mission.id}>
                        {mission.id} · {mission.requestId} · {mission.status}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedMapMission && (
                  <div className="dispatcher-selected-operation">
                    <div className="dispatcher-selected-operation__head">
                      <div>
                        <span>SELECTED DISPATCH</span>
                        <strong>{selectedMapMission.id} · {selectedMapMission.requestId}</strong>
                      </div>
                      <StatusBadge status={selectedMapMission.status} />
                    </div>
                    <div className="dispatcher-selected-operation__facts">
                      <div>
                        <span>Citizen</span>
                        <strong>{selectedMapRequest?.citizenName ?? 'Unknown citizen'}</strong>
                      </div>
                      <div>
                        <span>Assigned Unit</span>
                        <strong>{selectedMapTeam?.name ?? selectedMapMission.teamId}</strong>
                      </div>
                      <div>
                        <span>Recommended Corridor</span>
                        <strong>{selectedMapMission.suggestedRoute.primary.name}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon="route"
                title="No dispatches to inspect"
                description="Assigned rescue routes will be available here for inspection."
              />
            )}
            <InteractiveFloodMap
              activeStage={selectedMapMission?.status === 'cancelled' ? undefined : selectedMapMission?.status}
              showAlternatives
              routeExplanation={selectedMapMission?.routeDelayExplanation}
              etaMinutes={selectedMapMission?.etaMinutes}
            />
          </Section>
        </div>
      )}

      {/* 3. RESCUE TEAM ASSIGNMENT MODAL */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Rescue Team & Personnel"
        subtitle={`Deploy response unit to Request ${targetReqForAssign?.id} (${targetReqForAssign?.location.address})`}
        maxWidth="560px"
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

          <div className="assign-modal-actions">
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
              uses controlled academic flood and passability values; it does not provide live or guaranteed-safe navigation.
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

      {/* Phase 2: API-backed assignment modal — triggered from CoordinatorPendingQueue */}
      <CoordinatorAssignModal
        isOpen={showApiAssignModal}
        targetRequest={apiTargetRequest}
        onClose={() => {
          setShowApiAssignModal(false)
          setApiTargetRequest(null)
        }}
        onSuccess={() => {
          setApiTargetRequest(null)
        }}
      />
    </div>
  )
}
