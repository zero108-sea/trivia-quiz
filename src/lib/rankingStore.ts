import { MODES } from './modes'
import type { RankingEntry } from './types'

/**
 * v2: 점수가 '맞힌 개수'에서 '배수·보너스를 더한 점수'로 바뀌어 키를 새로 쓴다.
 * 예전 키(trivia-quiz:rankings)의 기록은 점수 기준이 달라 섞지 않는다.
 */
export const STORAGE_KEY = 'trivia-quiz:rankings:v2'

/** localStorage에서 쓰는 부분만 뽑은 형태. 테스트에서는 메모리 저장소를 넘긴다. */
export type RankingStorage = Pick<Storage, 'getItem' | 'setItem'>

/** 브라우저 저장소를 쓸 수 없으면(사파리 사생활 보호 모드, 차단 설정 등) null. */
export function getBrowserStorage(): RankingStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isRankingEntry(value: unknown): value is RankingEntry {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.nickname === 'string' &&
    MODES.includes(e.mode as RankingEntry['mode']) &&
    Number.isFinite(e.score) &&
    Number.isFinite(e.correct) &&
    Number.isFinite(e.total) &&
    Number.isFinite(e.durationSec) &&
    typeof e.playedAt === 'string'
  )
}

/** 저장된 기록을 읽는다. 저장소가 없거나 내용이 깨져 있으면 빈 목록을 돌려준다. */
export function loadRankings(storage: RankingStorage | null): RankingEntry[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isRankingEntry) : []
  } catch {
    return []
  }
}

/** 기록을 하나 추가한다. 성공하면 추가된 뒤의 전체 목록, 저장하지 못하면 null. */
export function saveRanking(
  storage: RankingStorage | null,
  entry: RankingEntry,
): RankingEntry[] | null {
  if (!storage) return null
  const entries = [...loadRankings(storage), entry]
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries))
    return entries
  } catch {
    return null
  }
}
