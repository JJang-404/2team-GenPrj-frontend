import React from 'react';
import type { MenuSection, BorderLine, CheckWave } from '../../App';

interface ControlPanelProps {
  cafeName: string;
  sections: MenuSection[];
  bgTopColor: string;
  bgBottomColor: string;
  checkWave: CheckWave;
  borders: BorderLine[];
  onUpdateCafeName: (name: string) => void;
  onUpdateBgTopColor: (color: string) => void;
  onUpdateBgBottomColor: (color: string) => void;
  onUpdateCheckWave: (wave: CheckWave) => void;
  onUpdateItem: (sectionId: string, itemId: string, field: 'name' | 'price', value: string) => void;
  onAddItem: (sectionId: string) => void;
  onRemoveItem: (sectionId: string, itemId: string) => void;
  onAddBorder: () => void;
  onRemoveBorder: (id: string) => void;
  onUpdateBorder: (id: string, field: keyof BorderLine, value: string | number) => void;
}

const inp: React.CSSProperties = {
  background: '#0f3460', border: '1px solid #1a4a8a', color: '#fff',
  padding: '5px 8px', borderRadius: '4px', fontSize: '12px',
  width: '100%', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '10px', color: '#999', marginBottom: '4px',
};
const secTitle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 'bold', color: '#e94560',
  borderBottom: '1px solid #0f3460', paddingBottom: '6px',
  marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em',
};
const colorInput: React.CSSProperties = {
  width: '100%', height: '34px', borderRadius: '6px',
  border: '1px solid #1a4a8a', cursor: 'pointer', padding: '2px', background: 'none',
};
const rangeInput: React.CSSProperties = {
  width: '100%', accentColor: '#e94560',
} as React.CSSProperties;
const addBtn: React.CSSProperties = {
  width: '100%', padding: '8px', background: 'transparent',
  border: '1px dashed #1a4a8a', color: '#5a8fd4',
  borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  cafeName, sections, bgTopColor, bgBottomColor, checkWave, borders,
  onUpdateCafeName, onUpdateBgTopColor, onUpdateBgBottomColor, onUpdateCheckWave,
  onUpdateItem, onAddItem, onRemoveItem,
  onAddBorder, onRemoveBorder, onUpdateBorder,
}) => {
  return (
    <aside style={{ backgroundColor: '#16213e', padding: '20px', color: '#e0e0e0' }}>
      <h2 style={{ fontSize: '13px', color: '#e94560', marginBottom: '20px', letterSpacing: '0.05em' }}>
        EDITOR CONTROLS
      </h2>

      {/* ── 배경 설정 ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={secTitle}>배경 설정</div>

        {/* 배경색 — 상단 / 하단 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <div>
            <label style={lbl}>배경 상단색</label>
            <input type="color" value={bgTopColor} onChange={e => onUpdateBgTopColor(e.target.value)} style={colorInput} />
          </div>
          <div>
            <label style={lbl}>배경 하단색</label>
            <input type="color" value={bgBottomColor} onChange={e => onUpdateBgBottomColor(e.target.value)} style={colorInput} />
          </div>
        </div>

        {/* 체커보드 물결 */}
        <div style={{ background: '#0f1f3d', borderRadius: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: checkWave.enabled ? '14px' : 0 }}>
            <span style={{ fontSize: '12px', color: '#ccc' }}>체크 무늬 물결</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checkWave.enabled}
                onChange={e => onUpdateCheckWave({ ...checkWave, enabled: e.target.checked })}
                style={{ accentColor: '#e94560', width: '14px', height: '14px' } as React.CSSProperties}
              />
              <span style={{ fontSize: '11px', color: checkWave.enabled ? '#e94560' : '#555' }}>
                {checkWave.enabled ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          {checkWave.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 색상 2종 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={lbl}>색상 1</label>
                  <input type="color" value={checkWave.color1}
                    onChange={e => onUpdateCheckWave({ ...checkWave, color1: e.target.value })}
                    style={{ ...colorInput, height: '30px' }} />
                </div>
                <div>
                  <label style={lbl}>색상 2</label>
                  <input type="color" value={checkWave.color2}
                    onChange={e => onUpdateCheckWave({ ...checkWave, color2: e.target.value })}
                    style={{ ...colorInput, height: '30px' }} />
                </div>
              </div>
              {/* 격자 크기 */}
              <div>
                <label style={lbl}>격자 크기 — {checkWave.cellSize}px</label>
                <input type="range" min="8" max="50" step="2"
                  value={checkWave.cellSize}
                  onChange={e => onUpdateCheckWave({ ...checkWave, cellSize: parseInt(e.target.value) })}
                  style={rangeInput} />
              </div>
              {/* 물결 위치 */}
              <div>
                <label style={lbl}>물결 위치 (위↑ ↓아래) — {checkWave.offsetY}%</label>
                <input type="range" min="30" max="95" step="1"
                  value={checkWave.offsetY}
                  onChange={e => onUpdateCheckWave({ ...checkWave, offsetY: parseInt(e.target.value) })}
                  style={rangeInput} />
              </div>
              {/* 물결 진폭 */}
              <div>
                <label style={lbl}>물결 진폭 (0=평평) — {checkWave.amplitude}px</label>
                <input type="range" min="0" max="60" step="1"
                  value={checkWave.amplitude}
                  onChange={e => onUpdateCheckWave({ ...checkWave, amplitude: parseInt(e.target.value) })}
                  style={rangeInput} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 굵은 선 ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={secTitle}>굵은 선</div>

        {borders.length === 0 && (
          <p style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>
            선이 없습니다. 추가 버튼을 누른 후 캔버스에서 드래그해 위치를 조정하세요.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
          {borders.map(border => (
            <div key={border.id} style={{ background: '#0f1f3d', borderRadius: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#aaa' }}>캔버스에서 상하 드래그로 이동</span>
                <button onClick={() => onRemoveBorder(border.id)}
                  style={{ background: 'none', border: 'none', color: '#e94560', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={lbl}>색상</label>
                  <input type="color" value={border.color}
                    onChange={e => onUpdateBorder(border.id, 'color', e.target.value)}
                    style={{ ...colorInput, height: '30px' }} />
                </div>
                <div>
                  <label style={lbl}>굵기 ({border.thickness}px)</label>
                  <input type="range" min="1" max="24" step="1"
                    value={border.thickness}
                    onChange={e => onUpdateBorder(border.id, 'thickness', parseInt(e.target.value))}
                    style={{ ...rangeInput, marginTop: '8px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onAddBorder} style={addBtn}>+ 굵은 선 추가</button>
      </div>

      {/* ── 카페 이름 ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={secTitle}>카페 이름</div>
        <input style={inp} value={cafeName}
          onChange={e => onUpdateCafeName(e.target.value)}
          placeholder="카페 이름 입력" />
        <p style={{ fontSize: '10px', color: '#555', marginTop: '6px' }}>캔버스에서 드래그해 위치 이동</p>
      </div>

      {/* ── 섹션별 메뉴 ── */}
      {sections.map(section => (
        <div key={section.id} style={{ marginBottom: '28px' }}>
          <div style={secTitle}>{section.title} 섹션</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {section.items.map(item => (
              <div key={item.id} style={{ background: '#0f1f3d', borderRadius: '6px', padding: '10px', position: 'relative' }}>
                <button onClick={() => onRemoveItem(section.id, item.id)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#e94560', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
                  ✕
                </button>
                <div style={{ paddingRight: '20px', marginBottom: '6px' }}>
                  <label style={lbl}>메뉴 이름</label>
                  <input style={inp} value={item.name}
                    onChange={e => onUpdateItem(section.id, item.id, 'name', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>가격</label>
                  <input style={inp} value={item.price}
                    onChange={e => onUpdateItem(section.id, item.id, 'price', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => onAddItem(section.id)} style={{ ...addBtn, marginTop: '10px' }}>
            + 메뉴 추가
          </button>
        </div>
      ))}
    </aside>
  );
};

export default ControlPanel;
