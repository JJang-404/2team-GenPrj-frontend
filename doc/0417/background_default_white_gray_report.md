# 그라데이션/다중색 초기 색상 기본값 변경 분석

## 요청 내용

- 현재 `editing`에서 `그라데이션`, `다중색` 기본 색상이 붉은 계열/푸른 계열처럼 보임
- 이 초기 색상을 `흰색/회색` 계열로 바꿀 수 있는지 확인
- 실제 코드는 아직 수정하지 않고
- 어떤 파일을 수정해야 하는지 `doc/0417`에 새 문서로 정리

## 결론

가능합니다.

다만 이 기본 색상은 한 군데만 있는 것이 아니라 아래 3층으로 나뉘어 있습니다.

1. `editing` 화면 내부에서 fallback으로 쓰는 기본 색
2. `initPage`에서 처음 옵션을 만들 때 쓰는 기본 색
3. 공용 배경 스타일 함수가 마지막 안전장치로 쓰는 기본 색

그래서 실제로 흰색/회색으로 안정적으로 바꾸려면 최소 `editing + initPage`를 같이 바꾸는 것이 맞고,
fallback까지 완전히 맞추려면 공용 함수도 같이 바꾸는 편이 안전합니다.

## 지금 붉은색/푸른색 계열이 나오는 이유

### 1. editing 내부 기본 draft 색이 파랑 계열로 박혀 있음

파일:
- `react/src/modules/editing/App.tsx`

코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:51)

현재 기본값:

```ts
const DEFAULT_BACKGROUND_COLOR_DRAFT: BackgroundColorDraft = {
  solid: ['#60a5fa'],
  gradient: ['#93c5fd', '#1d4ed8'],
  pastel: ['#c4b5fd', '#93c5fd'],
};
```

즉 `editing` 안에서 `options.startColor`, `options.endColor`가 비어 있거나 fallback이 필요할 때는
여기 값이 바로 기본으로 들어갑니다.

### 2. initPage 기본 옵션은 여전히 빨강/파랑으로 잡혀 있음

파일:
- `react/src/modules/initPage/constants/design.js`

코드:
- [design.js](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/constants/design.js:41)

현재 기본값:

```js
startColor: '#FF4757',
endColor: '#4A90E2',
```

즉 사용자가 initPage에서 별도로 색을 안 바꾸고 `editing`으로 들어가면,
실제로는 이 빨강/파랑 값이 브리지로 넘어올 가능성이 큽니다.

### 3. 공용 배경 함수도 최종 fallback이 빨강/파랑임

파일:
- `react/src/shared/backgroundStyle.ts`

코드:
- [backgroundStyle.ts](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/shared/backgroundStyle.ts:19)

현재 기본값:

```ts
const safeStart = startColor ?? '#FF4757';
const safeEnd = endColor ?? '#4A90E2';
```

이 함수는 `initPage`, `editing 초기 배경`, 배경 preview 렌더링에서 공용으로 쓰일 수 있어서,
위 두 값이 비었을 때 마지막 fallback이 다시 빨강/파랑으로 돌아갑니다.

## editing에서 실제 어떤 값을 쓰는지

### 1. editing 진입 시 사이드바 color draft를 만드는 곳

파일:
- `react/src/modules/editing/App.tsx`

코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:326)

여기서:

- `options.startColor`가 있으면 그 값을 우선 사용
- 없으면 `DEFAULT_BACKGROUND_COLOR_DRAFT`를 fallback으로 사용

즉 이 함수만 고치면 `editing` 내부 컬러 피커의 초기색은 바뀔 수 있습니다.

### 2. initPage -> editing 브리지용 prompt hint도 같은 fallback을 사용

파일:
- `react/src/modules/editing/App.tsx`

코드:
- [App.tsx](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:313)

여기서도:

- `options.startColor`, `options.endColor`가 없을 때
- `DEFAULT_BACKGROUND_COLOR_DRAFT.gradient[0]`, `[1]`을 사용

즉 `DEFAULT_BACKGROUND_COLOR_DRAFT`를 바꾸면 이 부분도 같이 따라갑니다.

### 3. 초기 배경 preview는 최종적으로 options / draft / token 순서로 색을 고름

