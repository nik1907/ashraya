'use client'

import { useActionState, useState } from 'react'

import { submitCase, type SubmitState } from '@/app/cases/actions'
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

function Field({ field, namePrefix = '' }: { field: FieldDef; namePrefix?: string }) {
  const name = `${namePrefix}${field.key}`
  const common =
    'rounded border border-brand-border px-3 py-2 w-full outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20'

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {field.label}
        {field.required && <span className="text-red-600"> *</span>}
      </span>
      {field.type === 'textarea' ? (
        <textarea name={name} required={field.required} rows={3} className={common} />
      ) : field.type === 'boolean' ? (
        <select name={name} className={common} defaultValue="">
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : field.type === 'select' ? (
        <select name={name} className={common} defaultValue="">
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
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          required={field.required}
          className={common}
        />
      )}
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

export function CaseForm() {
  const [state, formAction, pending] = useActionState(submitCase, initialState)
  const [caseTypeValue, setCaseTypeValue] = useState('')
  const selected = getCaseType(caseTypeValue)

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
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
          <span>Reporting emirate</span>
          <select
            name="reporting_emirate"
            defaultValue="Abu Dhabi"
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
          <span>Date of incident</span>
          <input
            name="date_of_incident"
            type="date"
            className="w-full rounded border border-brand-border px-3 py-2"
          />
        </label>
      </Section>

      <Section title="Affected individual">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BASE_FIELDS.map((f) => (
            <Field key={f.key} field={f} />
          ))}
        </div>
      </Section>

      {selected && selected.fields.length > 0 && (
        <Section title={`Details — ${selected.value}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {selected.fields.map((f) => (
              <Field key={f.key} field={f} namePrefix="detail__" />
            ))}
          </div>
        </Section>
      )}

      <Section title="Description">
        <label className="flex flex-col gap-1 text-sm">
          <span>
            Describe what happened<span className="text-red-600"> *</span>
          </span>
          <textarea
            name="raw_description"
            required
            rows={5}
            className="w-full rounded border border-brand-border px-3 py-2"
            placeholder="In your own words — this will be rewritten into a formal summary for the embassy."
          />
        </label>
      </Section>

      <Section title="Employer / agent (if any)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EMPLOYER_FIELDS.filter((f) => f.type !== 'boolean').map((f) => (
            <Field key={f.key} field={f} />
          ))}
        </div>
      </Section>

      <Section title="Reported by">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORTER_FIELDS.map((f) => (
            <Field key={f.key} field={f} />
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

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand-navy px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
        >
          {pending ? 'Submitting…' : 'Submit case'}
        </button>
      </div>
    </form>
  )
}
