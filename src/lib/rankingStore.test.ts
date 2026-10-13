import { describe, expect, it } from 'vitest'
import { loadRankings, saveRanking, STORAGE_KEY } from './rankingStore'
import { failingStorage, makeEntry, memoryStorage } from './testUtils'

describe('loadRankings', () => {
  it('저장소가 없거나 비어 있으면 빈 목록', () => {
    expect(loadRankings(null)).toEqual([])
    expect(loadRankings(memoryStorage())).toEqual([])
  })

  it('저장된 기록을 읽는다', () => {
    const entries = [makeEntry('a', 7, 60), makeEntry('b', 9, 30, 'cs')]
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(entries) })
    expect(loadRankings(storage)).toEqual(entries)
  })

  it('JSON이 깨져 있으면 빈 목록', () => {
    expect(loadRankings(memoryStorage({ [STORAGE_KEY]: '{not json' }))).toEqual([])
    expect(loadRankings(memoryStorage({ [STORAGE_KEY]: '{"a":1}' }))).toEqual([])
  })

  it('형식이 맞지 않는 항목은 건너뛴다', () => {
    const good = makeEntry('good', 5, 50)
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify([good, { id: 'bad' }, null, { ...good, id: 'x', mode: 'math' }]),
    })
    expect(loadRankings(storage)).toEqual([good])
  })

  it('getItem이 예외를 던져도 빈 목록', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {},
    }
    expect(loadRankings(storage)).toEqual([])
  })
})

describe('saveRanking', () => {
  it('기존 기록 뒤에 추가하고 전체 목록을 돌려준다', () => {
    const storage = memoryStorage()
    const first = makeEntry('first', 6, 70)
    const second = makeEntry('second', 9, 50)

    expect(saveRanking(storage, first)).toEqual([first])
    expect(saveRanking(storage, second)).toEqual([first, second])
    expect(loadRankings(storage)).toEqual([first, second])
  })

  it('새로고침 뒤(새로 읽어도) 기록이 유지된다', () => {
    const storage = memoryStorage()
    saveRanking(storage, makeEntry('a', 3, 30))
    const reopened = memoryStorage({ ...storage.data })
    expect(loadRankings(reopened).map((e) => e.id)).toEqual(['a'])
  })

  it('저장소가 없거나 쓰기에 실패하면 null', () => {
    expect(saveRanking(null, makeEntry('a', 1, 1))).toBeNull()
    expect(saveRanking(failingStorage(), makeEntry('a', 1, 1))).toBeNull()
  })
})
