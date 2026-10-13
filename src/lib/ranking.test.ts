import { describe, expect, it } from 'vitest'
import { rankingsForMode, rankOf, sortRankings } from './ranking'
import { makeEntry as entry } from './testUtils'

describe('sortRankings', () => {
  it('점수 내림차순으로 정렬한다', () => {
    const sorted = sortRankings([entry('a', 5, 60), entry('b', 9, 60), entry('c', 7, 60)])
    expect(sorted.map((e) => e.id)).toEqual(['b', 'c', 'a'])
  })

  it('동점이면 소요 시간이 짧은 순이다', () => {
    const sorted = sortRankings([entry('slow', 8, 120), entry('fast', 8, 45), entry('mid', 8, 90)])
    expect(sorted.map((e) => e.id)).toEqual(['fast', 'mid', 'slow'])
  })

  it('점수가 시간보다 우선한다', () => {
    const sorted = sortRankings([entry('quick-low', 6, 10), entry('slow-high', 7, 300)])
    expect(sorted.map((e) => e.id)).toEqual(['slow-high', 'quick-low'])
  })

  it('원본 배열을 바꾸지 않는다', () => {
    const entries = [entry('a', 1, 10), entry('b', 2, 10)]
    sortRankings(entries)
    expect(entries.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('빈 배열은 빈 배열을 돌려준다', () => {
    expect(sortRankings([])).toEqual([])
  })
})

describe('rankingsForMode', () => {
  it('해당 모드 기록만 순위대로 돌려준다', () => {
    const entries = [
      entry('h1', 5, 60, 'history'),
      entry('c1', 9, 60, 'cs'),
      entry('h2', 8, 60, 'history'),
      entry('a1', 30, 300, 'all'),
    ]
    expect(rankingsForMode(entries, 'history').map((e) => e.id)).toEqual(['h2', 'h1'])
    expect(rankingsForMode(entries, 'all').map((e) => e.id)).toEqual(['a1'])
    expect(rankingsForMode(entries, 'english')).toEqual([])
  })
})

describe('rankOf', () => {
  const entries = [
    entry('h1', 5, 60, 'history'),
    entry('c1', 10, 30, 'cs'),
    entry('h2', 8, 90, 'history'),
    entry('h3', 8, 40, 'history'),
  ]

  it('같은 모드 안에서의 순위를 1부터 센다', () => {
    expect(rankOf(entries, 'h3')).toBe(1)
    expect(rankOf(entries, 'h2')).toBe(2)
    expect(rankOf(entries, 'h1')).toBe(3)
    expect(rankOf(entries, 'c1')).toBe(1)
  })

  it('점수와 시간이 모두 같으면 먼저 남긴 기록이 앞선다', () => {
    const tied = [entry('first', 7, 50), entry('second', 7, 50)]
    expect(rankOf(tied, 'first')).toBe(1)
    expect(rankOf(tied, 'second')).toBe(2)
  })

  it('없는 id면 null', () => {
    expect(rankOf(entries, 'nope')).toBeNull()
  })
})
