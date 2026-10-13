export const CATEGORIES = ['history', 'cs', 'english', 'general'] as const

export type Category = (typeof CATEGORIES)[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

/** 카테고리별(10문제), 전체 도전(all, 40문제), 스피드 퀴즈(speed, 20문제·문제당 15초) */
export type Mode = Category | 'all' | 'speed'

export interface Question {
  id: string
  category: Category
  difficulty: Difficulty
  question: string
  choices: string[]
  answerIndex: number
  explanation: string
}

/** 문제 하나에 대한 플레이 기록. */
export interface AnswerRecord {
  /** 고른 보기 인덱스. 스피드 퀴즈에서 시간이 다 되면 null. */
  selectedIndex: number | null
  /** 문제가 나온 뒤 답하기까지 걸린 시간(초). */
  timeSec: number
  /** 힌트(보기 2개 지우기)를 썼는지. */
  usedHint: boolean
}

export interface RankingEntry {
  /** 방금 남긴 기록을 순위표에서 찾아 강조할 때 쓴다. */
  id: string
  nickname: string
  mode: Mode
  /** 난이도 배수와 보너스를 더한 최종 점수. 순위는 이 값으로 매긴다. */
  score: number
  /** 맞힌 문제 수. */
  correct: number
  /** 문제 수. */
  total: number
  durationSec: number
  playedAt: string
}
