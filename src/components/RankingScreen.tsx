import { type KeyboardEvent, useRef, useState } from 'react'
import { formatDuration, MODE_LABELS, MODES } from '../lib/modes'
import { rankingsForMode } from '../lib/ranking'
import type { Mode, RankingEntry } from '../lib/types'

const TOP_N = 10

interface RankingScreenProps {
  entries: RankingEntry[]
  initialMode: Mode
  /** 방금 남긴 기록. 순위표에서 강조한다. */
  highlightId: string | null
  onHome: () => void
}

/** "2026-10-01T05:30:00Z" → "10.01" (사용자 시간대 기준) */
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}.${dd}`
}

export function RankingScreen({ entries, initialMode, highlightId, onHome }: RankingScreenProps) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const tabRefs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({})

  const ranked = rankingsForMode(entries, mode)
  const top = ranked.slice(0, TOP_N)
  const myIndex = highlightId ? ranked.findIndex((e) => e.id === highlightId) : -1
  // 방금 기록이 10위 밖이면 표 아래에 따로 보여 준다.
  const myEntryOutsideTop = myIndex >= TOP_N ? ranked[myIndex] : null

  // 탭 목록에서 좌우 화살표로 과목을 옮긴다(WAI-ARIA 탭 패턴).
  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (offset === 0) return
    event.preventDefault()
    const next = MODES.at((MODES.indexOf(mode) + offset) % MODES.length)!
    setMode(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="sheet ranking" aria-labelledby="ranking-title">
      <h1 id="ranking-title" className="ranking__title">
        순위표
      </h1>
      <p className="ranking__lead">
        이 브라우저에서 남긴 기록이에요. 점수가 같으면 더 빨리 푼 순서예요.
      </p>

      <div className="tabs" role="tablist" aria-label="게임 모드">
        {MODES.map((value) => (
          <button
            key={value}
            ref={(el) => {
              tabRefs.current[value] = el
            }}
            type="button"
            role="tab"
            id={`tab-${value}`}
            aria-selected={mode === value}
            aria-controls="ranking-panel"
            tabIndex={mode === value ? 0 : -1}
            className="tab"
            onClick={() => setMode(value)}
            onKeyDown={handleTabKeyDown}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </div>

      <div id="ranking-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="ranking__panel">
        {top.length === 0 ? (
          <p className="ranking__empty">
            아직 {MODE_LABELS[mode]} 기록이 없어요. 시작 화면에서 첫 기록을 남겨 보세요.
          </p>
        ) : (
          <table className="board">
            <caption className="sr-only">{MODE_LABELS[mode]} 상위 {TOP_N}명</caption>
            <thead>
              <tr>
                <th scope="col" className="board__rank">순위</th>
                <th scope="col">닉네임</th>
                <th scope="col" className="board__num">점수</th>
                <th scope="col" className="board__num">시간</th>
                <th scope="col" className="board__num board__date">날짜</th>
              </tr>
            </thead>
            <tbody>
              {top.map((entry, i) => (
                <BoardRow key={entry.id} entry={entry} rank={i + 1} current={entry.id === highlightId} />
              ))}
            </tbody>
            {myEntryOutsideTop && (
              <tbody className="board__mine">
                <BoardRow entry={myEntryOutsideTop} rank={myIndex + 1} current />
              </tbody>
            )}
          </table>
        )}
      </div>

      <button type="button" className="button ranking__home" onClick={onHome}>
        처음으로
      </button>
    </section>
  )
}

function BoardRow({ entry, rank, current }: { entry: RankingEntry; rank: number; current: boolean }) {
  return (
    <tr className="board__row" data-current={current} aria-current={current ? 'true' : undefined}>
      <td className="board__rank">{rank}</td>
      <td className="board__name">
        {entry.nickname}
        {current && <span className="board__tag">방금 기록</span>}
      </td>
      <td className="board__num">
        <span className="board__score">{entry.score}</span>
        <span className="board__correct">
          {entry.correct}/{entry.total}
        </span>
      </td>
      <td className="board__num">{formatDuration(entry.durationSec)}</td>
      <td className="board__num board__date">{formatDate(entry.playedAt)}</td>
    </tr>
  )
}
