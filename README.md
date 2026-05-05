# simsasukgo-frontend

심사숙고 (Sim-Sasukgo) 여신심사 보고서 서비스 — Next.js + Vercel 프론트엔드.

claude.ai 아티팩트 PoC를 본 서비스로 옮긴 버전입니다. 아티팩트 환경의 CSP 제약 (외부 도메인 fetch 차단) 때문에 PR #36의 직접 PUT 흐름이 동작하지 않던 문제를, **Next.js + Vercel API Routes**로 풀어냅니다.

## 구조

```
[브라우저] ──→ [Next.js App on Vercel]
              ├─ 정적 페이지 / 클라이언트 컴포넌트 (UI)
              └─ /api/mcp/*  (서버 컴포넌트, ANTHROPIC_API_KEY 사용)
                    │
                    └─→ api.anthropic.com (mcp_servers=[심사숙고])
                              │
                              └─→ 심사숙고 MCP 서버 (Azure Container App)
                                       │
                                       └─→ Azure Blob Storage / Table Storage

[브라우저] ──직접 PUT──→ Azure Blob (SAS URL)   ← Step 3에서 활성화
                                  ↑
                       Storage CORS에 Vercel 도메인 추가 필요
```

핵심 결정:

- **Anthropic API 키는 백엔드(API Route)에만**. 클라이언트 번들에는 절대 포함되지 않음.
- **MCP 호출은 모두 `/api/mcp/*`를 거쳐서** Anthropic API로 위임. 우리가 MCP 클라이언트를 직접 구현하지 않고 `mcp_servers` 인자를 그대로 사용.
- **파일 업로드(Step 3)** 는 PR #36 의도대로 **브라우저가 Azure Blob에 직접 PUT**. CSP 제약이 없는 환경이므로 가능.

## 로컬 실행

```bash
git clone https://github.com/mijiai/simsasukgo-frontend.git
cd simsasukgo-frontend

# 1. 의존성
npm install   # 또는 pnpm install / yarn

# 2. 환경 변수
cp .env.example .env.local
# .env.local 을 열고 ANTHROPIC_API_KEY 채워넣기
# (그 외 변수는 기본값 그대로 두면 됨)

# 3. 개발 서버
npm run dev
# → http://localhost:3000
```

## 환경 변수

| 키 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API 키 (`/api/mcp/*` 라우트에서만 사용, 클라이언트 노출 금지) |
| `ANTHROPIC_MODEL` | ❌ | 기본 `claude-sonnet-4-20250514` |
| `SIMSASUKGO_MCP_URL` | ❌ | 심사숙고 MCP 서버 SSE 엔드포인트 |
| `SIMSASUKGO_MCP_NAME` | ❌ | MCP 서버 식별자 (기본 `심사숙고`) |

## Vercel 배포

1. GitHub repo를 Vercel에 연결 (자동 빌드)
2. Vercel 프로젝트 → **Settings → Environment Variables** 에 `ANTHROPIC_API_KEY` 추가 (Production / Preview / Development 모두)
3. 첫 배포 후 발급된 도메인(예: `https://simsasukgo-frontend.vercel.app`)을 **Azure Storage CORS 허용 origin에 추가**:
   ```bash
   # 심사숙고 backend repo (mijiai/simsa-sukgo-agents) 에서:
   CORS_ORIGINS="https://simsasukgo-frontend.vercel.app,https://*.vercel.app" \
     bash scripts/setup_storage_cors.sh
   ```
   (아티팩트 환경의 CSP 차단으로 못 쓰던 PR #36의 직접 PUT 흐름이 이 환경에선 정상 동작합니다.)

## 진행 상황 — Step별 로드맵

- **Step 1 (현재)** — Next.js App Router 스캐폴드 + Sidebar + Home 화면 + 환경 설정 ✅
- Step 2 — `/api/mcp/{create-job,collect,analyze,report}` 4개 라우트 + 분석 파이프라인 wiring
- Step 3 — `/api/mcp/create-upload-url` + 브라우저 직접 PUT (PR #36의 원래 흐름 활성화)
- Step 4 — 결과 화면 / 보관함 / 보관함 상세
- Step 5 — 사후관리 (`monitor_list/register/run_now/deregister`)

## 폴더 구조

```
app/
  layout.tsx                  # 루트 레이아웃 + 폰트 + AppProvider
  page.tsx                    # / (홈)
  globals.css                 # 디자인 토큰 + 공통 스타일
  components/
    AppShell.tsx              # Sidebar + main 래퍼
    Sidebar.tsx               # 라우터 기반 nav
    HomeForm.tsx              # 홈 입력 카드 (Step 2에서 제출 wiring)
  lib/
    state.tsx                 # AppContext (analysisRun / savedReports)
    log.ts                    # safe console wrapper
  report/page.tsx             # 자리표시자 (Step 2)
  storage/page.tsx            # 자리표시자 (Step 4)
  management/page.tsx         # 자리표시자 (Step 5)
public/
  dandi.png                   # 마스코트
  building.png                # 사이드바 홈 아이콘
```

## 라이센스

Internal — MIZi AI Lab.
