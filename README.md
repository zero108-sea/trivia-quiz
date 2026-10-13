# 상식 퀴즈

한국사, 컴퓨터과학, 영어, 일반상식 4개 과목의 4지선다 문제를 풀고 순위표에 기록을 남기는 웹 퀴즈 게임입니다. 요구사항은 [PRD.md](./PRD.md)에 있습니다.

- 게임 모드: 카테고리별(10문제), 전체 도전(40문제), 스피드 퀴즈(20문제, 문제당 15초)
- 점수: 난이도별 기본 점수(10/15/20점) + 빠른 답(10초 미만 +3) + 힌트 미사용(+2) + 연속 정답 콤보(3연속 +2, 5연속 +5, 10연속 +10)
- 힌트: 문제마다 1번, 오답 보기 2개를 지움
- 보기를 고르면 바로 정답/오답, 얻은 점수 내역, 해설 표시. 키보드 1~4와 Enter로도 플레이
- 결과 화면에서 점수 내역, 정답률, 소요 시간, 순위, 틀린 문제 다시 보기
- 순위표는 모드별 상위 10명, 점수가 같으면 더 빨리 푼 순서

점수 규칙의 숫자는 모두 [`src/lib/scoreManager.ts`](./src/lib/scoreManager.ts) 맨 위 상수에 모여 있어 그곳만 고치면 바뀝니다. 스피드 퀴즈 문제 수와 제한 시간은 [`src/lib/modes.ts`](./src/lib/modes.ts)에 있습니다.

## 실행 방법

Node.js 20 이상이 필요합니다.

```bash
npm install        # 의존성 설치
npm run dev        # 개발 서버 (http://localhost:5173)
npm test           # 단위·컴포넌트 테스트 한 번 실행
npm run test:watch # 파일이 바뀔 때마다 테스트 다시 실행
npm run build      # 타입 검사 + 배포용 빌드 (dist/)
npm run preview    # 빌드 결과 미리 보기
npm run lint       # oxlint
```

`dist/`는 정적 파일이라 서버 없이 GitHub Pages, Netlify, Vercel 같은 정적 호스팅에 그대로 올릴 수 있습니다.

## 순위 기록 저장

순위 기록은 서버 없이 브라우저 `localStorage`의 `trivia-quiz:rankings:v2` 키에 저장됩니다. 점수 시스템이 생기기 전 기록(`trivia-quiz:rankings`)은 점수 기준이 달라 순위표에 섞지 않습니다. 그래서 기록은 그 브라우저에서만 보이고, 다른 기기나 브라우저와는 공유되지 않습니다.

- 기록을 지우려면 개발자 도구 콘솔에서 `localStorage.removeItem('trivia-quiz:rankings:v2')`를 실행합니다.
- 사생활 보호 모드처럼 저장소를 쓸 수 없는 환경에서도 게임은 진행되고, 결과 화면에 "기록을 저장하지 못했어요" 안내가 나옵니다. 이때 기록은 페이지를 닫기 전까지만 순위표에 남습니다.

## 문제 추가·수정 방법

문제는 [`src/data/questions.json`](./src/data/questions.json)에 있습니다. 문제 하나의 형식은 다음과 같습니다.

```json
{
  "id": "history-11",
  "category": "history",
  "difficulty": "medium",
  "question": "문제 본문",
  "choices": ["보기 1", "보기 2", "보기 3", "보기 4"],
  "answerIndex": 0,
  "explanation": "해설 한 줄"
}
```

| 필드 | 규칙 |
| --- | --- |
| `id` | `카테고리-두자리번호` 형식, 중복 불가 |
| `category` | `history`(한국사), `cs`(컴퓨터과학), `english`(영어), `general`(일반상식) 중 하나 |
| `difficulty` | `easy`(×1), `medium`(×1.5), `hard`(×2) 중 하나. 기본 점수 배수가 됩니다 |
| `choices` | 서로 다른 보기 정확히 4개 |
| `answerIndex` | 정답 보기의 위치, 0~3 (첫 번째 보기가 0) |
| `explanation` | 정답/오답 화면과 틀린 문제 다시 보기에 나오는 해설 |

보기 순서는 게임에서 매번 섞이므로 JSON에서는 아무 순서로 적어도 됩니다. 수정한 뒤 `npm test`를 실행하면 `src/data/questions.test.ts`가 형식을 검사합니다.

지금은 카테고리마다 정확히 10문제가 있어야 테스트가 통과합니다. 과목당 문제 수를 늘리려면 이 테스트와, 과목 모드에서 10문제만 고르도록 출제 로직(`pickQuestions`)도 함께 바꿔야 합니다.

## 폴더 구조

```
.
├── PRD.md                    # 제품 요구사항
├── index.html                # 페이지 뼈대, 글꼴(Google Fonts)
└── src
    ├── main.tsx              # React 진입점
    ├── App.tsx               # 화면 전환(시작 → 퀴즈 → 결과 → 순위표), 기록 저장
    ├── App.test.tsx          # 화면 흐름 컴포넌트 테스트
    ├── index.css             # 전체 스타일 (색상·글꼴 변수는 맨 위 :root)
    ├── components
    │   ├── StartScreen.tsx   # 닉네임 입력, 과목 선택
    │   ├── QuizScreen.tsx    # 문제, 보기, 타이머, 힌트, 즉시 피드백·점수 내역, 나가기 확인
    │   ├── ResultScreen.tsx  # 점수 내역, 정답률, 시간, 순위, 틀린 문제 다시 보기
    │   └── RankingScreen.tsx # 과목별 상위 10명
    ├── data
    │   ├── questions.json    # 문제 40개
    │   └── questions.ts      # JSON에 타입을 붙여 내보냄
    ├── lib                   # 화면과 무관한 순수 로직 (각각 .test.ts 있음)
    │   ├── types.ts          # Question, RankingEntry 등 타입
    │   ├── quiz.ts           # 모드별 문제 고르기, 문제·보기 섞기, 힌트로 지울 보기
    │   ├── scoreManager.ts   # 점수 시스템: 난이도 배수, 시간·힌트·콤보 보너스
    │   ├── ranking.ts        # 순위 정렬, 몇 위인지 계산
    │   ├── rankingStore.ts   # localStorage 읽기·쓰기
    │   ├── modes.ts          # 모드 이름·문제 수·제한 시간, 닉네임 검사, 시간·정답률 표시
    │   └── testUtils.ts      # 테스트용 고정 난수, 메모리 저장소
    └── test
        └── setup.ts          # 테스트 환경 설정 (jest-dom)
```
