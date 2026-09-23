/**
 * RequestForm — citizen rescue-request submission form.
 *
 * Implements all required UI states per UI_STATES.md:
 *   initial · validating · submitting · validation-error · outside-boundary-error
 *   system-error · success · unauthorized (403) · conflict (409)
 *
 * Form fields are aligned to POST /rescue-requests from API_CONTRACT.md.
 * After a validation or system failure, safe input is preserved.
 * After success, the returned record ID and pending status are shown;
 * no response-time promise is made.
 *
 * Accessibility:
 *   - All inputs have associated <label> elements.
 *   - Errors are rendered in an aria-live="polite" region AND linked to each
 *     input via aria-describedby so assistive technologies announce them.
 *   - Submit button is keyboard-operable (native <button type="submit">).
 *   - Color is never the only indicator (shape + text used alongside).
 */

import { type FormEvent, useId, useState } from 'react'
import { isAxiosError } from 'axios'
import { useCreateRescueRequest } from '../../../../features/requests/hooks'
import {
  FLOOD_LEVEL_OPTIONS,
  VULNERABILITY_OPTIONS,
  type FloodLevel,
  type RescueRequestRecord,
  type VulnerabilityTag,
} from '../../../../features/requests/types'
import {
  CreateRequestSchema,
  UBELT_BOUNDS,
} from '../../../../features/requests/validation'
import { PrototypeNotice } from './PrototypeNotice'

// ---------------------------------------------------------------------------
// Default sanitised demo coordinates (inside U-Belt boundary)
// ---------------------------------------------------------------------------
const DEMO_LNG = 120.9946
const DEMO_LAT = 14.6042

// Human-readable flood level labels (aligned to API contract values)
const FLOOD_LEVEL_LABELS: Record<FloodLevel, string> = {
  none: 'None — dry or draining',
  low: 'Low — ankle-deep (0.1–0.2 m)',
  moderate: 'Moderate — waist-deep (0.5–0.9 m)',
  high: 'High — chest-deep (1.0–1.4 m)',
  unknown: 'Unknown — unsure of depth',
}

interface FieldError {
  [field: string]: string
}

interface RequestFormProps {
  /** Called when the API confirms the request was created */
  onSuccess: (record: RescueRequestRecord) => void
  /** Called when the user wants to dismiss / cancel the form */
  onCancel: () => void
}

