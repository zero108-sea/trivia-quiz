import { CATEGORIES, type Mode } from './types'

export const MODES: readonly Mode[] = [...CATEGORIES, 'all', 'speed']

export const MODE_LABELS: Record<Mode, string> = {
  history: '한국사',
  cs: '컴퓨터과학',
  english: '영어',
  general: '일반상식',
  all: '전체 도전',
  speed: '스피드 퀴즈',
}

export const CATEGORY_QUESTION_COUNT = 10
/** 스피드 퀴즈는 카테고리마다 같은 수(5문제)씩 뽑는다. */
export const SPEED_QUESTION_COUNT = 20
export const SPEED_TIME_LIMIT_SEC = 15

/** 모드별 문제 수. 전체 도전은 문제 은행 전체(40문제). */
export function questionCount(mode: Mode): number {
  if (mode === 'all') return CATEGORIES.length * CATEGORY_QUESTION_COUNT
  if (mode === 'speed') return SPEED_QUESTION_COUNT
  return CATEGORY_QUESTION_COUNT
}

/** 문제당 제한 시간(초). 제한이 없으면 null. */
export function timeLimitSec(mode: Mode): number | null {
  return mode === 'speed' ? SPEED_TIME_LIMIT_SEC : null
}

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 12

/** 앞뒤 공백을 뺀 길이가 2~12자면 유효한 닉네임이다. */
export function isValidNickname(nickname: string): boolean {
  const length = nickname.trim().length
  return length >= NICKNAME_MIN && length <= NICKNAME_MAX
}

/** 83 → "1분 23초", 45 → "45초" */
export function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`
}

/** 정답률(%)을 정수로 반올림한다. */
export function accuracyPercent(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0
}
