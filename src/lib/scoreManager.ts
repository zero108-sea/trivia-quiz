import type { AnswerRecord, Difficulty, Question } from './types'

/** 정답 1개의 기본 점수. 난이도 배수를 곱한다. */
export const BASE_POINTS = 10

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

/** 이 시간(초)보다 빨리 맞히면 시간 보너스. */
export const FAST_ANSWER_LIMIT_SEC = 10
export const FAST_ANSWER_BONUS = 3

/** 힌트 없이 맞히면 받는 보너스. */
export const NO_HINT_BONUS = 2

/** 연속 정답이 이 수에 도달한 순간 한 번 받는 콤보 보너스. */
export const COMBO_BONUSES: Readonly<Record<number, number>> = {
  3: 2,
  5: 5,
  10: 10,
}

/** 문제 하나에서 얻은 점수 내역. 오답이면 모두 0. */
export interface AnswerScore {
  correct: boolean
  base: number
  fast: number
  noHint: number
  combo: number
  /** 이 문제까지의 연속 정답 수. 오답이면 0. */
  streak: number
  total: number
}

export interface GameScore {
  answers: AnswerScore[]
  /** 최종 점수. */
  total: number
  /** 맞힌 문제 수. */
  correct: number
  maxStreak: number
  /** 항목별 합계. */
  totals: { base: number; fast: number; noHint: number; combo: number }
}

/** 기본 점수 × 난이도 배수 (쉬움 10, 보통 15, 어려움 20) */
export function basePoints(difficulty: Difficulty): number {
  return Math.round(BASE_POINTS * DIFFICULTY_MULTIPLIER[difficulty])
}

/** 문제 하나를 채점한다. previousStreak는 바로 앞 문제까지의 연속 정답 수. */
export function scoreAnswer(
  question: Question,
  record: AnswerRecord,
  previousStreak: number,
): AnswerScore {
  if (record.selectedIndex !== question.answerIndex) {
    return { correct: false, base: 0, fast: 0, noHint: 0, combo: 0, streak: 0, total: 0 }
  }
  const streak = previousStreak + 1
  const base = basePoints(question.difficulty)
  const fast = record.timeSec < FAST_ANSWER_LIMIT_SEC ? FAST_ANSWER_BONUS : 0
  const noHint = record.usedHint ? 0 : NO_HINT_BONUS
  const combo = COMBO_BONUSES[streak] ?? 0
  return { correct: true, base, fast, noHint, combo, streak, total: base + fast + noHint + combo }
}

/**
 * 지금까지의 기록을 순서대로 채점한다. records[i]는 questions[i]의 기록이며,
 * 게임 중에는 푼 문제까지만 들어 있다.
 */
export function scoreGame(
  questions: readonly Question[],
  records: readonly AnswerRecord[],
): GameScore {
  const answers: AnswerScore[] = []
  let streak = 0
  for (let i = 0; i < records.length; i++) {
    const answer = scoreAnswer(questions[i], records[i], streak)
    streak = answer.streak
    answers.push(answer)
  }
  const sum = (key: keyof GameScore['totals']) => answers.reduce((acc, a) => acc + a[key], 0)
  return {
    answers,
    total: answers.reduce((acc, a) => acc + a.total, 0),
    correct: answers.filter((a) => a.correct).length,
    maxStreak: Math.max(0, ...answers.map((a) => a.streak)),
    totals: { base: sum('base'), fast: sum('fast'), noHint: sum('noHint'), combo: sum('combo') },
  }
}
