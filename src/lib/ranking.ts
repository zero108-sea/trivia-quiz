import type { Mode, RankingEntry } from './types'

/** 점수 내림차순, 동점이면 소요 시간(durationSec) 오름차순. 원본은 바꾸지 않는다. */
export function sortRankings(entries: readonly RankingEntry[]): RankingEntry[] {
  return [...entries].sort((a, b) => b.score - a.score || a.durationSec - b.durationSec)
}

/** 한 모드의 기록만 골라 순위대로 정렬한다. */
export function rankingsForMode(entries: readonly RankingEntry[], mode: Mode): RankingEntry[] {
  return sortRankings(entries.filter((entry) => entry.mode === mode))
}

/**
 * 같은 모드 기록 중 몇 위인지(1부터) 돌려준다. 기록이 없으면 null.
 * 점수와 시간이 같으면 먼저 남긴 기록이 앞선다.
 */
export function rankOf(entries: readonly RankingEntry[], id: string): number | null {
  const entry = entries.find((e) => e.id === id)
  if (!entry) return null
  return rankingsForMode(entries, entry.mode).findIndex((e) => e.id === id) + 1
}
