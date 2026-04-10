# AI 광고 문구 생성 로직 및 프롬프트 커스터마이징 가이드

본 문서는 편집(Editing) 페이지에서 'AI 문구 생성'이 작동하는 방식과, 사용자가 원하는 정보만 프롬프트에 포함하도록 수정하는 방법을 설명합니다.

---

## 1. AI 문구 생성 및 데이터 연동 원리

### Q1. 편집 페이지의 'AI 문구'는 `genprj_store_info`를 사용하나요?
**네, 사용합니다.**
편집 페이지(`App.tsx`)에서 'AI 문구 생성' 버튼을 클릭하면 `handleGenerateSlogan` 함수가 실행됩니다. 이 함수는 내부적으로 `storeInfo.buildAdPrompt()`를 호출하는데, 이 유틸리티는 브라우저의 `localStorage`에 저장된 `genprj_store_info` 데이터를 읽어와서 텍스트 프롬프트를 생성합니다.

### Q2. 편집 창의 '소개문구'에 입력한 내용이 `store_info`가 비어있을 때도 적용되나요?
**아니오, 직접적으로 적용되지 않습니다.**
*   **이유**: 편집 창의 '소개문구' 입력 필드는 현재 화면(`projectData` 상태)만 업데이트할 뿐, `localStorage`에 있는 `store_info`를 실시간으로 덮어쓰지 않습니다.
*   **결과**: 만약 초기 페이지(`initPage`)에서 정보를 입력하지 않아 `store_info`가 비어 있다면, AI 생성 시 프롬프트도 비어 있게 됩니다. 이 경우 시스템은 서버 호출 대신 미리 정의된 기본 문구 생성 로직(`createAutoSlogan`)을 사용하게 됩니다.

---

## 2. 프롬프트 데이터 선별 제어 (Customization)

프롬프트에 모든 정보가 아닌 **일부 정보만** 포함하고 싶다면, `react/src/server/api/storeInfo.js` 파일의 `buildAdPrompt()` 메서드를 수정해야 합니다.

### [수정 위치]
`react/src/server/api/storeInfo.js` 파일의 약 47라인 부근:

```javascript
/* 기존 코드 예시 */
buildAdPrompt() {
  const info = this.getStoreInfo();
  if (!info) return '';

  const { basicInfo, extraInfo } = info;
  const lines = [];

  // 1. 필요한 항목만 주석 처리하거나 조건문을 수정하여 제외할 수 있습니다.
  if (basicInfo?.storeName) lines.push(`가게이름: ${basicInfo.storeName}`);
  if (basicInfo?.industry) lines.push(`업종: ${basicInfo.industry}`);
  if (basicInfo?.storeDesc) lines.push(`가게소개: ${basicInfo.storeDesc}`); // 제외하고 싶다면 이 줄 삭제
  
  // 2. 편의시설 중 특정 항목만 선택적으로 포함
  const extras = [];
  if (extraInfo?.parkingCount > 0 && extraInfo?.showParkingCount) extras.push(`주차공간 ${extraInfo.parkingCount}대`);
  // if (extraInfo?.isNoKids) extras.push('노키즈존'); // 예: 노키즈존 정보는 프롬프트에서 제외
  
  // ... 생략 ...
  return lines.join('\n');
}
```

### 권장 수정 방법
특정 데이터가 있을 때만 포함하거나, 특정 필드(예: 가게 이름, 업종)만 고정적으로 보내고 싶다면 위 함수 내의 `lines.push` 부분을 원하는 대로 편집하십시오.

---

## 3. 요약 및 주의사항

> [!IMPORTANT]
> **데이터 동기화**: 편집 페이지에서 수정한 '가게 이름'이나 '소개 문구'를 AI 프롬프트에도 즉시 반영하고 싶다면, `handleStoreNameChange` 등에서 `storeInfo.saveStoreInfo()`를 호출하여 스토리지 동기화 로직을 추가해야 합니다.

> [!TIP]
> **프롬프트 확인**: 실제로 어떤 데이터가 서버로 전송되는지 확인하려면 브라우저 개발자 도구(F12)의 **Console** 탭을 확인하세요. `[Editing] AI 광고 문구 생성 요청 프롬프트:` 라는 로그로 전송 직전의 텍스트가 표시됩니다.
