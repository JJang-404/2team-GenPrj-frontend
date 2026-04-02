/**
 * src/utils/transform.ts
 * 백엔드(px) <-> 프론트엔드(%) 좌표 변환 및 데이터 가공 유틸리티
 */

// 1. 기본 단위 변환 함수
export const pxToPercent = (px: number, total: number): number => {
  return (px / total) * 100;
};

export const percentToPx = (pct: number, total: number): number => {
  return Math.round((pct / 100) * total);
};

/**
 * 2. 백엔드 JSON을 프론트엔드 전용 상태로 변환
 * @param backendTemplate sample_ver3의 원본 JSON 데이터
 */
export const transformTemplateForEditor = (backendTemplate: any) => {
  const { width, height } = backendTemplate.canvas;

  // text_blocks를 가공하여 UI 렌더링에 최적화된 형태로 반환
  const transformedBlocks = Object.entries(backendTemplate.text_blocks).reduce(
    (acc: any, [id, block]: [string, any]) => {
      acc[id] = {
        ...block,
        // UI 표현을 위해 % 좌표를 미리 계산해둘 수 있음 (선택 사항)
        uiPos: {
          left: pxToPercent(block.area.x, width),
          top: pxToPercent(block.area.y, height),
          width: pxToPercent(block.area.width, width),
          height: pxToPercent(block.area.height, height),
        }
      };
      return acc;
    },
    {}
  );

  return {
    ...backendTemplate,
    text_blocks: transformedBlocks,
  };
};

/**
 * 3. 에디터 상태를 백엔드 전송용 JSON으로 역변환
 * @param editorTemplate 리액트에서 수정된 템플릿 상태
 * @param canvasSize 기준 해상도 (예: 1080, 1350)
 */
export const transformStateToBackendJSON = (editorTemplate: any) => {
  // UI 전용 데이터를 제거하고 순수 픽셀 데이터만 추출하는 로직
  // (현재 구조에서는 픽셀 값을 직접 업데이트하므로 정제 작업 위주)
  const cleanBlocks = { ...editorTemplate.text_blocks };
  
  Object.keys(cleanBlocks).forEach(id => {
    delete cleanBlocks[id].uiPos; // UI 전용 필드 삭제
  });

  return {
    ...editorTemplate,
    text_blocks: cleanBlocks
  };
};