import { describe, it, expect } from 'vitest'
import { quickAnalyze } from './quick-analyze.js'

describe('quickAnalyze', () => {
  describe('emotional tone', () => {
    it('detects positive', () => {
      expect(quickAnalyze('This is awesome!', 0).emotionalTone).toBe('positive')
    })

    it('detects negative', () => {
      expect(quickAnalyze('I hate this terrible thing', 0).emotionalTone).toBe('negative')
    })

    it('detects anxious', () => {
      expect(quickAnalyze("I'm really worried about it", 0).emotionalTone).toBe('anxious')
    })

    it('detects curious', () => {
      expect(quickAnalyze('I wonder how this works??', 0).emotionalTone).toBe('curious')
    })

    it('defaults to neutral', () => {
      expect(quickAnalyze('ok sure', 0).emotionalTone).toBe('neutral')
    })
  })

  describe('urgency', () => {
    it('detects high urgency', () => {
      expect(quickAnalyze('I need this ASAP!', 0).urgency).toBe(9)
    })

    it('detects medium urgency', () => {
      expect(quickAnalyze('Can you do this today?', 0).urgency).toBe(7)
    })

    it('returns 0 for no urgency', () => {
      expect(quickAnalyze('Just thinking about stuff', 0).urgency).toBe(0)
    })
  })

  describe('request type', () => {
    it('detects question', () => {
      expect(quickAnalyze('What is this?', 0).requestType).toBe('question')
    })

    it('detects task', () => {
      expect(quickAnalyze('Please create a new file', 0).requestType).toBe('task')
    })

    it('detects greeting', () => {
      expect(quickAnalyze('Hello there', 0).requestType).toBe('greeting')
    })

    it('detects advice', () => {
      expect(quickAnalyze('Should I take the job?', 0).requestType).toBe('advice')
    })
  })

  describe('response mode', () => {
    it('detects advising mode', () => {
      expect(quickAnalyze('What should I do about this?', 0).responseMode).toBe('advising')
    })

    it('detects informing mode', () => {
      expect(quickAnalyze('What is machine learning?', 0).responseMode).toBe('informing')
    })

    it('defaults to listening', () => {
      expect(quickAnalyze('I just had a long day', 0).responseMode).toBe('listening')
    })
  })

  describe('entity extraction', () => {
    it('extracts emails', () => {
      const result = quickAnalyze('Email me at test@example.com', 0)
      expect(result.entities).toContainEqual(
        expect.objectContaining({ type: 'email', value: 'test@example.com' }),
      )
    })

    it('extracts URLs', () => {
      const result = quickAnalyze('Check https://example.com', 0)
      expect(result.entities).toContainEqual(
        expect.objectContaining({ type: 'url', value: 'https://example.com' }),
      )
    })

    it('extracts times', () => {
      const result = quickAnalyze('Meeting at 14:30', 0)
      expect(result.entities).toContainEqual(
        expect.objectContaining({ type: 'time', value: '14:30' }),
      )
    })
  })

  describe('conversation phase', () => {
    it('opening for history 0', () => {
      expect(quickAnalyze('hi', 0).conversationPhase).toBe('opening')
    })

    it('exploration for early history', () => {
      expect(quickAnalyze('tell me more', 2).conversationPhase).toBe('exploration')
    })

    it('deep_dive for mid history', () => {
      expect(quickAnalyze('interesting', 5).conversationPhase).toBe('deep_dive')
    })

    it('follow_up for long history', () => {
      expect(quickAnalyze('another thing', 15).conversationPhase).toBe('follow_up')
    })
  })

  describe('custom patterns', () => {
    it('uses custom emotion patterns', () => {
      const result = quickAnalyze('круто!', 0, {
        emotions: { excited: [/круто/i] },
      })
      expect(result.emotionalTone).toBe('excited')
    })
  })
})
