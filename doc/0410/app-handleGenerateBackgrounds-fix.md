# App.tsx 버그 수정 (handleGenerateBackgrounds / handleGenerateSlogan)

**날짜**: 2026-04-10  
**파일**: `react/src/modules/editing/App.tsx`  
**함수**: `handleGenerateBackgrounds`, `handleGenerateSlogan`

---

## 버그 원인

`handleGenerateBackgrounds` 함수 내 Case A, Case B 로직이 두 버전의 코드가 잘못 병합되면서 구문 오류가 발생했습니다.

```
[vite] Pre-transform error: Unexpected token (287:6)
> 287 |     } catch (err) {
```

---

## Case A 수정 내용

### 문제
`solid` 분기 처리 이후 중복된 상태 업데이트 코드가 삽입되어 있었습니다.

```tsx
// ❌ 수정 전 - 불필요한 중복 코드
const nextCandidates = localResult.candidates.slice(0, 4);
setBackgroundCandidates(nextCandidates);              // 중복 호출 1
setSelectedBackgroundId(nextCandidates[0]?.id ?? null); // 중복 호출 2
const mergedCandidates = initialBackground ? [...] : localResult.candidates;

setBackgroundCandidates(mergedCandidates);             // 중복 호출 3
setSelectedBackgroundId(...);
```

### 수정
중복 호출(1, 2)을 제거하고 `mergedCandidates` 기반 단일 업데이트로 정리했습니다.

```tsx
// ✅ 수정 후
const mergedCandidates = initialBackground
  ? [initialBackground, ...localResult.candidates.filter((c) => c.id !== initialBackground.id)]
  : localResult.candidates;

setBackgroundCandidates(mergedCandidates);
setSelectedBackgroundId((prev) => {
  if (prev === initialBackground?.id) return prev;
  return mergedCandidates[0]?.id ?? null;
});
```

---

## Case B 수정 내용

### 문제 1: 미정의 변수 `newCandidates` 참조

```tsx
// ❌ 수정 전 - newCandidates 는 선언된 적 없는 변수
if (newCandidates.length > 0) {
  setBackgroundCandidates(newCandidates.slice(0, 4));
  setSelectedBackgroundId(newCandidates[0].id);
  ...
}
```

### 문제 2: 중괄호 불일치로 `catch` 파싱 오류

```tsx
// ❌ 수정 전 - if (res.ok) 블록이 닫히지 않아 catch 가 블록 내에 위치
if (res.ok && res.blobUrl) {
  const newCandidate = { ... };

if (newCandidates.length > 0) {   // ← 들여쓰기도 잘못됨
  ...
} else {
  throw ...
}
// ← if (res.ok) 닫는 } 없음

} catch (err) {   // ← Unexpected token 오류 발생
```

### 수정
`newCandidates` 관련 코드를 제거하고 `if (res.ok && res.blobUrl)` 블록을 올바르게 닫았습니다.

```tsx
// ✅ 수정 후
if (res.ok && res.blobUrl) {
  const newCandidate = { ... };

  setBackgroundCandidates((prev) => [newCandidate, ...prev]);
  setSelectedBackgroundId(newCandidate.id);
  setStep('background');
} else {
  throw new Error(res.error || '배경 생성에 실패했습니다.');
}

} catch (err) {   // ← 정상 위치
```

---

---

## handleGenerateSlogan 수정 내용

### 문제: 동일 스코프에 `result` 중복 선언

```
[vite] Pre-transform error: Identifier 'result' has already been declared. (341:12)
> 341 |       const result = await callApi.generateAdCopy();
```

두 버전의 코드가 병합되면서 같은 `try` 블록 안에 `const result`가 두 번 선언되었습니다.

```tsx
// ❌ 수정 전 - 동일 스코프에 중복 선언
const result = (await callApi.generateAdCopy()) as AdCopyResult; // 선언 1
const result = await callApi.generateAdCopy();                   // 선언 2 → 오류
```

### 수정

타입 캐스트 버전(선언 1)을 제거하고, 이하 로직과 호환되는 일반 버전(선언 2)만 유지합니다.  
이에 따라 사용처가 없어진 `type AdCopyResult` 타입 정의도 함께 제거했습니다.

```tsx
// ✅ 수정 후
const result = await callApi.generateAdCopy();
```

---

## 최종 구조 요약

| 함수 | 항목 | 이전 | 이후 |
|------|------|------|------|
| `handleGenerateBackgrounds` | Case A 상태 업데이트 | `setBackgroundCandidates` 3회 중복 호출 | 1회로 정리 |
| `handleGenerateBackgrounds` | Case B 변수 | 미정의 `newCandidates` 참조 | 제거 |
| `handleGenerateBackgrounds` | Case B 중괄호 | `if (res.ok)` 미닫힘 → `catch` 파싱 오류 | 정상 닫힘 |
| `handleGenerateBackgrounds` | Case B API | `generateBackground` (순수 생성) 유지 | 동일 |
| `handleGenerateSlogan` | `result` 선언 | 동일 스코프 중복 선언 → 파싱 오류 | 단일 선언으로 정리 |
| `handleGenerateSlogan` | `AdCopyResult` 타입 | 미사용 타입 잔존 | 제거 |
