# AI 배경 생성 통합 핸들러 (수정 전문)

현재 `App.tsx`에서 오류가 날 수 있는 부분을 바로잡고, 4개 배경을 동시에 생성하는 기능을 완벽하게 통합한 코드입니다.

## 1. App.tsx 수정 코드 전문

`react/src/modules/editing/App.tsx` 파일 내에서 기존에 중복 정의된 `handleGenerateBackgrounds` 함수 두 개를 모두 삭제하고, 아래 코드를 **한 번만** 붙여넣으세요.

```typescript
  /**
   * 배경 생성 통합 핸들러
   * - 단색/그라데이션/다중색: 로컬에서 즉시 생성
   * - AI 이미지 생성: Backend1(callApi)을 통해 4개 병렬 생성
   */
  const handleGenerateBackgrounds = async () => {
    if (!selectedTemplateId || !projectData) return;
    
    setGenerating(true);
    setError(null);

    // 편집 중이던 선택 박스 해제
    const previousSelectedId = selectedElementId;
    setSelectedElementId(null);

    try {
      // --- [CASE A] 로컬 배경 모드 (단색, 그라데이션, 다중색) ---
      if (backgroundMode !== 'ai-image') {
        const localResult = await generateBackgrounds({
          templateId: selectedTemplateId,
          backgroundMode,
          promptKo: buildBackgroundPrompt(projectData, selectedTemplate, promptKo, promptHint),
          guideImage: '',
          guideSummary: '',
        });

        const initialBackground = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint);
        
        if (backgroundMode === 'solid') {
          setBackgroundCandidates([initialBackground]);
          setSelectedBackgroundId(initialBackground.id);
          setStep('editor');
          return;
        }

        const mergedCandidates = [
          initialBackground,
          ...localResult.candidates.filter((c) => c.id !== initialBackground.id)
        ];

        setBackgroundCandidates(mergedCandidates);
        setSelectedBackgroundId(initialBackground.id);
        setStep('background');
        return;
      }

      // --- [CASE B] AI 이미지 생성 모드 (Backend1 서버 호출 + 4개 확장) ---
      
      // 4개의 생성 태스크를 병렬로 준비합니다.
      const generateTasks = [1, 2, 3, 4].map(() => 
        callApi.generateBackground({
          storeName: projectData.storeName,
          industry: projectData.industry,
          storeDesc: projectData.mainSlogan,
        })
      );

      // 4개의 요청을 동시에 실행하고 기다립니다.
      const results = await Promise.all(generateTasks);

      // 성공한 결과만 필터링하여 후보군 리스트로 변환
      const newCandidates: BackgroundCandidate[] = results
        .filter(res => res.ok && res.blobUrl)
        .map((res, idx) => ({
          id: `ai-gen-${Date.now()}-${idx}`,
          name: `AI 배경 ${idx + 1}`,
          mode: 'ai-image' as const,
          cssBackground: 'transparent',
          imageUrl: res.blobUrl!,
          note: 'AI가 추천하는 실사 배경 시안입니다.',
          translatedPrompt: res.prompt || '',
          negativePrompt: res.negativePrompt || '',
        }));

      if (newCandidates.length > 0) {
        // 기존 initPage 배경은 유지하면서 앞에 4개를 추가합니다.
        setBackgroundCandidates(prev => [...newCandidates, ...prev]);
        setSelectedBackgroundId(newCandidates[0].id); // 첫 번째 시안 자동 선택
        setStep('background');
      } else {
        throw new Error('서버로부터 배경 이미지를 받지 못했습니다. 백엔드 상태를 확인하세요.');
      }

    } catch (err) {
      console.error('[배경 생성 오류]', err);
      setError(err instanceof Error ? err.message : '배경 생성 도중 오류가 발생했습니다.');
    } finally {
      // 생성 완료 후 원래 선택했던 요소 다시 선택 (UX 배려)
      setSelectedElementId(previousSelectedId);
      setGenerating(false);
    }
  };
```

## 2. 코드 삽입 시 주의사항

1.  **중복 제거**: 파일 내에 `const handleGenerateBackgrounds = ...`로 시작하는 다른 코드가 있다면 모두 지워야 합니다. (특히 165행과 315행 근처)
2.  **타입 정의**: `BackgroundCandidate[]` 타입 에러가 난다면, 상단에 `BackgroundCandidate`가 `import` 되어 있는지 확인하세요.
3.  **병렬 처리의 장점**: `Promise.all`을 사용했기 때문에 이미지 4개를 하나씩 만들 때보다 약 3~4배 더 빠르게 결과가 화면에 나타납니다.

## 3. 요약: 무엇이 변했나요?
- **문법 교정**: 엉켜있던 중괄호(`}`)와 중복 코드를 깔끔하게 하나로 합쳤습니다.
- **기능 확장**: 버튼 한 번 클릭에 배경 시안이 **4개**씩 생성됩니다.
- **안정성**: 서버가 하나라도 성공하면 결과를 보여주며, 전체 실패 시에만 에러 메시지를 띄웁니다.

---

## 4. 'industry' 속성 오류 해결 방법

`industry`(업종) 정보가 `HomeProjectData` 형식에 없다는 에러가 발생할 경우, 아래 두 파일을 수정하여 데이터 설계도를 업데이트해야 합니다.

### 4-1. 타입 정의 수정 (TypeScript)
**대상 파일**: `react/src/modules/editing/types/home.ts`

`HomeProjectData` 인터페이스에 `industry` 속성을 추가합니다.
```typescript
export interface HomeProjectData {
  options: HomeProjectOptions;
  storeName: string;
  industry: string;  // <-- 이 줄을 추가하세요
  mainSlogan: string;
  details: string;
  products: HomeProductInput[];
  additionalInfo: HomeAdditionalInfo;
}
```

### 4-2. 데이터 브릿지 수정 (JavaScript)
**대상 파일**: `react/src/modules/initPage/utils/editingBridge.js`

데이터를 넘겨주는 시점에 `industry` 값을 포함하도록 수정합니다.
```javascript
export async function buildEditingPayload({ options, basicInfo, extraInfo, products, draftIndex }) {
  // ... 생략 ...
  return {
    draftIndex,
    projectData: {
      options: { ... },
      storeName: basicInfo.storeName?.trim() ?? '',
      industry: basicInfo.industry?.trim() ?? '', // <-- 이 줄을 추가하여 업종 정보를 넘깁니다.
      mainSlogan: basicInfo.storeDesc?.trim() ?? '',
      // ... 생략 ...
    },
  };
}
```

이 작업을 완료하면 `App.tsx`의 빨간색 에러 줄이 사라지고, 사용자가 입력한 '카페', '베이커리' 등의 정보가 AI 이미지 생성 시 정확하게 반영됩니다.