파일:
- `react/src/modules/editing/utils/initialBackground.ts`

코드:
- [initialBackground.ts](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/initialBackground.ts:73)

우선순위는 대략 아래 순서입니다.

1. 현재 `colorDraft`
2. `promptHint` 토큰
3. `options.startColor`, `options.endColor`
4. 마지막 fallback `#FF4757`, `#4A90E2`

즉 완전히 일관성 있게 바꾸려면 여기 마지막 fallback도 같이 바꾸는 것이 안전합니다.

## 후보 4개 생성 시 사용하는 기본색

파일:
- `react/src/modules/editing/utils/backgroundGeneration.ts`

코드:
- [backgroundGeneration.ts](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/backgroundGeneration.ts:142)
- [backgroundGeneration.ts](/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/backgroundGeneration.ts:182)

현재 기본값:

```ts
const colors = (gradient ?? ['#93c5fd', '#1d4ed8']).slice(0, 2);
const colors = (multi ?? ['#c4b5fd', '#93c5fd']).slice(0, 2);
```

다만 현재 구조에서는 `handleGenerateBackgrounds()`가 `BG_GRADIENT(...)`, `BG_MULTI(...)` 토큰을 넣어서 호출하므로,
정상 흐름에서는 이 fallback이 직접 쓰일 가능성은 낮습니다.

그래도 안전하게 맞추고 싶으면 이 부분도 흰색/회색 계열로 같이 바꾸는 편이 좋습니다.

## 어떤 파일을 수정하면 되는가

### 최소 수정

이 두 파일만 바꾸면 사용자가 보는 초기 체감은 거의 원하는 방향으로 바뀝니다.

1. `react/src/modules/editing/App.tsx`
2. `react/src/modules/initPage/constants/design.js`

이유:

- `App.tsx`는 editing 내부 초기 color draft를 결정
- `design.js`는 initPage에서 시작하는 기본 색을 결정

### 권장 수정

아래 4개를 같이 바꾸는 것이 가장 일관적입니다.

1. `react/src/modules/editing/App.tsx`
2. `react/src/modules/initPage/constants/design.js`
3. `react/src/shared/backgroundStyle.ts`
4. `react/src/modules/editing/utils/initialBackground.ts`

### 선택적 보강

fallback까지 완전히 통일하려면 이것도 같이 봅니다.

5. `react/src/modules/editing/utils/backgroundGeneration.ts`
6. `react/src/server/common/defines.js`

`defines.js`는 서버/공용 기본 옵션 쪽에 가까워서, 실제 현재 프런트 단일 앱 흐름에서 직접 얼마나 쓰이는지는 별도 확인이 필요하지만,
기본 옵션 소스가 중복되어 있으므로 장기적으로는 같이 맞춰두는 편이 안전합니다.

## 흰색/회색으로 바꾼다면 추천 값

예시는 아래처럼 잡으면 무난합니다.

### 그라데이션

- 시작색: `#ffffff`
- 끝색: `#d9d9d9`

### 다중색

- 시작색: `#ffffff`
- 끝색: `#cfcfcf`

조금 더 부드럽게 가려면:

- `#f8f8f8`
- `#dcdcdc`

처럼 순백 대신 살짝 톤다운한 조합도 괜찮습니다.

## 실제 수정 포인트 예시

### 1. editing 기본 draft 값

파일:
- `react/src/modules/editing/App.tsx`

현재:

```ts
const DEFAULT_BACKGROUND_COLOR_DRAFT: BackgroundColorDraft = {
  solid: ['#60a5fa'],
  gradient: ['#93c5fd', '#1d4ed8'],
  pastel: ['#c4b5fd', '#93c5fd'],
};
```

변경 예시:

```ts
const DEFAULT_BACKGROUND_COLOR_DRAFT: BackgroundColorDraft = {
  solid: ['#ffffff'],
  gradient: ['#ffffff', '#d9d9d9'],
  pastel: ['#ffffff', '#cfcfcf'],
};
```

### 2. initPage 기본 옵션

파일:
- `react/src/modules/initPage/constants/design.js`

현재:

```js
startColor: '#FF4757',
endColor: '#4A90E2',
```

변경 예시:

```js
startColor: '#ffffff',
endColor: '#d9d9d9',
```

