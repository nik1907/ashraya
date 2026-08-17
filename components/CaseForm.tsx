'use client'

import { useActionState, useRef, useState, useTransition } from 'react'

import { saveDraft, submitCase, type SubmitState } from '@/app/cases/actions'
import { EidInput } from '@/components/EidInput'
import {
  BASE_FIELDS,
  CASE_TYPES,
  COMMON_ATTACHMENTS,
  EMPLOYER_FIELDS,
  REPORTER_FIELDS,
  REPORTING_EMIRATES,
  getCaseType,
  type AttachmentSlot,
  type FieldDef,
} from '@/lib/caseConfig'

const initialState: SubmitState = { error: null }

/** Source languages Sarvam's saaras:v3 speech-to-text-translate model accepts. */
const SPEECH_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'od-IN', label: 'Odia' },
  { code: 'ur-IN', label: 'Urdu' },
  { code: 'as-IN', label: 'Assamese' },
  { code: 'ne-IN', label: 'Nepali' },
  { code: 'kok-IN', label: 'Konkani' },
  { code: 'mai-IN', label: 'Maithili' },
  { code: 'sa-IN', label: 'Sanskrit' },
  { code: 'sd-IN', label: 'Sindhi' },
  { code: 'ks-IN', label: 'Kashmiri' },
  { code: 'mni-IN', label: 'Manipuri' },
  { code: 'brx-IN', label: 'Bodo' },
  { code: 'doi-IN', label: 'Dogri' },
  { code: 'sat-IN', label: 'Santali' },
]

function Field({
  field,
  namePrefix = '',
  defaultValue,
  frozen,
  onBlur,
  error,
}: {
  field: FieldDef
  namePrefix?: string
  defaultValue?: string
  frozen?: boolean
  onBlur?: (val: string) => void
  error?: string
}) {
  const name = `${namePrefix}${field.key}`
  const hasError = !!error
  const common =
    `rounded border px-3 py-2 w-full outline-none focus:ring-2 focus:ring-brand-navy/20 ${hasError ? 'border-red-400 focus:border-red-500' : 'border-brand-border focus:border-brand-navy'}`
  const frozenClass = frozen
    ? 'rounded border border-brand-border bg-gray-50 px-3 py-2 w-full text-brand-muted cursor-not-allowed'
    : common

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-red-600"> *</span>}
        {frozen && <span className="text-[10px] text-brand-muted">(auto-filled)</span>}
      </span>
      {field.type === 'eid' ? (
        <EidInput
          name={name}
          required={field.required}
          className={frozenClass}
          defaultValue={defaultValue}
        />
      ) : field.type === 'textarea' ? (
        <textarea
          name={name}
          required={field.required}
          rows={3}
          className={frozenClass}
          defaultValue={defaultValue}
          readOnly={frozen}
          onBlur={onBlur ? e => onBlur(e.target.value) : undefined}
        />
      ) : field.type === 'boolean' ? (
        <select name={name} className={frozenClass} defaultValue={defaultValue ?? ''} disabled={frozen}
          onBlur={onBlur ? e => onBlur(e.target.value) : undefined}>
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : field.type === 'select' ? (
        <select name={name} className={frozenClass} defaultValue={defaultValue ?? ''} disabled={frozen}
          onBlur={onBlur ? e => onBlur(e.target.value) : undefined}>
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={
            field.type === 'number'
              ? 'number'
              : field.type === 'date'
                ? 'date'
                : field.type === 'email'
                  ? 'email'
                  : 'text'
          }
          required={field.required}
          className={frozenClass}
          defaultValue={defaultValue}
          readOnly={frozen}
          max={field.type === 'date' && field.pastOnly ? new Date().toISOString().split('T')[0] : undefined}
          onBlur={onBlur ? e => onBlur(e.target.value) : undefined}
        />
      )}
      {frozen && <input type="hidden" name={name} value={defaultValue ?? ''} />}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  )
}

