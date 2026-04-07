import { useState } from 'react';
import InitPage from './features/init/InitPage';
import EditorPage from './features/editor/EditorPage';
import type { HomeProjectData } from './types/home';

type AppStep = 'init' | 'editor';

/**
 * 통합 루트 컴포넌트
 *
 * 'init'   → InitPage  (1_initPage 로직: 드래프트 미리보기, 데이터 입력)
 * 'editor' → EditorPage (2_editingPage 로직: AI 배경 생성, 요소 편집)
 *
 * 두 페이지 간 데이터는 React state로 직접 전달합니다.
 * sessionStorage / bridge token / window.location 전환은 사용하지 않습니다.
 */
export default function App() {
  const [step, setStep] = useState<AppStep>('init');
  const [projectData, setProjectData] = useState<HomeProjectData | null>(null);
  const [draftIndex, setDraftIndex] = useState(0);

  const handleEnterEditor = (data: HomeProjectData, idx: number) => {
    setProjectData(data);
    setDraftIndex(idx);
    setStep('editor');
  };

  const handleBackToInit = () => {
    setStep('init');
    // projectData와 draftIndex는 유지 — initPage가 재마운트되어 자체 상태로 초기화됨
  };

  if (step === 'editor' && projectData) {
    return (
      <EditorPage
        projectData={projectData}
        draftIndex={draftIndex}
        onBackToInit={handleBackToInit}
      />
    );
  }

  return <InitPage onEnterEditor={handleEnterEditor} />;
}
