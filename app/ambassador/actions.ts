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
