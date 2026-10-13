import { useEffect, useRef } from 'react'
import { accuracyPercent, formatDuration, MODE_LABELS } from '../lib/modes'
import type { GameScore } from '../lib/scoreManager'
import type { Question, RankingEntry } from '../lib/types'

export interface WrongAnswer {
  question: Question
  /** 시간 초과면 null. */
  selectedIndex: number | null
}

export interface GameResult {
  entry: RankingEntry
  score: GameScore
  /** 브라우저 저장소에 기록을 남겼는지. */
  saved: boolean
  /** 같은 모드 기록 중 몇 위인지(1부터). */
  rank: number | null
  /** 같은 모드 기록 수(이번 기록 포함). */
  rankCount: number
  wrongAnswers: WrongAnswer[]
}

interface ResultScreenProps {
  result: GameResult
  onRetry: () => void
  onHome: () => void
  onShowRanking: () => void
}

export function ResultScreen({ result, onRetry, onHome, onShowRanking }: ResultScreenProps) {
  const { entry, score, saved, rank, rankCount, wrongAnswers } = result
  const { nickname, mode, correct, total, durationSec } = entry
  const headingRef = useRef<HTMLHeadingElement>(null)

  // 화면이 바뀌면 결과 제목으로 포커스를 옮겨 스크린 리더가 결과부터 읽게 한다.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className="sheet result" aria-labelledby="result-title">
      <h1 id="result-title" ref={headingRef} tabIndex={-1} className="result__title">
        {nickname}님의 {MODE_LABELS[mode]} 결과
      </h1>

      <p className="result__score" aria-label={`최종 점수 ${score.total}점, ${total}문제 중 ${correct}개 정답`}>
        <span className="result__got">{score.total}</span>
        <span className="result__unit">점</span>
        <span className="result__total">
          정답 {correct} / {total}
        </span>
      </p>

      <dl className="result__stats">
        <div className="stat">
          <dt>정답률</dt>
          <dd>{accuracyPercent(correct, total)}%</dd>
        </div>
        <div className="stat">
          <dt>소요 시간</dt>
          <dd>{formatDuration(durationSec)}</dd>
        </div>
        <div className="stat">
          <dt>순위</dt>
          <dd>
            {rank}위<span className="stat__sub"> / {rankCount}개 기록</span>
          </dd>
        </div>
      </dl>

      <dl className="breakdown" aria-label="점수 내역">
        <div className="breakdown__row">
          <dt>기본 점수 (난이도 배수 포함)</dt>
          <dd>{score.totals.base}</dd>
        </div>
        <div className="breakdown__row">
          <dt>빠른 답 보너스</dt>
          <dd>+{score.totals.fast}</dd>
        </div>
        <div className="breakdown__row">
          <dt>힌트 미사용 보너스</dt>
          <dd>+{score.totals.noHint}</dd>
        </div>
        <div className="breakdown__row">
          <dt>콤보 보너스 (최대 {score.maxStreak}연속)</dt>
          <dd>+{score.totals.combo}</dd>
        </div>
        <div className="breakdown__row breakdown__row--total">
          <dt>합계</dt>
          <dd>{score.total}점</dd>
        </div>
      </dl>

      {!saved && (
        <p className="notice" role="alert">
          기록을 저장하지 못했어요. 브라우저 저장소를 쓸 수 없어서, 이 기록은 페이지를 닫으면
          사라져요.
        </p>
      )}

      <div className="result__actions">
        <button type="button" className="button button--primary" onClick={onRetry}>
          다시 하기
        </button>
        <button type="button" className="button" onClick={onShowRanking}>
          순위표 보기
        </button>
        <button type="button" className="text-button result__home" onClick={onHome}>
          처음으로
        </button>
      </div>

      <section className="review" aria-labelledby="review-title">
        <h2 id="review-title" className="review__title">
          틀린 문제 {wrongAnswers.length}개
        </h2>
        {wrongAnswers.length === 0 ? (
          <p className="review__empty">모두 맞혔어요. 다른 모드에도 도전해 보세요.</p>
        ) : (
          <ol className="review__list">
            {wrongAnswers.map(({ question, selectedIndex }) => (
              <li key={question.id} className="review__item">
                <p className="review__question">{question.question}</p>
                <dl className="review__answers">
                  <div className="review__row" data-kind={selectedIndex === null ? 'timeout' : 'mine'}>
                    <dt>내 답</dt>
                    <dd>{selectedIndex === null ? '시간 초과' : question.choices[selectedIndex]}</dd>
                  </div>
                  <div className="review__row" data-kind="answer">
                    <dt>정답</dt>
                    <dd>{question.choices[question.answerIndex]}</dd>
                  </div>
                </dl>
                <p className="review__explanation">{question.explanation}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  )
}
