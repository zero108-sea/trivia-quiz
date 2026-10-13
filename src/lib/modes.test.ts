import { describe, expect, it } from 'vitest'
import { accuracyPercent, formatDuration, isValidNickname, questionCount, timeLimitSec } from './modes'

describe('isValidNickname', () => {
  it('2~12자면 유효하다', () => {
    expect(isValidNickname('지호')).toBe(true)
    expect(isValidNickname('가나다라마바사아자차카타')).toBe(true)
  })

  it('1자 이하나 13자 이상이면 유효하지 않다', () => {
    expect(isValidNickname('')).toBe(false)
    expect(isValidNickname('지')).toBe(false)
    expect(isValidNickname('가나다라마바사아자차카타파')).toBe(false)
  })

  it('앞뒤 공백은 길이에 넣지 않는다', () => {
    expect(isValidNickname('  지  ')).toBe(false)
    expect(isValidNickname('  지호  ')).toBe(true)
  })
})

describe('formatDuration', () => {
  it('1분 미만은 초만 표시한다', () => {
    expect(formatDuration(0)).toBe('0초')
    expect(formatDuration(45)).toBe('45초')
  })

  it('1분 이상은 분과 초를 표시한다', () => {
    expect(formatDuration(60)).toBe('1분 0초')
    expect(formatDuration(83)).toBe('1분 23초')
  })
})

describe('accuracyPercent', () => {
  it('정답률을 반올림한 정수로 돌려준다', () => {
    expect(accuracyPercent(7, 10)).toBe(70)
    expect(accuracyPercent(13, 40)).toBe(33)
    expect(accuracyPercent(0, 0)).toBe(0)
  })
})

describe('questionCount / timeLimitSec', () => {
  it('카테고리 10문제, 전체 도전 40문제, 스피드 퀴즈 20문제', () => {
    expect(questionCount('history')).toBe(10)
    expect(questionCount('all')).toBe(40)
    expect(questionCount('speed')).toBe(20)
  })

  it('스피드 퀴즈만 문제당 15초 제한이 있다', () => {
    expect(timeLimitSec('speed')).toBe(15)
    expect(timeLimitSec('all')).toBeNull()
    expect(timeLimitSec('cs')).toBeNull()
  })
})
