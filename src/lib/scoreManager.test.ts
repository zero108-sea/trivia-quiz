import { describe, expect, it } from 'vitest'
import { basePoints, scoreAnswer, scoreGame } from './scoreManager'
import { makeQuestion } from './testUtils'
import type { AnswerRecord } from './types'

const right = (timeSec = 12, usedHint = false): AnswerRecord => ({ selectedIndex: 0, timeSec, usedHint })
const wrong = (timeSec = 5): AnswerRecord => ({ selectedIndex: 1, timeSec, usedHint: false })
const timedOut: AnswerRecord = { selectedIndex: null, timeSec: 15, usedHint: false }

describe('basePoints', () => {
  it('기본 10점에 난이도 배수를 곱한다', () => {
    expect(basePoints('easy')).toBe(10)
    expect(basePoints('medium')).toBe(15)
    expect(basePoints('hard')).toBe(20)
  })
})

describe('scoreAnswer', () => {
  it('정답이면 기본 점수 + 힌트 미사용 보너스', () => {
    expect(scoreAnswer(makeQuestion('q', 'medium'), right(12), 0)).toEqual({
      correct: true,
      base: 15,
      fast: 0,
      noHint: 2,
      combo: 0,
      streak: 1,
      total: 17,
    })
  })

  it('10초 미만에 맞히면 시간 보너스 +3, 정확히 10초는 받지 못한다', () => {
    expect(scoreAnswer(makeQuestion('q'), right(9.9), 0).fast).toBe(3)
    expect(scoreAnswer(makeQuestion('q'), right(10), 0).fast).toBe(0)
  })

  it('힌트를 쓰면 힌트 미사용 보너스가 없다', () => {
    const score = scoreAnswer(makeQuestion('q', 'hard'), right(3, true), 0)
    expect(score).toMatchObject({ base: 20, fast: 3, noHint: 0, total: 23 })
  })

  it('오답이나 시간 초과는 보너스 없이 0점이고 연속 기록이 끊긴다', () => {
    expect(scoreAnswer(makeQuestion('q'), wrong(1), 4)).toMatchObject({ correct: false, total: 0, streak: 0 })
    expect(scoreAnswer(makeQuestion('q'), timedOut, 4)).toMatchObject({ correct: false, total: 0, streak: 0 })
  })

  it('연속 정답이 3, 5, 10개째가 되는 문제에서 콤보 보너스를 준다', () => {
    const q = makeQuestion('q')
    expect(scoreAnswer(q, right(), 1).combo).toBe(0) // 2연속
    expect(scoreAnswer(q, right(), 2).combo).toBe(2) // 3연속
    expect(scoreAnswer(q, right(), 3).combo).toBe(0) // 4연속
    expect(scoreAnswer(q, right(), 4).combo).toBe(5) // 5연속
    expect(scoreAnswer(q, right(), 9).combo).toBe(10) // 10연속
    expect(scoreAnswer(q, right(), 10).combo).toBe(0) // 11연속
  })
})

describe('scoreGame', () => {
  it('항목별 합계, 맞힌 수, 최대 연속 정답을 계산한다', () => {
    const questions = ['easy', 'medium', 'hard', 'easy', 'easy'].map((d, i) =>
      makeQuestion(`q${i}`, d as 'easy' | 'medium' | 'hard'),
    )
    // 정답(빠름), 정답, 정답(힌트), 오답, 정답
    const records = [right(5), right(12), right(20, true), wrong(), right(12)]
    const game = scoreGame(questions, records)

    expect(game.answers.map((a) => a.total)).toEqual([
      10 + 3 + 2, // 쉬움, 빠름, 힌트 없음
      15 + 2, // 보통
      20 + 0 + 2, // 어려움, 힌트 사용, 3연속 콤보
      0,
      10 + 2,
    ])
    expect(game.totals).toEqual({ base: 55, fast: 3, noHint: 6, combo: 2 })
    expect(game.total).toBe(66)
    expect(game.correct).toBe(4)
    expect(game.maxStreak).toBe(3)
  })

  it('10문제 모두 빨리, 힌트 없이 맞히면 콤보 보너스 3개를 모두 받는다', () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`))
    const game = scoreGame(questions, questions.map(() => right(1)))
    expect(game.totals).toEqual({ base: 100, fast: 30, noHint: 20, combo: 17 })
    expect(game.total).toBe(167)
    expect(game.maxStreak).toBe(10)
  })

  it('게임 중에는 푼 문제까지만 채점한다', () => {
    const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`))
    expect(scoreGame(questions, [right(), right()])).toMatchObject({ total: 24, correct: 2 })
    expect(scoreGame(questions, [])).toMatchObject({ total: 0, correct: 0, maxStreak: 0 })
  })
})
