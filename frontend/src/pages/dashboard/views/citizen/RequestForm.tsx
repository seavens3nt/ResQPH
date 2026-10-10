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

import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useCreateRescueRequest } from '../../../../features/requests/hooks'
import {
  VULNERABILITY_OPTIONS,
  type FloodLevel,
  type RescueRequestRecord,
  type VulnerabilityTag,
} from '../../../../features/requests/types'
import {
  CreateRequestSchema,
} from '../../../../features/requests/validation'
import { RequestLocationMap } from './RequestLocationMap'
import { RequestReview } from './RequestReview'
import { useCitizenDraft } from '../../../../features/workspace/CitizenDraftContext'

// ---------------------------------------------------------------------------
// Default sanitised demo coordinates (inside U-Belt boundary)
// ---------------------------------------------------------------------------
const DEMO_LNG = 120.9946
const DEMO_LAT = 14.6042

interface FieldError {
  [field: string]: string
}

interface RequestFormProps {
  modalLayout?: boolean
  onBusyChange?: (busy: boolean) => void
  requireReview?: boolean
  initialFloodLevel?: FloodLevel
  /** Called when the API confirms the request was created */
  onSuccess: (record: RescueRequestRecord) => void
  /** Called when the user wants to dismiss / cancel the form */
  onCancel: () => void
}