export function RequestForm({ onSuccess, onCancel }: RequestFormProps) {
  const uid = useId()

  // Form field state (kept across validation failures — "preserve safe input")
  const [address, setAddress] = useState('Sanitized demonstration address, Sampaloc, Manila')
  const [lngStr, setLngStr] = useState(String(DEMO_LNG))
  const [latStr, setLatStr] = useState(String(DEMO_LAT))
  const [headcountStr, setHeadcountStr] = useState('1')
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityTag[]>([])
  const [medicalNeeds, setMedicalNeeds] = useState(false)
  const [medicalDetails, setMedicalDetails] = useState('')
  const [floodLevel, setFloodLevel] = useState<FloodLevel>('unknown')
  const [situationSummary, setSituationSummary] = useState('')

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null)

  const { mutate, isPending } = useCreateRescueRequest()

  // ---------------------------------------------------------------------------
  // Vulnerability toggle
  // ---------------------------------------------------------------------------
  function toggleVulnerability(tag: VulnerabilityTag) {
    setVulnerabilities((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag],
    )
  }

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setSubmitError(null)
    setSubmitErrorCode(null)

    const lng = parseFloat(lngStr)
    const lat = parseFloat(latStr)
    const headcount = parseInt(headcountStr, 10)

    const raw = {
      location: {
        address,
        point: {
          type: 'Point' as const,
          coordinates: [lng, lat] as [number, number],
        },
      },
      headcount,
      vulnerabilities,
      medical_needs: medicalNeeds,
      medical_details: medicalDetails || undefined,
      reported_flood_level: floodLevel,
      situation_summary: situationSummary || undefined,
    }

    // Client-side Zod validation
    const parsed = CreateRequestSchema.safeParse(raw)
    if (!parsed.success) {
      const errs: FieldError = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        // Surface the outside-boundary error on the coordinates field
        errs[key || 'general'] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    mutate(parsed.data, {
      onSuccess: (record) => {
        onSuccess(record)
      },
      onError: (err) => {
        if (isAxiosError(err) && err.response) {
          const status = err.response.status
          const body = err.response.data as { error?: { code?: string; message?: string }; message?: string } | undefined
          const code = body?.error?.code ?? null
          const msg =
            body?.error?.message ??
            body?.message ??
            err.response.statusText ??
            'The server returned an error.'

          setSubmitErrorCode(code)

          if (status === 403) {
            setSubmitError(
              'The simulated citizen role is not allowed to perform this action. ' +
              'Ensure you are logged in as a citizen.',
            )
          } else if (status === 409) {
            setSubmitError(
              'A conflict occurred on the server. The server state may have changed — ' +
              'please review your request and try again.',
            )
          } else if (status === 422) {
            setSubmitError(msg || 'One or more fields failed server validation.')
          } else if (status === 503) {
            setSubmitError(
              'The service is temporarily unavailable. Your input has been preserved — try again shortly.',
            )
          } else {
            setSubmitError(msg || 'An unexpected error occurred. Your input has been preserved.')
          }
        } else {
          setSubmitError(
            err instanceof Error
              ? err.message
              : 'A network error occurred. Check your connection and try again.',
          )
        }
      },
    })
  }

  // ---------------------------------------------------------------------------
  // Boundary helper text
  // ---------------------------------------------------------------------------
  const boundaryHint = `U-Belt pilot area — Longitude ${UBELT_BOUNDS.west}–${UBELT_BOUNDS.east}, Latitude ${UBELT_BOUNDS.south}–${UBELT_BOUNDS.north}`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <form
      id="citizen-request-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Citizen rescue request form"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <PrototypeNotice variant="form" />

      {/* ── Global error banner ─────────────────────────────────────── */}
      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="submit-error-banner"
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.7rem 0.9rem',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            color: '#7f1d1d',
            fontSize: '0.82rem',
          }}
        >
          <span aria-hidden="true">✕</span>
          <div>
            <strong style={{ display: 'block' }}>
              {submitErrorCode === 'outside_boundary'
                ? 'Location outside boundary'
                : submitErrorCode === 'invalid_input' || submitErrorCode === 'validation_error'
                  ? 'Validation error'
                  : 'Submission failed'}
            </strong>
            {submitError}
          </div>
        </div>
      )}

      {/* ── Location — address ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor={`${uid}-address`}
          style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}
        >
          Location — street address
          <span aria-hidden="true" style={{ color: '#dc2626' }}> *</span>
        </label>
        <input
          id={`${uid}-address`}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street name, barangay, landmark"
          aria-required="true"
          aria-describedby={fieldErrors['location.address'] ? `${uid}-address-err` : undefined}
          aria-invalid={!!fieldErrors['location.address']}
          disabled={isPending}
          style={{
            padding: '0.55rem 0.75rem',
            borderRadius: '6px',
            border: `1px solid ${fieldErrors['location.address'] ? '#dc2626' : '#cbd5e1'}`,
            fontSize: '0.88rem',
          }}
        />
        {fieldErrors['location.address'] && (
          <span
            id={`${uid}-address-err`}
            role="alert"
            style={{ color: '#dc2626', fontSize: '0.77rem' }}
          >
            {fieldErrors['location.address']}
          </span>
        )}
      </div>

      {/* ── Location — coordinates ──────────────────────────────────── */}
      <fieldset
        style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        aria-describedby={`${uid}-coords-hint`}
      >
        <legend style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', padding: '0 4px' }}>
          Coordinates (longitude, latitude)
        </legend>
        <span
          id={`${uid}-coords-hint`}
          style={{ fontSize: '0.75rem', color: '#64748b' }}
        >
          {boundaryHint}
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '120px' }}>
            <label htmlFor={`${uid}-lng`} style={{ fontSize: '0.8rem', color: '#475569' }}>
              Longitude
            </label>
            <input
              id={`${uid}-lng`}
              type="number"
              step="any"
              value={lngStr}
              onChange={(e) => setLngStr(e.target.value)}
              aria-required="true"
              aria-describedby={fieldErrors['location.point.coordinates'] ? `${uid}-coords-err` : `${uid}-coords-hint`}
              aria-invalid={!!fieldErrors['location.point.coordinates']}
              disabled={isPending}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: `1px solid ${fieldErrors['location.point.coordinates'] ? '#dc2626' : '#cbd5e1'}`,
                fontSize: '0.85rem',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '120px' }}>
            <label htmlFor={`${uid}-lat`} style={{ fontSize: '0.8rem', color: '#475569' }}>
              Latitude
            </label>
            <input
              id={`${uid}-lat`}
              type="number"
              step="any"
              value={latStr}
              onChange={(e) => setLatStr(e.target.value)}
              aria-required="true"
              aria-describedby={fieldErrors['location.point.coordinates'] ? `${uid}-coords-err` : `${uid}-coords-hint`}
              aria-invalid={!!fieldErrors['location.point.coordinates']}
              disabled={isPending}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: `1px solid ${fieldErrors['location.point.coordinates'] ? '#dc2626' : '#cbd5e1'}`,
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>
        {fieldErrors['location.point.coordinates'] && (
          <span
            id={`${uid}-coords-err`}
            role="alert"
            style={{ color: '#dc2626', fontSize: '0.77rem' }}
          >
            {fieldErrors['location.point.coordinates']}
          </span>
        )}
      </fieldset>

      {/* ── Headcount ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor={`${uid}-headcount`}
          style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}
        >
          People needing assistance
          <span aria-hidden="true" style={{ color: '#dc2626' }}> *</span>
        </label>
        <input
          id={`${uid}-headcount`}
          type="number"
          min={1}
          max={100}
          value={headcountStr}
          onChange={(e) => setHeadcountStr(e.target.value)}
          aria-required="true"
          aria-describedby={fieldErrors['headcount'] ? `${uid}-headcount-err` : undefined}
          aria-invalid={!!fieldErrors['headcount']}
          disabled={isPending}
          style={{
            padding: '0.55rem 0.75rem',
            borderRadius: '6px',
            border: `1px solid ${fieldErrors['headcount'] ? '#dc2626' : '#cbd5e1'}`,
            fontSize: '0.88rem',
            maxWidth: '120px',
          }}
        />
        {fieldErrors['headcount'] && (
          <span
            id={`${uid}-headcount-err`}
            role="alert"
            style={{ color: '#dc2626', fontSize: '0.77rem' }}
          >
            {fieldErrors['headcount']}
          </span>
        )}
      </div>

      {/* ── Vulnerabilities ─────────────────────────────────────────── */}
      <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
        <legend style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', padding: '0 4px' }}>
          Vulnerabilities (select all that apply)
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {VULNERABILITY_OPTIONS.map((tag) => {
            const checked = vulnerabilities.includes(tag)
            const inputId = `${uid}-vuln-${tag}`
            return (
              <label
                key={tag}
                htmlFor={inputId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: `1px solid ${checked ? '#dc2626' : '#e2e8f0'}`,
                  background: checked ? 'rgba(220,38,38,0.06)' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: checked ? '#991b1b' : '#475569',
                  fontWeight: checked ? 700 : 400,
                }}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleVulnerability(tag)}
                  disabled={isPending}
                  style={{ width: '14px', height: '14px' }}
                />
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* ── Medical needs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', cursor: 'pointer' }}
        >
          <input
            id={`${uid}-medical`}
            type="checkbox"
            checked={medicalNeeds}
            onChange={(e) => setMedicalNeeds(e.target.checked)}
            disabled={isPending}
            style={{ width: '16px', height: '16px' }}
          />
          Medical assistance needed
        </label>
        {medicalNeeds && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              htmlFor={`${uid}-medical-details`}
              style={{ fontSize: '0.8rem', color: '#475569' }}
            >
              Medical details (sanitized — no personal health records)
            </label>
            <input
              id={`${uid}-medical-details`}
              type="text"
              value={medicalDetails}
              onChange={(e) => setMedicalDetails(e.target.value)}
              placeholder="e.g. mobility impairment, oxygen equipment"
              disabled={isPending}
              maxLength={500}
              style={{
                padding: '0.45rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Reported flood level ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor={`${uid}-flood-level`}
          style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}
        >
          Reported flood level
          <span aria-hidden="true" style={{ color: '#dc2626' }}> *</span>
        </label>
        <select
          id={`${uid}-flood-level`}
          value={floodLevel}
          onChange={(e) => setFloodLevel(e.target.value as FloodLevel)}
          aria-required="true"
          aria-describedby={fieldErrors['reported_flood_level'] ? `${uid}-flood-err` : undefined}
          aria-invalid={!!fieldErrors['reported_flood_level']}
          disabled={isPending}
          style={{
            padding: '0.55rem 0.75rem',
            borderRadius: '6px',
            border: `1px solid ${fieldErrors['reported_flood_level'] ? '#dc2626' : '#cbd5e1'}`,
            fontSize: '0.88rem',
            background: '#fff',
            maxWidth: '320px',
          }}
        >
          {FLOOD_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {FLOOD_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
        {fieldErrors['reported_flood_level'] && (
          <span
            id={`${uid}-flood-err`}
            role="alert"
            style={{ color: '#dc2626', fontSize: '0.77rem' }}
          >
            {fieldErrors['reported_flood_level']}
          </span>
        )}
      </div>

      {/* ── Situation summary ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor={`${uid}-situation`}
          style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}
        >
          Situation summary
          <span style={{ fontWeight: 400, color: '#64748b' }}> (optional)</span>
        </label>
        <textarea
          id={`${uid}-situation`}
          value={situationSummary}
          onChange={(e) => setSituationSummary(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Brief description of the situation — sanitized, no personal details."
          disabled={isPending}
          style={{
            padding: '0.55rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.85rem',
            resize: 'vertical',
          }}
        />
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '0.25rem' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '7px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '7px',
            border: 'none',
            background: isPending ? '#f87171' : '#dc2626',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isPending ? (
            <>
              <span aria-hidden="true" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Submitting…
            </>
          ) : (
            'Submit request'
          )}
        </button>
      </div>
    </form>
  )
}
