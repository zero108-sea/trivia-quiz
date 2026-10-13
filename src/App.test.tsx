import { cleanup as cleanupRender, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { questions } from './data/questions'
import { loadRankings, STORAGE_KEY, type RankingStorage } from './lib/rankingStore'
import { scoreGame } from './lib/scoreManager'
import { failingStorage, makeEntry, memoryStorage, seededRandom } from './lib/testUtils'
import type { AnswerRecord, Question } from './lib/types'

function setup(storage: RankingStorage | null = memoryStorage()) {
  let clock = Date.parse('2026-10-01T03:00:00.000Z')
  let nextId = 0
  const user = userEvent.setup()
  render(
    <App
      random={seededRandom(2026)}
      now={() => clock}
      storage={storage}
      createId={() => `game-${++nextId}`}
    />,
  )
  return {
    user,
    storage,
    advanceSeconds: (sec: number) => {
      clock += sec * 1000
    },
  }
}

async function startGame(user: ReturnType<typeof userEvent.setup>, modeLabel: RegExp) {
  await user.type(screen.getByLabelText('닉네임'), '지호')
  await user.click(screen.getByRole('radio', { name: modeLabel }))
  await user.click(screen.getByRole('button', { name: '시작하기' }))
}

/** 화면에 보이는 문제를 원본 데이터에서 찾는다. */
function currentQuestion(): Question {
  const heading = screen.getByRole('heading', { level: 2 }).textContent ?? ''
  const found = questions.find((q) => heading.endsWith(q.question))
  if (!found) throw new Error(`문제를 찾지 못했습니다: ${heading}`)
  return found
}

function choiceButtons(): HTMLButtonElement[] {
  return within(screen.getByRole('list', { name: '보기' })).getAllByRole('button')
}

function choiceButton(text: string): HTMLButtonElement {
  const button = choiceButtons().find((b) => b.querySelector('.choice__text')?.textContent === text)
  if (!button) throw new Error(`보기를 찾지 못했습니다: ${text}`)
  return button
}

function correctText(q: Question) {
  return q.choices[q.answerIndex]
}

function wrongText(q: Question) {
  return q.choices.find((_, i) => i !== q.answerIndex)!
}

/** 테스트 시계는 직접 움직이지 않으면 멈춰 있으므로, 별도 표시가 없으면 답한 시간은 0초다. */
function quickRecord(q: Question, correct: boolean, timeSec = 0, usedHint = false): AnswerRecord {
  return {
    selectedIndex: q.choices.indexOf(correct ? correctText(q) : wrongText(q)),
    timeSec,
    usedHint,
  }
}

function expectedScore(played: { q: Question; record: AnswerRecord }[]) {
  return scoreGame(
    played.map((p) => p.q),
    played.map((p) => p.record),
  )
}

describe('시작 화면', () => {
  it('닉네임이 2~12자가 아니면 시작 버튼이 비활성이다', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('닉네임')
    const start = screen.getByRole('button', { name: '시작하기' })

    expect(start).toBeDisabled()
    await user.type(input, '지')
    expect(start).toBeDisabled()
    await user.type(input, '호')
    expect(start).toBeEnabled()
    await user.clear(input)
    await user.type(input, '가나다라마바사아자차카타파')
    expect(start).toBeDisabled()
    await user.clear(input)
    await user.type(input, '   ')
    expect(start).toBeDisabled()
  })

  it('게임 모드 6개(카테고리 4개, 전체 도전, 스피드 퀴즈)를 고를 수 있고 기본값은 한국사다', () => {
    setup()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(6)
    expect(screen.getByRole('radio', { name: /한국사/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /한국사/ })).toHaveAccessibleName(/10문제/)
    expect(screen.getByRole('radio', { name: /전체 도전/ })).toHaveAccessibleName(/40문제/)
    expect(screen.getByRole('radio', { name: /스피드 퀴즈/ })).toHaveAccessibleName(/20문제 · 문제당 15초/)
  })
})

