/**
 * RoleNotice — Shown when the server returns HTTP 403 (role not permitted).
 *
 * UI state covered (UI_STATES.md):
 *   - Unauthorized role: "explain that the simulated role cannot perform the action"
 *
 * Also renders the required non-production prototype notice per PHASE-02.md:
 *   "Visible controlled-scenario and non-production role-simulation notices"
 */

import './RoleNotice.css'

interface RoleNoticeProps {
  /** The action the user attempted (e.g. "assign a rescue team"). */
  attemptedAction: string
  /** The current simulated role (e.g. "rescuer"). */
  currentRole: string
  /** The role(s) allowed to perform this action (e.g. "coordinator"). */
  requiredRole: string
  className?: string
}

export function RoleNotice({ attemptedAction, currentRole, requiredRole, className = '' }: RoleNoticeProps) {
  return (
    <div
      className={`role-notice ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="role-notice__header">
        <span className="role-notice__icon" aria-hidden="true">🔒</span>
        <span className="role-notice__title">Action Not Permitted</span>
      </div>

      <p className="role-notice__body">
        The simulated role <strong>{currentRole}</strong> cannot {attemptedAction}.
        This action requires the <strong>{requiredRole}</strong> role.
      </p>

      <p className="role-notice__proto-disclaimer">
        Role access is controlled by the prototype role-simulation boundary (
        <code>X-Demo-Role</code>). This is not production authentication.
      </p>
    </div>
  )
}
