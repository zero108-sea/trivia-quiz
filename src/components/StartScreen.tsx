import { type FormEvent, useId } from 'react'
import {
  isValidNickname,
  MODE_LABELS,
  MODES,
  NICKNAME_MAX,
  NICKNAME_MIN,
  questionCount,
  timeLimitSec,
} from '../lib/modes'
import {
  basePoints,
  COMBO_BONUSES,
  FAST_ANSWER_BONUS,
  FAST_ANSWER_LIMIT_SEC,
  NO_HINT_BONUS,
} from '../lib/scoreManager'
import type { Mode } from '../lib/types'

function modeSummary(mode: Mode): string {
  const limit = timeLimitSec(mode)
  return limit === null ? `${questionCount(mode)}문제` : `${questionCount(mode)}문제 · 문제당 ${limit}초`
}

const comboText = Object.entries(COMBO_BONUSES)
  .map(([streak, bonus]) => `${streak}연속 +${bonus}`)
  .join(', ')

interface StartScreenProps {
  nickname: string
  mode: Mode
  onNicknameChange: (nickname: string) => void
  onModeChange: (mode: Mode) => void
  onStart: () => void
  onShowRanking: () => void
}

export function StartScreen({
  nickname,
  mode,
  onNicknameChange,
  onModeChange,
  onStart,
  onShowRanking,
}: StartScreenProps) {
  const nicknameId = useId()
  const hintId = useId()
  const canStart = isValidNickname(nickname)
  const length = nickname.trim().length

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (canStart) onStart()
  }

  return (
    <section className="sheet start" aria-labelledby="start-title">
      <h1 id="start-title" className="start__title">
        상식 퀴즈
      </h1>
      <p className="start__lead">
        한국사, 컴퓨터과학, 영어, 일반상식. 빨리, 힌트 없이, 연달아 맞힐수록 점수가 커져요.
      </p>

      <form className="start__form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor={nicknameId} className="field__label">
            닉네임
          </label>
          <input
            id={nicknameId}
            className="field__input"
            type="text"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            maxLength={20}
            autoComplete="nickname"
            aria-describedby={hintId}
            aria-invalid={length > 0 && !canStart}
          />
          <p id={hintId} className="field__hint" data-invalid={length > 0 && !canStart}>
            {NICKNAME_MIN}~{NICKNAME_MAX}자로 입력하세요 ({length}/{NICKNAME_MAX})
          </p>
        </div>

        <fieldset className="modes">
          <legend className="field__label">게임 모드</legend>
          <div className="modes__grid">
            {MODES.map((value) => (
              <label key={value} className="mode" data-wide={value === 'all' || value === 'speed'}>
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => onModeChange(value)}
                  className="mode__input"
                />
                <span className="mode__name">{MODE_LABELS[value]}</span>
                <span className="mode__count">{modeSummary(value)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="button button--primary" disabled={!canStart}>
          시작하기
        </button>
      </form>

      <details className="rules">
        <summary className="rules__summary">점수 계산 방법</summary>
        <ul className="rules__list">
          <li>
            정답 기본 점수: 쉬움 {basePoints('easy')}점, 보통 {basePoints('medium')}점(×1.5), 어려움{' '}
            {basePoints('hard')}점(×2)
          </li>
          <li>
            {FAST_ANSWER_LIMIT_SEC}초 안에 맞히면 +{FAST_ANSWER_BONUS}, 힌트 없이 맞히면 +{NO_HINT_BONUS}
          </li>
          <li>연속 정답 콤보: {comboText} (그 횟수에 도달할 때 한 번)</li>
          <li>오답과 시간 초과는 0점이고, 연속 정답이 끊겨요.</li>
          <li>힌트를 쓰면 오답 보기 2개가 지워져요.</li>
        </ul>
      </details>

      <button type="button" className="text-button start__ranking" onClick={onShowRanking}>
        순위표 보기
      </button>
    </section>
  )
}
