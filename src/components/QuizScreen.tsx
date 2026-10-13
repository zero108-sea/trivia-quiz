import { useEffect, useRef, useState } from 'react'
import { MODE_LABELS, timeLimitSec } from '../lib/modes'
import { hintEliminations } from '../lib/quiz'
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_MULTIPLIER,
  FAST_ANSWER_BONUS,
  FAST_ANSWER_LIMIT_SEC,
  NO_HINT_BONUS,
  scoreGame,
} from '../lib/scoreManager'
import type { AnswerRecord, Mode, Question } from '../lib/types'

const CHOICE_NUMBERS = ['1', '2', '3', '4']
const TICK_MS = 200

type ChoiceState = 'idle' | 'removed' | 'correct' | 'wrong' | 'answer' | 'dim'

interface QuizScreenProps {
  mode: Mode
  questions: Question[]
  /** 현재 시각(밀리초). 테스트에서 고정된 시계를 넘긴다. */
  now: () => number
  /** records[i]는 questions[i]의 플레이 기록이다. */
  onFinish: (records: AnswerRecord[]) => void
  /** 기록을 남기지 않고 게임을 그만둔다. */
  onQuit: () => void
}

export function QuizScreen({ mode, questions, now, onFinish, onQuit }: QuizScreenProps) {
  const limitSec = timeLimitSec(mode)
  const [index, setIndex] = useState(0)
  const [records, setRecords] = useState<AnswerRecord[]>([])
  const [hintUsed, setHintUsed] = useState(false)
  const [questionStartedAt, setQuestionStartedAt] = useState(now)
  // 나가기 확인 패널이 열린 동안에는 시간이 흐르지 않게 멈춘 시각을 기억한다.
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [, setTick] = useState(0)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const quitButtonRef = useRef<HTMLButtonElement>(null)
  const keepPlayingRef = useRef<HTMLButtonElement>(null)

  const confirmingQuit = pausedAt !== null
  const question = questions[index]
  const record = records[index] ?? null
  const answered = record !== null
  const timedOut = answered && record.selectedIndex === null
  const isLast = index === questions.length - 1
  const game = scoreGame(questions, records)
  const answerScore = answered ? game.answers[index] : null
  const streak = game.answers.at(-1)?.streak ?? 0
  const removed = hintUsed ? hintEliminations(question) : []

  // 화면을 그릴 때가 아니라 부를 때마다 시계를 다시 읽는다(답한 순간의 시간을 재야 한다).
  function elapsedMsNow() {
    return Math.max(0, (pausedAt ?? now()) - questionStartedAt)
  }
  const elapsedMs = elapsedMsNow()
  const elapsedSec = Math.round(elapsedMs / 100) / 10
  const remainingSec = limitSec === null ? null : Math.max(0, Math.ceil(limitSec - elapsedMs / 1000))

  function saveRecord(selectedIndex: number | null, timeSec: number) {
    setRecords((prev) => {
      // 같은 렌더 안에서 키가 연달아 눌려도 처음 기록만 남긴다.
      if (prev[index] !== undefined) return prev
      const next = [...prev]
      next[index] = { selectedIndex, timeSec, usedHint: hintUsed }
      return next
    })
  }

  function choose(choiceIndex: number) {
    if (answered || confirmingQuit || removed.includes(choiceIndex)) return
    saveRecord(choiceIndex, Math.round(elapsedMsNow() / 100) / 10)
  }

  function applyHint() {
    if (answered || confirmingQuit || hintUsed) return
    setHintUsed(true)
  }

  function goNext() {
    if (!answered || confirmingQuit) return
    if (isLast) {
      onFinish(records)
    } else {
      setIndex(index + 1)
      setHintUsed(false)
      setQuestionStartedAt(now())
    }
  }

  // 답하기 전에는 타이머를 다시 그리고, 스피드 퀴즈에서 시간이 다 되면 오답으로 기록한다.
  useEffect(() => {
    if (answered || confirmingQuit) return
    const id = window.setInterval(() => {
      if (limitSec !== null && now() - questionStartedAt >= limitSec * 1000) {
        saveRecord(null, limitSec)
      } else {
        setTick((t) => t + 1)
      }
    }, TICK_MS)
    return () => window.clearInterval(id)
  })

  // 답이 정해지면 '다음 문제' 버튼으로 포커스를 옮겨 Enter 한 번으로 넘어갈 수 있게 한다.
  useEffect(() => {
    if (answered) nextButtonRef.current?.focus()
  }, [answered])

  function openQuitConfirm() {
    setPausedAt(now())
  }

  function closeQuitConfirm() {
    if (pausedAt !== null) {
      const pausedFor = now() - pausedAt
      setQuestionStartedAt((startedAt) => startedAt + pausedFor)
    }
    setPausedAt(null)
    quitButtonRef.current?.focus()
  }

  // 확인 패널이 열리면 '계속 풀기'에 포커스를 둬서 실수로 Enter를 눌러도 게임이 이어지게 한다.
  useEffect(() => {
    if (confirmingQuit) keepPlayingRef.current?.focus()
  }, [confirmingQuit])

  // 키보드 1~4로 보기 선택, Enter로 다음 문제.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      if (confirmingQuit) {
        if (event.key === 'Escape') closeQuitConfirm()
        return
      }
      const choiceIndex = ['1', '2', '3', '4'].indexOf(event.key)
      if (choiceIndex !== -1 && choiceIndex < question.choices.length) {
        event.preventDefault()
        choose(choiceIndex)
        return
      }
      // 버튼에 포커스가 있으면 브라우저가 Enter를 클릭으로 처리하므로 여기서는 건너뛴다.
      if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function choiceState(choiceIndex: number): ChoiceState {
    if (!answered) return removed.includes(choiceIndex) ? 'removed' : 'idle'
    if (choiceIndex === record?.selectedIndex) return answerScore?.correct ? 'correct' : 'wrong'
    if (choiceIndex === question.answerIndex) return 'answer'
    return removed.includes(choiceIndex) ? 'removed' : 'dim'
  }

  const verdict = timedOut ? '시간 초과' : answerScore?.correct ? '정답!' : '오답'

  return (
    <section className="sheet quiz" aria-labelledby="question-text">
      <header className="quiz__bar">
        <span className="quiz__subject">
          {MODE_LABELS[question.category]}
          <span className="badge" data-difficulty={question.difficulty}>
            {DIFFICULTY_LABELS[question.difficulty]} ×{DIFFICULTY_MULTIPLIER[question.difficulty]}
          </span>
        </span>
        <span className="quiz__progress-text" aria-label={`${questions.length}문제 중 ${index + 1}번째`}>
          {index + 1} / {questions.length}
        </span>
        <span className="quiz__score">점수 {game.total}</span>
        <button
          ref={quitButtonRef}
          type="button"
          className="text-button quiz__quit"
          onClick={openQuitConfirm}
          aria-expanded={confirmingQuit}
          aria-controls="quit-confirm"
        >
          나가기
        </button>
        <div
          className="progress"
          role="progressbar"
          aria-label="진행률"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={index + 1}
        >
          <div
            className="progress__fill"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="quiz__meta">
        {remainingSec !== null ? (
          <span className="timer" data-urgent={!answered && remainingSec <= 5}>
            남은 시간 <strong>{answered ? '-' : `${remainingSec}초`}</strong>
            <span className="timer__track" aria-hidden="true">
              <span
                className="timer__fill"
                style={{ width: `${answered ? 0 : (remainingSec / (limitSec ?? 1)) * 100}%` }}
              />
            </span>
          </span>
        ) : (
          <span className="timer">
            경과 <strong>{answered ? `${record?.timeSec}초` : `${Math.floor(elapsedSec)}초`}</strong>
          </span>
        )}
        {streak >= 2 && <span className="combo">{streak}연속 정답</span>}
      </div>

      {confirmingQuit && (
        <div id="quit-confirm" className="confirm" role="group" aria-labelledby="quit-confirm-title">
          <p id="quit-confirm-title" className="confirm__title">
            이번 판을 그만둘까요?
          </p>
          <p className="confirm__body">지금까지 푼 문제는 기록에 남지 않아요. 확인하는 동안 시간은 멈춰 있어요.</p>
          <div className="confirm__actions">
            <button type="button" className="button button--danger" onClick={onQuit}>
              그만두기
            </button>
            <button
              ref={keepPlayingRef}
              type="button"
              className="button"
              onClick={closeQuitConfirm}
            >
              계속 풀기
            </button>
          </div>
        </div>
      )}

      <h2 id="question-text" className="quiz__question">
        <span className="quiz__number">{index + 1}.</span> {question.question}
      </h2>

      <ol className="choices" aria-label="보기">
        {question.choices.map((choice, choiceIndex) => {
          const state = choiceState(choiceIndex)
          return (
            <li key={choice}>
              <button
                type="button"
                className="choice"
                data-state={state}
                disabled={answered || confirmingQuit || state === 'removed'}
                onClick={() => choose(choiceIndex)}
              >
                <span className="choice__bubble" aria-hidden="true">
                  {state === 'correct' || state === 'answer' ? '✓' : state === 'wrong' ? '✗' : CHOICE_NUMBERS[choiceIndex]}
                </span>
                <span className="choice__text">{choice}</span>
                {state === 'correct' && <span className="sr-only"> (내 선택, 정답)</span>}
                {state === 'wrong' && <span className="sr-only"> (내 선택, 오답)</span>}
                {state === 'answer' && <span className="sr-only"> (정답)</span>}
                {state === 'removed' && <span className="sr-only"> (힌트로 지운 보기)</span>}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="feedback-slot" role="status" aria-live="polite">
        {answered && answerScore && (
          <div className="feedback" data-correct={answerScore.correct}>
            <p className="feedback__verdict">
              <span aria-hidden="true">{answerScore.correct ? '✓' : '✗'}</span> {verdict}
              {answerScore.correct && <span className="feedback__points">+{answerScore.total}점</span>}
            </p>
            {answerScore.correct ? (
              <ul className="points" aria-label="점수 내역">
                <li>
                  기본 {answerScore.base}점
                  <span className="points__note">
                    {' '}
                    ({DIFFICULTY_LABELS[question.difficulty]} ×{DIFFICULTY_MULTIPLIER[question.difficulty]})
                  </span>
                </li>
                {answerScore.fast > 0 && <li>빠른 답 +{answerScore.fast}</li>}
                {answerScore.noHint > 0 && <li>힌트 미사용 +{answerScore.noHint}</li>}
                {answerScore.combo > 0 && (
                  <li>
                    {answerScore.streak}연속 콤보 +{answerScore.combo}
                  </li>
                )}
              </ul>
            ) : (
              <p className="feedback__answer">
                정답은 {question.answerIndex + 1}번 {question.choices[question.answerIndex]}
              </p>
            )}
            <p className="feedback__explanation">{question.explanation}</p>
          </div>
        )}
      </div>

      {answered ? (
        <button
          ref={nextButtonRef}
          type="button"
          disabled={confirmingQuit}
          className="button button--primary quiz__next"
          onClick={goNext}
        >
          {isLast ? '결과 보기' : '다음 문제'}
        </button>
      ) : (
        <div className="quiz__help">
          <button
            type="button"
            className="button quiz__hint-button"
            onClick={applyHint}
            disabled={hintUsed || confirmingQuit}
          >
            {hintUsed ? '힌트 사용함' : '힌트: 오답 2개 지우기'}
          </button>
          <p className="quiz__hint">
            {hintUsed
              ? `힌트를 써서 힌트 미사용 보너스(+${NO_HINT_BONUS})는 받지 못해요.`
              : `${FAST_ANSWER_LIMIT_SEC}초 안에 맞히면 +${FAST_ANSWER_BONUS}, 힌트 없이 맞히면 +${NO_HINT_BONUS}. 키보드 1~4로도 고를 수 있어요.`}
          </p>
        </div>
      )}
    </section>
  )
}
