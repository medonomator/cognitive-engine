import type { Entity, ResponseMode, ConversationPhase } from '@cognitive-engine/core'

export interface QuickAnalysisResult {
  emotionalTone: string
  urgency: number
  requestType: string
  responseMode: ResponseMode
  entities: Entity[]
  conversationPhase: ConversationPhase
}

export interface QuickPatterns {
  emotions?: Record<string, RegExp[]>
  urgency?: Array<{ pattern: RegExp; score: number }>
  requestTypes?: Record<string, RegExp[]>
  responseMode?: Record<string, RegExp[]>
}

// ═══════════════════════════════════════════
// Default patterns (English + some Russian)
// ═══════════════════════════════════════════

const DEFAULT_EMOTION_PATTERNS: Record<string, RegExp[]> = {
  positive: [
    /\b(great|awesome|love|happy|excited|wonderful|amazing|fantastic|thank|glad)\b/i,
    /[😊🎉❤️👍🥳😄]+/,
  ],
  negative: [
    /\b(hate|terrible|awful|worst|angry|sad|upset|frustrated|annoyed|disappoint)\b/i,
    /[😢😡😤💔😞]+/,
  ],
  anxious: [
    /\b(worry|worried|anxious|nervous|scared|afraid|panic|stress|overwhelm)\b/i,
  ],
  curious: [
    /\b(wonder|curious|interesting|how|why|what if)\b/i,
    /\?{2,}/,
  ],
  frustrated: [
    /\b(can'?t|impossible|stuck|broken|doesn'?t work|give up|ugh)\b/i,
  ],
}

const DEFAULT_URGENCY_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /\b(asap|urgent|emergency|immediately|right now|hurry)\b/i, score: 9 },
  { pattern: /\b(today|tonight|soon|quickly|fast)\b/i, score: 7 },
  { pattern: /\b(deadline|due|by (?:monday|tuesday|wednesday|thursday|friday|tomorrow))\b/i, score: 6 },
  { pattern: /!{2,}/, score: 5 },
]

const DEFAULT_REQUEST_TYPE_PATTERNS: Record<string, RegExp[]> = {
  advice: [/\b(should I|recommend|advise|what do you think|opinion|help me decide)\b/i],
  question: [/\?$/, /\b(what|who|when|where|why|how|which|is it|can you|could you)\b/i],
  task: [/\b(do|make|create|build|write|send|update|fix|add|remove|delete)\b/i],
  creative: [/\b(idea|brainstorm|suggest|think of|come up with|design|imagine)\b/i],
  venting: [/\b(can'?t believe|so tired|fed up|sick of|hate when|ugh)\b/i],
  sharing: [/\b(guess what|check this|look at|did you know|funny thing)\b/i],
  greeting: [/^(hi|hello|hey|good morning|good evening|yo|sup|привет|здравствуй)\b/i],
}

const DEFAULT_RESPONSE_MODE_PATTERNS: Record<string, RegExp[]> = {
  advising: [
    /\b(what should I|how should|recommend|advise|help me|suggest|tips|guide)\b/i,
  ],
  informing: [
    /\b(what is|explain|tell me about|describe|define|how does|what are)\b/i,
  ],
}

// ═══════════════════════════════════════════
// Entity extraction via regex
// ═══════════════════════════════════════════

const ENTITY_PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
  { type: 'url', pattern: /https?:\/\/[^\s<>]+/g },
  { type: 'date', pattern: /\b\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}\b/g },
  { type: 'time', pattern: /\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?\b/gi },
  { type: 'phone', pattern: /\+?\d[\d\s\-()]{7,}\d/g },
  { type: 'number', pattern: /\b\d+(?:\.\d+)?%?\b/g },
]

function extractEntities(text: string): Entity[] {
  const entities: Entity[] = []
  for (const { type, pattern } of ENTITY_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      entities.push({ type, value: match[0], confidence: 0.9 })
    }
  }
  return entities
}

// ═══════════════════════════════════════════
// Main quick analyze function
// ═══════════════════════════════════════════

export function quickAnalyze(
  text: string,
  historyLength: number,
  customPatterns?: QuickPatterns,
): QuickAnalysisResult {
  const emotionPatterns = customPatterns?.emotions ?? DEFAULT_EMOTION_PATTERNS
  const urgencyPatterns = customPatterns?.urgency ?? DEFAULT_URGENCY_PATTERNS
  const requestTypePatterns = customPatterns?.requestTypes ?? DEFAULT_REQUEST_TYPE_PATTERNS
  const responseModePatterns = customPatterns?.responseMode ?? DEFAULT_RESPONSE_MODE_PATTERNS

  return {
    emotionalTone: detectByPatterns(text, emotionPatterns) ?? 'neutral',
    urgency: detectUrgency(text, urgencyPatterns),
    requestType: detectByPatterns(text, requestTypePatterns) ?? 'sharing',
    responseMode: detectResponseMode(text, responseModePatterns),
    entities: extractEntities(text),
    conversationPhase: detectPhase(historyLength),
  }
}

function detectByPatterns(
  text: string,
  patterns: Record<string, RegExp[]>,
): string | undefined {
  for (const [label, regexes] of Object.entries(patterns)) {
    if (regexes.some((re) => re.test(text))) {
      return label
    }
  }
  return undefined
}

function detectUrgency(
  text: string,
  patterns: Array<{ pattern: RegExp; score: number }>,
): number {
  let maxScore = 0
  for (const { pattern, score } of patterns) {
    if (pattern.test(text) && score > maxScore) {
      maxScore = score
    }
  }
  return maxScore
}

function detectResponseMode(
  text: string,
  patterns: Record<string, RegExp[]>,
): ResponseMode {
  const detected = detectByPatterns(text, patterns)
  if (detected === 'advising') return 'advising'
  if (detected === 'informing') return 'informing'
  return 'listening'
}

function detectPhase(historyLength: number): ConversationPhase {
  if (historyLength === 0) return 'opening'
  if (historyLength <= 3) return 'exploration'
  if (historyLength <= 8) return 'deep_dive'
  if (historyLength <= 12) return 'conclusion'
  return 'follow_up'
}
