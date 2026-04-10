# AI 배경 생성 및 에디터 연동 가이드

이 문서는 `editingPage`에서 `callApi.generateBackground`를 호출하여 AI 이미지를 생성하고, 이를 캔버스 배경으로 즉시 반영하는 로직을 설명합니다.

## 1. 개요
사용자가 'AI 배경 생성' 버튼을 클릭하면, 현재 입력된 가게 정보(이름, 업종, 설명)를 바탕으로 백엔드에서 실사 배경 이미지를 생성합니다. 생성된 이미지는 `Blob URL` 형태로 반환되며, 이를 에디터의 배경 후보군(`backgroundCandidates`)에 추가합니다.

## 2. 주요 수정 코드

### ⚠ 주의: 파일 위치 확인
프로젝트에 `App.tsx`가 여러 개 있습니다. 반드시 아래 경로의 파일을 수정해야 합니다.
- **수정할 파일 경로**: `react/src/modules/editing/App.tsx`
- *(참고: `react/src/App.tsx`는 라우터이므로 수정하지 않습니다.)*

### 2-1. callApi 임포트
`react/src/modules/editing/App.tsx` 파일 최상단에 `callApi` 인스턴스를 가져오는 코드를 추가합니다.

```typescript
// react/src/modules/editing/App.tsx 상단

import { callApi } from "../../server/api/callApi";
```

**경로 계산 원리:**
- 현재 위치: `src/modules/editing/`
- 대상 위치: `src/server/api/callApi.js`
- `../../`를 통해 `src` 폴더까지 올라간 뒤 `server/api`로 내려가서 파일을 찾습니다.

### 2-2. 생성 핸들러 수정 (`handleGenerateBackgrounds`)
기존의 가짜 로직이나 타사 API 호출 대신 `callApi`를 사용하도록 수정합니다.

```typescript
const handleGenerateBackgrounds = async () => {
  if (!projectData) return;
  
  setGenerating(true);
  setError(null);

  try {
    // 1. callApi 호출 (가게 정보 전달)
    const result = await callApi.generateBackground({
      storeName: projectData.storeName,
      industry: projectData.industry, // initPage에서 받은 업종 정보
      storeDesc: projectData.mainSlogan, // 슬로건을 설명으로 활용
    });

    if (result.ok && result.blobUrl) {
      // 2. 새로운 배경 후보 객체 생성
      const newBackground = {
        id: `ai-gen-${Date.now()}`,
        name: 'AI 생성 배경',
        mode: 'ai-image' as const,
        cssBackground: 'transparent',
        imageUrl: result.blobUrl, // 생성된 이미지 URL
        note: 'AI가 만든 맞춤형 배경입니다.',
        translatedPrompt: result.prompt || '',
        negativePrompt: result.negativePrompt || '',
      };

      // 3. 후보군 리스트 업데이트 및 선택
      setBackgroundCandidates(prev => [newBackground, ...prev]);
      setSelectedBackgroundId(newBackground.id);
      
      // 4. 배경 선택 단계로 이동 (필요 시)
      setStep('background');
    } else {
      throw new Error(result.error || '이미지 생성에 실패했습니다.');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : '알 수 없는 오류 발생');
  } finally {
    setGenerating(false);
  }
};
```

## 3. 동작 원리 상세 설명 (Internal Logic)

1.  **데이터 준비**: `projectData`에 담긴 가게 이름과 업종 정보를 꺼냅니다.
2.  **백엔드 전송**: `callApi`는 이 정보들을 조합하여 백엔드(`Backend1`)의 `/addhelper/model/generate` 엔드포인트로 요청을 보냅니다.
3.  **이미지 생성**: 백엔드는 OpenAI를 통해 풍부한 영어 프롬프트를 만들고, 이를 이미지 생성 엔진(Stable Diffusion)에 전달합니다.
4.  **Blob 변환**: 프론트엔드는 이미지 바이너리를 받아 `URL.createObjectURL`을 통해 브라우저에서 즉시 볼 수 있는 임시 주소(`blob:http://...`)를 만듭니다.
5.  **렌더링**: `EditorCanvas.tsx`는 `background.imageUrl`이 존재하면 해당 주소를 `<img>` 태그의 `src`로 사용하여 캔버스 가장 하단 레이어에 그립니다.

## 4. 추후 확장 (4개 이미지 생성 시)
이미지를 4개 보여주고 싶다면 다음과 같이 루프를 돌리거나 백엔드에서 리스트로 받아오도록 수정합니다.

```typescript
// 예시: 4번 반복 호출하여 후보군에 추가
for (let i = 0; i < 4; i++) {
  const res = await callApi.generateBackground(...);
  // 각 결과를 backgroundCandidates 배열에 push
}
```

## 5. 구현 체크리스트
- [ ] `callApi.js`의 `backendUrl`이 `http://localhost:8000/addhelper`로 되어 있는가?
- [ ] `generating` 상태일 때 사이드바 버튼에 로딩 스피너가 표시되는가?
- [ ] 생성 실패 시 `error` 배너가 사용자에게 명확히 보이는가?
