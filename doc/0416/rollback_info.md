# [Rollback] 레이아웃 위치 변경 전 원본 코드 및 설정

본 문서는 2026-04-16 레이아웃 변경 작업 중 문제가 발생할 경우 원상복구하기 위한 원본 코드 백업용입니다.

---

## 1. `wireframeTextPlacements.ts` 원본 좌표
**위치**: `react/src/modules/editing/utils/wireframeTextPlacements.ts`

```typescript
export const WIREFRAME_TEXT_PLACEMENTS = {
  0: { // Type 1
    storeName:  { x: 4, y: 5,  width: 92, height: 10 },
    mainSlogan: { x: 0, y: 92, width: 100, height: 8  },
  },
  1: { // Type 2
    storeName:  { x: 4, y: 5,  width: 92, height: 12 },
    mainSlogan: { x: 4, y: 15, width: 92, height: 10 },
  },
  2: { // Type 3
    storeName:  { x: 4, y: 5,  width: 92, height: 10 },
    mainSlogan: { x: 0, y: 92, width: 100, height: 8  },
  },
  3: { // Type 4
    storeName:  { x: 4, y: 4,  width: 92, height: 9  },
    mainSlogan: { x: 0, y: 93, width: 100, height: 7  },
  },
};
```

---

## 2. JSX 컴포넌트 원본 구조

### Type 2 (SingleCompactLayout)
**위치**: `react/src/modules/initPage/components/wireframe/SingleCompactLayout.jsx` (Line 96-108)
```jsx
<div className={`relative z-30 ${containerPadding}`}>
  <StoreTitle ... />
  <SloganText slogan={inputData.mainSlogan} className={`${isSquare ? 'text-[8px]' : 'text-xs'} opacity-60`} />
</div>
<div className={`absolute bottom-0 w-full text-center z-30 ${containerPadding} py-2`}>
  <SloganText slogan={inputData.mainSlogan} className={`${isSquare ? 'text-[8px]' : 'text-xs'} opacity-60`} />
</div>
```

### Type 3 (OverlapGroupLayout)
**위치**: `react/src/modules/initPage/components/wireframe/OverlapGroupLayout.jsx` (Line 187-200)
```jsx
<div className={`relative z-30 ${containerPadding}`}>
  <StoreTitle ... />
</div>
<div className={`absolute bottom-0 w-full text-center z-30 ${containerPadding} py-2`}>
  <SloganText slogan={inputData.mainSlogan} ... />
</div>
```

### Type 4 (HalfCropGroupLayout)
**위치**: `react/src/modules/initPage/components/wireframe/HalfCropGroupLayout.jsx` (Line 114-127)
```jsx
<div className={`relative z-30 ${containerPadding}`}>
  <StoreTitle ... />
</div>
<div className={`absolute bottom-0 w-full text-center z-30 ${containerPadding} py-2`}>
  <SloganText slogan={inputData.mainSlogan} ... />
</div>
```