### 3. 공용 fallback

파일:
- `react/src/shared/backgroundStyle.ts`

현재:

```ts
const safeStart = startColor ?? '#FF4757';
const safeEnd = endColor ?? '#4A90E2';
```

변경 예시:

```ts
const safeStart = startColor ?? '#ffffff';
const safeEnd = endColor ?? '#d9d9d9';
```

### 4. editing 초기 배경 fallback

파일:
- `react/src/modules/editing/utils/initialBackground.ts`

현재:

```ts
options.startColor ??
options.brandColor ??
'#FF4757';

options.endColor ??
'#4A90E2';
```

변경 예시:

```ts
options.startColor ??
options.brandColor ??
'#ffffff';

options.endColor ??
'#d9d9d9';
```

## 주의할 점

### 1. `solid`도 같이 흰색으로 바뀔 수 있음

`DEFAULT_BACKGROUND_COLOR_DRAFT.solid`까지 바꾸면
단색 기본도 흰색이 됩니다.

이게 의도라면 문제 없고,
단색은 다른 색을 유지하고 싶으면 `solid`만 별도 값으로 두면 됩니다.

### 2. `brandColor`는 텍스트 색과 관련 있음

`design.js`에는 `brandColor`도 따로 있습니다.

현재:
- `brandColor: '#000000'`

이 값은 가게 이름 같은 텍스트 쪽에 영향이 갈 수 있으므로,
배경을 흰색/회색으로 바꾼다고 해서 반드시 같이 바꿀 필요는 없습니다.

오히려 지금처럼 검정 텍스트가 더 잘 맞을 가능성이 큽니다.

### 3. initPage와 editing이 다르게 보이지 않게 같이 바꾸는 게 좋음

`editing`만 바꾸고 `initPage` 기본값을 안 바꾸면:

- initPage에서는 여전히 빨강/파랑 느낌
- editing 들어간 뒤에는 흰색/회색 fallback

처럼 화면 간 인상이 달라질 수 있습니다.

그래서 실사용 기준으로는 `App.tsx`만이 아니라 `initPage/constants/design.js`도 같이 수정하는 것이 맞습니다.

## 최종 정리

초기 `그라데이션/다중색` 색상을 흰색/회색으로 바꾸는 것은 충분히 가능합니다.

가장 중요한 수정 파일은:

- `react/src/modules/editing/App.tsx`
- `react/src/modules/initPage/constants/design.js`

일관성까지 맞추려면 추가로:

- `react/src/shared/backgroundStyle.ts`
- `react/src/modules/editing/utils/initialBackground.ts`
- 필요 시 `react/src/modules/editing/utils/backgroundGeneration.ts`

를 같이 바꾸면 됩니다.

실제로 수정할 때는 `#ffffff + #2f2f2f` 또는 `#f8f8f8 + #3a3a3a`처럼 더 강한 명암 대비 조합도 사용할 수 있습니다.

## 수정사항

### 적용 일시

- 2026-04-17

### 실제 수정 파일

- `react/src/modules/editing/App.tsx`
- `react/src/modules/initPage/constants/design.js`
- `react/src/shared/backgroundStyle.ts`
- `react/src/modules/editing/utils/initialBackground.ts`
- `react/src/modules/editing/utils/backgroundGeneration.ts`

### 적용 내용

`그라데이션`과 `다중색`의 기본 초기 색상을 흰색/진회색 계열로 변경했습니다.

적용한 값:

- `gradient`: `#ffffff` -> `#2f2f2f`
- `pastel`: `#ffffff` -> `#1f1f1f`

구체적으로는:

1. `editing` 내부 기본 draft 색상 변경
2. `initPage` 기본 옵션의 `startColor`, `endColor` 변경
3. 공용 배경 스타일 fallback 색상 변경
4. `editing` 초기 배경 계산 fallback 색상 변경
5. 로컬 배경 후보 생성 fallback 색상도 동일 톤으로 변경

### 비고

- `solid` 기본값은 기존대로 유지했습니다
- 요청대로 회색 쪽은 거의 검정색에 가까운 진회색으로 더 어둡게 조정했습니다
- 요청하신 범위대로 `그라데이션/다중색` 초기 색상 관련 부분만 수정했습니다
