/** Days after case submission before the reporter's Follow Up button activates. */
const DELAYS: Record<string, number> = {
  'Death':                              2,
  'Repatriation of Mortal Remains':     2,
  'Suicidal Risk / Trauma':             1,
  'Hospitalized / Medical Emergency':   3,
  'Police Case / Detention':            3,
  'Stranded Without Support':           2,
  'Child Welfare / Abandonment':        3,
  'Mental Health / Behavioral Crisis':  3,
  'Missing Person':                     7,
  'Employer Harassment / Abuse':        5,
  'Documents Withheld by Employer':     5,
  'Request for Exit / Amnesty Case':    5,
  'Unpaid Salary / Labor Exploitation': 7,
  'Overstay / Illegal Status':          7,
  'Absconding':                         7,
  'Visa Fraud / Fake Agent':            7,
  'Legal Aid / Court Case Support':     7,
  'Job Scam / Absconded Agents':        7,
  'Family Dispute / Marital Issues':    7,
  'Unlisted':                           7,
}

export const DEFAULT_FOLLOW_UP_DELAY_DAYS = 7

export function followUpDelayDays(caseType: string): number {
  return DELAYS[caseType] ?? DEFAULT_FOLLOW_UP_DELAY_DAYS
}
