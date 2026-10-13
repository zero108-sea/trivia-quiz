import { useState } from 'react'
import { QuizScreen } from './components/QuizScreen'
import { RankingScreen } from './components/RankingScreen'
import { ResultScreen, type GameResult } from './components/ResultScreen'
import { StartScreen } from './components/StartScreen'
import { questions as allQuestions } from './data/questions'
import { pickQuestions, type Random } from './lib/quiz'
import { rankingsForMode, rankOf } from './lib/ranking'
import {
  getBrowserStorage,
  loadRankings,
  saveRanking,
  type RankingStorage,
} from './lib/rankingStore'
import { scoreGame } from './lib/scoreManager'
import type { AnswerRecord, Mode, Question, RankingEntry } from './lib/types'

type Screen =
  | { name: 'start' }
  | { name: 'quiz'; mode: Mode; questions: Question[]; startedAt: number; round: number }
  | { name: 'result'; result: GameResult }
  | { name: 'ranking'; mode: Mode; highlightId: string | null }

interface AppProps {
  /** 테스트에서 문제 순서를 고정할 때 넘긴다. */
  random?: Random
  /** 테스트에서 시간을 고정할 때 넘긴다. 밀리초를 돌려준다. */
  now?: () => number
  /** 순위 기록 저장소. 기본값은 브라우저 localStorage, 쓸 수 없으면 null. */
  storage?: RankingStorage | null
  /** 테스트에서 기록 id를 고정할 때 넘긴다. */
  createId?: () => string
}

export default function App({
  random = Math.random,
  now = Date.now,
  storage = getBrowserStorage(),
  createId = () => crypto.randomUUID(),
}: AppProps) {
  const [nickname, setNickname] = useState('')
  const [mode, setMode] = useState<Mode>('history')
  const [screen, setScreen] = useState<Screen>({ name: 'start' })
  const [round, setRound] = useState(0)
  // 저장에 실패해도 이번 세션에서 남긴 기록은 순위표에 보여 준다.
  const [unsaved, setUnsaved] = useState<RankingEntry[]>([])

  function allRankings(): RankingEntry[] {
    return [...loadRankings(storage), ...unsaved]
  }

  function startGame(selectedMode: Mode) {
    const nextRound = round + 1
    setRound(nextRound)
    setScreen({
      name: 'quiz',
      mode: selectedMode,
      questions: pickQuestions(allQuestions, selectedMode, random),
      startedAt: now(),
      round: nextRound,
    })
  }

  function finishGame(
    gameMode: Mode,
    quizQuestions: Question[],
    startedAt: number,
    records: AnswerRecord[],
  ) {
    const finishedAt = now()
    const score = scoreGame(quizQuestions, records)
    const entry: RankingEntry = {
      id: createId(),
      nickname: nickname.trim(),
      mode: gameMode,
      score: score.total,
      correct: score.correct,
      total: quizQuestions.length,
      durationSec: Math.round((finishedAt - startedAt) / 1000),
      playedAt: new Date(finishedAt).toISOString(),
    }

    const saved = saveRanking(storage, entry)
    let entries: RankingEntry[]
    if (saved) {
      entries = [...saved, ...unsaved]
    } else {
      entries = [...allRankings(), entry]
      setUnsaved((prev) => [...prev, entry])
    }

    setScreen({
      name: 'result',
      result: {
        entry,
        score,
        saved: saved !== null,
        rank: rankOf(entries, entry.id),
        rankCount: rankingsForMode(entries, entry.mode).length,
        wrongAnswers: quizQuestions.flatMap((question, i) =>
          score.answers[i]?.correct ? [] : [{ question, selectedIndex: records[i].selectedIndex }],
        ),
      },
    })
  }

  return (
    <main className="app">
      {screen.name === 'start' && (
        <StartScreen
          nickname={nickname}
          mode={mode}
          onNicknameChange={setNickname}
          onModeChange={setMode}
          onStart={() => startGame(mode)}
          onShowRanking={() => setScreen({ name: 'ranking', mode, highlightId: null })}
        />
      )}
      {screen.name === 'quiz' && (
        <QuizScreen
          key={screen.round}
          mode={screen.mode}
          questions={screen.questions}
          now={now}
          onFinish={(records) =>
            finishGame(screen.mode, screen.questions, screen.startedAt, records)
          }
          onQuit={() => setScreen({ name: 'start' })}
        />
      )}
      {screen.name === 'result' && (
        <ResultScreen
          result={screen.result}
          onRetry={() => startGame(screen.result.entry.mode)}
          onHome={() => setScreen({ name: 'start' })}
          onShowRanking={() =>
            setScreen({
              name: 'ranking',
              mode: screen.result.entry.mode,
              highlightId: screen.result.entry.id,
            })
          }
        />
      )}
      {screen.name === 'ranking' && (
        <RankingScreen
          entries={allRankings()}
          initialMode={screen.mode}
          highlightId={screen.highlightId}
          onHome={() => setScreen({ name: 'start' })}
        />
      )}
    </main>
  )
}
