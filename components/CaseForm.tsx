'use client'

import { useActionState, useRef, useState } from 'react'

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

function Field({
  field,
  namePrefix = '',
  defaultValue,
  frozen,
}: {
  field: FieldDef
  namePrefix?: string
  defaultValue?: string
  frozen?: boolean
}) {
  const name = `${namePrefix}${field.key}`
  const common =
    'rounded border border-brand-border px-3 py-2 w-full outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20'
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
        />
      ) : field.type === 'boolean' ? (
        <select name={name} className={frozenClass} defaultValue={defaultValue ?? ''} disabled={frozen}>
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : field.type === 'select' ? (
        <select name={name} className={frozenClass} defaultValue={defaultValue ?? ''} disabled={frozen}>
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
        />
      )}
      {frozen && <input type="hidden" name={name} value={defaultValue ?? ''} />}
    </label>
  )
}

function FileField({ slot }: { slot: AttachmentSlot }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{slot.label}</span>
      <input
        name={`file__${slot.key}`}
        type="file"
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
      />
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
  const [state, formAction, pending] = useActionState(submitCase, initialState)
  const [caseTypeValue, setCaseTypeValue] = useState(initialData.case_type ?? '')
  const [description, setDescription] = useState(initialData.raw_description ?? '')
  const [listening, setListening] = useState(false)
  const [speechLang, setSpeechLang] = useState<'en-US' | 'te-IN'>('en-US')
  const [translating, setTranslating] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const selected = getCaseType(caseTypeValue)

  function toggleSpeech() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition requires Chrome or Edge. Please type your description.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new SR() as any
    r.continuous = true
    r.interimResults = false
    r.lang = speechLang
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = async (e: any) => {
      const raw = Array.from(e.results as unknown[])
        .slice(e.resultIndex as number)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((res: any) => res[0].transcript as string)
        .join(' ')
        .trim()
      if (!raw) return
      if (speechLang === 'te-IN') {
        setTranslating(true)
        try {
          const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(raw)}&langpair=te|en`,
          )
          const json = await res.json()
          const translated: string = json?.responseData?.translatedText ?? raw
          setDescription((prev) => (prev ? prev + ' ' + translated : translated))
        } catch {
          setDescription((prev) => (prev ? prev + ' ' + raw : raw))
        } finally {
          setTranslating(false)
        }
      } else {
        setDescription((prev) => (prev ? prev + ' ' + raw : raw))
      }
    }
    r.onerror = () => setListening(false)
    r.onend   = () => setListening(false)
    recognitionRef.current = r
    r.start()
    setListening(true)
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
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
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Date of incident</span>
          <input
            name="date_of_incident"
            type="date"
            defaultValue={initialData.date_of_incident ?? ''}
            className="w-full rounded border border-brand-border px-3 py-2"
          />
        </label>
      </Section>

      <Section title="Affected individual">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BASE_FIELDS.map((f) => (
            <Field key={f.key} field={f} defaultValue={initialData[f.key]} />
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
          <div className="flex items-center justify-between gap-2">
            <span>
              Describe what happened<span className="text-red-600"> *</span>
            </span>
            <div className="flex items-center gap-2">
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value as 'en-US' | 'te-IN')}
                disabled={listening}
                className="rounded border border-brand-border bg-white px-2 py-1 text-xs text-brand-navy disabled:opacity-50"
              >
                <option value="en-US">English</option>
                <option value="te-IN">Telugu → English</option>
              </select>
              <button
                type="button"
                onClick={toggleSpeech}
                title={listening ? 'Stop recording' : 'Dictate using your microphone'}
                className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                  listening
                    ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-brand-border bg-brand-surface text-brand-muted hover:text-brand-navy'
                }`}
              >
                {listening ? (
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
            className="w-full rounded border border-brand-border px-3 py-2 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
            placeholder="In your own words — this will be rewritten into a formal summary."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {listening && (
            <p className="text-xs text-red-600">
              Listening{speechLang === 'te-IN' ? ' (Telugu)' : ''}… speak clearly. Click "Stop" when done.
            </p>
          )}
          {translating && (
            <p className="text-xs text-brand-muted">Translating Telugu → English…</p>
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
        <p className="text-xs text-brand-muted">
          Please submit either the <strong>passport number</strong> or a valid <strong>Emirates ID</strong> (at least one is required).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORTER_FIELDS.map((f) => (
            <Field
              key={f.key}
              field={f}
              defaultValue={frozenFields[f.key] ?? initialData[f.key]}
              frozen={f.key in frozenFields}
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
          {pending ? 'Submitting…' : 'Submit case'}
        </button>
        <button
          type="submit"
          formAction={saveDraft}
          className="rounded border border-brand-navy bg-brand-navy/10 px-5 py-2.5 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-navy/20"
        >
          Save draft
        </button>
      </div>
    </form>
  )
}