describe('시작 → 퀴즈 → 결과 흐름', () => {
  it('한국사 10문제를 풀고 결과를 본 뒤 다시 하기와 처음으로가 동작한다', async () => {
    const { user, advanceSeconds } = setup()
    await startGame(user, /한국사/)

    const seen = new Set<string>()
    const played: { q: Question; record: AnswerRecord }[] = []
    for (let n = 1; n <= 10; n++) {
      expect(screen.getByText(`${n} / 10`)).toBeInTheDocument()
      const q = currentQuestion()
      expect(q.category).toBe('history')
      seen.add(q.id)

      // 앞 7문제는 정답, 뒤 3문제는 오답을 고른다.
      const answerCorrectly = n <= 7
      played.push({ q, record: quickRecord(q, answerCorrectly) })
      expect(screen.queryByRole('button', { name: /다음 문제|결과 보기/ })).not.toBeInTheDocument()
      await user.click(choiceButton(answerCorrectly ? correctText(q) : wrongText(q)))

      // 답이 확정되면 모든 보기가 비활성이 된다.
      for (const button of choiceButtons()) expect(button).toBeDisabled()

      const status = screen.getByRole('status')
      expect(status).toHaveTextContent(q.explanation)
      if (answerCorrectly) {
        expect(status).toHaveTextContent('정답!')
        expect(choiceButton(correctText(q))).toHaveAttribute('data-state', 'correct')
      } else {
        expect(status).toHaveTextContent('오답')
        expect(choiceButton(wrongText(q))).toHaveAttribute('data-state', 'wrong')
        // 오답이면 원래 정답 보기도 강조한다.
        expect(choiceButton(correctText(q))).toHaveAttribute('data-state', 'answer')
      }
      expect(screen.getByText(`점수 ${expectedScore(played).total}`)).toBeInTheDocument()

      if (n < 10) {
        await user.click(screen.getByRole('button', { name: '다음 문제' }))
      } else {
        advanceSeconds(83)
        await user.click(screen.getByRole('button', { name: '결과 보기' }))
      }
    }
    expect(seen.size).toBe(10)

    // 결과 화면
    expect(screen.getByRole('heading', { name: '지호님의 한국사 결과' })).toBeInTheDocument()
    const final = expectedScore(played)
    expect(screen.getByLabelText(`최종 점수 ${final.total}점, 10문제 중 7개 정답`)).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('1분 23초')).toBeInTheDocument()

    // 다시 하기: 같은 모드로 처음부터
    await user.click(screen.getByRole('button', { name: '다시 하기' }))
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
    expect(screen.getByText('점수 0')).toBeInTheDocument()
    expect(currentQuestion().category).toBe('history')

    // 두 번째 판은 모두 맞혀서 이전 판 점수가 남지 않았는지 확인한다.
    for (let n = 1; n <= 10; n++) {
      await user.click(choiceButton(correctText(currentQuestion())))
      await user.click(screen.getByRole('button', { name: n < 10 ? '다음 문제' : '결과 보기' }))
    }
    expect(screen.getByLabelText(/10문제 중 10개 정답/)).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()

    // 처음으로: 시작 화면, 입력한 닉네임과 과목은 유지
    await user.click(screen.getByRole('button', { name: '처음으로' }))
    expect(screen.getByRole('heading', { name: '상식 퀴즈' })).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toHaveValue('지호')
    expect(screen.getByRole('radio', { name: /한국사/ })).toBeChecked()
  })

  it('전체 모드는 네 과목에서 40문제를 낸다', async () => {
    const { user } = setup()
    await startGame(user, /전체 도전/)
    expect(screen.getByText('1 / 40')).toBeInTheDocument()

    const categories = new Set<string>()
    for (let n = 1; n <= 40; n++) {
      const q = currentQuestion()
      categories.add(q.category)
      await user.click(choiceButton(correctText(q)))
      await user.click(screen.getByRole('button', { name: n < 40 ? '다음 문제' : '결과 보기' }))
    }
    expect(categories).toEqual(new Set(['history', 'cs', 'english', 'general']))
    expect(screen.getByRole('heading', { name: '지호님의 전체 도전 결과' })).toBeInTheDocument()
    expect(screen.getByLabelText(/40문제 중 40개 정답/)).toBeInTheDocument()
  })
})

