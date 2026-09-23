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
import { useAuth } from '../../../../features/auth/AuthContext'
import { useCreateRescueRequest } from '../../../../features/requests/hooks'
import {
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
import { RequestLocationMap } from './RequestLocationMap'

// ---------------------------------------------------------------------------
// Default sanitised demo coordinates (inside U-Belt boundary)
// ---------------------------------------------------------------------------
const DEMO_LNG = 120.9946
const DEMO_LAT = 14.6042

interface FieldError {
  [field: string]: string
}

interface RequestFormProps {
  initialFloodLevel?: FloodLevel
  /** Called when the API confirms the request was created */
  onSuccess: (record: RescueRequestRecord) => void
  /** Called when the user wants to dismiss / cancel the form */
  onCancel: () => void
}

export function RequestForm({ onSuccess, onCancel, initialFloodLevel = 'unknown' }: RequestFormProps) {
  const uid = useId()
  const { user } = useAuth()
  const savedLocation = user?.homeLocation

  // Form field state (kept across validation failures — "preserve safe input")
  const [address, setAddress] = useState(savedLocation?.address ?? 'Sanitized demonstration address, Sampaloc, Manila')
  const [lngStr, setLngStr] = useState(String(savedLocation?.coordinates[0] ?? DEMO_LNG))
  const [latStr, setLatStr] = useState(String(savedLocation?.coordinates[1] ?? DEMO_LAT))
  const [locationSource, setLocationSource] = useState<'profile' | 'gps' | 'demo' | 'map'>(savedLocation ? 'profile' : 'demo')
  const [isLocating, setIsLocating] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [headcountStr, setHeadcountStr] = useState('1')
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityTag[]>([])
  const [medicalNeeds, setMedicalNeeds] = useState(false)
  const [medicalDetails, setMedicalDetails] = useState('')
  const [situationSummary, setSituationSummary] = useState('')

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null)

  const { mutate, isPending } = useCreateRescueRequest()

  function chooseLocationSource(source: 'profile' | 'gps' | 'demo') {
    setGpsError('')
    if (source === 'profile' && savedLocation) {
      setAddress(savedLocation.address)
      setLngStr(String(savedLocation.coordinates[0]))
      setLatStr(String(savedLocation.coordinates[1]))
      setLocationSource('profile')
      return
    }
    if (source === 'demo') {
      setAddress('Sanitized demonstration address, Sampaloc, Manila')
      setLngStr(String(DEMO_LNG))
      setLatStr(String(DEMO_LAT))
      setLocationSource('demo')
      return
    }

    if (!navigator.geolocation) {
      setGpsError('GPS is not available in this browser. Choose your saved or demonstration location instead.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setAddress('')
        setLngStr(String(coords.longitude))
        setLatStr(String(coords.latitude))
        setLocationSource('gps')
        setIsLocating(false)
      },
      () => {
        setGpsError('Could not get your GPS location. Allow location access or choose another location source.')
        setIsLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  function chooseMapCoordinates(coordinates: [number, number]) {
    setLngStr(String(coordinates[0]))
    setLatStr(String(coordinates[1]))
    setAddress('')
    setLocationSource('map')
    setGpsError('')
  }

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
      // Flood depth is collected once in SOS triage and carried into the API request.
      reported_flood_level: initialFloodLevel,
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

      <div style={{ padding: '0.75rem 0.9rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0f172a' }}>Start with the essentials</strong>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Add a location and number of people. Extra details are optional.</span>
      </div>

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
        <RequestLocationMap
          coordinates={[
            Number.isFinite(parseFloat(lngStr)) ? parseFloat(lngStr) : DEMO_LNG,
            Number.isFinite(parseFloat(latStr)) ? parseFloat(latStr) : DEMO_LAT,
          ]}
          source={locationSource}
          hasSavedLocation={!!savedLocation}
          isLocating={isLocating}
          disabled={isPending}
          gpsError={gpsError}
          onChooseSource={chooseLocationSource}
          onChooseCoordinates={chooseMapCoordinates}
        />
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
          placeholder={locationSource === 'gps' || locationSource === 'map' ? 'Enter street name, barangay, or landmark' : 'Street name, barangay, landmark'}
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
      <details style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
        <summary style={{ cursor: 'pointer', color: '#334155', fontWeight: 600, fontSize: '0.84rem' }}>
          Adjust map coordinates
          <span style={{ display: 'block', marginTop: '3px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
            Coordinates come from your chosen source and can be adjusted here.
          </span>
        </summary>
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
      </details>

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
      <details style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
        <summary style={{ cursor: 'pointer', color: '#334155', fontWeight: 600, fontSize: '0.84rem' }}>
          Add details for responders (optional)
          <span style={{ display: 'block', marginTop: '3px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
            Note who may need extra help and describe the situation.
          </span>
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.9rem' }}>
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
        </div>
      </details>

      {/* ── Situation summary ───────────────────────────────────────── */}
      <details style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
        <summary style={{ cursor: 'pointer', color: '#334155', fontWeight: 600, fontSize: '0.84rem' }}>
          Describe the immediate conditions (optional)
          <span style={{ display: 'block', marginTop: '3px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
            Water movement, blocked exits, or urgent needs.
          </span>
        </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.9rem' }}>
        <label
          htmlFor={`${uid}-situation`}
          style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}
        >
          What is happening right now?
          <span style={{ fontWeight: 400, color: '#64748b' }}> (optional)</span>
        </label>
        <span id={`${uid}-situation-hint`} style={{ fontSize: '0.77rem', color: '#64748b' }}>
          Share what happened, whether the water is rising, any blocked exits, or urgent assistance needed. Do not include personal details.
        </span>
        <textarea
          id={`${uid}-situation`}
          value={situationSummary}
          onChange={(e) => setSituationSummary(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Example: Water is rising inside the ground floor; the front exit is blocked."
          aria-describedby={`${uid}-situation-hint`}
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
      </details>

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
          disabled={isPending || isLocating}
          aria-busy={isPending || isLocating}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '7px',
            border: 'none',
            background: isPending || isLocating ? '#f87171' : '#dc2626',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: isPending || isLocating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isLocating ? (
            'Getting location…'
          ) : isPending ? (
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
