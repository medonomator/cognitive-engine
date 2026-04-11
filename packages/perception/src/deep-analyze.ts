import type { LlmProvider, Entity } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'

export interface DeepAnalysisResult {
  emotionalTone: string
  urgency: number
  requestType: string
  entities: Entity[]
  implicitNeeds: string[]
  confidence: number
}

const DEFAULT_PROMPT = `Analyze the following message and respond ONLY with valid JSON (no markdown, no code blocks). Extract:

{
  "emotionalTone": "neutral|positive|negative|anxious|frustrated|curious|excited",
  "urgency": 0-10,
  "requestType": "question|task|creative|advice|venting|sharing|greeting|feedback",
  "entities": [{"type": "person|concept|place|event", "value": "...", "confidence": 0.0-1.0}],
  "implicitNeeds": ["string array of unstated needs"],
  "confidence": 0.0-1.0
}`

export async function deepAnalyze(
  text: string,
  conversationHistory: string[],
  llm: LlmProvider,
  customPrompt?: string,
): Promise<DeepAnalysisResult> {
  const systemPrompt = customPrompt ?? DEFAULT_PROMPT

  const contextMessages = conversationHistory.length > 0
    ? `\n\nRecent conversation context:\n${conversationHistory.slice(-5).join('\n')}`
    : ''

  const response = await llm.completeJson<DeepAnalysisResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${text}${contextMessages}` },
    ],
    { temperature: 0, maxTokens: 500 },
  )

  return normalizeResult(response.parsed)
}

function normalizeResult(raw: DeepAnalysisResult): DeepAnalysisResult {
  return {
    emotionalTone: raw.emotionalTone ?? 'neutral',
    urgency: clamp(raw.urgency ?? 0, 0, 10),
    requestType: raw.requestType ?? 'sharing',
    entities: Array.isArray(raw.entities)
      ? raw.entities.map((e) => ({
          type: e.type ?? 'concept',
          value: e.value ?? '',
          confidence: clamp(e.confidence ?? 0.5, 0, 1),
        }))
      : [],
    implicitNeeds: Array.isArray(raw.implicitNeeds) ? raw.implicitNeeds : [],
    confidence: clamp(raw.confidence ?? 0.5, 0, 1),
  }
}

