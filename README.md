# HoxyWeb

React + TypeScript + Vite로 구성된 웹 애플리케이션 프로젝트입니다.

## 기술 스택

- **React 18.3** - UI 라이브러리
- **TypeScript** - 타입 안정성을 위한 정적 타입 언어
- **Vite** - 빠른 개발 환경을 제공하는 빌드 툴
- **ESLint** - 코드 품질 관리

## 시작하기

### 개발 서버 실행

```bash
npm run dev
```

개발 서버가 실행되면 브라우저에서 `http://localhost:5173`로 접속할 수 있습니다.

### 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 디렉토리에 생성됩니다.

### 프리뷰

```bash
npm run preview
```

프로덕션 빌드를 로컬에서 미리 확인할 수 있습니다.

### 린트 검사

```bash
npm run lint
```

## 프로젝트 구조

```
HoxyWeb/
├── src/
│   ├── App.tsx          # 메인 App 컴포넌트
│   ├── App.css          # App 스타일
│   ├── main.tsx         # 애플리케이션 진입점
│   ├── index.css        # 전역 스타일
│   └── vite-env.d.ts    # Vite 타입 정의
├── index.html           # HTML 진입점
├── vite.config.ts       # Vite 설정
├── tsconfig.json        # TypeScript 설정
└── package.json         # 프로젝트 의존성
```

## 개발 가이드

- Hot Module Replacement (HMR)가 활성화되어 있어 코드 수정 시 자동으로 브라우저가 업데이트됩니다.
- TypeScript의 strict 모드가 활성화되어 있습니다.
- ESLint를 통해 React Hooks 규칙과 코드 품질을 자동으로 검사합니다.
