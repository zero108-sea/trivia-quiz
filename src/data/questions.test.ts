import { describe, expect, it } from 'vitest'
import { CATEGORIES, DIFFICULTIES } from '../lib/types'
import { questions } from './questions'

describe('questions.json', () => {
  it('총 40문제다', () => {
    expect(questions).toHaveLength(40)
  })

  it.each(CATEGORIES)('%s 카테고리는 10문제다', (category) => {
    expect(questions.filter((q) => q.category === category)).toHaveLength(10)
  })

  it('알 수 없는 카테고리가 없다', () => {
    for (const q of questions) {
      expect(CATEGORIES).toContain(q.category)
    }
  })

  it('모든 문제에 난이도(easy/medium/hard)가 있고, 세 난이도가 모두 쓰인다', () => {
    for (const q of questions) {
      expect(DIFFICULTIES, q.id).toContain(q.difficulty)
    }
    expect(new Set(questions.map((q) => q.difficulty))).toEqual(new Set(DIFFICULTIES))
  })

  it('id가 중복되지 않고 "카테고리-번호" 형식이다', () => {
    const ids = questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of questions) {
      expect(q.id).toMatch(new RegExp(`^${q.category}-\\d{2}$`))
    }
  })

  it('모든 문제의 보기는 4개이고 서로 다르다', () => {
    for (const q of questions) {
      expect(q.choices, q.id).toHaveLength(4)
      expect(new Set(q.choices).size, q.id).toBe(4)
    }
  })

  it('answerIndex는 0~3 정수다', () => {
    for (const q of questions) {
      expect(Number.isInteger(q.answerIndex), q.id).toBe(true)
      expect(q.answerIndex, q.id).toBeGreaterThanOrEqual(0)
      expect(q.answerIndex, q.id).toBeLessThanOrEqual(3)
    }
  })

  it('문제, 보기, 해설에 빈 문자열이 없다', () => {
    for (const q of questions) {
      expect(q.question.trim(), q.id).not.toBe('')
      expect(q.explanation.trim(), q.id).not.toBe('')
      for (const choice of q.choices) {
        expect(choice.trim(), q.id).not.toBe('')
      }
    }
  })
})
