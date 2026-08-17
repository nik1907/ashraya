import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY    = '#0b2545'
const SAFFRON = '#ff9933'
const GREEN   = '#138808'
const MUTED   = '#5b6677'
const LIGHT   = '#f4f6f9'
const BORDER  = '#dfe5ee'
const FG      = '#1a2233'

// ── Types ─────────────────────────────────────────────────────────────────────
export type CasePDFData = {
  case_id:          string | null
  case_type:        string
  status:           string
  name:             string | null
  gender:           string | null
  age:              number | null
  passport:         string | null
  eid:              string | null
  phone:            string | null
  company_name:     string | null
  company_phone:    string | null
  company_location: string | null
  raw_description:  string | null
  polished_summary: string | null
  case_brief:       string | null
  reporter_name:    string | null
  reporter_phone:   string | null
  reporter_email:   string | null
  assigned_emirate: string | null
  reporting_emirate:string | null
  date_of_incident: string | null
  created_at:       string
  outcome:          string | null
  resolution_note:  string | null
}

export type CaseEventPDF = {
  id:          string
  event_type:  string
  created_at:  string
  note:        string | null
  to_status:   string | null
  actor_name:  string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending_review:       'Pending Review',
  submitted:            'Submitted',
  sent:                 'Forwarded to Embassy',
  acknowledged:         'Embassy Acknowledged',
  in_progress:          'Under Process',
  need_more_info:       'Information Required',
  needs_attention:      'Needs Attention',
  resolved:             'Resolved',
  closed:               'Closed',
}

const EVENT_LABELS: Record<string, string> = {
  submitted:             'Case Submitted',
  officer_claimed:       'Officer Assigned',
  case_transferred:      'Case Transferred',
  info_provided:         'Information Provided',
  volunteer_resubmitted: 'Case Resubmitted',
  status_changed:        'Status Updated',
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function val(v: string | null | undefined): string {
  return v?.trim() || '—'
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    fontSize:        10,
    color:           FG,
    paddingTop:      44,
    paddingBottom:   56,
    paddingLeft:     48,
    paddingRight:    48,
    backgroundColor: '#ffffff',
  },

  // Tricolor stripe
  stripe: { flexDirection: 'row', height: 5, marginBottom: 20 },
  stripeSaffron: { flex: 1, backgroundColor: SAFFRON },
  stripeWhite:   { flex: 1, backgroundColor: '#f0f0f0' },
  stripeGreen:   { flex: 1, backgroundColor: GREEN },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  headerLeft:  {},
  orgLabel:    { fontSize: 7.5, color: MUTED, fontFamily: 'Helvetica', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  appName:     { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 1 },
  appSub:      { fontSize: 8, color: MUTED, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  genDate:     { fontSize: 7.5, color: MUTED },
  pageNum:     { fontSize: 7.5, color: MUTED, marginTop: 2 },

  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 14 },

  // Case ID + status bar
  caseBar: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: LIGHT,
    padding:         10,
    borderRadius:    4,
    marginBottom:    18,
    borderWidth:     1,
    borderColor:     BORDER,
  },
  caseBarLeft:  {},
  caseRefLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  caseRefVal:   { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 2 },
  caseType:     { fontSize: 9, color: MUTED, marginTop: 2 },
  statusPill: {
    backgroundColor: NAVY,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      3,
  },
  statusPillText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.6 },

  // Sections
  section:      { marginBottom: 16 },
  sectionTitle: {
    fontSize:        7.5,
    fontFamily:      'Helvetica-Bold',
    color:           MUTED,
    textTransform:   'uppercase',
    letterSpacing:   0.8,
    marginBottom:    7,
    paddingBottom:   4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  // Two-column field grid
  fieldGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
  fieldPair:  { width: '50%', flexDirection: 'row', marginBottom: 5 },
  fieldPairWide: { width: '100%', flexDirection: 'row', marginBottom: 5 },
  fieldLabel: { fontSize: 8.5, color: MUTED, width: 90 },
  fieldValue: { fontSize: 8.5, color: FG, flex: 1, fontFamily: 'Helvetica' },

  // Description block
  descBlock: {
    backgroundColor: LIGHT,
    padding:         10,
    borderRadius:    4,
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
  },
  descText:  { fontSize: 9, color: FG, lineHeight: 1.6 },

  // Events timeline
  eventRow: {
    flexDirection:   'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  eventDotWrap: { width: 16, paddingTop: 2 },
  eventDot:     { width: 6, height: 6, backgroundColor: NAVY, borderRadius: 3 },
  eventBody:    { flex: 1 },
  eventType:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY },
  eventDate:    { fontSize: 7.5, color: MUTED, marginTop: 1 },
  eventNote:    { fontSize: 8.5, color: FG, marginTop: 3, lineHeight: 1.5 },
  eventActor:   { fontSize: 7.5, color: MUTED, marginTop: 1 },

  // Footer (absolute)
  footer: {
    position:         'absolute',
    bottom:           24,
    left:             48,
    right:            48,
    flexDirection:    'row',
    justifyContent:   'space-between',
    paddingTop:       6,
    borderTopWidth:   1,
    borderTopColor:   BORDER,
  },
  footerText: { fontSize: 7, color: MUTED },
})

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={wide ? s.fieldPairWide : s.fieldPair}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

