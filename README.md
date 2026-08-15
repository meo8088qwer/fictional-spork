# 줄넘기 실시간 랭킹보드

줄넘기 체육관을 위한 멀티테넌트 랭킹보드 SaaS. React + Vite 프론트엔드, Supabase(Postgres + Auth + RLS) 백엔드.

## 로컬 실행

**사전 준비:** Node.js, Supabase 프로젝트 (설정 방법은 [`supabase/README.md`](supabase/README.md) 참고)

1. 의존성 설치: `npm install`
2. `.env.example`을 `.env.local`로 복사하고 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`를 채워주세요.
3. 실행: `npm run dev`

## 구조

- `src/routes/` — 라우트별 페이지 (로그인/회원가입, 관리자 화면, 공개 랭킹보드/TV 모드)
- `src/data/api/` — Supabase 데이터 접근 레이어 (체육관/종목/수련생/기록)
- `src/hooks/useGymData.ts` — React Query 훅
- `supabase/migrations/` — 스키마, RLS 정책, plan(무료/유료) 제한 트리거
- `supabase/functions/ai-coach/` — AI 코칭 리포트 생성 Edge Function

## 배포

`npm run build`로 프론트엔드(`dist/`)와 Express 정적 서버(`dist/server.cjs`)를 빌드합니다. `npm start`로 실행.
