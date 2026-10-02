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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  assignTeam,
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

  const initialTeam = teams.find(
    (team: RescueTeam) => team.status === 'available' && (!targetRequest?.medical_needs || team.hasMedicalUnit),
  ) ?? teams.find((team: RescueTeam) => team.status === 'available')
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeam?.id ?? '')
  const [apiError, setApiError] = useState<ApiError | null>(null)
  const [assignmentSuccess, setAssignmentSuccess] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!targetRequest || !selectedTeam) throw new Error('No request or available team selected')
      return assignTeam(targetRequest.id, {
        team_id: selectedTeam.id,
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
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam) return
    setApiError(null)
    mutate()
  }

  const availableTeams = teams.filter((t: RescueTeam) => t.status === 'available')
  const selectedTeam = availableTeams.find((team) => team.id === selectedTeamId) ?? null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Rescue Team & Personnel"
      subtitle={
        targetRequest
          ? `Choose an available unit for Request ${targetRequest.id}`
          : undefined
      }
      maxWidth="680px"
    >
      <div className="assign-modal-body">
        {/* Non-production notice */}
        <p className="proto-notice" role="note">
          <strong>Prototype:</strong> Assignment uses demo role simulation headers (
          <code>X-Demo-Role: coordinator</code>). Not a production operation.
        </p>

        {/* Medical alert */}
        {targetRequest?.medical_needs && (
          <div className="assign-medical-alert" role="note">
            <Icon name="medical" size={20} />
            <div>
              <strong>Medical unit requested</strong>
              <span>Prefer a team with a dedicated medical unit. Capabilities are shown on each team.</span>
            </div>
          </div>
        )}

        {targetRequest && (
          <section className="assign-request-summary" aria-label="Request summary">
            <div className="assign-request-summary__heading">
              <span>REQUEST</span>
              <strong>{targetRequest.id}</strong>
            </div>
            <p>{targetRequest.location.address}</p>
            <div className="assign-request-facts">
              <span><strong>{targetRequest.headcount}</strong> people need assistance</span>
              <span><strong>{targetRequest.reported_flood_level}</strong> reported flood level</span>
              <span className={targetRequest.medical_needs ? 'has-medical-need' : ''}>
                {targetRequest.medical_needs ? 'Medical need reported' : 'No medical need reported'}
              </span>
            </div>
          </section>
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

        {/* Assignment form */}
        {!assignmentSuccess && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field assign-team-field">
              <div className="assign-team-field__heading">
                <div>
                  <h4 id="assign-team-label">Available rescue teams</h4>
                  <p>Select a team to see crew and medical-unit capability.</p>
                </div>
                <span>{availableTeams.length} available</span>
              </div>
              {availableTeams.length === 0 ? (
                <div className="empty-state" style={{ padding: '12px 0' }}>
                  <Icon name="volunteers" size={24} />
                  <p>No teams are currently available for dispatch.</p>
                </div>
              ) : (
                <div className="assign-team-options" role="radiogroup" aria-labelledby="assign-team-label">
                  {availableTeams.map((team: RescueTeam) => (
                    <label
                      key={team.id}
                      className={`assign-team-option${selectedTeamId === team.id ? ' is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="assign-team"
                        value={team.id}
                        checked={selectedTeamId === team.id}
                        onChange={() => setSelectedTeamId(team.id)}
                      />
                      <span className="assign-team-option__content">
                        <span className="assign-team-option__topline">
                          <strong>{team.name}</strong>
                          <span className="assign-team-option__status">AVAILABLE</span>
                        </span>
                        <span className="assign-team-option__unit">{team.unitType}</span>
                        <span className="assign-team-option__capabilities">
                          <span>{team.membersCount} crew members</span>
                          <span className={team.hasMedicalUnit ? 'has-medical-unit' : 'no-medical-unit'}>
                            {team.hasMedicalUnit ? 'Medical unit' : 'No medical unit'}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {!selectedTeam && availableTeams.length > 0 && (
                <span id="assign-team-error" className="field__error" role="alert">
                  A team selection is required
                </span>
              )}
            </div>

            {selectedTeam && (
              <div className="assign-selected-summary" aria-live="polite">
                <span>Assigned crew</span>
                <strong>{selectedTeam.membersCount} rescuers · {selectedTeam.unitType}</strong>
                <span>{selectedTeam.hasMedicalUnit ? 'Medical unit available' : 'No dedicated medical unit'}</span>
              </div>
            )}

            <div className="modal-footer" style={{ padding: 0, marginTop: 14 }}>
              <Button variant="ghost" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isPending || !selectedTeam || availableTeams.length === 0}
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
