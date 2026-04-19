● Git 명령어 순서

  1단계: 두 브랜치 차이 확인                                                                                                                   git diff United1_7 United1_8
  또는 파일 목록만:                                                                                                                            git diff --name-only United1_7 United1_8

2단계: United1_7로 전환 
git checkout git gcheckout feature/United1_7                                                                                                                  

3단계: United1_8에서 특정 파일만 가져오기
  메인 프리뷰, 선택 카드 관련 파일만 골라서:
  git checkout United1_8 -- src/경로/파일명.tsx
  git checkout United1_8 -- src/경로/다른파일.tsx

  AI 이미지 생성 관련 파일은 건드리지 않으면 United1_7 코드 그대로 유지됨

4단계: 변경사항 확인
  git diff HEAD
  git status

5단계: 커밋
  git add .
  git commit -m "커밋 메시지"

---

어떤 파일이 메인 프리뷰/선택 카드인지, AI 이미지 생성인지 특정하기 어렵다면 먼저 git diff --name-only United1_7 United1_8 결과를
공유해주시면 어떤 파일을 checkout 해야 할지 안내드릴 수 있습니다.