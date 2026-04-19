# 2026-04-17 UI/UX 및 레이아웃 최적화 통합 마스터 보고서

본 문서는 금일 진행된 텍스트 정렬, 푸터 자동 생성, 배경 UI 로직 개선 등 모든 디자인 관련 수정 내역을 통합하여 기술합니다.

---

##  1. 레이아웃 정렬 및 시각적 동기화 표준화

`Main Preview`, `Background Card`, `Wireframe Card` 간의 시각적 불일치를 해결하고 정렬 표준을 수립했습니다.

### **핵심 가계 이름/슬로건 정렬 표준**
- **중앙 정렬 표준**: `x: 0`, `width: 100`, `align: 'center'`를 원칙으로 적용하여 모든 환경에서 완벽한 중앙 배치를 보장합니다.
- **BackgroundCard 수정**: 텍스트 박스 너비를 `fit-content`에서 `${element.width}%`로 변경하여 정렬이 무시되는 버그를 해결했습니다.
- **레이아웃 겹침 방지**: `WireframeChoiceCard` 내에 `ensureStoreAboveSlogan` 로직을 추가하여 가게 이름과 슬로건이 겹치지 않도록 7%의 최소 간격을 강제합니다.

---

##  2. 지능형 푸터(Footer) 및 추가 정보 시스템

'White-on-White' 버그를 해결하고 하단 정보를 가독성 있게 자동 배치합니다.

### **주요 수정 사항**
- **가시성 확보**: 주소/전화번호의 하드코딩된 흰색(`#ffffff`)을 시스템 기본 검정색(`#000000`)으로 변경했습니다.
- **자동 배치 로직**: 편집 화면 진입 시 `initPage`의 정보를 기반으로 최하단(`y: 92.5%`, `y: 96%`)에 푸터 요소를 자동 생성합니다.
- **Type 2 레이아웃 조정**: 푸터 공간 확보를 위해 슬로건의 위치를 상향 조정(`y: 92` → **`80`**)하고, 가게 이름도 공간 확보를 위해 상향(`y: 68` → **`65`**)했습니다.

---

##  3. 배경 UI 로직 및 테마 최적화

### **배경 후보 자동 노출 복구**
- **대상 모드**: `그라데이션`, `다중색(Pastel)`
- **로직**: 이전에 제거되었던 자동 생성 트리거(`setQueuedBackgroundGeneration(true)`)를 복구하여, 모드 진입 즉시 4개의 배경 후보가 우측에 나타나도록 개선했습니다.

### **초기 배경 색상 테마 변경**
- **기존**: 붉은색/푸른색 계열의 자극적인 초기색
- **변경**: 화이트/진회색 계열로 변경하여 프리미엄한 첫인상을 제공합니다.
  - `Gradient`: `#ffffff` (시작) / `#2f2f2f` (끝)
  - `Pastel`: `#ffffff` (시작) / `#1f1f1f` (끝)

---

##  4. 기술적 유지보수 및 원상복구 가이드

추후 레이아웃을 이전으로 되돌려야 할 경우, 코드 내의 특수 주석을 참조하십시오.

### **코드 내 주석 가이드 (`editorFlow.ts`)**
- **`[ORIGINAL]`**: 초기 팀원 또는 설계상의 오리지널 수치 및 로직입니다.
- **`[MODIFIED]`**: 금일 가독성과 공간 확보를 위해 수정된 수치입니다.
- **적용 예시**: Type 2 슬로건 위치, 추가 정보 프리셋 좌표 등.

---

##  5. 통합된 개별 리포트 목록 (삭제 대상)
- `background_candidate_auto_show_analysis.md`
- `background_default_white_gray_report.md`
- `footer_fix_complete.md`
- `footer_issue_analysis.md`
- `footer_logic_backup.md`
- `footer_reimplementation_report.md`
- `text_alignment_fix.md`
- `wireframe_alignment_fixes.md`
- `type2_layout_update.md`

---
**보고서 작성 완료 (2026-04-17)**
