import { SPEED_QUESTION_COUNT } from './modes'
import { CATEGORIES, type Mode, type Question } from './types'

/** 0 이상 1 미만의 난수를 돌려주는 함수. 테스트에서는 고정된 값으로 바꿔 넣는다. */
export type Random = () => number

/** Fisher-Yates 셔플. 원본을 바꾸지 않고 섞인 새 배열을 돌려준다. */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** 보기 순서를 섞고, 정답 보기가 옮겨 간 위치로 answerIndex를 고친 새 문제를 돌려준다. */
export function shuffleChoices(question: Question, random: Random = Math.random): Question {
  const order = shuffle(
    question.choices.map((_, index) => index),
    random,
  )
  return {
    ...question,
    choices: order.map((index) => question.choices[index]),
    answerIndex: order.indexOf(question.answerIndex),
  }
}

/**
 * 모드에 맞는 문제를 골라 문제 순서와 보기 순서를 모두 섞는다.
 * - 카테고리: 그 카테고리 전체(10문제)
 * - all: 문제 은행 전체(40문제)
 * - speed: 카테고리마다 같은 수만큼 무작위로 뽑아 20문제
 */
export function pickQuestions(
  questions: readonly Question[],
  mode: Mode,
  random: Random = Math.random,
): Question[] {
  let pool: readonly Question[]
  if (mode === 'all') {
    pool = questions
  } else if (mode === 'speed') {
    const perCategory = SPEED_QUESTION_COUNT / CATEGORIES.length
    pool = CATEGORIES.flatMap((category) =>
      shuffle(
        questions.filter((q) => q.category === category),
        random,
      ).slice(0, perCategory),
    )
  } else {
    pool = questions.filter((q) => q.category === mode)
  }
  return shuffle(pool, random).map((q) => shuffleChoices(q, random))
}

/** 힌트로 지울 보기 2개. 지금 보이는 순서에서 앞쪽 오답 2개를 고른다(보기는 이미 섞여 있다). */
export function hintEliminations(question: Question): number[] {
  return question.choices
    .map((_, index) => index)
    .filter((index) => index !== question.answerIndex)
    .slice(0, 2)
}
