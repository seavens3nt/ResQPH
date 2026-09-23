/**
 * ApiErrorBanner — Displays a structured API error (409 / 403 / 503 / network).
 *
 * UI states covered (UI_STATES.md):
 *   - System error: "the operation failed, preserve safe retry context"
 *   - Conflict:     "show that server state changed … do not silently overwrite"
 *   - Unauthorized role: delegates to RoleNotice for 403
 */
import type { ApiError } from '../../api/assignments'

import './ApiErrorBanner.css'

interface ApiErrorBannerProps {
  error: ApiError
  /** Optional callback shown as a "Retry" button. */
  onRetry?: () => void
  /** Optional callback shown as a "Refresh" button (for conflict states). */
  onRefresh?: () => void
  className?: string
}

const VARIANT: Record<string, { label: string; cssClass: string }> = {
  conflict: { label: 'Conflict', cssClass: 'api-error-banner--conflict' },
  forbidden: { label: 'Not Permitted', cssClass: 'api-error-banner--forbidden' },
  unavailable: { label: 'Service Unavailable', cssClass: 'api-error-banner--unavailable' },
  default: { label: 'Error', cssClass: 'api-error-banner--error' },
}

function variantFor(error: ApiError) {
  if (error.isConflict) return VARIANT.conflict
  if (error.isForbidden) return VARIANT.forbidden
  if (error.isUnavailable) return VARIANT.unavailable
  return VARIANT.default
}

export function ApiErrorBanner({ error, onRetry, onRefresh, className = '' }: ApiErrorBannerProps) {
  const variant = variantFor(error)

  return (
    <div
      className={`api-error-banner ${variant.cssClass} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="api-error-banner__header">
        <span className="api-error-banner__label">{variant.label}</span>
        {error.requestId && (
          <span className="api-error-banner__req-id" aria-label="Request ID">
            ref: {error.requestId}
          </span>
        )}
      </div>

      <p className="api-error-banner__message">{error.message}</p>

      {error.details.length > 0 && (
        <ul className="api-error-banner__details" aria-label="Error details">
          {error.details.map((d, i) => (
            <li key={i}>
              {d.field && <strong>{d.field}: </strong>}
              {d.reason}
            </li>
          ))}
        </ul>
      )}

      <div className="api-error-banner__actions">
        {error.isConflict && onRefresh && (
          <button
            type="button"
            className="api-error-banner__btn api-error-banner__btn--refresh"
            onClick={onRefresh}
          >
            Refresh Current State
          </button>
        )}
        {!error.isForbidden && !error.isConflict && onRetry && (
          <button
            type="button"
            className="api-error-banner__btn api-error-banner__btn--retry"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