// ── Main document ─────────────────────────────────────────────────────────────
export function CasePDF({
  data,
  events,
}: {
  data:   CasePDFData
  events: CaseEventPDF[]
}) {
  const statusLabel = STATUS_LABELS[data.status] ?? data.status
  const generatedAt = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const description = data.polished_summary || data.raw_description || null
  const hasPersonInfo = data.name || data.gender || data.age || data.passport || data.eid || data.phone
  const hasCompanyInfo = data.company_name || data.company_phone || data.company_location
  const hasReporter = data.reporter_name || data.reporter_phone || data.reporter_email
  const hasResolution = data.outcome || data.resolution_note

  return (
    <Document
      title={`Case Report — ${data.case_id ?? 'Draft'}`}
      author="TFA Community Welfare"
      subject={`Welfare Case: ${data.case_type}`}
      creator="Ashraya Platform"
    >
      <Page size="A4" style={s.page}>

        {/* Tricolor stripe */}
        <View style={s.stripe}>
          <View style={s.stripeSaffron} />
          <View style={s.stripeWhite} />
          <View style={s.stripeGreen} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.orgLabel}>Embassy of India · UAE</Text>
            <Text style={s.appName}>ASHRAYA</Text>
            <Text style={s.appSub}>आश्रय · Community Welfare Case Report</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.genDate}>Generated {generatedAt}</Text>
            <Text render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            } style={s.pageNum} />
          </View>
        </View>

        <View style={s.divider} />

        {/* Case ID + Status bar */}
        <View style={s.caseBar}>
          <View style={s.caseBarLeft}>
            <Text style={s.caseRefLabel}>Case Reference</Text>
            <Text style={s.caseRefVal}>{data.case_id ?? 'Pending ID'}</Text>
            <Text style={s.caseType}>{data.case_type}</Text>
          </View>
          <View style={s.statusPill}>
            <Text style={s.statusPillText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Case Information */}
        <Section title="Case Information">
          <View style={s.fieldGrid}>
            <Field label="Reporting emirate" value={val(data.reporting_emirate)} />
            <Field label="Assigned to"       value={val(data.assigned_emirate)} />
            <Field label="Date of incident"  value={fmtDate(data.date_of_incident)} />
            <Field label="Date submitted"    value={fmtDate(data.created_at)} />
          </View>
        </Section>

        {/* Affected Individual */}
        {hasPersonInfo && (
          <Section title="Affected Individual">
            <View style={s.fieldGrid}>
              <Field label="Full name"    value={val(data.name)} />
              <Field label="Gender"       value={val(data.gender)} />
              <Field label="Age"          value={data.age != null ? String(data.age) : '—'} />
              <Field label="Phone"        value={val(data.phone)} />
              <Field label="Passport no." value={val(data.passport)} />
              <Field label="Emirates ID"  value={val(data.eid)} />
            </View>
          </Section>
        )}

        {/* Employer */}
        {hasCompanyInfo && (
          <Section title="Employer / Company">
            <View style={s.fieldGrid}>
              <Field label="Company name"     value={val(data.company_name)} />
              <Field label="Company phone"    value={val(data.company_phone)} />
              <Field label="Company location" value={val(data.company_location)} wide />
            </View>
          </Section>
        )}

        {/* Reporter */}
        {hasReporter && (
          <Section title="Reported By">
            <View style={s.fieldGrid}>
              <Field label="Name"  value={val(data.reporter_name)} />
              <Field label="Phone" value={val(data.reporter_phone)} />
              {data.reporter_email && (
                <Field label="Email" value={data.reporter_email} wide />
              )}
            </View>
          </Section>
        )}

        {/* Description */}
        {description && (
          <Section title={data.polished_summary ? 'AI-Polished Summary' : 'Description'}>
            <View style={s.descBlock}>
              <Text style={s.descText}>{description}</Text>
            </View>
          </Section>
        )}

        {/* Case Brief */}
        {data.case_brief && (
          <Section title="Embassy Brief">
            <View style={s.descBlock}>
              <Text style={s.descText}>{data.case_brief}</Text>
            </View>
          </Section>
        )}

        {/* Resolution */}
        {hasResolution && (
          <Section title="Resolution">
            <View style={s.fieldGrid}>
              {data.outcome       && <Field label="Outcome" value={data.outcome} wide />}
              {data.resolution_note && <Field label="Note"  value={data.resolution_note} wide />}
            </View>
          </Section>
        )}

        {/* Event Timeline */}
        {events.length > 0 && (
          <Section title="Case Timeline">
            {events.map((ev) => (
              <View key={ev.id} style={s.eventRow}>
                <View style={s.eventDotWrap}>
                  <View style={s.eventDot} />
                </View>
                <View style={s.eventBody}>
                  <Text style={s.eventType}>
                    {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    {ev.to_status ? `  →  ${STATUS_LABELS[ev.to_status] ?? ev.to_status}` : ''}
                  </Text>
                  <Text style={s.eventDate}>{fmtDateTime(ev.created_at)}</Text>
                  {ev.actor_name && (
                    <Text style={s.eventActor}>By {ev.actor_name}</Text>
                  )}
                  {ev.note && <Text style={s.eventNote}>{ev.note}</Text>}
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            CONFIDENTIAL · TFA Community Welfare · tfa.abudhabi@gmail.com
          </Text>
          <Text style={s.footerText}>
            Ashraya Platform · {generatedAt}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
