# Git 브랜치 생성 및 변경 사항 업로드 가이드

> 작성일: 2026-04-13  
> 목표: `feature/United1_2_patch` 브랜치를 생성하고 최근 변경 사항과 `doc/0413` 내용을 커밋합니다.

---

## 1. 새로운 브랜치 생성 및 이동

현재 작업 중인 브랜치에서 새로운 패치 브랜치(`feature/United1_2_patch`)를 생성하고 해당 브랜치로 전환합니다.

```bash
# 새로운 브랜치 생성 및 이동
git checkout -b feature/United1_2_patch
```

---

## 2. 변경 사항 확인 및 스테이징

현재 변경된 파일들과 새로 추가된 `doc/0413` 폴더의 파일들을 확인한 후 스테이징합니다.

```bash
# 변경된 파일 상태 확인
git status

# 모든 변경 사항 및 doc/0413 폴더 스테이징
git add .
```

---

## 3. 커밋 작성

수정 내용에 맞는 의미 있는 커밋 메시지를 작성합니다.

```bash
# 커밋 실행
git commit -m "docs: add font scale sync plan and git branch guide to doc/0413"
```

---

## 4. 원격 저장소에 푸시

새로 생성한 브랜치를 원격 저장소(`origin`)에 업로드합니다.

```bash
# 원격 저장소로 푸시 (처음 푸시할 때 -u 옵션 사용)
git push -u origin feature/United1_2_patch
```

---

## 5. (참고) 브랜치 확인

브랜치가 정상적으로 생성되고 전환되었는지 확인하려면 다음 명령어를 사용하세요.

```bash
git branch
```
