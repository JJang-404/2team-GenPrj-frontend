import React, { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';
import type { ImageSlotDef, ImageSlotState } from '../../App';
import { BG_REMOVAL_CONFIG } from '../../config/backgroundRemoval';
import { cropToBoundingBox } from '../../utils/cropToBoundingBox';
import type { CropResult } from '../../utils/cropToBoundingBox';

interface SlotListProps {
  slotDefs: ImageSlotDef[];
  imageSlots: Record<string, ImageSlotState>;
  onImageUpload: (slotId: string, imageUrl: string) => void;
  onUpdateSlotOpacity: (slotId: string, opacity: number) => void;
  onUpdateSlotSize: (slotId: string, width: number, height: number) => void;
}

async function removeBgFromImage(imgUrl: string): Promise<string> {
  const blob = await removeBackground(imgUrl, BG_REMOVAL_CONFIG);
  return URL.createObjectURL(blob);
}

const lbl: React.CSSProperties = { fontSize: '10px', color: '#aaa', display: 'block', marginBottom: '3px' };
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  fontSize: '10px', padding: '3px 10px', borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer',
  border: 'none', background: disabled ? '#333' : '#1a4a8a', color: disabled ? '#666' : '#fff',
});

const SlotList: React.FC<SlotListProps> = ({
  slotDefs, imageSlots, onImageUpload, onUpdateSlotOpacity, onUpdateSlotSize,
}) => {
  // 슬롯별 배경제거 로딩 상태
  const [loadingSlots, setLoadingSlots] = useState<Record<string, boolean>>({});

  const handleFileChange = (slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onImageUpload(slotId, ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveBg = async (slotId: string, url: string) => {
    setLoadingSlots(prev => ({ ...prev, [slotId]: true }));
    // Capture prevUrl from the parameter (call-time value) to avoid stale closure
    // over imageSlots which may update during the async operation.
    const prevUrl = url;
    let bgRemovedUrl: string | null = null;
    try {
      bgRemovedUrl = await removeBgFromImage(url);
      const crop: CropResult = await cropToBoundingBox(bgRemovedUrl);
      // Release the uncropped intermediate blob if a new one was created
      if (crop.url !== bgRemovedUrl) URL.revokeObjectURL(bgRemovedUrl);
      onImageUpload(slotId, crop.url);
      if (prevUrl.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
      // Resize the slot so the cropped object fills one full dimension of
      // the original slot (contain logic). slot.width% is relative to canvas
      // width (400), slot.height% is relative to canvas height (500).
      const CW = 400, CH = 500;
      const currentSlot = imageSlots[slotId];
      if (currentSlot) {
        // Convert slot % to canvas logical units
        const slotWcu = currentSlot.width * CW / 100;
        const slotHcu = currentSlot.height * CH / 100;
        // One dimension stays at original slot size, the other GROWS to
        // match the bounding box ratio. Use the larger scale factor.
        const scale = Math.max(slotWcu / crop.width, slotHcu / crop.height);
        // Convert back to %
        const newWidth = (scale * crop.width) * 100 / CW;
        const newHeight = (scale * crop.height) * 100 / CH;
        onUpdateSlotSize(slotId, newWidth, newHeight);
      }
    } catch (e) {
      // Clean up intermediate blob URL if background removal succeeded but crop failed
      if (bgRemovedUrl) URL.revokeObjectURL(bgRemovedUrl);
      console.error('배경 제거 실패:', e);
    } finally {
      setLoadingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

  return (
    <div style={{ borderTop: '1px solid #0f3460', padding: '20px', backgroundColor: '#16213e' }}>
      <h3 style={{ fontSize: '11px', color: '#e94560', marginBottom: '14px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        IMAGE SLOTS
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {slotDefs.map(def => {
          const slot = imageSlots[def.id];
          const isLoading = loadingSlots[def.id] ?? false;
          return (
            <div key={def.id} style={{ background: '#0f1f3d', padding: '10px', borderRadius: '8px' }}>

              {/* 썸네일 + 업로드 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '40px', height: '40px', backgroundColor: '#16213e', borderRadius: '4px',
                  overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: '1px solid #1a4a8a',
                }}>
                  {slot?.url
                    ? <img src={slot.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={def.label} />
                    : <span style={{ fontSize: '16px' }}>🖼️</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#fff', marginBottom: '5px' }}>{def.label}</div>
                  <input
                    type="file" accept="image/*"
                    onChange={e => handleFileChange(def.id, e)}
                    style={{ fontSize: '10px', color: '#666', width: '100%' }}
                  />
                </div>
              </div>

              {/* 크기 슬라이더 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>너비: {Math.round(slot?.width ?? 22)}%</label>
                  <input
                    type="range" min={5} max={80} value={slot?.width ?? 22}
                    onChange={e => onUpdateSlotSize(def.id, Number(e.target.value), slot?.height ?? 22)}
                    style={{ width: '100%', accentColor: '#e94560' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>높이: {Math.round(slot?.height ?? 22)}%</label>
                  <input
                    type="range" min={5} max={80} value={slot?.height ?? 22}
                    onChange={e => onUpdateSlotSize(def.id, slot?.width ?? 22, Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#e94560' }}
                  />
                </div>
              </div>

              {/* 불투명도 슬라이더 */}
              <div style={{ marginBottom: '8px' }}>
                <label style={lbl}>불투명도: {slot?.opacity ?? 100}%</label>
                <input
                  type="range" min={0} max={100} value={slot?.opacity ?? 100}
                  onChange={e => onUpdateSlotOpacity(def.id, Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#e94560' }}
                />
              </div>

              {/* 배경 제거 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  style={btnStyle(!slot?.url || isLoading)}
                  disabled={!slot?.url || isLoading}
                  onClick={() => slot?.url && handleRemoveBg(def.id, slot.url)}
                >
                  {isLoading ? '처리 중...' : '배경 제거 (AI)'}
                </button>
                {isLoading && (
                  <span style={{ fontSize: '10px', color: '#e94560' }}>
                    최초 실행 시 모델 다운로드로 시간이 걸릴 수 있습니다
                  </span>
                )}
                {!slot?.url && !isLoading && (
                  <span style={{ fontSize: '10px', color: '#555' }}>이미지 먼저 업로드</span>
                )}
              </div>

            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '10px', color: '#444', marginTop: '10px', lineHeight: 1.5 }}>
        업로드 후 캔버스에서 이미지 슬롯을 드래그해 위치를 조정하세요.
      </p>
    </div>
  );
};

export default SlotList;
