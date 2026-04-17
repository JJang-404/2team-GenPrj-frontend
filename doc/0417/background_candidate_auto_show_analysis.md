# editing 배경 후보 자동 노출 기능 분석

## 요청 내용

- 대상 프로젝트: `2team-GenPrj-frontend`
- 확인 대상: `editing` 화면에서 `다중색` 또는 `그라데이션` 선택 시
  원래는 `배경 후보 보기` 버튼을 누르지 않아도 우측에 배경 후보 4개가 바로 보였는데,
  현재는 그 기능이 사라진 이유
- 요구 사항:
  - 아직 코드는 직접 수정하지 않음
  - 원인, 해결 방법, 수정해야 할 파일 경로를 문서로 정리

## 결론

현재 기능이 사라진 직접 원인은 `editing` 쪽 배경 후보 "자동 생성 트리거"가 제거되었기 때문입니다.

지금 코드에서는:

- `그라데이션/다중색` 모드로 바꿔도 자동으로 4개 후보를 생성하지 않음
- 대신 현재 선택 색상으로 만든 `preview` 1개만 `backgroundCandidates`에 넣음
- 4개 후보 생성은 `배경 후보 보기` 버튼을 눌렀을 때만 `handleShowBackgroundCandidates()` -> `handleGenerateBackgrounds()`로 실행됨

즉, 기능이 고장 난 것이 아니라, 현재 구현이 "자동 4개 후보 노출"이 아니라 "1장 preview 후 수동 후보 보기"로 바뀐 상태입니다.

## 실제 코드 기준 원인

### 1. 자동 생성 큐를 소비하는 effect는 남아 있는데, 큐를 켜는 코드가 사실상 사라짐

파일:
- `react/src/modules/editing/App.tsx`

현재 코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:223)

여기에는 아래 흐름이 남아 있습니다.

- `queuedBackgroundGeneration`이 `true`이면
- `80ms` 뒤 `handleGenerateBackgrounds()`를 호출
- 호출 후 다시 `false`로 되돌림

하지만 현재 `HEAD`에서는 `gradient`/`pastel` 모드 진입 시 이 값을 `true`로 만드는 로직이 없습니다.

현재 관련 코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:559)

현재 `handleBackgroundModeChange()`는:

- `solid`면 `template` 패널로 전환
- `gradient`/`pastel`면 `background` 패널로만 전환
- `setQueuedBackgroundGeneration(true)`는 호출하지 않음

그래서 자동 생성 effect가 있어도 실행될 일이 거의 없습니다.

### 2. 자동 후보 생성 대신 preview 1장만 넣는 effect가 현재 동작 중

파일:
- `react/src/modules/editing/App.tsx`

현재 코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:238)

이 effect는 `backgroundMode !== 'ai-image'`일 때:

- `buildInitialBackgroundCandidate(...)`를 호출하고
- `backgroundCandidates`를 `[preview]` 한 장으로 덮어씀

즉 `그라데이션/다중색`을 선택하면 우측 패널에 후보 4개를 만드는 대신,
현재 선택 색상 기반의 preview 1개만 남기는 구조입니다.

### 3. 실제 4개 후보 생성은 버튼 클릭 시에만 실행되도록 바뀌어 있음

파일:
- `react/src/modules/editing/App.tsx`

현재 코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:536)

`handleShowBackgroundCandidates()`는:

- `solid`면 바로 `template` 패널로 보냄
- 그 외 모드에서는 `background` 패널을 열고
- 후보가 4개 미만이면 `handleGenerateBackgrounds()`를 호출

즉 현재 UX는 명확하게 "`배경 후보 보기` 버튼을 눌러야 후보를 만든다"는 구조입니다.

### 4. 초기 진입 시 흰색 1장부터 넣는 변경도 자동 노출 체감 감소에 영향을 줌

파일:
- `react/src/modules/editing/App.tsx`

현재 코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:403)

`handleStartFromHome()`에서:

