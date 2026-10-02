import { useState, useRef, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/art/Icon'
import { Modal } from '../../../components/ui/Modal'
import { useMissions } from '../../../features/missions/MissionContext'
import { useAuth } from '../../../features/auth/AuthContext'
import { InteractiveFloodMap } from '../../../features/map/InteractiveFloodMap'
import type { KeyboardEvent } from 'react'
import type { IncidentReport, RescueRequest, RescueTeam, RequestStatus } from '../../../features/missions/types'
import { ApiErrorBanner } from '../../../components/ui/ApiErrorBanner'
import { RoleNotice } from '../../../components/ui/RoleNotice'
import { RescuerOfflineQueue } from './rescuer/RescuerOfflineQueue'
import { RescuerMissionCard } from './rescuer/RescuerMissionCard'
import './rescuer/RescuerView.css'
import {
  listMyMissions,
  updateMissionStatus as apiUpdateMissionStatus,
  nextValidStatus,
  ApiError,
} from '../../../api/missions'
import type { OfflineQueueEntry } from '../../../api/missions'
import {
  EmptyState,
  Section,
  StatusBadge,
  SeverityTag,
  VulnerabilitiesBadges,
} from './shared'
import type { NavSection } from './navTypes'

interface RescuerOverviewMission {
  id: string
  requestId: string
  status: string
  location?: string
}

function RescuerRecordsView({
  reports,
}: {
  reports: IncidentReport[]
}) {
  return (
    <div className="rescuer-records-container">
      <Section title="Rescue Records" subtitle="Operational records and completed rescue mission logs." action={<span className="records-head-icon" aria-hidden="true"><Icon name="shield" size={22} /></span>}>
        <div className="rescuer-records-note">
          <span className="rescuer-records-note__icon"><Icon name="report" size={17} /></span>
          <p>Review completed missions and field reports from this controlled demonstration.</p>
        </div>
      </Section>

      <Section title="Incident Transactions" subtitle="Completed mission reports and their recorded outcomes" action={<span className="records-count-badge"><Icon name="report" size={15} /> {reports.length} {reports.length === 1 ? 'REPORT' : 'REPORTS'}</span>}>
        {reports.length === 0 ? (
          <EmptyState icon="report" title="No field reports yet" description="Mission completion reports will appear here after your team files them." />
        ) : (
          <div className="rescuer-reports-list" role="list" aria-label="Field report transactions">
            {reports.map((rep) => (
              <article key={rep.id} className="rescuer-report-card" role="listitem">
                <div className="rescuer-report-card__main">
                  <div className="rescuer-report-card__banner">
                    <span className="rescuer-report-card__icon"><Icon name="report" size={19} /></span>
                    <span>AFTER-ACTION REPORT</span>
                  </div>
                  <div className="rescuer-record-transaction__identity">
                    <div><strong className="rescuer-record-id">{rep.id}</strong><span className="rescuer-record-request">Mission {rep.missionId}</span></div>
                    <span className="rescuer-record-status">{rep.outcome}</span>
                  </div>
                  <div className="rescuer-record-transaction__fields">
                    <div><span><Icon name="route" size={13} /> Mission / Request</span><strong>{rep.missionId} / {rep.requestId}</strong></div>
                    <div><span><Icon name="clock" size={13} /> Recorded</span><strong>{rep.documentedAt}</strong></div>
                    <div><span><Icon name="user" size={13} /> Reported by</span><strong>{rep.reportedBy}</strong></div>
                    <div><span><Icon name="volunteers" size={13} /> People evacuated</span><strong>{rep.evacuatedCount}</strong></div>
                    <div><span><Icon name="alert" size={13} /> Casualties</span><strong>{rep.casualtiesCount}</strong></div>
                  </div>
                </div>
                <details className="rescuer-record-transaction__details">
                  <summary><Icon name="report" size={15} /> View field report details</summary>
                  <div className="rescuer-record-transaction__notes">
                    <div><span>Delays &amp; complications</span><p>{rep.delaysOrComplications || 'None recorded.'}</p></div>
                    <div><span>Operational notes &amp; medical care</span><p>{rep.operationalNotes || 'None recorded.'}</p></div>
                    <div><span>Suggestions for future operations</span><p>{rep.futureSuggestions || 'None recorded.'}</p></div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </Section>

    </div>
  )
}

function getMemberRole(memberName: string, leadRescuer?: string): string {
  if (leadRescuer && memberName.toLowerCase().includes(leadRescuer.toLowerCase().replace(/^(capt\.|sgt\.|lt\.)\s*/i, ''))) {
    return 'Unit Commander / Lead'
  }
  if (/santos|dizon|valenzuela|capt|sgt|lt\b/i.test(memberName)) return 'Unit Commander / Lead'
  if (/reyes|diver/i.test(memberName)) return 'Water Rescue Diver'
  if (/cruz|medic/i.test(memberName)) return 'Emergency Field Medic'
  if (/garcia|morales|equipment/i.test(memberName)) return 'Logistics & Equipment'
  if (/ramos/i.test(memberName)) return 'Amphibious Specialist'
  if (/fernandez/i.test(memberName)) return 'Field Rescue Responder'
  return 'Field Rescue Responder'
}

function getMemberInitials(name: string): string {
  const clean = name.replace(/^(Capt\.|Sgt\.|Lt\.|PFC\.|Cpl\.|Pvt\.)\s*/i, '').trim()
  const parts = clean.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

function RescuerOverviewCards({
  team,
  missions,
  currentMission,
  user,
}: {
  team: RescueTeam | null
  missions: RescuerOverviewMission[]
  currentMission: { id: string; requestId: string; status: string } | null
  user: { name: string; email: string; role: string } | null
}) {
  const activeCount = missions.filter((m) => !['completed', 'cancelled'].includes(m.status)).length
  const members = team?.members && team.members.length > 0
    ? team.members
    : ['Capt. R. Santos', 'PFC. J. Reyes', 'PFC. M. Cruz', 'Cpl. A. Garcia']
  const [memberSearch, setMemberSearch] = useState('')
  const filteredMembers = members.filter((member) =>
    member.toLowerCase().includes(memberSearch.trim().toLowerCase()),
  )

  return (
    <div className="rescuer-overview-wrapper">
      <div
        className="rescuer-identity-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div className="rescuer-identity-card">
          <div className="rescuer-identity-avatar">
            <Icon name="volunteers" size={26} />
          </div>
          <div className="rescuer-identity-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="rescuer-identity-name">{user?.name || 'Field Rescuer'}</span>
              <span className="rescuer-identity-role-badge">Field Responder</span>
            </div>
            {team ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                <span className="rescuer-identity-team">
                  Unit: <strong>{team.name}</strong> ({team.unitType})
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                  📍 {team.baseLocation || 'Staging Base'} · 📞 {team.contactPhone || '+63 918 123 4567'}
                </span>
              </div>
            ) : (
              <span className="rescuer-identity-team rescuer-identity-team--unassigned">No team assigned</span>
            )}
          </div>
        </div>

        <div
          className="rescuer-quick-stats-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '1.25rem',
            background: 'var(--surface-raised)',
            borderRadius: '12px',
            border: '1px solid var(--border-default)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>Active Tasks</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-brand)' }}>{activeCount}</div>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'var(--border-default)' }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>Target Mission</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {currentMission ? 'Active Deployment' : 'Standby'}
            </div>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'var(--border-default)' }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>Unit Status</span>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: team?.status === 'available' ? '#34d399' : '#60a5fa',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  letterSpacing: '0.04em',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: team?.status === 'available' ? '#10b981' : '#3b82f6',
                    boxShadow: team?.status === 'available' ? '0 0 8px #10b981' : '0 0 8px #3b82f6',
                  }}
                />
                {(team?.status || 'available').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Teammates Roster ("Sino kateam niya") */}
      <div className="rescuer-teammates-panel">
        <div className="teammates-panel-header">
          <div className="teammates-panel-title">
            <Icon name="volunteers" size={18} />
            <span>Unit Teammates & Personnel</span>
          </div>
          <span className="teammates-panel-badge">
            {team?.name || 'Team Alpha'} · {team?.membersCount || 4} responders on duty
          </span>
        </div>
        <div className="teammates-search-box">
          <label htmlFor="rescuer-member-search">Search team members</label>
          <input
            id="rescuer-member-search"
            type="search"
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Search by name"
          />
        </div>
        <div className="teammates-grid">
          {filteredMembers.length > 0 ? filteredMembers.map((member) => {
            const idx = members.indexOf(member)
            const isLead =
              idx === 0 ||
              (team?.leadRescuer &&
                member.toLowerCase().includes(team.leadRescuer.toLowerCase().replace(/^(capt\.|sgt\.|lt\.)\s*/i, '')))
            const isCurrentUser =
              user?.name &&
              (member.toLowerCase().includes(user.name.toLowerCase()) ||
                user.name.toLowerCase().includes(member.toLowerCase()))
            return (
              <div key={member} className={`teammate-card ${isCurrentUser ? 'teammate-card--self' : ''}`}>
                <div className="teammate-avatar">{getMemberInitials(member)}</div>
                <div className="teammate-details">
                  <div className="teammate-name-row">
                    <span className="teammate-name">{member}</span>
                    {isCurrentUser && <span className="teammate-self-tag">You</span>}
                    {isLead && !isCurrentUser && <span className="teammate-lead-tag">Lead</span>}
                  </div>
                  <span className="teammate-role">{getMemberRole(member, team?.leadRescuer)}</span>
                  <div className="teammate-status-row">
                    <span className="teammate-status-dot" />
                    <span className="teammate-status-text">On-Duty</span>
                  </div>
                </div>
              </div>
            )
          }) : (
            <p className="teammates-search-empty">No team members match “{memberSearch}”.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function RescueDetailsList({
  requests,
  missions,
  missionStatus,
  onEnRoute,
  onArrived,
  onComplete,
}: {
  requests: RescueRequest[]
  missions: RescuerOverviewMission[]
  missionStatus?: string
  onEnRoute?: () => void
  onArrived?: () => void
  onComplete?: () => void
}) {
  // Only show active (non-completed, non-cancelled) missions
  const activeRequests = requests.filter((req) =>
    missions.some(
      (m) =>
        m.requestId === req.id &&
        !['completed', 'cancelled'].includes(m.status),
    ),
  )

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    activeRequests[0]?.id ?? null,
  )
  const selectedRequest = activeRequests.find((r) => r.id === selectedRequestId) ?? null

  const STEPS: { key: string; label: string; sub: string }[] = [
    { key: 'assigned', label: 'Deployed', sub: 'Nakatalagang' },
    { key: 'en-route', label: 'En Route', sub: 'Papunta na' },
    { key: 'arrived', label: 'Arrived', sub: 'Nakarating na' },
    { key: 'completed', label: 'Completed', sub: 'Tapos na' },
  ]
  const ORDER = ['assigned', 'en-route', 'arrived', 'completed']
  const currentIdx = ORDER.indexOf(missionStatus ?? 'assigned')

  return (
    <Section
      title="Rescue Target Details"
      subtitle="Active assignments only — completed missions appear in Records"
    >
      {activeRequests.length === 0 ? (
        <EmptyState icon="pin" title="No active rescue targets" description="Assigned rescue requests will appear here when your team receives a mission." />
      ) : (
        <div className="rescue-inquiries-layout">

          {/* ── Ticket selector dropdown ─────────────────────── */}
          <div className="rescue-ticket-select-row">
            <label htmlFor="rescue-ticket-select" className="rescue-ticket-select-label">
              <Icon name="alert" size={14} /> Select Rescue Ticket
            </label>
            <select
              id="rescue-ticket-select"
              className="rescue-ticket-select"
              value={selectedRequestId ?? ''}
              onChange={(e) => setSelectedRequestId(e.target.value)}
            >
              {activeRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.id} — {request.citizenName}{request.medicalNeeds ? ' 🩺' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ── Detail panel ─────────────────────────────────── */}
          {selectedRequest ? (
            <div className="rescue-inquiries-detail">
              {/* Medical alert */}
              {selectedRequest.medicalNeeds && (
                <div className="medical-emergency-alert">
                  <Icon name="medical" size={18} />
                  <div>
                    <strong>🚨 HIGH PRIORITY MEDICAL ALERT</strong>
                    <p>{selectedRequest.medicalDetails || 'Urgent medical assistance required.'}</p>
                  </div>
                </div>
              )}

              <div className="rescue-detail-grid">
                {/* Request info */}
                <div className="rescue-info-block">
                  <span className="rescue-info-label">
                    <Icon name="alert" size={13} /> Request
                  </span>
                  <span className="rescue-info-value">{selectedRequest.id}</span>
                  <span className="rescue-info-sub">Submitted: {selectedRequest.submittedAt}</span>
                  <StatusBadge status={selectedRequest.status} />
                </div>

                {/* Citizen */}
                <div className="rescue-info-block">
                  <span className="rescue-info-label">
                    <Icon name="volunteers" size={13} /> Citizen
                  </span>
                  <span className="rescue-info-value">{selectedRequest.citizenName}</span>
                  <a href={`tel:${selectedRequest.citizenPhone}`} className="citizen-phone-btn">
                    <Icon name="phone" size={13} /> {selectedRequest.citizenPhone}
                  </a>
                </div>

                {/* Location */}
                <div className="rescue-info-block" style={{ gridColumn: '1 / -1' }}>
                  <span className="rescue-info-label">
                    <Icon name="pin" size={13} /> House & Location Description
                  </span>
                  <span className="rescue-info-value">{selectedRequest.location.address}</span>
                  {selectedRequest.location.landmark && (
                    <span className="rescue-info-sub">
                      <strong>Landmark:</strong> {selectedRequest.location.landmark}
                    </span>
                  )}
                  {selectedRequest.location.houseDescription && (
                    <span className="rescue-info-sub">
                      <strong>Structure:</strong> {selectedRequest.location.houseDescription}
                    </span>
                  )}
                  <span className="rescue-info-coords">
                    {selectedRequest.location.coordinates[1].toFixed(5)}° N,{' '}
                    {selectedRequest.location.coordinates[0].toFixed(5)}° E
                  </span>
                </div>

                {/* People & vulnerabilities */}
                <div className="rescue-info-block">
                  <span className="rescue-info-label">
                    <Icon name="volunteers" size={13} /> Vulnerability Breakdown
                  </span>
                  <span className="rescue-info-headcount">{selectedRequest.headcount}</span>
                  <div className="vuln-breakdown-list">
                    <VulnerabilitiesBadges vulns={selectedRequest.vulnerabilities} />
                  </div>
                </div>

                {/* Flood severity */}
                <div className="rescue-info-block">
                  <span className="rescue-info-label">
                    <Icon name="warning" size={13} /> Flood Severity
                  </span>
                  <div className="flood-severity-gauge">
                    <SeverityTag severity={selectedRequest.severity} />
                    <span className="depth-badge depth-chest">{selectedRequest.floodDepth}</span>
                  </div>
                </div>

                {/* Assigned team */}
                <div className="rescue-info-block">
                  <span className="rescue-info-label">
                    <Icon name="shield" size={13} /> Assigned Team
                  </span>
                  {selectedRequest.assignedTeamName ? (
                    <>
                      <span className="rescue-info-value">{selectedRequest.assignedTeamName}</span>
                      {selectedRequest.rescuerCount !== undefined && (
                        <span className="rescue-info-sub">{selectedRequest.rescuerCount} rescuers</span>
                      )}
                      {selectedRequest.hasMedicalUnit && (
                        <span className="rescue-info-sub" style={{ color: '#bfdbfe' }}>🩺 Medical unit included</span>
                      )}
                    </>
                  ) : (
                    <span className="rescue-info-sub" style={{ fontStyle: 'italic' }}>Not yet assigned</span>
                  )}
                </div>

                {/* ETA */}
                {selectedRequest.eta && (
                  <div className="rescue-info-block">
                    <span className="rescue-info-label">
                      <Icon name="route" size={13} /> ETA
                    </span>
                    <span className="rescue-info-value">{selectedRequest.eta}</span>
                  </div>
                )}
              </div>

              {/* ── Mission Lifecycle Control ─────────────────── */}
              {missionStatus && missionStatus !== 'cancelled' && (
                <div className="rescue-target-status-control-card">
                  <div className="status-control-header">
                    <div className="status-control-title">
                      <Icon name="route" size={18} />
                      <span>Mission Lifecycle</span>
                    </div>
                    <StatusBadge status={missionStatus as RequestStatus} />
                  </div>

                  {/* Stepper */}
                  <div className="target-status-stepper">
                    {STEPS.map((step, idx) => {
                      const isCompleted = idx < currentIdx
                      const isActive = idx === currentIdx
                      return (
                        <Fragment key={step.key}>
                          <div
                            className={`status-step${isActive ? ' status-step--active' : ''}${isCompleted ? ' status-step--completed' : ''}`}
                          >
                            <div className="step-circle">
                              {isCompleted ? '✓' : idx + 1}
                            </div>
                            <div className="step-label">
                              <span className="step-name">{step.label}</span>
                              <span className="step-tagalog">{step.sub}</span>
                            </div>
                          </div>
                          {idx < STEPS.length - 1 && (
                            <div
                              className={`status-step-line${isCompleted ? ' status-step-line--filled' : ''}`}
                            />
                          )}
                        </Fragment>
                      )
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="target-status-actions-row">
                    {missionStatus === 'assigned' && onEnRoute && (
                      <Button variant="primary" size="lg" className="btn-enroute" onClick={onEnRoute}>
                        <Icon name="boat" size={18} />
                        <span>TAP EN ROUTE</span>
                      </Button>
                    )}
                    {missionStatus === 'en-route' && onArrived && (
                      <Button
                        variant="primary"
                        size="lg"
                        style={{ background: '#10b981', borderColor: '#059669' }}
                        onClick={onArrived}
                      >
                        <Icon name="pin" size={18} />
                        <span>TAP ARRIVED AT AREA</span>
                      </Button>
                    )}
                    {missionStatus === 'arrived' && onComplete && (
                      <Button
                        variant="primary"
                        size="lg"
                        className="btn-danger-emergency"
                        onClick={onComplete}
                      >
                        <Icon name="check" size={18} />
                        <span>Complete Rescue</span>
                      </Button>
                    )}
                    {missionStatus === 'completed' && (
                      <span className="mission-completed-tag">✓ Mission Completed</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rescue-details-placeholder">
              <Icon name="pin" size={40} />
              <p>Select a ticket above to view details</p>
            </div>
          )}

        </div>
      )}
    </Section>
  )
}

export function RescuerView({ navSection = 'overview' }: { navSection?: NavSection }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const {
    activeRescuerMission,
    requests,
    teams = [],
    missions = [],
    incidentReports = [],
    updateMissionStatus: contextUpdateMissionStatus,
    overrideRoute,
    isOffline,
  } = useMissions()

  // ── Phase 2: Real API mission fetch ─────────────────────────────────────
  const {
    data: apiMissionsData,
    isLoading: isMissionsLoading,
    isError: isMissionsError,
    error: missionsError,
    dataUpdatedAt,
    refetch: refetchMissions,
  } = useQuery({
    queryKey: ['my-missions', user?.email],
    queryFn: () => listMyMissions(),
    staleTime: 30_000,
    enabled: !isOffline,
    retry: false,
  })

  // Use the first API mission if available, else fall back to mock context
  const apiMission = apiMissionsData?.[0] ?? null
  const mission = activeRescuerMission  // keep mock-context mission for existing JSX
  const targetRequest = mission
    ? requests.find((r: RescueRequest) => r.id === mission.requestId)
    : null
  const rescuerTeamId = apiMission?.team_id ?? mission?.teamId
  const rescuerTeam = teams.find((team) => team.id === rescuerTeamId) ?? null
  const currentMissionOverview = apiMission
    ? { id: apiMission.id, requestId: apiMission.request_id, status: apiMission.status }
    : mission
      ? { id: mission.id, requestId: mission.requestId, status: mission.status }
      : null
  const openMissions: RescuerOverviewMission[] = apiMissionsData && apiMissionsData.length > 0
    ? apiMissionsData
        .filter((openMission) => !['completed', 'cancelled'].includes(openMission.status))
        .map((openMission) => ({
          id: openMission.id,
          requestId: openMission.request_id,
          status: openMission.status,
          location: openMission.request_summary?.location.address,
        }))
    : missions
        .filter((openMission) => !['completed', 'cancelled'].includes(openMission.status))
        .map((openMission) => ({
          id: openMission.id,
          requestId: openMission.requestId,
          status: openMission.status,
          location: requests.find((request) => request.id === openMission.requestId)?.location.address,
        }))
  const teamReports = rescuerTeam
    ? incidentReports.filter((report) => report.teamName.toLowerCase().includes(rescuerTeam.name.toLowerCase()))
    : incidentReports

  // ── Offline queue (single-entry spec from RESCUE_LIFECYCLE.md) ───────────
  const [offlineEntry, setOfflineEntry] = useState<OfflineQueueEntry | null>(null)
  const syncAttemptedRef = useRef(false)

  // ── Phase 2: Real API status advance mutation ────────────────────────────
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const { mutate: advanceStatus, isPending: isAdvancing } = useMutation({
    mutationFn: () => {
      if (!apiMission) throw new Error('No mission loaded')
      const next = nextValidStatus(apiMission.status)
      if (!next) throw new Error('No valid next status')
      const eventId = crypto.randomUUID()
      if (isOffline) {
        // Queue for later — spec: at most one queued transition
        const entry: OfflineQueueEntry = {
          localId: eventId,
          missionId: apiMission.id,
          body: {
            event_id: eventId,
            new_status: next,
            expected_mission_version: apiMission.version,
            client_recorded_at: new Date().toISOString(),
            source: 'offline-sync',
          },
          syncState: 'pending',
          enqueuedAt: new Date().toISOString(),
        }
        setOfflineEntry(entry)
        return Promise.resolve(null)
      }
      return apiUpdateMissionStatus(apiMission.id, {
        event_id: eventId,
        new_status: next,
        expected_mission_version: apiMission.version,
        client_recorded_at: new Date().toISOString(),
        source: 'online',
      })
    },
    onSuccess: (result) => {
      setApiError(null)
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['my-missions', user?.email] })
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setApiError(err)
        // On conflict: refresh to show authoritative server state
        if (err.isConflict) void queryClient.invalidateQueries({ queryKey: ['my-missions', user?.email] })
      }
    },
  })

  function handleRetrySync() {
    if (!offlineEntry || isOffline) return
    const entry = offlineEntry
    setOfflineEntry({ ...entry, syncState: 'syncing' })
    syncAttemptedRef.current = true
    apiUpdateMissionStatus(entry.missionId, entry.body)
      .then(() => {
        setOfflineEntry(null)
        void queryClient.invalidateQueries({ queryKey: ['my-missions', user?.email] })
      })
      .catch((err: unknown) => {
        const reason = err instanceof ApiError ? err.message : 'Sync failed'
        setOfflineEntry({ ...entry, syncState: 'failed', failureReason: reason })
        void queryClient.invalidateQueries({ queryKey: ['my-missions', user?.email] })
      })
  }

  // UI States
  const [selectedRouteKey, setSelectedRouteKey] = useState<'primary' | 'alternative'>('primary')
  const [showRouteDetails, setShowRouteDetails] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [evacuatedCount, setEvacuatedCount] = useState(
    targetRequest ? String(targetRequest.headcount) : '4',
  )
  const [rescuerFieldNotes, setRescuerFieldNotes] = useState('')
  const [openMissionsExpanded, setOpenMissionsExpanded] = useState(false)
  const [selectedNavMissionId, setSelectedNavMissionId] = useState<string>(mission?.id ?? '')

  // If no active mission in mock context and API is loading
  if (!mission && isMissionsLoading) {
    return (
      <div className="rescuer-view" aria-busy="true" aria-label="Loading mission">
        <div className="empty-state">
          <span className="coord-queue__spinner" aria-hidden="true" />
          <p>Loading your assigned mission…</p>
        </div>
      </div>
    )
  }

  // Role / system error from API when no context mission exists
  if (!mission && isMissionsError && missionsError instanceof ApiError) {
    if (missionsError.isForbidden) {
      return (
        <div className="rescuer-view">
          <RoleNotice
            attemptedAction="retrieve assigned missions"
            currentRole="current role"
            requiredRole="rescuer"
          />
        </div>
      )
    }
    // System error — show with retry
    return (
      <div className="rescuer-view">
        <ApiErrorBanner
          error={missionsError}
          onRetry={() => void refetchMissions()}
        />
      </div>
    )
  }

  // A real backend mission is authoritative even when no matching mock fixture exists.
  if ((!mission || !targetRequest) && apiMission) {
    return (
      <div className="rescuer-view">
        {apiError && !apiError.isForbidden && (
          <ApiErrorBanner
            error={apiError}
            onRetry={advanceStatus}
            onRefresh={() => void refetchMissions()}
          />
        )}
        {apiError?.isForbidden && (
          <RoleNotice
            attemptedAction="advance mission status"
            currentRole="rescuer"
            requiredRole="assigned rescuer"
          />
        )}
        <RescuerOfflineQueue
          entry={offlineEntry}
          isOffline={isOffline}
          onRetrySync={handleRetrySync}
          onDismissFailed={() => setOfflineEntry(null)}
        />
        {navSection === 'overview' && (
          <>
            <RescuerOverviewCards team={rescuerTeam} missions={openMissions} currentMission={currentMissionOverview} user={user} />
            <Section
              title="Assigned Mission"
              subtitle="Current active deployment. Status updates are visible to citizens and dispatch."
            >
              <RescuerMissionCard
                mission={apiMission}
                lastSyncedAt={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null}
                isStale={isOffline}
                isAdvancing={isAdvancing}
                onAdvanceStatus={advanceStatus}
              />
            </Section>
          </>
        )}
        {navSection === 'inquiries' && (
          <Section title="Rescue Target" subtitle="Request details returned with the assigned mission.">
            {apiMission.request_summary ? (
              <div className="target-details-grid rescuer-api-target-grid">
                <div className="target-card">
                  <span className="target-card-label">Location</span>
                  <h3 className="target-address">{apiMission.request_summary.location.address}</h3>
                  <span className="target-gps">
                    {apiMission.request_summary.location.point.coordinates[1].toFixed(4)}° N,{' '}
                    {apiMission.request_summary.location.point.coordinates[0].toFixed(4)}° E
                  </span>
                </div>
                <div className="target-card">
                  <span className="target-card-label">People &amp; Conditions</span>
                  <p className="target-api-value">{apiMission.request_summary.headcount} people</p>
                  <p className="target-house-desc">Flood level: {apiMission.request_summary.reported_flood_level}</p>
                  {apiMission.request_summary.situation_summary && (
                    <p className="target-house-desc">{apiMission.request_summary.situation_summary}</p>
                  )}
                </div>
                {apiMission.request_summary.medical_needs && (
                  <div className="medical-emergency-alert">
                    <Icon name="medical" size={22} />
                    <div>
                      <strong>MEDICAL NEED REPORTED</strong>
                      <p>Review the request details and follow dispatch guidance.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rescuer-tab-note">Target details were not included in the API mission response.</div>
            )}
          </Section>
        )}
        {navSection === 'missions' && (
          <Section title="Navigation" subtitle="Routing and passability data are not included in this API mission response.">
            <div className="rescuer-tab-note">
              Route guidance is unavailable for this assigned mission. Do not use the controlled-scenario sample map as live navigation.
            </div>
            <InteractiveFloodMap activeStage="none" />
          </Section>
        )}
        {navSection === 'incidents' && (
          <RescuerRecordsView reports={teamReports} />
        )}
      </div>
    )
  }

  // If no active mission
  if (!mission || !targetRequest) {
    return (
      <div className="rescuer-view">
        <RescuerOfflineQueue
          entry={offlineEntry}
          isOffline={isOffline}
          onRetrySync={handleRetrySync}
          onDismissFailed={() => setOfflineEntry(null)}
        />
        {navSection === 'overview' ? (
          <>
            <RescuerOverviewCards team={rescuerTeam} missions={openMissions} currentMission={currentMissionOverview} user={user} />
            <Section title="Standby" subtitle="No active mission assigned. New assignments will appear here.">
              <div className="rescuer-standby-note">
                <Icon name="boat" size={20} />
                <span>No active mission. New assignments will appear here.</span>
              </div>
            </Section>
          </>
        ) : navSection === 'incidents' ? (
          <RescuerRecordsView reports={teamReports} />
        ) : (
          <Section title={navSection === 'inquiries' ? 'Rescue Target' : 'Navigation'}>
            <div className="rescuer-tab-note">
              No active mission is available. The map below shows controlled-scenario data only, not your live location.
            </div>
            {navSection === 'missions' && <InteractiveFloodMap activeStage="none" />}
          </Section>
        )}
      </div>
    )
  }

  // 1. Mission Execution actions (mock context — preserved for existing view JSX)
  function handleStartEnRoute() {
    if (!mission) return
    // Try real API first; fall back to context for demo mode
    if (apiMission) {
      advanceStatus()
    } else {
      contextUpdateMissionStatus(mission.id, 'en-route')
    }
  }

  function handleMarkArrived() {
    if (!mission) return
    if (apiMission) {
      advanceStatus()
    } else {
      contextUpdateMissionStatus(mission.id, 'arrived')
    }
  }

  function handleConfirmCompleted() {
    if (!mission) return
    if (apiMission) {
      advanceStatus()
    } else {
      contextUpdateMissionStatus(
        mission.id,
        'completed',
        rescuerFieldNotes || `Successfully evacuated ${evacuatedCount} residents to evacuation center.`,
      )
    }
    setShowCompleteConfirm(false)
  }

  const primaryRoute = mission.suggestedRoute.primary
  const alternativeRoute = mission.suggestedRoute.alternative

  // ── Navigation tab: per-mission selector ────────────────────────────────
  const activeMissions = missions.filter((m) => !['completed', 'cancelled'].includes(m.status))
  const selectedNavMission = activeMissions.find((m) => m.id === selectedNavMissionId) ?? mission
  const selectedNavRequest = requests.find((r) => r.id === selectedNavMission.requestId)
  const navPrimaryRoute = selectedNavMission.suggestedRoute.primary
  const navAlternativeRoute = selectedNavMission.suggestedRoute.alternative
  const navImpassableRoad = selectedNavMission.suggestedRoute.impassable

  function selectRoute(routeKey: 'primary' | 'alternative') {
    const route = routeKey === 'primary' ? navPrimaryRoute : navAlternativeRoute
    setSelectedRouteKey(routeKey)
    setShowRouteDetails(true)
    overrideRoute(
      selectedNavMission.id,
      route.name,
      routeKey === 'primary'
        ? 'Selected primary recommended corridor'
        : 'Rescuer opted for alternative detour',
    )
  }

  function handleRouteCardKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    routeKey: 'primary' | 'alternative',
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectRoute(routeKey)
    }
  }

  return (
    <div className="rescuer-view rescuer-view--overview">
      {/* Phase 2: API error banner for status-advance failures */}
      {apiError && !apiError.isForbidden && (
        <ApiErrorBanner
          error={apiError}
          onRetry={advanceStatus}
          onRefresh={() => void refetchMissions()}
        />
      )}
      {apiError?.isForbidden && (
        <RoleNotice
          attemptedAction="advance mission status"
          currentRole="rescuer"
          requiredRole="assigned rescuer"
        />
      )}

      {/* Phase 2: Offline sync queue */}
      <RescuerOfflineQueue
        entry={offlineEntry}
        isOffline={isOffline}
        onRetrySync={handleRetrySync}
        onDismissFailed={() => setOfflineEntry(null)}
      />

      {/* OVERVIEW - Main container for rescuer view */}
      {navSection === 'overview' && (
        <div className="overview-container">


          {/* Phase 2: Live API Mission card with sync badge & status history */}
          {apiMission && (
            <RescuerMissionCard
              mission={apiMission}
              lastSyncedAt={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null}
              isStale={isOffline}
              isAdvancing={isAdvancing}
              onAdvanceStatus={advanceStatus}
            />
          )}

          {/* Rescuer Operational Stats */}
          <Section
            title="Assigned Team & Progress"
            subtitle="Unit personnel, deployment status, and assigned teammates roster."
          >
            {/* Screen-reader accessible timeline preserved for accessibility / contract testing */}
            <ol
              className="mission-progress-timeline sr-only"
              aria-label="Mission progress"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              <li style={{ fontWeight: ['assigned', 'en-route', 'arrived', 'completed'].includes(mission.status) ? 700 : 400 }}>
                ✓ Assigned
              </li>
              <li style={{ fontWeight: ['en-route', 'arrived', 'completed'].includes(mission.status) ? 700 : 400 }}>
                {['en-route', 'arrived', 'completed'].includes(mission.status) ? '✓' : '○'} En Route
              </li>
              <li style={{ fontWeight: ['arrived', 'completed'].includes(mission.status) ? 700 : 400 }}>
                {['arrived', 'completed'].includes(mission.status) ? '✓' : '○'} Arrived at Scene
              </li>
              <li style={{ fontWeight: mission.status === 'completed' ? 700 : 400 }}>
                {mission.status === 'completed' ? '✓' : '○'} Completed
              </li>
            </ol>

            <RescuerOverviewCards team={rescuerTeam} missions={openMissions} currentMission={currentMissionOverview} user={user} />

            {/* En Route Advisory — live when navigating, contextual for other states */}
            {mission.status === 'en-route' ? (
              <div className="enroute-reroute-explanation-card">
                <div className="reroute-header">
                  <span className="live-indicator-dot" />
                  <span className="reroute-title">ACTIVE EN ROUTE STATUS ADVISORY</span>
                  <span className="reroute-source">Prototype status shared across role views</span>
                </div>
                <p className="reroute-message">
                  &ldquo;{mission.routeDelayExplanation}&rdquo;
                </p>
                <div className="reroute-eta-row">
                  <span>⏱️ Transit Target: <strong>{mission.etaMinutes} minutes</strong></span>
                  <span>🛣️ Active Corridor: <strong>{mission.activeRouteName}</strong></span>
                </div>
              </div>
            ) : null}
          </Section>

          <Section
            title="Open Missions"
            subtitle="Missions queued and assigned to this emergency response team."
          >
            {openMissions.length === 0 ? (
              <EmptyState icon="boat" title="No open missions" description="Missions assigned to your team will appear here." />
            ) : (
              <div className="open-missions-container">
                <ol className="rescuer-open-mission-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(openMissionsExpanded ? openMissions : openMissions.slice(0, 3)).map((m) => (
                    <li key={m.id} className="open-mission-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '8px' }}>
                      <strong>{m.id}</strong>
                      <StatusBadge status={m.status as RequestStatus} />
                      <span>Request: {m.requestId}</span>
                    </li>
                  ))}
                </ol>
                {openMissions.length > 3 && (
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    aria-expanded={openMissionsExpanded}
                    onClick={() => setOpenMissionsExpanded((prev) => !prev)}
                    style={{ marginTop: '8px' }}
                  >
                    {openMissionsExpanded ? 'Show fewer missions' : `Show all ${openMissions.length} missions`}
                  </button>
                )}
              </div>
            )}
          </Section>
        </div>
      )}

      {navSection === 'inquiries' && (
        <RescueDetailsList
          requests={requests}
          missions={openMissions}
          missionStatus={mission.status}
          onEnRoute={handleStartEnRoute}
          onArrived={handleMarkArrived}
          onComplete={() => setShowCompleteConfirm(true)}
        />
      )}

      {/* 3. AUTOMATED REROUTING & NAVIGATION VIEW */}
      {navSection === 'missions' && <Section
        title="Flood-Aware Navigation & Rerouting Engine"
        subtitle="Deterministic route costs using controlled flood and passability rules."
      >
        <div className="flood-navigation-panel">
        {/* Mission picker dropdown */}
        <div className="rescue-ticket-select-row flood-navigation-mission-picker">
          <label htmlFor="nav-mission-select" className="rescue-ticket-select-label">
            <Icon name="alert" size={14} /> Select Mission
          </label>
          <select
            id="nav-mission-select"
            className="rescue-ticket-select"
            value={selectedNavMissionId}
            onChange={(e) => {
              setSelectedNavMissionId(e.target.value)
              setSelectedRouteKey('primary')
              setShowRouteDetails(false)
            }}
          >
            {activeMissions.map((m) => {
              const req = requests.find((r) => r.id === m.requestId)
              return (
                <option key={m.id} value={m.id}>
                  {m.id}{req ? ` — ${req.citizenName}` : ''}
                </option>
              )
            })}
          </select>
        </div>

        {selectedNavRequest && (
          <p className="rescuer-tab-note flood-navigation-target">
            Showing route for <strong>{selectedNavRequest.citizenName}</strong> · {selectedNavRequest.location.address}
          </p>
        )}

        {/* Impassable Alert Box */}
        <div className="impassable-alert-box flood-navigation-hazard">
          <div className="impassable-icon">
            <Icon name="warning" size={24} />
          </div>
          <div className="impassable-body">
            <div className="impassable-tag">HAZARD · ROAD EXCLUDED</div>
            <h4>{navImpassableRoad.name} — impassable</h4>
            <p>
              Controlled-scenario depth: <strong>{navImpassableRoad.waterDepth}</strong> · vehicle limit:{' '}
              <strong>{navImpassableRoad.threshold}</strong>. This road is excluded.
            </p>
          </div>
        </div>

        {!showRouteDetails ? (
          <div className="route-reveal-prompt">
            <div>
              <strong>Alternate corridor available</strong>
              <span>{navImpassableRoad.name} is excluded in this controlled scenario.</span>
            </div>
            <Button variant="primary" onClick={() => selectRoute('primary')}>
              Use recommended route
            </Button>
          </div>
        ) : (
          <>
            <div className="route-selection-confirmation" role="status">
              <span>
                ✓ {selectedRouteKey === 'primary' ? 'Recommended route' : 'Alternative detour'} selected
              </span>
              <button type="button" onClick={() => setShowRouteDetails(false)}>
                Hide route details
              </button>
            </div>

            {/* Route Comparison Options */}
            <div className="route-comparison-grid" role="group" aria-label="Select rescue route">
              <div
                className={`route-card ${selectedRouteKey === 'primary' ? 'is-selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Select recommended route: ${navPrimaryRoute.name}, scenario score ${navPrimaryRoute.safetyScore} out of 100`}
                aria-pressed={selectedRouteKey === 'primary'}
                onClick={() => selectRoute('primary')}
                onKeyDown={(event) => handleRouteCardKeyDown(event, 'primary')}
              >
                <div className="route-card-head">
                  <span className="route-badge-recommended">RECOMMENDED ROUTE</span>
                  <span className="route-score">
                    <small>SCENARIO SCORE</small>{navPrimaryRoute.safetyScore}<span>/100</span>
                  </span>
                </div>
                <h4>{navPrimaryRoute.name}</h4>
                <div className="route-metrics">
                  <span><small>ESTIMATED TIME</small><strong>{navPrimaryRoute.estimatedMinutes} min</strong></span>
                  <span><small>WATER DEPTH</small><strong>{navPrimaryRoute.waterDepth}</strong></span>
                  <span><small>ELEVATION</small><strong>{navPrimaryRoute.elevation}</strong></span>
                </div>
                <p className="route-explanation">{navPrimaryRoute.explanation}</p>
              </div>

              <div
                className={`route-card ${selectedRouteKey === 'alternative' ? 'is-selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Select alternative route: ${navAlternativeRoute.name}, scenario score ${navAlternativeRoute.safetyScore} out of 100`}
                aria-pressed={selectedRouteKey === 'alternative'}
                onClick={() => selectRoute('alternative')}
                onKeyDown={(event) => handleRouteCardKeyDown(event, 'alternative')}
              >
                <div className="route-card-head">
                  <span className="route-badge-alternative">ALTERNATIVE DETOUR</span>
                  <span className="route-score">
                    <small>SCENARIO SCORE</small>{navAlternativeRoute.safetyScore}<span>/100</span>
                  </span>
                </div>
                <h4>{navAlternativeRoute.name}</h4>
                <div className="route-metrics">
                  <span><small>ESTIMATED TIME</small><strong>{navAlternativeRoute.estimatedMinutes} min</strong></span>
                  <span><small>WATER DEPTH</small><strong>{navAlternativeRoute.waterDepth}</strong></span>
                  <span><small>ELEVATION</small><strong>{navAlternativeRoute.elevation}</strong></span>
                </div>
                <p className="route-explanation">{navAlternativeRoute.explanation}</p>
              </div>
            </div>
          </>
        )}
        </div>
      </Section>}

      {navSection === 'missions' && showRouteDetails && <div className="rescuer-navigation-map-note">
        <div className="rescuer-navigation-map-heading">
          <div>
            <span className="rescuer-navigation-map-kicker">ROUTE PREVIEW</span>
          <h3>Selected route map</h3>
          </div>
          <p>Controlled U-Belt scenario · Hindi live GPS o garantisadong ligtas na nabigasyon</p>
        </div>
        <InteractiveFloodMap
          activeStage={selectedNavMission.status === 'cancelled' ? undefined : selectedNavMission.status}
          selectedRoute={selectedRouteKey}
          onSelectRoute={(r: 'primary' | 'alternative') => setSelectedRouteKey(r)}
          showRouteAdvisory={false}
          showRouteRationale={false}
          routeExplanation={selectedNavMission.routeDelayExplanation}
          etaMinutes={selectedNavMission.etaMinutes}
        />
      </div>}

      {navSection === 'incidents' && (
        <RescuerRecordsView reports={teamReports} />
      )}

      {/* 4. Complete Rescue Confirmation Modal */}
      <Modal
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        title="Confirm Rescue Completion"
        subtitle="Verify all affected citizens are safely secured and transferred."
        maxWidth="600px"
      >
        <div className="complete-modal-content">
          <div className="complete-modal-field complete-modal-count-field">
            <label className="field__label" htmlFor="evacuated-count">Confirmed number of evacuees rescued</label>
            <input
              id="evacuated-count"
              type="number"
              value={evacuatedCount}
              onChange={(e) => setEvacuatedCount(e.target.value)}
              min="1"
              inputMode="numeric"
            />
          </div>

          <div className="complete-modal-field">
            <label className="field__label" htmlFor="rescuer-field-notes">Field notes and evacuation observations</label>
            <textarea
              id="rescuer-field-notes"
              rows={3}
              placeholder="E.g., All 4 family members secured. Minor asthma symptoms treated with onboard inhaler. Transferred to NU Gymnasium evacuation center."
              value={rescuerFieldNotes}
              onChange={(e) => setRescuerFieldNotes(e.target.value)}
            />
          </div>

          <div className="complete-modal-state-notice" role="note">
            <Icon name="alert" size={16} />
            <p>
              Closing this prototype mission updates the shared demonstration state and resets your craft status to{' '}
              <strong>AVAILABLE</strong>.
            </p>
          </div>

          <div className="modal-footer">
            <Button variant="ghost" onClick={() => setShowCompleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="btn-danger-emergency"
              onClick={handleConfirmCompleted}
            >
              ✓ Confirm Rescue Completed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
