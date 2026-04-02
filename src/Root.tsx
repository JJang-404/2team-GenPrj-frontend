import { useState } from 'react';
import InitialPage from './pages/InitialPage';
import App from './App';
import { generateTemplate } from './api/generate';
import type { GenerateRequest, GeneratedTemplate } from './api/generate';

type Step = 'form' | 'editor';

export default function Root() {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GeneratedTemplate | null>(null);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);

  const handleFormSubmit = async (req: GenerateRequest) => {
    setLoading(true);
    setFormError(null);
    try {
      const data = await generateTemplate(req);
      setGeneratedData(data);
      setBackendWarning(null);
      setStep('editor');
    } catch (e) {
      // 백엔드 연동 실패 → 데모 에디터로 이동 (경고 표시)
      setGeneratedData(null);
      setBackendWarning(
        e instanceof Error
          ? `백엔드 연동 실패: ${e.message} — 데모 템플릿으로 대체되었습니다.`
          : '백엔드에 연결할 수 없어 데모 템플릿으로 대체되었습니다.'
      );
      setStep('editor');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
    setGeneratedData(null);
    setBackendWarning(null);
    setFormError(null);
  };

  if (step === 'editor') {
    return (
      <App
        initialData={generatedData ?? undefined}
        onBack={handleBackToForm}
        warning={backendWarning ?? undefined}
      />
    );
  }

  return (
    <InitialPage
      onSubmit={handleFormSubmit}
      loading={loading}
      error={formError}
    />
  );
}