- 예전처럼 `buildInitialBackgroundCandidate(...)`를 즉시 넣지 않고
- `buildPlainWhiteBackground(...)`로 흰색 preview 1장만 넣음
- `suspendInitialBackgroundSyncRef.current = true`로 초기 동기화까지 잠시 막음

이 변경은 "처음부터 후보들이 떠 있는 느낌"을 더 약하게 만듭니다.

## 예전에는 왜 됐는지

과거 커밋 `15278f6` 기준으로 확인한 결과, 자동 생성 트리거가 실제로 있었습니다.

과거 코드 핵심:

- `backgroundMode === 'gradient' || backgroundMode === 'pastel'`일 때
  - `setRightPanelMode('background')`
  - `setStep('background')`
  - `setQueuedBackgroundGeneration(true)`

즉 모드만 바꿔도 자동으로 후보 생성 큐가 켜졌고,
위에서 남아 있는 effect가 그 큐를 소비해서 4개 후보를 생성했습니다.

현재 `HEAD`에서는 그 부분이 빠졌습니다.

## 왜 사라졌는지 추정이 아니라 코드로 확인되는 설명

단순 추정이 아니라, `15278f6..HEAD` diff 기준으로 보면 다음 변경이 들어갔습니다.

### 제거/변경된 핵심

1. `gradient`/`pastel` 모드 진입 시 자동 생성 큐 활성화 제거
2. `step` 기반 배경 단계 표시 약화
3. `backgroundCandidates`를 1장 preview로 먼저 덮는 로직 강화
4. `배경 후보 보기` 버튼을 수동 진입 버튼처럼 사용하는 구조로 변경

즉 "기능이 어딘가에서 우발적으로 깨진 것"보다는,
"리팩터링 중 자동 생성 흐름이 빠지고 수동 진입 흐름만 남은 상태"로 보는 것이 맞습니다.

## 문서와 현재 코드가 어긋나는 부분

파일:
- `react/README.md`

문서 내용:
- [react/README.md](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/README.md:363)

README에는:

- `그라데이션`, `다중색`, `AI 이미지 생성`은 후보 4개를 보여주도록 복구
- `배경 후보 보기` 버튼 동작 복구

라고 적혀 있습니다.

하지만 현재 실제 구현은:

- `그라데이션/다중색`에서 자동으로 4개를 즉시 보여주지 않음
- 버튼을 눌러야 후보 생성이 일어남

그래서 사용자 체감 기준으로는 "기능이 사라진 것처럼" 보이는 것이 맞습니다.

## 해결 방법

코드는 아직 수정하지 않았고, 아래 방향으로 고치면 됩니다.

### 해결안 A. 예전 UX 그대로 복구

가장 직접적인 방법입니다.

해야 할 일:

1. `gradient`/`pastel` 모드 진입 시 `setQueuedBackgroundGeneration(true)`를 다시 호출
2. 색상 변경 시에도 필요하면 자동 재생성을 다시 걸지 결정
3. 자동 생성 후 우측 패널이 `background` 상태를 유지하도록 보장

수정 핵심 파일:
- `react/src/modules/editing/App.tsx`

예상 수정 위치:
- `handleBackgroundModeChange()`
- `backgroundMode/promptHint/backgroundColorDraft` 관련 `useEffect`

### 해결안 B. preview 1장 유지 + 자동으로 4개 생성까지 이어붙이기

지금 구조를 최대한 살리는 방법입니다.

흐름:

1. 모드 전환 직후 preview 1장 즉시 표시
2. 동시에 `queuedBackgroundGeneration`을 `true`로 켬
3. effect에서 4개 후보 생성 후 preview 1장을 4개 후보로 교체

이 방식이 UX상 가장 자연스럽습니다.

### 해결안 C. 버튼 기반 UX로 갈 거면 문구를 명확히 바꾸기

만약 의도적으로 수동 UX를 유지할 거라면, 현재는 사용자 기대와 다릅니다.

그 경우 최소한:

- `그라데이션/다중색 선택 시 preview만 보입니다`
- `후보 4개를 보려면 배경 후보 보기를 누르세요`

같은 안내가 필요합니다.