export function RequestForm({ onSuccess, onCancel, initialFloodLevel = 'unknown', requireReview = false, modalLayout = false, onBusyChange }: RequestFormProps) {
  const uid = useId()
  const draftContext = useCitizenDraft()
  const draft = draftContext?.draft
  const saveDraft = draftContext?.saveDraft
  const formRef = useRef<HTMLFormElement>(null)

  // Form field state (kept across validation failures — "preserve safe input")
  const [address, setAddress] = useState(draft?.address ?? 'Sanitized demonstration address, Sampaloc, Manila')
  const [lngStr, setLngStr] = useState(draft?.lngStr ?? String(DEMO_LNG))
  const [latStr, setLatStr] = useState(draft?.latStr ?? String(DEMO_LAT))
  const [locationSource, setLocationSource] = useState<'gps' | 'demo' | 'map'>(draft?.locationSource ?? 'demo')
  const [isLocating, setIsLocating] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [headcountStr, setHeadcountStr] = useState(draft?.headcountStr ?? '1')
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityTag[]>(draft?.vulnerabilities ?? [])
  const [medicalNeeds, setMedicalNeeds] = useState(draft?.medicalNeeds ?? false)
  const [medicalDetails, setMedicalDetails] = useState(draft?.medicalDetails ?? '')
  const [situationSummary, setSituationSummary] = useState(draft?.situationSummary ?? '')

  // UI state
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null)
  const [review, setReview] = useState(false)
  const [floodLevel, setFloodLevel] = useState<FloodLevel>(draft?.floodLevel ?? initialFloodLevel)

  useEffect(() => {
    const dirty = address !== 'Sanitized demonstration address, Sampaloc, Manila' ||
      lngStr !== String(DEMO_LNG) || latStr !== String(DEMO_LAT) || locationSource !== 'demo' ||
      headcountStr !== '1' || vulnerabilities.length > 0 || medicalNeeds || medicalDetails !== '' ||
      situationSummary !== '' || floodLevel !== initialFloodLevel
    saveDraft?.(dirty ? { address, lngStr, latStr, locationSource, headcountStr, vulnerabilities,
      medicalNeeds, medicalDetails, situationSummary, floodLevel } : null)
  }, [address, lngStr, latStr, locationSource, headcountStr, vulnerabilities, medicalNeeds,
    medicalDetails, situationSummary, floodLevel, initialFloodLevel, saveDraft])

  useEffect(() => {
    if (Object.keys(fieldErrors).length) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    }
  }, [fieldErrors])

  const { mutate, isPending } = useCreateRescueRequest()
  const wasReview = useRef(false)
  useEffect(() => { onBusyChange?.(isPending) }, [isPending, onBusyChange])
  useEffect(() => {
    if (review) formRef.current?.querySelector<HTMLElement>('.request-review h3')?.focus()
    else if (wasReview.current) formRef.current?.querySelector<HTMLElement>('input[type=text]')?.focus()
    wasReview.current = review
  }, [review])

  function chooseLocationSource(source: 'gps' | 'demo') {
    setGpsError('')
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

    const lng = lngStr.trim() ? Number(lngStr) : NaN
    const lat = latStr.trim() ? Number(latStr) : NaN
    const headcount = headcountStr.trim() ? Number(headcountStr) : NaN

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
      reported_flood_level: floodLevel,
      situation_summary: situationSummary || undefined,
    }

    // Client-side Zod validation
    const parsed = CreateRequestSchema.safeParse(raw)
    if (!parsed.success) {
      const errs: FieldError = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        const key = path.startsWith('location.point.coordinates') ? 'location.point.coordinates' : path
        // Surface the outside-boundary error on the coordinates field
        errs[key || 'general'] = path.endsWith('coordinates.0')
          ? 'Enter a valid longitude between -180 and 180, then check the U-Belt location.'
          : path.endsWith('coordinates.1')
            ? 'Enter a valid latitude between -90 and 90, then check the U-Belt location.'
            : issue.message
      }
      setFieldErrors(errs)
      return
    }

    if (requireReview && !review) { setReview(true); return }
    mutate(parsed.data, {
      onSuccess: (record) => {
        saveDraft?.(null)
        onSuccess(record)
      },
      onError: (err) => {
        setReview(false)
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
          setSubmitError('Could not reach the request service. Your details have been preserved. Check your connection and try again; if this continues, ask the project team to check the API.')
        }
      },
    })
  }

  // ---------------------------------------------------------------------------
  // Boundary helper text
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <form
      ref={formRef}
      id="citizen-request-form"
      className={modalLayout ? `request-form-modal${review ? ' is-reviewing' : ''}` : undefined}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Citizen rescue request form"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {Object.keys(fieldErrors).length > 0 && <div className="request-error-summary" role="alert">
        <strong>Check your request before continuing</strong>
        <ul>{[...new Set(Object.values(fieldErrors))].map(message => <li key={message}>{message}</li>)}</ul>
        <p>Your details are still here. Correct the highlighted fields, then try again.</p>
      </div>}
      {review && <RequestReview coordinates={[Number(lngStr),Number(latStr)]} source={locationSource} address={address} headcount={headcountStr} floodLevel={floodLevel} situation={situationSummary} accessibility={vulnerabilities.join(', ')} medical={medicalNeeds ? medicalDetails || 'Medical assistance requested' : ''}/>}
      <fieldset className="request-edit-fields" disabled={isPending || review} style={{border: 0, padding: 0, display: review ? 'none' : 'contents'}}>

      <div className="request-essentials" style={{ padding: '0.75rem 0.9rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
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
      <div className="request-location-fields" style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <RequestLocationMap
          coordinates={[
            Number.isFinite(parseFloat(lngStr)) ? parseFloat(lngStr) : DEMO_LNG,
            Number.isFinite(parseFloat(latStr)) ? parseFloat(latStr) : DEMO_LAT,
          ]}
          source={locationSource}
          showInstruction={!modalLayout}
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
      {modalLayout && <p className="workspace-caption">Controlled U-Belt pilot map. Click the map to place the request marker; coordinates outside the pilot boundary cannot be submitted.</p>}

      {fieldErrors['location.point.coordinates'] && <p id={`${uid}-coords-err`} role="alert" tabIndex={-1} aria-invalid="true" style={{color:'#dc2626'}}>{fieldErrors['location.point.coordinates']} Choose a location inside the pilot area using the map or demonstration location.</p>}
      </div>
      <div className="request-assistance-fields" style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      {requireReview && <label className="request-flood-field">Reported flood level<select value={floodLevel} onChange={e => setFloodLevel(e.target.value as FloodLevel)}>{['none','low','moderate','high','unknown'].map(v => <option key={v}>{v}</option>)}</select></label>}

      {/* ── Headcount ───────────────────────────────────────────────── */}
      <div className="request-people-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
      <section className="request-responder-section" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
        <h3 style={{ color: '#334155', fontWeight: 600, fontSize: '0.84rem' }}>
          Add details for responders (optional)
          <span style={{ display: 'block', marginTop: '3px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
            Note who may need extra help and describe the situation.
          </span>
        </h3>
        <div className="request-responder-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.9rem' }}>
      <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
        <legend style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', padding: '0 4px' }}>
          Vulnerabilities (select all that apply)
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
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
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  minHeight: '40px',
                  boxSizing: 'border-box',
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
          <div className="request-medical-details" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
      </div>
        </div>
      </section>

      {/* ── Situation summary ───────────────────────────────────────── */}
      <section className="request-conditions-section" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
        <h3 style={{ color: '#334155', fontWeight: 600, fontSize: '0.84rem' }}>
          Describe the immediate conditions (optional)
          <span style={{ display: 'block', marginTop: '3px', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
            Water movement, blocked exits, or urgent needs.
          </span>
        </h3>
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
      </section>
      </div>
      </fieldset>
      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="request-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '0.25rem' }}>
        <button
          type="button"
          onClick={review ? () => setReview(false) : onCancel}
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
          {review ? 'Back' : 'Cancel'}
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
            requireReview && !review ? 'Review request' : review ? 'Submit Request' : 'Submit request'
          )}
        </button>
      </div>
    </form>
  )
}
