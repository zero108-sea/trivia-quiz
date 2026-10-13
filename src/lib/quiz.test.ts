import { describe, expect, it } from 'vitest'
import { questions } from '../data/questions'
import { hintEliminations, pickQuestions, shuffle, shuffleChoices } from './quiz'
import { seededRandom } from './testUtils'
import { CATEGORIES, type Question } from './types'

const sample: Question = {
  id: 'cs-99',
  category: 'cs',
  difficulty: 'easy',
  question: '테스트 문제',
  choices: ['A', 'B', 'C', 'D'],
  answerIndex: 2,
  explanation: '정답은 C',
}

describe('shuffle', () => {
  it('원소는 그대로 두고 순서만 바꾸며 원본을 바꾸지 않는다', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const result = shuffle(items, seededRandom(1))
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...result].sort((a, b) => a - b)).toEqual(items)
  })

  it('같은 seed면 같은 결과를 낸다', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(items, seededRandom(42))).toEqual(shuffle(items, seededRandom(42)))
  })

  it('빈 배열과 원소 1개짜리 배열도 처리한다', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['a'])).toEqual(['a'])
  })
})

describe('shuffleChoices', () => {
  it('여러 seed로 섞어도 answerIndex가 원래 정답 보기를 가리킨다', () => {
    for (let seed = 0; seed < 100; seed++) {
      const shuffled = shuffleChoices(sample, seededRandom(seed))
      expect(shuffled.choices[shuffled.answerIndex]).toBe('C')
      expect([...shuffled.choices].sort()).toEqual(['A', 'B', 'C', 'D'])
    }
  })

  it('정답 위치가 여러 곳으로 옮겨 간다(실제로 섞인다)', () => {
    const positions = new Set<number>()
    for (let seed = 0; seed < 100; seed++) {
      positions.add(shuffleChoices(sample, seededRandom(seed)).answerIndex)
    }
    expect(positions.size).toBe(4)
  })

  it('원본 문제를 바꾸지 않는다', () => {
    shuffleChoices(sample, seededRandom(3))
    expect(sample.choices).toEqual(['A', 'B', 'C', 'D'])
    expect(sample.answerIndex).toBe(2)
  })
})

describe('pickQuestions', () => {
  it.each(CATEGORIES)('%s 모드는 해당 카테고리 10문제만 고른다', (category) => {
    const picked = pickQuestions(questions, category, seededRandom(7))
    expect(picked).toHaveLength(10)
    expect(picked.every((q) => q.category === category)).toBe(true)
  })

  it('all 모드는 40문제를 중복 없이 고른다', () => {
    const picked = pickQuestions(questions, 'all', seededRandom(7))
    expect(picked).toHaveLength(40)
    expect(new Set(picked.map((q) => q.id)).size).toBe(40)
  })

  it('섞인 뒤에도 모든 문제의 정답 텍스트가 원본과 같다', () => {
    const original = new Map(questions.map((q) => [q.id, q.choices[q.answerIndex]]))
    for (let seed = 0; seed < 20; seed++) {
      for (const q of pickQuestions(questions, 'all', seededRandom(seed))) {
        expect(q.choices[q.answerIndex]).toBe(original.get(q.id))
      }
    }
  })

  it('speed 모드는 카테고리마다 5문제씩 20문제를 중복 없이 고른다', () => {
    for (let seed = 0; seed < 10; seed++) {
      const picked = pickQuestions(questions, 'speed', seededRandom(seed))
      expect(picked).toHaveLength(20)
      expect(new Set(picked.map((q) => q.id)).size).toBe(20)
      for (const category of CATEGORIES) {
        expect(picked.filter((q) => q.category === category)).toHaveLength(5)
      }
    }
  })

  it('speed 모드는 seed마다 다른 문제 조합을 고른다', () => {
    const a = pickQuestions(questions, 'speed', seededRandom(1)).map((q) => q.id).sort()
    const b = pickQuestions(questions, 'speed', seededRandom(2)).map((q) => q.id).sort()
    expect(a).not.toEqual(b)
  })

  it('문제 순서를 섞는다', () => {
    const ids = questions.map((q) => q.id)
    const pickedIds = pickQuestions(questions, 'all', seededRandom(11)).map((q) => q.id)
    expect(pickedIds).not.toEqual(ids)
  })
})

describe('hintEliminations', () => {
  it('정답이 아닌 보기 2개를 고른다', () => {
    for (let answerIndex = 0; answerIndex < 4; answerIndex++) {
      const removed = hintEliminations({ ...sample, answerIndex })
      expect(removed).toHaveLength(2)
      expect(removed).not.toContain(answerIndex)
      expect(new Set(removed).size).toBe(2)
    }
  })
})