const FILE_SIZE_LIMIT_MB = 5
const FILE_SIZE_LIMIT_BYTES = FILE_SIZE_LIMIT_MB * 1024 * 1024

function FileField({ slot }: { slot: AttachmentSlot }) {
  const [sizeError, setSizeError] = useState<string | null>(null)
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{slot.label}</span>
      <input
        name={`file__${slot.key}`}
        type="file"
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && file.size > FILE_SIZE_LIMIT_BYTES) {
            setSizeError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is ${FILE_SIZE_LIMIT_MB} MB.`)
            e.target.value = ''
          } else {
            setSizeError(null)
          }
        }}
      />
      {sizeError && <span className="text-xs text-red-600">{sizeError}</span>}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-brand-border bg-brand-card p-4 shadow-sm">
      <legend className="px-1 text-sm font-semibold text-brand-navy">{title}</legend>
      {children}
    </fieldset>
  )
}

export function CaseForm({
  draftId,
  initialData = {},
  frozenFields = {},
}: {
  draftId?: string
  initialData?: Record<string, string>
  frozenFields?: Record<string, string>
}) {
  const [state, dispatch, pending] = useActionState(submitCase, initialState)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [caseTypeValue, setCaseTypeValue] = useState(initialData.case_type ?? '')
  const [description, setDescription] = useState(initialData.raw_description ?? '')
  const [docType, setDocType] = useState<'passport' | 'eid' | ''>(
    initialData.reporter_passport ? 'passport' : initialData.reporter_eid ? 'eid' : ''
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const today = new Date().toISOString().split('T')[0]

  function touchField(key: string, value: string, label: string) {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, [key]: `${label} is required` }))
    } else {
      setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }
  const [recording, setRecording] = useState(false)
  const [sttProcessing, setSttProcessing] = useState(false)
  const [speechLang, setSpeechLang] = useState('en-IN')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const streamRef        = useRef<MediaStream | null>(null)
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const continueRecordingRef = useRef(false)
  const speechLangRef    = useRef(speechLang)
  speechLangRef.current  = speechLang
  const selected = getCaseType(caseTypeValue)

  // Sarvam's sync speech-to-text API caps a single request at 30s of audio, so
  // each "burst" auto-stops just under that, transcribes, and (unless the user
  // clicked Stop) immediately starts the next burst on the same mic stream —
  // this makes dictation feel continuous instead of hard-capped at 30s.
  const BURST_MS = 28_000

  function startBurst(stream: MediaStream) {
    audioChunksRef.current = []
    const mr = new MediaRecorder(stream)
    mediaRecorderRef.current = mr

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    mr.onstop = async () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
        autoStopTimerRef.current = null
      }
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      setSttProcessing(true)
      try {
        const form = new FormData()
        form.append('audio', blob, 'recording.webm')
        form.append('language', speechLangRef.current)
        const res  = await fetch('/api/stt', { method: 'POST', body: form })
        const data = await res.json()
        const text = (data.transcript ?? '').trim()
        if (text) setDescription((prev) => (prev ? prev + ' ' + text : text))
      } catch {
        // non-fatal — user can type manually
      } finally {
        setSttProcessing(false)
      }

      if (continueRecordingRef.current && streamRef.current) {
        startBurst(streamRef.current)
      } else {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setRecording(false)
      }
    }

    mr.start()
    autoStopTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    }, BURST_MS)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      continueRecordingRef.current = true
      setRecording(true)
      startBurst(stream)
    } catch {
      alert('Could not access microphone. Please allow microphone permission and try again.')
    }
  }

  function stopRecording() {
    continueRecordingRef.current = false
    mediaRecorderRef.current?.stop()
  }

  function toggleSpeech() {
    if (recording) stopRecording()
    else startRecording()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!docType) {
      setFieldErrors(prev => ({ ...prev, doc_type: 'Please select a document type' }))
      return
    }
    const fd = new FormData(e.currentTarget)
    startTransition(() => dispatch(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      {draftId && <input type="hidden" name="draft_id" value={draftId} />}

      <Section title="Case type">
        <label className="flex flex-col gap-1 text-sm">
          <span>
            Type of case<span className="text-red-600"> *</span>
          </span>
          <select
            name="case_type"
            required
            value={caseTypeValue}
            onChange={(e) => setCaseTypeValue(e.target.value)}
            className="w-full rounded border border-brand-border px-3 py-2"
          >
            <option value="">Select a case type…</option>
            {CASE_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Reporting emirate <span className="text-brand-muted font-normal">(where you are calling from)</span></span>
          <select
            name="reporting_emirate"
            defaultValue={initialData.reporting_emirate ?? 'Abu Dhabi'}
            className="w-full rounded border border-brand-border px-3 py-2"
          >
            {REPORTING_EMIRATES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>
            Affected person&apos;s emirate of visa / residence<span className="text-red-600"> *</span>
          </span>
          <select
            name="visa_emirate"
            defaultValue={initialData.visa_emirate ?? 'Abu Dhabi'}
            className="w-full rounded border border-brand-border px-3 py-2"
          >
            <option value="Abu Dhabi">Abu Dhabi</option>
            <option value="Other Emirates">Other Emirates (Dubai, Sharjah, etc.)</option>
          </select>
          <span className="text-[11px] text-brand-muted">Select Abu Dhabi if the emirate of residence is not known</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Date of incident</span>
          <input
            name="date_of_incident"
            type="date"
            max={today}
            defaultValue={initialData.date_of_incident ?? ''}
            className="w-full rounded border border-brand-border px-3 py-2"
          />
          <span className="text-[11px] text-brand-muted">Cannot be a future date</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>
            Case urgency <span className="text-brand-muted font-normal">(your assessment)</span>
          </span>
          <select
            name="volunteer_severity"
            defaultValue={initialData.volunteer_severity ?? ''}
            className="w-full rounded border border-brand-border px-3 py-2"
          >
            <option value="">— Let system decide —</option>
            <option value="Critical">Critical — life risk, immediate danger, detention</option>
            <option value="High">High — serious welfare issue, legal jeopardy</option>
            <option value="Normal">Normal — needs attention but not urgent</option>
          </select>
          <span className="text-[11px] text-brand-muted">
            Your judgment sets the priority on the embassy email. Leave blank to use the automatic classification.
          </span>
        </label>
      </Section>

      <Section title="Affected individual">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BASE_FIELDS.map((f) => (
            <Field
              key={f.key}
              field={f}
              defaultValue={initialData[f.key]}
              onBlur={f.required ? val => touchField(f.key, val, f.label) : undefined}
              error={fieldErrors[f.key]}
            />
          ))}
        </div>
      </Section>

      {selected && selected.fields.length > 0 && (
        <Section title={`Details — ${selected.value}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {selected.fields.map((f) => (
              <Field
                key={f.key}
                field={f}
                namePrefix="detail__"
                defaultValue={initialData[`detail__${f.key}`]}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Description">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Describe what happened<span className="text-red-600"> *</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value)}
                disabled={recording || sttProcessing}
                className="rounded border border-brand-border bg-white px-2 py-1 text-xs text-brand-navy disabled:opacity-50"
              >
                {SPEECH_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code === 'en-IN' ? l.label : `${l.label} → English`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={toggleSpeech}
                disabled={sttProcessing}
                title={recording ? 'Stop recording' : 'Dictate using your microphone'}
                className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  recording
                    ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-brand-border bg-brand-surface text-brand-muted hover:text-brand-navy'
                }`}
              >
                {recording ? (
                  <>
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    Stop
                  </>
                ) : (
                  <>🎤 Speak</>
                )}
              </button>
            </div>
          </div>
          <textarea
            name="raw_description"
            required
            rows={6}
            className={`w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 ${fieldErrors.raw_description ? 'border-red-400 focus:border-red-500' : 'border-brand-border focus:border-brand-navy'}`}
            placeholder="In your own words — this will be rewritten into a formal summary."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => touchField('raw_description', description, 'Description')}
          />
          {fieldErrors.raw_description && (
            <span className="text-xs text-red-600">{fieldErrors.raw_description}</span>
          )}
          {recording && sttProcessing && (
            <p className="text-xs text-brand-muted">
              Transcribing that segment… recording continues automatically.
            </p>
          )}
          {!recording && sttProcessing && (
            <p className="text-xs text-brand-muted">Transcribing…</p>
          )}
          {recording && !sttProcessing && (
            <p className="text-xs text-red-600">
              Recording{speechLang === 'en-IN' ? '' : ` (${SPEECH_LANGUAGES.find((l) => l.code === speechLang)?.label})`}… auto-continues every ~28s, click Stop when done.
            </p>
          )}
        </div>
      </Section>

      <Section title="Employer / agent (if any)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EMPLOYER_FIELDS.filter((f) => f.type !== 'boolean').map((f) => (
            <Field key={f.key} field={f} defaultValue={initialData[f.key]} />
          ))}
        </div>
      </Section>

      <Section title="Reported by">
        {/* Document type — mandatory; determines which document number field is shown */}
        <div className="flex flex-col gap-1.5 text-sm">
          <span>
            Reporter document type<span className="text-red-600"> *</span>
          </span>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="reporter_doc_type_ui"
                value="passport"
                checked={docType === 'passport'}
                onChange={() => {
                  setDocType('passport')
                  setFieldErrors(prev => { const n = { ...prev }; delete n.doc_type; return n })
                }}
                className="h-4 w-4 accent-brand-navy"
              />
              Passport Number
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="reporter_doc_type_ui"
                value="eid"
                checked={docType === 'eid'}
                onChange={() => {
                  setDocType('eid')
                  setFieldErrors(prev => { const n = { ...prev }; delete n.doc_type; return n })
                }}
                className="h-4 w-4 accent-brand-navy"
              />
              Emirates ID
            </label>
          </div>
          {fieldErrors.doc_type && (
            <span className="text-xs text-red-600">{fieldErrors.doc_type}</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORTER_FIELDS
            .filter(f => {
              if (f.key === 'reporter_passport') return docType === 'passport'
              if (f.key === 'reporter_eid') return docType === 'eid'
              return true
            })
            .map((f) => (
              <Field
                key={f.key}
                field={
                  f.key === 'reporter_passport' || f.key === 'reporter_eid'
                    ? { ...f, required: true }
                    : f
                }
                defaultValue={frozenFields[f.key] ?? initialData[f.key]}
                frozen={f.key in frozenFields}
                onBlur={(f.required || f.key === 'reporter_passport' || f.key === 'reporter_eid') && !(f.key in frozenFields)
                  ? val => touchField(f.key, val, f.label)
                  : undefined}
                error={fieldErrors[f.key]}
              />
            ))}
        </div>
      </Section>

      <Section title="Documents (optional)">
        <p className="text-xs text-brand-muted">
          Attach any supporting files. Leave blank if you have none.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selected?.attachments.map((s) => (
            <FileField key={s.key} slot={s} />
          ))}
          {COMMON_ATTACHMENTS.map((s) => (
            <FileField key={s.key} slot={s} />
          ))}
        </div>
      </Section>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand-navy px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
        >
          {pending ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Submitting…
            </span>
          ) : 'Submit case'}
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded border border-brand-navy bg-brand-navy/10 px-5 py-2.5 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-navy/20 disabled:opacity-50"
          onClick={() => {
            if (!formRef.current) return
            const fd = new FormData(formRef.current)
            startTransition(async () => { await saveDraft(fd) })
          }}
        >
          Save draft
        </button>
      </div>
    </form>
  )
}
