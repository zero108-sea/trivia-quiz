import type { Random } from './quiz'
import type { RankingStorage } from './rankingStore'
import type { Difficulty, Mode, Question, RankingEntry } from './types'

/** 같은 seed면 항상 같은 수열을 내는 난수 생성기(mulberry32). */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** localStorage처럼 동작하는 메모리 저장소. */
export function memoryStorage(initial: Record<string, string> = {}): RankingStorage & {
  data: Record<string, string>
} {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

/** 용량 초과나 차단처럼 쓰기가 실패하는 저장소. */
export function failingStorage(): RankingStorage {
  return {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('QuotaExceededError')
    },
  }
}

export function makeEntry(
  id: string,
  score: number,
  durationSec: number,
  mode: Mode = 'history',
): RankingEntry {
  return {
    id,
    nickname: id,
    mode,
    score,
    correct: Math.min(score, 10),
    total: mode === 'all' ? 40 : mode === 'speed' ? 20 : 10,
    durationSec,
    playedAt: '2026-10-01T00:00:00.000Z',
  }
}

/** 정답이 answerIndex인 테스트용 문제. */
export function makeQuestion(id: string, difficulty: Difficulty = 'easy', answerIndex = 0): Question {
  return {
    id,
    category: 'general',
    difficulty,
    question: id,
    choices: ['A', 'B', 'C', 'D'],
    answerIndex,
    explanation: '',
  }
}