하지만 사용자 요청 기준으로는 이 방향이 아니라 A 또는 B가 맞습니다.

## 손봐야 할 파일 경로

우선순위 기준입니다.

### 1순위

- `react/src/modules/editing/App.tsx`

이 파일에서 실제 동작이 결정됩니다.

수정 대상 로직:

- `queuedBackgroundGeneration`을 실행시키는 조건
- `handleBackgroundModeChange()`
- preview 1장만 넣는 `useEffect`
- `handleShowBackgroundCandidates()`
- `handleStartFromHome()`의 초기 배경 세팅 방식

### 2순위

- `react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`

이 파일은 버튼/입력 UX를 제어합니다.

확인/수정 포인트:

- 모드 클릭 시 어떤 핸들러가 호출되는지
- `배경 후보 보기` 버튼을 유지할지, 숨길지, 보조 버튼으로 둘지

### 3순위

- `react/src/modules/editing/utils/backgroundGeneration.ts`

현재 로컬 후보 생성 자체는 정상입니다.

이 파일은 원인 파일은 아니지만,
후보 개수와 생성 규칙 확인용으로 같이 봐야 합니다.

현재 확인 결과:

- `gradient`는 4개 후보 생성 로직 있음
- `pastel`도 4개 후보 생성 로직 있음

즉 문제는 "생성 함수가 사라진 것"이 아니라 "그 함수를 자동 호출하지 않는 것"입니다.

## 추가로 같이 보인 사항

사용자 요청 핵심은 `다중색/그라데이션`이지만, 현재 코드에는 별도 이슈도 있습니다.

- `AI 이미지 생성`은 `BACKGROUND_VARIANTS`가 4개인데
- `GENERATE_VARIANT_COUNT = 1`로 잡혀 있어서 실제 병렬 생성은 1개만 요청됩니다

파일:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:57)

이건 이번 질문의 직접 원인은 아니지만,
README의 "후보 4개" 기대와는 또 어긋나는 부분이라 나중에 같이 정리하는 게 맞습니다.

## 최종 판단

현재 `editing`에서 `다중색/그라데이션` 선택 후 4개 후보가 자동으로 안 보이는 이유는:

- 후보 생성 로직이 없어서가 아니라
- 자동 생성 트리거가 제거되었고
- preview 1장만 보여주는 로직만 남았기 때문입니다

따라서 복구는 `App.tsx` 중심으로:

- `gradient/pastel` 진입 시 자동 생성 큐를 다시 켜거나
- preview 후 자동 생성으로 이어지게 만드는 방식

으로 해결하는 것이 맞습니다.

## 수정사항

### 적용 일시

- 2026-04-17

### 실제 수정 파일

- `react/src/modules/editing/App.tsx`

### 수정 내용

`그라데이션` 또는 `다중색` 선택 시 바로 배경 후보 4개가 뜨도록 자동 생성 트리거를 복구했습니다.

적용한 변경:

1. `backgroundMode === 'gradient' || backgroundMode === 'pastel'`일 때 자동으로 `setQueuedBackgroundGeneration(true)`가 실행되도록 `useEffect`를 추가
2. 이 effect는 `promptHint`, `projectData`, `backgroundColorDraft` 변경도 함께 감지하도록 두어, 해당 모드에서 색상 변경 후에도 자동 후보 재생성이 가능하도록 유지
3. `handleBackgroundModeChange()`에서도 `gradient/pastel` 선택 직후 `setQueuedBackgroundGeneration(true)`를 바로 호출하도록 수정

### 현재 동작

- `다중색` 클릭
  - 우측 패널이 `배경 선택`으로 전환됨
  - preview 1장이 먼저 보일 수 있음
  - 곧바로 로컬 후보 생성이 실행됨
  - 최종적으로 4개의 배경 후보 카드로 교체됨

- `그라데이션` 클릭
  - 위와 동일하게 자동으로 4개 후보 생성

### 비고

- `solid`는 기존처럼 자동 4후보를 만들지 않음
- 이번 수정은 요청 범위대로 `다중색/그라데이션` 자동 후보 노출만 복구
