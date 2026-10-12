/**
 * CoordinatorAssignModal — Assignment form with real API call and full error handling.
 *
 * UI states covered (UI_STATES.md § Coordinator):
 *   - Conflict (409): assignment conflict or stale version → refresh
 *   - Unauthorized role (403): role not permitted
 *   - System error (503 / network): unavailable + retry
 *   - Success: assignment confirmed + updated state
 *   - Validation error: team selection required
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  assignTeam,
  getTeamRecommendations,
  type ApiRescueRequestSummary,
} from '../../../../api/assignments'
import { ApiErrorBanner } from '../../../../components/ui/ApiErrorBanner'
import { RoleNotice } from '../../../../components/ui/RoleNotice'
import { Modal } from '../../../../components/ui/Modal'
import { Button } from '../../../../components/ui/Button'
import { Icon } from '../../../../components/art/Icon'
import { useMissions } from '../../../../features/missions/MissionContext'
import type { RescueTeam } from '../../../../features/missions/types'
import './CoordinatorAssignModal.css'

interface CoordinatorAssignModalProps {
  isOpen: boolean
  targetRequest: ApiRescueRequestSummary | null
  onClose: () => void
  /** Called on successful assignment so the parent can update its state. */
  onSuccess: () => void
}

export function CoordinatorAssignModal({
  isOpen,
  targetRequest,
  onClose,
  onSuccess,
}: CoordinatorAssignModalProps) {
  const queryClient = useQueryClient()
  // Read available teams from the existing mock context (fallback for when backend teams endpoint is not yet available)
  const { teams } = useMissions()

  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const [assignmentSuccess, setAssignmentSuccess] = useState(false)
  const recommendations = useQuery({
    queryKey: ['team-recommendations', targetRequest?.id],
    queryFn: () => getTeamRecommendations(targetRequest?.id ?? ''),
    enabled: isOpen && Boolean(targetRequest?.id),
    staleTime: 10_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.httpStatus === 429) return false
      return failureCount < 1
    },
  })

  const availableTeams = teams.filter((t: RescueTeam) => t.status === 'available')
  const recommendationCandidates = recommendations.data?.candidates ?? []
  const defaultTeamId = recommendationCandidates[0]?.team_id ?? availableTeams[0]?.id ?? ''
  const effectiveSelectedTeamId = selectedTeamId || defaultTeamId
  const hasSelectableTeam = recommendationCandidates.length > 0 || availableTeams.length > 0

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!targetRequest) throw new Error('No request selected')
      return assignTeam(targetRequest.id, {
        team_id: effectiveSelectedTeamId,
        expected_request_version: targetRequest.version,
      })
    },
    onSuccess: () => {
      setAssignmentSuccess(true)
      setApiError(null)
      // Invalidate the pending-requests query so the queue refreshes automatically
      void queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      setTimeout(() => {
        setAssignmentSuccess(false)
        onSuccess()
        onClose()
      }, 1500)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setApiError(err)
        // On conflict, also refresh the queue so coordinator sees current state
        if (err.isConflict) {
          void queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
        }
      } else {
        setApiError(
          new ApiError(500, 'unknown_error', err instanceof Error ? err.message : 'Unknown error'),
        )
      }
    },
  })

  function handleClose() {
    setApiError(null)
    setAssignmentSuccess(false)
    setSelectedTeamId('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveSelectedTeamId) return
    setApiError(null)
    mutate()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Rescue Team"
      subtitle={
        targetRequest
          ? `Deploy response unit to Request ${targetRequest.id} (${targetRequest.location.address})`
          : undefined
      }
    >
      <div className="assign-modal-body">
        {/* Non-production notice */}
        <p className="proto-notice" role="note">
          <strong>Prototype:</strong> Assignment uses demo role simulation headers (
          <code>X-Demo-Role: coordinator</code>). Not a production operation.
        </p>

        {/* Medical alert */}
        {targetRequest?.medical_needs && (
          <div
            className="fast-track-banner"
            style={{ background: 'var(--color-danger-surface)', color: 'var(--color-danger-text)' }}
          >
            <Icon name="medical" size={20} />
            <span>
              <strong>Medical Emergency Flagged!</strong> Automated recommendation: Attach specialized
              flood medical unit.
            </span>
          </div>
        )}

        {/* Success confirmation */}
        {assignmentSuccess && (
          <div className="alert-banner-success" role="status" aria-live="polite">
            ✓ Assignment confirmed. Queue refreshing…
          </div>
        )}

        {/* Error states */}
        {apiError && !apiError.isForbidden && (
          <ApiErrorBanner
            error={apiError}
            onRetry={() => mutate()}
            onRefresh={() => {
              setApiError(null)
              void queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
              handleClose()
            }}
          />
        )}
        {apiError?.isForbidden && (
          <RoleNotice
            attemptedAction="assign a rescue team"
            currentRole="coordinator"
            requiredRole="coordinator"
          />
        )}
        {recommendations.error instanceof ApiError && (
          <ApiErrorBanner
            error={recommendations.error}
            onRetry={() => void recommendations.refetch()}
          />
        )}

        {/* Assignment form */}
        {!assignmentSuccess && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="assign-team-select">
                Select Available Rescue Team
              </label>
              {recommendations.isLoading ? (
                <p role="status" className="proto-notice">Calculating shortest valid simulated road-distance recommendation…</p>
              ) : recommendationCandidates.length > 0 ? (
                <div className="recommendation-list" role="list">
                  {recommendationCandidates.map((candidate, index) => (
                    <label
                      key={candidate.team_id}
                      role="listitem"
                      className={`recommendation-row ${effectiveSelectedTeamId === candidate.team_id ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="recommended-team"
                        value={candidate.team_id}
                        checked={effectiveSelectedTeamId === candidate.team_id}
                        onChange={() => setSelectedTeamId(candidate.team_id)}
                      />
                      <span>
                        <strong>{index === 0 ? 'Recommended: ' : ''}{candidate.team_name}</strong>
                        <small>
                          {Math.round(candidate.road_distance_m)} m road distance · ETA {Math.ceil(candidate.estimated_travel_time_s / 60)} min · {candidate.station_address ?? 'simulated station'}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              ) : availableTeams.length === 0 ? (
                <div className="empty-state" style={{ padding: '12px 0' }}>
                  <Icon name="volunteers" size={24} />
                  <p>No teams are currently available for dispatch.</p>
                </div>
              ) : (
                <select
                  id="assign-team-select"
                  value={effectiveSelectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="form-select"
                  required
                  aria-required="true"
                  aria-describedby={!effectiveSelectedTeamId ? 'assign-team-error' : undefined}
                >
                  <option value="">— Select a team —</option>
                  {availableTeams.map((t: RescueTeam) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unitType}) — {t.membersCount} crew
                    </option>
                  ))}
                </select>
              )}
              {recommendations.data && recommendationCandidates.length === 0 && (
                <p className="field__error" role="status">
                  No available simulated team has a valid road route. Review exclusions before assigning manually.
                </p>
              )}
              {recommendations.data?.exclusions.length ? (
                <details className="recommendation-exclusions">
                  <summary>Excluded teams ({recommendations.data.exclusions.length})</summary>
                  <ul>
                    {recommendations.data.exclusions.map((item) => (
                      <li key={item.team_id}>{item.team_name}: {item.reason}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {!effectiveSelectedTeamId && (
                <span id="assign-team-error" className="field__error" role="alert">
                  A team selection is required
                </span>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: 14 }}>
              <Button variant="ghost" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isPending || !effectiveSelectedTeamId || !hasSelectableTeam}
                aria-busy={isPending}
              >
                {isPending ? 'Assigning…' : 'Confirm Dispatch Assignment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