describe('키보드 조작', () => {
  it('1~4로 보기를 고르고 Enter로 다음 문제로 넘어간다', async () => {
    const { user } = setup()
    await startGame(user, /컴퓨터과학/)

    const q = currentQuestion()
    const firstChoice = choiceButtons()[0]
    const firstIsCorrect = firstChoice.querySelector('.choice__text')?.textContent === correctText(q)
    await user.keyboard('1')
    expect(firstChoice).toHaveAttribute('data-state', firstIsCorrect ? 'correct' : 'wrong')

    // 이미 답했으면 다른 숫자를 눌러도 답이 바뀌지 않는다.
    await user.keyboard('2')
    expect(firstChoice.getAttribute('data-state')).toMatch(/correct|wrong/)
    expect(choiceButtons()[1].getAttribute('data-state')).toMatch(/answer|dim/)

    // 답을 고르면 '다음 문제' 버튼에 포커스가 가서 Enter로 넘어간다.
    expect(screen.getByRole('button', { name: '다음 문제' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('포커스가 버튼 밖에 있어도 Enter로 넘어가고, 답하기 전 Enter는 무시한다', async () => {
    const { user } = setup()
    await startGame(user, /영어/)

    ;(document.activeElement as HTMLElement | null)?.blur()
    await user.keyboard('{Enter}')
    expect(screen.getByText('1 / 10')).toBeInTheDocument()

    await user.keyboard('3')
    ;(document.activeElement as HTMLElement | null)?.blur()
    await user.keyboard('{Enter}')
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
  })
})

/** 현재 판을 끝까지 푼다. 앞에서부터 correctCount개만 맞힌다. */
async function playToEnd(
  user: ReturnType<typeof userEvent.setup>,
  correctCount: number,
  advance?: (sec: number) => void,
  seconds = 0,
) {
  const total = Number(/\d+ \/ (\d+)/.exec(screen.getByText(/^1 \/ \d+$/).textContent ?? '')![1])
  const played: { q: Question; record: AnswerRecord }[] = []
  for (let n = 1; n <= total; n++) {
    const q = currentQuestion()
    played.push({ q, record: quickRecord(q, n <= correctCount) })
    await user.click(choiceButton(n <= correctCount ? correctText(q) : wrongText(q)))
    if (n === total) advance?.(seconds)
    await user.click(screen.getByRole('button', { name: n < total ? '다음 문제' : '결과 보기' }))
  }
  return expectedScore(played)
}

describe('순위 기록', () => {
  it('게임이 끝나면 기록이 자동 저장되고 결과 화면에 순위가 나온다', async () => {
    const { user, storage, advanceSeconds } = setup()
    await startGame(user, /한국사/)
    const game = await playToEnd(user, 6, advanceSeconds, 75)

    expect(loadRankings(storage)).toEqual([
      {
        id: 'game-1',
        nickname: '지호',
        mode: 'history',
        score: game.total,
        correct: 6,
        total: 10,
        durationSec: 75,
        playedAt: '2026-10-01T03:01:15.000Z',
      },
    ])
    expect(screen.getByText('1위')).toBeInTheDocument()
    expect(screen.getByText('/ 1개 기록')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // 같은 모드에서 더 낮은 점수로 한 판 더
    await user.click(screen.getByRole('button', { name: '다시 하기' }))
    await playToEnd(user, 3, advanceSeconds, 40)
    expect(screen.getByText('2위')).toBeInTheDocument()
    expect(screen.getByText('/ 2개 기록')).toBeInTheDocument()
    expect(loadRankings(storage)).toHaveLength(2)
  })

  it('저장소에 쓰지 못해도 게임은 끝나고 안내 문구와 순위가 나온다', async () => {
    const { user } = setup(failingStorage())
    await startGame(user, /영어/)
    await playToEnd(user, 10)

    expect(screen.getByRole('alert')).toHaveTextContent('기록을 저장하지 못했어요')
    expect(screen.getByLabelText(/10문제 중 10개 정답/)).toBeInTheDocument()
    expect(screen.getByText('1위')).toBeInTheDocument()

    // 저장하지 못한 기록도 이번 세션의 순위표에는 보인다.
    await user.click(screen.getByRole('button', { name: '순위표 보기' }))
    expect(within(screen.getByRole('table')).getByText('지호')).toBeInTheDocument()
  })

  it('브라우저 저장소 자체가 없어도(null) 게임을 할 수 있다', async () => {
    const { user } = setup(null)
    await startGame(user, /일반상식/)
    await playToEnd(user, 5)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText(/10문제 중 5개 정답/)).toBeInTheDocument()
  })

  it('새로 열어도(같은 저장소로 다시 렌더링) 순위표가 유지된다', async () => {
    const storage = memoryStorage()
    const first = setup(storage)
    await startGame(first.user, /한국사/)
    await playToEnd(first.user, 8)
    cleanupRender()

    const { user } = setup(storage)
    await user.click(screen.getByRole('button', { name: '순위표 보기' }))
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(2)
    expect(rows[1]).toHaveTextContent('지호')
    expect(rows[1]).toHaveTextContent('8/10')
  })
})

describe('순위표 화면', () => {
  function seeded() {
    const entries = [
      // 한국사 12개: 점수는 0~10(h0과 h11은 0점), 시간은 100초부터 1초씩 줄어든다.
      ...Array.from({ length: 12 }, (_, i) => makeEntry(`h${i}`, i % 11, 100 - i)),
      makeEntry('fast', 9, 30, 'cs'),
      makeEntry('slow', 9, 90, 'cs'),
      makeEntry('low', 4, 20, 'cs'),
    ]
    return memoryStorage({ [STORAGE_KEY]: JSON.stringify(entries) })
  }

  it('모드별 상위 10명을 점수, 시간 순으로 보여 준다', async () => {
    const { user } = setup(seeded())
    await user.click(screen.getByRole('button', { name: '순위표 보기' }))

    expect(screen.getByRole('tab', { name: '한국사' })).toHaveAttribute('aria-selected', 'true')
    const historyRows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(historyRows).toHaveLength(10)
    // 점수 10(h10)이 1위, 점수 9 두 개(h9, …) 중 시간이 짧은 쪽이 먼저
    expect(historyRows[0]).toHaveTextContent('h10')

    await user.click(screen.getByRole('tab', { name: '컴퓨터과학' }))
    const csRows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(csRows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      'fast',
      'slow',
      'low',
    ])
    expect(csRows[0]).toHaveTextContent('30초')
  })

  it('기록이 없는 모드는 안내 문구를 보여 주고, 화살표 키로 탭을 옮길 수 있다', async () => {
    const { user } = setup(seeded())
    await user.click(screen.getByRole('button', { name: '순위표 보기' }))

    screen.getByRole('tab', { name: '한국사' }).focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    const englishTab = screen.getByRole('tab', { name: '영어' })
    expect(englishTab).toHaveFocus()
    expect(englishTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/아직 영어 기록이 없어요/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '처음으로' }))
    expect(screen.getByRole('heading', { name: '상식 퀴즈' })).toBeInTheDocument()
  })

  it('결과 화면에서 열면 방금 기록이 있는 모드가 열리고 그 줄이 강조된다', async () => {
    const { user } = setup(seeded())
    await startGame(user, /컴퓨터과학/)
    await playToEnd(user, 9)
    await user.click(screen.getByRole('button', { name: '순위표 보기' }))

    expect(screen.getByRole('tab', { name: '컴퓨터과학' })).toHaveAttribute('aria-selected', 'true')
    const current = within(screen.getByRole('table'))
      .getAllByRole('row')
      .filter((row) => row.getAttribute('aria-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('지호')
    expect(current[0]).toHaveTextContent('방금 기록')
  })

  it('방금 기록이 10위 밖이면 표 아래에 따로 보여 준다', async () => {
    const { user, advanceSeconds } = setup(seeded())
    await startGame(user, /한국사/)
    // 0점, 200초: 기존 0점 기록 2개(89초, 100초)보다도 느려서 13위가 된다.
    await playToEnd(user, 0, advanceSeconds, 200)
    expect(screen.getByText('13위')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '순위표 보기' }))
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(11)
    expect(rows[10]).toHaveAttribute('aria-current', 'true')
    expect(rows[10]).toHaveTextContent('13')
  })
})

describe('틀린 문제 다시 보기', () => {
  it('틀린 문제마다 내 답, 정답, 해설을 보여 준다', async () => {
    const { user } = setup()
    await startGame(user, /한국사/)

    const wrong: { q: Question; mine: string }[] = []
    for (let n = 1; n <= 10; n++) {
      const q = currentQuestion()
      const pickWrong = n % 4 === 0 // 4번, 8번 문제만 틀린다
      const pick = pickWrong ? wrongText(q) : correctText(q)
      if (pickWrong) wrong.push({ q, mine: pick })
      await user.click(choiceButton(pick))
      await user.click(screen.getByRole('button', { name: n < 10 ? '다음 문제' : '결과 보기' }))
    }

    const review = screen.getByRole('region', { name: '틀린 문제 2개' })
    const items = within(review).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    wrong.forEach(({ q, mine }, i) => {
      expect(items[i]).toHaveTextContent(q.question)
      expect(items[i]).toHaveTextContent(`내 답${mine}`)
      expect(items[i]).toHaveTextContent(`정답${correctText(q)}`)
      expect(items[i]).toHaveTextContent(q.explanation)
    })
  })

  it('모두 맞히면 틀린 문제가 없다고 알려 준다', async () => {
    const { user } = setup()
    await startGame(user, /영어/)
    await playToEnd(user, 10)
    expect(screen.getByRole('region', { name: '틀린 문제 0개' })).toHaveTextContent('모두 맞혔어요')
  })
})

describe('게임 중 나가기', () => {
  it('계속 풀기를 고르면 같은 문제로 돌아가고, 그만두기를 고르면 기록 없이 시작 화면으로 간다', async () => {
    const { user, storage } = setup()
    await startGame(user, /한국사/)
    const first = currentQuestion()
    await user.click(choiceButton(correctText(first)))
    await user.click(screen.getByRole('button', { name: '다음 문제' }))
    const second = currentQuestion()

    await user.click(screen.getByRole('button', { name: '나가기' }))
    expect(screen.getByText('이번 판을 그만둘까요?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '계속 풀기' })).toHaveFocus()

    // 확인 패널이 열려 있는 동안에는 보기를 고를 수 없다.
    await user.keyboard('1')
    for (const button of choiceButtons()) expect(button).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '계속 풀기' }))
    expect(screen.queryByText('이번 판을 그만둘까요?')).not.toBeInTheDocument()
    expect(currentQuestion().id).toBe(second.id)
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
    expect(
      screen.getByText(`점수 ${expectedScore([{ q: first, record: quickRecord(first, true) }]).total}`),
    ).toBeInTheDocument()
    for (const button of choiceButtons()) expect(button).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '나가기' }))
    await user.click(screen.getByRole('button', { name: '그만두기' }))
    expect(screen.getByRole('heading', { name: '상식 퀴즈' })).toBeInTheDocument()
    expect(loadRankings(storage)).toEqual([])
  })

  it('Esc로 확인 패널을 닫으면 나가기 버튼으로 포커스가 돌아온다', async () => {
    const { user } = setup()
    await startGame(user, /영어/)
    await user.click(screen.getByRole('button', { name: '나가기' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByText('이번 판을 그만둘까요?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '나가기' })).toHaveFocus()
  })
})

describe('점수 시스템', () => {
  it('정답마다 난이도별 기본 점수와 보너스 내역을 보여 주고, 3연속 정답에서 콤보 보너스를 준다', async () => {
    const { user, advanceSeconds } = setup()
    await startGame(user, /한국사/)

    // 1번: 12초 걸려서 정답 → 빠른 답 보너스 없음
    const q1 = currentQuestion()
    advanceSeconds(12)
    await user.click(choiceButton(correctText(q1)))
    let status = screen.getByRole('status')
    expect(status).toHaveTextContent(`+${expectedScore([{ q: q1, record: quickRecord(q1, true, 12) }]).total}점`)
    expect(status).toHaveTextContent(/기본 \d+점/)
    expect(status).toHaveTextContent('힌트 미사용 +2')
    expect(status).not.toHaveTextContent('빠른 답')
    await user.click(screen.getByRole('button', { name: '다음 문제' }))

    // 2번: 바로 정답 → 빠른 답 보너스
    await user.click(choiceButton(correctText(currentQuestion())))
    expect(screen.getByRole('status')).toHaveTextContent('빠른 답 +3')
    expect(screen.getByText('2연속 정답')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다음 문제' }))

    // 3번: 3연속 콤보
    await user.click(choiceButton(correctText(currentQuestion())))
    status = screen.getByRole('status')
    expect(status).toHaveTextContent('3연속 콤보 +2')
    await user.click(screen.getByRole('button', { name: '다음 문제' }))

    // 4번: 오답이면 0점이고 연속 정답이 끊긴다
    await user.click(choiceButton(wrongText(currentQuestion())))
    expect(screen.getByRole('status')).not.toHaveTextContent(/\+\d+점/)
    expect(screen.queryByText(/연속 정답/)).not.toBeInTheDocument()
  })

  it('힌트를 쓰면 오답 보기 2개가 지워지고 힌트 미사용 보너스를 받지 못한다', async () => {
    const { user } = setup()
    await startGame(user, /컴퓨터과학/)
    const q = currentQuestion()

    await user.click(screen.getByRole('button', { name: '힌트: 오답 2개 지우기' }))
    const removed = choiceButtons().filter((b) => b.getAttribute('data-state') === 'removed')
    expect(removed).toHaveLength(2)
    for (const button of removed) {
      expect(button).toBeDisabled()
      expect(button).not.toHaveTextContent(correctText(q))
    }
    expect(choiceButton(correctText(q))).toBeEnabled()
    expect(screen.getByRole('button', { name: '힌트 사용함' })).toBeDisabled()

    // 지워진 보기는 키보드로도 고를 수 없다.
    const removedIndex = choiceButtons().indexOf(removed[0])
    await user.keyboard(String(removedIndex + 1))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    await user.click(choiceButton(correctText(q)))
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(`+${expectedScore([{ q, record: quickRecord(q, true, 0, true) }]).total}점`)
    expect(status).not.toHaveTextContent('힌트 미사용')

    // 다음 문제에서는 힌트를 다시 쓸 수 있다.
    await user.click(screen.getByRole('button', { name: '다음 문제' }))
    expect(screen.getByRole('button', { name: '힌트: 오답 2개 지우기' })).toBeEnabled()
  })

  it('결과 화면에 항목별 점수 내역과 최대 연속 정답이 나온다', async () => {
    const { user } = setup()
    await startGame(user, /영어/)
    const game = await playToEnd(user, 6)

    expect(screen.getByText('기본 점수 (난이도 배수 포함)').nextSibling).toHaveTextContent(String(game.totals.base))
    expect(screen.getByText('빠른 답 보너스').nextSibling).toHaveTextContent(`+${game.totals.fast}`)
    expect(screen.getByText('힌트 미사용 보너스').nextSibling).toHaveTextContent(`+${game.totals.noHint}`)
    expect(screen.getByText('콤보 보너스 (최대 6연속)').nextSibling).toHaveTextContent(`+${game.totals.combo}`)
    expect(screen.getByText('합계').nextSibling).toHaveTextContent(`${game.total}점`)
    // 6연속이면 3연속(+2)과 5연속(+5) 콤보를 받는다.
    expect(game.totals.combo).toBe(7)
  })
})

describe('스피드 퀴즈', () => {
  it('네 과목에서 20문제를 내고, 15초가 지나면 시간 초과로 오답 처리한다', async () => {
    const { user, advanceSeconds } = setup()
    await startGame(user, /스피드 퀴즈/)
    expect(screen.getByText('1 / 20')).toBeInTheDocument()
    expect(screen.getByText('15초')).toBeInTheDocument()

    const q = currentQuestion()
    advanceSeconds(15)
    const status = screen.getByRole('status')
    await screen.findByText('시간 초과', {}, { timeout: 2000 })
    expect(status).toHaveTextContent(`정답은`)
    expect(choiceButton(correctText(q))).toHaveAttribute('data-state', 'answer')
    for (const button of choiceButtons()) expect(button).toBeDisabled()
    expect(screen.getByText('점수 0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음 문제' }))
    expect(screen.getByText('15초')).toBeInTheDocument()
  })

  it('나가기 확인 중에는 시간이 멈춘다', async () => {
    const { user, advanceSeconds } = setup()
    await startGame(user, /스피드 퀴즈/)
    advanceSeconds(5)
    await user.click(screen.getByRole('button', { name: '나가기' }))
    advanceSeconds(60)
    await new Promise((resolve) => setTimeout(resolve, 300))
    await user.click(screen.getByRole('button', { name: '계속 풀기' }))
    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(screen.queryByText('시간 초과')).not.toBeInTheDocument()
    expect(screen.getByText('10초')).toBeInTheDocument()
  })

  it('20문제를 끝내면 스피드 퀴즈 순위에 기록된다', async () => {
    const { user, storage } = setup()
    await startGame(user, /스피드 퀴즈/)
    const categories = new Set<string>()
    for (let n = 1; n <= 20; n++) {
      const q = currentQuestion()
      categories.add(q.category)
      await user.click(choiceButton(correctText(q)))
      await user.click(screen.getByRole('button', { name: n < 20 ? '다음 문제' : '결과 보기' }))
    }
    expect(categories.size).toBe(4)
    expect(screen.getByRole('heading', { name: '지호님의 스피드 퀴즈 결과' })).toBeInTheDocument()
    expect(loadRankings(storage)).toMatchObject([{ mode: 'speed', correct: 20, total: 20 }])

    await user.click(screen.getByRole('button', { name: '순위표 보기' }))
    expect(screen.getByRole('tab', { name: '스피드 퀴즈' })).toHaveAttribute('aria-selected', 'true')
  })
})
