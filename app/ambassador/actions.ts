'use server'

import { requireProfile } from '@/lib/auth'
import {
  askAshrayaAI,
  computeAIRiskScore,
  generateAmbassadorBrief,
  generateEmergingRisks,
  type AmbassadorBriefInput,
  type RiskItem,
  type RiskScoreResult,
} from '@/lib/ai/ambassador'
import { generateMissionOneLiner } from '@/lib/ai/polish'

export type OneLinerInput = {
  status: 'UNDER_CONTROL' | 'ELEVATED' | 'CRITICAL'
  totalOpen: number; crisisCount: number; topType: string
  slaBreaches: number; employerAlerts: number; avgDaysOpen: number
}

export async function getMissionOneLiner(input: OneLinerInput): Promise<string | null> {
  await requireProfile(['ambassador', 'tfa_admin'])
  return generateMissionOneLiner(input)
}

export async function getAmbassadorBrief(
  input: AmbassadorBriefInput,
  briefType: 'daily' | 'weekly' | 'monthly',
): Promise<string | null> {
  await requireProfile(['ambassador', 'tfa_admin'])
  return generateAmbassadorBrief(input, briefType)
}

export async function getEmergingRisks(input: AmbassadorBriefInput): Promise<RiskItem[]> {
  await requireProfile(['ambassador', 'tfa_admin'])
  return generateEmergingRisks(input)
}

export async function getRiskScore(input: AmbassadorBriefInput): Promise<RiskScoreResult> {
  await requireProfile(['ambassador', 'tfa_admin'])
  return computeAIRiskScore(input)
}

export async function getAIAnswer(
  question: string,
  input: AmbassadorBriefInput,
): Promise<string | null> {
  await requireProfile(['ambassador', 'tfa_admin'])
  if (!question.trim()) return null
  return askAshrayaAI(question, input)
}
