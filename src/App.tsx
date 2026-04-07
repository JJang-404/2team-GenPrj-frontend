/*
 * ── 실행 명령어 ──────────────────────────────────────────────────
 *
 * 1) 패키지 설치 (최초 1회)
 *      npm install
 *
 * 2) 개발 서버 실행 (http://localhost:5173)
 *      npm run dev
 *
 * 3) 프로덕션 빌드 (dist/ 폴더 생성)
 *      npm run build
 *
 * 4) 빌드 결과 미리보기
 *      npm run preview
 *
 * ─────────────────────────────────────────────────────────────────
 */
import React, { useState, useCallback } from 'react';
import Canvas from './components/Editor/Canvas';
import ControlPanel from './components/Editor/ControlPanel';
import SlotList from './components/Editor/SlotList';
import type { GeneratedTemplate } from './api/generate';
import { exportFull, exportObjects, downloadBlob, type ExportState } from './utils/exportCanvas';
import { sendObjectsToBackend } from './api/backgroundApi';

export interface MenuItem {
  id: string;
  name: string;
  price: string;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
  x: number;
  y: number;
}

export interface ImageSlotDef {
  id: string;
  label: string;
}

export interface ImageSlotState {
  url: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number; // 0~100
  bgRemoved: boolean; // true after background removal — controls objectFit (contain vs cover)
}

export interface BorderLine {
  id: string;
  y: number;
  thickness: number;
  color: string;
}

export interface CheckWave {
  enabled: boolean;
  color1: string;
  color2: string;
  cellSize: number;
  offsetY: number;
  amplitude: number;
}

const IMAGE_SLOT_DEFS: ImageSlotDef[] = [
  { id: 'coffee_img', label: '커피 이미지' },
  { id: 'dessert_img', label: '디저트 이미지' },
];

interface AppProps {
  initialData?: GeneratedTemplate;
  onBack?: () => void;
  warning?: string;
}

