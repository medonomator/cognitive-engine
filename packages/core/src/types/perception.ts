export interface Percept {
  rawText: string
  emotionalTone: string
  urgency: number
  requestType: string
  responseMode: ResponseMode
  entities: Entity[]
  implicitNeeds: string[]
  conversationPhase: ConversationPhase
  confidence: number
  analysisMethod: 'quick' | 'deep'
}

export type ResponseMode = 'listening' | 'advising' | 'informing'

export type ConversationPhase =
  | 'opening'
  | 'exploration'
  | 'deep_dive'
  | 'conclusion'
  | 'follow_up'

export interface Entity {
  type: string
  value: string
  confidence: number
}