export default function App({ initialData, onBack, warning }: AppProps = {}) {
  // 배경 (위/아래 각각)
  const [bgTopColor, setBgTopColor] = useState(initialData?.bgTopColor ?? '#ffffff');
  const [bgBottomColor, setBgBottomColor] = useState(initialData?.bgBottomColor ?? '#fce8e8');
  const [checkWave, setCheckWave] = useState<CheckWave>(initialData?.checkWave ?? {
    enabled: false,
    color1: '#f5c5c5',
    color2: '#ffffff',
    cellSize: 20,
    offsetY: 78,
    amplitude: 20,
  });

  // 카페 이름 + 위치
  const [cafeName, setCafeName] = useState(initialData?.cafeName ?? '카페 이름');
  const [cafeNamePos, setCafeNamePos] = useState({ x: 50, y: 5 });

  // 메뉴 섹션 (위치 포함)
  const [sections, setSections] = useState<MenuSection[]>(initialData?.sections ?? [
    {
      id: 'coffee',
      title: '에스프레소',
      x: 30,
      y: 22,
      items: [
        { id: 'c1', name: '아메리카노', price: '4000원' },
        { id: 'c2', name: '라떼', price: '4500원' },
        { id: 'c3', name: '카페모카', price: '4500원' },
        { id: 'c4', name: '카라멜 마끼아또', price: '4800원' },
      ],
    },
    {
      id: 'dessert',
      title: '디저트',
      x: 5,
      y: 62,
      items: [
        { id: 'd1', name: '휘낭시에', price: '5500원' },
        { id: 'd2', name: '두바이 쫀득 쿠키', price: '6000원' },
        { id: 'd3', name: '버터떡', price: '5500원' },
      ],
    },
  ]);

  // 이미지 슬롯 (위치 포함)
  const [imageSlots, setImageSlots] = useState<Record<string, ImageSlotState>>(
    initialData?.imageSlots ?? {
      coffee_img:  { url: null, x: 5,  y: 22, width: 22, height: 22, opacity: 100, bgRemoved: false },
      dessert_img: { url: null, x: 73, y: 60, width: 22, height: 22, opacity: 100, bgRemoved: false },
    }
  );

  // 굵은 선
  const [borders, setBorders] = useState<BorderLine[]>([]);

  // 선택된 요소
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 내보내기 로딩 상태
  const [exporting, setExporting] = useState(false);

  // ── 위치 업데이트 (Canvas 드래그 → App) ───────────────────────
  const handleUpdatePos = useCallback((type: string, id: string, x: number, y: number) => {
    if (type === 'cafeName') {
      setCafeNamePos({ x, y });
    } else if (type === 'section') {
      setSections(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
    } else if (type === 'image') {
      setImageSlots(prev => ({ ...prev, [id]: { ...prev[id], x, y } }));
    } else if (type === 'border') {
      setBorders(prev => prev.map(b => b.id === id ? { ...b, y } : b));
    }
  }, []);

  // ── 이미지 업로드 ─────────────────────────────────────────────
  const handleImageUpload = (slotId: string, url: string) =>
    setImageSlots(prev => ({ ...prev, [slotId]: { ...prev[slotId], url } }));

  const handleUpdateSlotOpacity = (slotId: string, opacity: number) =>
    setImageSlots(prev => ({ ...prev, [slotId]: { ...prev[slotId], opacity } }));

  const handleUpdateSize = useCallback((slotId: string, width: number, height: number) =>
    setImageSlots(prev => ({ ...prev, [slotId]: { ...prev[slotId], width, height } }))
  , []);

  // ── 메뉴 아이템 CRUD ──────────────────────────────────────────
  const updateItem = (sectionId: string, itemId: string, field: 'name' | 'price', value: string) =>
    setSections(prev =>
      prev.map(sec =>
        sec.id === sectionId
          ? { ...sec, items: sec.items.map(it => it.id === itemId ? { ...it, [field]: value } : it) }
          : sec
      )
    );

  const addItem = (sectionId: string) =>
    setSections(prev =>
      prev.map(sec =>
        sec.id === sectionId
          ? { ...sec, items: [...sec.items, { id: `${sectionId}_${Date.now()}`, name: '새 메뉴', price: '0원' }] }
          : sec
      )
    );

  const removeItem = (sectionId: string, itemId: string) =>
    setSections(prev =>
      prev.map(sec =>
        sec.id === sectionId
          ? { ...sec, items: sec.items.filter(it => it.id !== itemId) }
          : sec
      )
    );

  // ── 굵은 선 CRUD ──────────────────────────────────────────────
  const addBorder = () =>
    setBorders(prev => [...prev, { id: `border_${Date.now()}`, y: 50, thickness: 6, color: '#e06060' }]);

  const removeBorder = (id: string) =>
    setBorders(prev => prev.filter(b => b.id !== id));

  const updateBorder = (id: string, field: keyof BorderLine, value: string | number) =>
    setBorders(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));

  // ── 내보내기 ──────────────────────────────────────────────────
  const getExportState = useCallback((): ExportState => ({
    bgTopColor, bgBottomColor, checkWave,
    cafeName, cafeNamePos, sections, imageSlots, borders,
  }), [bgTopColor, bgBottomColor, checkWave, cafeName, cafeNamePos, sections, imageSlots, borders]);

  const handleExportFull = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportFull(getExportState());
      downloadBlob(blob, 'ad_full.png');
    } catch (e) {
      console.error('전체 저장 실패:', e);
    } finally {
      setExporting(false);
    }
  }, [getExportState]);

  const handleExportObjects = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportObjects(getExportState());
      downloadBlob(blob, 'ad_objects.png');
    } catch (e) {
      console.error('객체 저장 실패:', e);
    } finally {
      setExporting(false);
    }
  }, [getExportState]);

  const handleSendToBackend = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportObjects(getExportState());
      await sendObjectsToBackend(blob);
    } catch (e) {
      console.error('백엔드 전송 실패:', e);
    } finally {
      setExporting(false);
    }
  }, [getExportState]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d1a' }}>
      {/* 상단 네비게이션 바 */}
      {onBack && (
        <header style={{ flexShrink: 0, borderBottom: '1px solid #1e2a4a' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px' }}>
            <button
              onClick={onBack}
              style={{ background: 'none', border: '1px solid #1e2a4a', borderRadius: '6px', color: '#7986cb', fontSize: '13px', cursor: 'pointer', padding: '6px 14px' }}
            >
              ← 처음으로
            </button>
            <span style={{ marginLeft: '16px', fontSize: '13px', color: '#424870' }}>메뉴판 편집기</span>
          </div>
          {warning && (
            <div style={{ background: '#2a1a00', borderTop: '1px solid #7c4a00', padding: '8px 20px', fontSize: '12px', color: '#fbbf24' }}>
              ⚠ {warning}
            </div>
          )}
        </header>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* 왼쪽 패널 */}
      <aside style={{ width: '350px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #0f3460', overflowY: 'auto' }}>
        <ControlPanel
          cafeName={cafeName}
          sections={sections}
          bgTopColor={bgTopColor}
          bgBottomColor={bgBottomColor}
          checkWave={checkWave}
          borders={borders}
          onUpdateCafeName={setCafeName}
          onUpdateBgTopColor={setBgTopColor}
          onUpdateBgBottomColor={setBgBottomColor}
          onUpdateCheckWave={setCheckWave}
          onUpdateItem={updateItem}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onAddBorder={addBorder}
          onRemoveBorder={removeBorder}
          onUpdateBorder={updateBorder}
        />
        <SlotList
          slotDefs={IMAGE_SLOT_DEFS}
          imageSlots={imageSlots}
          onImageUpload={handleImageUpload}
          onUpdateSlotOpacity={handleUpdateSlotOpacity}
          onUpdateSlotSize={handleUpdateSize}
        />
      </aside>

      {/* 오른쪽: 미리보기 */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '380px' }}>
          <Canvas
            bgTopColor={bgTopColor}
            bgBottomColor={bgBottomColor}
            checkWave={checkWave}
            cafeName={cafeName}
            cafeNamePos={cafeNamePos}
            sections={sections}
            imageSlots={imageSlots}
            borders={borders}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdatePos={handleUpdatePos}
            onUpdateSize={handleUpdateSize}
          />
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '10px' }}>
            드래그: 요소 이동 &nbsp;|&nbsp; 클릭: 선택
          </p>

          {/* 내보내기 버튼 */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportFull}
              disabled={exporting}
              style={{
                padding: '8px 16px', fontSize: '12px', borderRadius: '6px', border: 'none',
                background: exporting ? '#333' : '#1a4a8a', color: exporting ? '#666' : '#fff',
                cursor: exporting ? 'not-allowed' : 'pointer', fontWeight: 600,
              }}
            >
              {exporting ? '처리 중...' : '전체 저장'}
            </button>
            <button
              onClick={handleExportObjects}
              disabled={exporting}
              style={{
                padding: '8px 16px', fontSize: '12px', borderRadius: '6px', border: 'none',
                background: exporting ? '#333' : '#0f3460', color: exporting ? '#666' : '#fff',
                cursor: exporting ? 'not-allowed' : 'pointer', fontWeight: 600,
              }}
            >
              {exporting ? '처리 중...' : '객체 저장 (테스트)'}
            </button>
            <button
              onClick={handleSendToBackend}
              disabled={exporting}
              style={{
                padding: '8px 16px', fontSize: '12px', borderRadius: '6px', border: 'none',
                background: exporting ? '#333' : '#e94560', color: exporting ? '#666' : '#fff',
                cursor: exporting ? 'not-allowed' : 'pointer', fontWeight: 600,
              }}
            >
              {exporting ? '처리 중...' : '백엔드 전송'}
            </button>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
