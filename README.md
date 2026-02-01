# ![Rectify Novel v3](https://img.shields.io/badge/Rectify-Novel%20v3-1D4ED8?style=for-the-badge&logo=notion&logoColor=white)

Rectify-branded rebuild of Novel v3: a Notion-style, TipTap v3 editor with AI-assisted writing, SSR-safe rendering,
and reference apps for Next.js App Router and React Router v7 SSR.

<div align="left">
  <table>
    <tr>
      <td><strong>Lifecycle</strong></td>
      <td>
        <a href="https://github.com/andrewmaspero/novel-v3/actions?query=workflow%3ACI">
          <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-1F4B99?style=flat&logo=githubactions&logoColor=white" alt="CI/CD" />
        </a>
        <a href="https://github.com/andrewmaspero/novel-v3/releases">
          <img src="https://img.shields.io/badge/Release-Tags-0F766E?style=flat&logo=git&logoColor=white" alt="Release tags" />
        </a>
        <a href="https://github.com/andrewmaspero/novel-v3/tree/main/apps/web/tests">
          <img src="https://img.shields.io/badge/E2E-Playwright-7C3AED?style=flat&logo=testinglibrary&logoColor=white" alt="E2E tests" />
        </a>
      </td>
    </tr>
    <tr>
      <td><strong>Core Stack</strong></td>
      <td>
        <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
        <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black" alt="React" />
        <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js" />
        <img src="https://img.shields.io/badge/React%20Router-7-CA4245?style=flat&logo=reactrouter&logoColor=white" alt="React Router" />
        <img src="https://img.shields.io/badge/Editor-TipTap%20v3-111827?style=flat&logo=markdown&logoColor=white" alt="TipTap v3" />
        <img src="https://img.shields.io/badge/Turbo-2.x-000000?style=flat&logo=turborepo&logoColor=white" alt="Turbo" />
        <img src="https://img.shields.io/badge/pnpm-9-4A4A4A?style=flat&logo=pnpm&logoColor=white" alt="pnpm" />
        <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind" />
      </td>
    </tr>
    <tr>
      <td><strong>Navigation</strong></td>
      <td>
        <a href="#install"><img src="https://img.shields.io/badge/Install-npm-0EA5E9?style=flat&logo=npm&logoColor=white" alt="Install" /></a>
        <a href="#quick-start"><img src="https://img.shields.io/badge/Local%20Setup-Quick%20Start-059669?style=flat&logo=serverless&logoColor=white" alt="Quick start" /></a>
        <a href="#nextjs"><img src="https://img.shields.io/badge/Example-Next.js-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js example" /></a>
        <a href="#react-router-ssr"><img src="https://img.shields.io/badge/Example-React%20Router-CA4245?style=flat&logo=reactrouter&logoColor=white" alt="React Router example" /></a>
        <a href="#features"><img src="https://img.shields.io/badge/Overview-Features-7C3AED?style=flat&logo=simpleicons&logoColor=white" alt="Features" /></a>
        <a href="#configuration"><img src="https://img.shields.io/badge/Config-Env-0EA5E9?style=flat&logo=zod&logoColor=white" alt="Configuration" /></a>
        <a href="#ci-cd"><img src="https://img.shields.io/badge/Deploy-CI%2FCD-1F4B99?style=flat&logo=githubactions&logoColor=white" alt="CI/CD" /></a>
        <a href="#architecture"><img src="https://img.shields.io/badge/Design-Architecture-1F2937?style=flat&logo=planetscale&logoColor=white" alt="Architecture" /></a>
        <a href="#credits"><img src="https://img.shields.io/badge/Credits-Attribution-0F172A?style=flat&logo=github&logoColor=white" alt="Credits" /></a>
      </td>
    </tr>
  </table>
</div>

<a id="quick-start"></a>
## ![Quick Start](https://img.shields.io/badge/Quick%20Start-5%20steps-059669?style=for-the-badge&logo=serverless&logoColor=white)

1. Install dependencies: `pnpm install`
2. Configure env for the Next.js app: copy `apps/web/.env.example` to `apps/web/.env` and fill values.
3. Start all apps in dev mode: `pnpm dev`
4. Or run a single app:
   - Next.js: `pnpm --filter novel-next-app dev`
   - React Router SSR: `pnpm --filter novel-rr7-ssr dev`
5. Optional: install Playwright browsers for E2E tests: `pnpm --filter novel-next-app test:e2e:install`

<a id="install"></a>
## ![Install](https://img.shields.io/badge/Install-npm%20package-0EA5E9?style=for-the-badge&logo=npm&logoColor=white)

Published package name: `@vectorfyco/novel-v3`

```bash
pnpm add @vectorfyco/novel-v3
# or
npm install @vectorfyco/novel-v3
# or
yarn add @vectorfyco/novel-v3
# or
bun add @vectorfyco/novel-v3
```

<a id="nextjs"></a>
## ![Next.js](https://img.shields.io/badge/Next.js-Getting%20Started-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)

Minimal client editor (App Router):

```tsx
"use client";

import { EditorRoot, EditorContent, StarterKit, type JSONContent } from "@vectorfyco/novel-v3/client";

const content: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Hello from Next.js" }] }],
};

export function Editor() {
  return (
    <EditorRoot>
      <EditorContent extensions={[StarterKit]} content={content} />
    </EditorRoot>
  );
}
```

Client-only editor in a server component:

```tsx
import dynamic from "next/dynamic";

const ClientEditor = dynamic(() => import("./editor"), { ssr: false });

export default function Page() {
  return <ClientEditor />;
}
```

<a id="react-router-ssr"></a>
## ![React Router](https://img.shields.io/badge/React%20Router-Getting%20Started-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)

React Router v7 SSR route with a client-only editor:

```tsx
import { Suspense, lazy, useEffect, useState } from "react";

const ClientEditor = lazy(() => import("../components/editor"));

export default function IndexRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      {mounted ? <ClientEditor /> : null}
    </Suspense>
  );
}
```

SSR rendering on the server:

```ts
import { renderToHTMLString, renderToMarkdown, serverExtensions, type JSONContent } from "@vectorfyco/novel-v3/server";

const content: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "SSR-safe" }] }],
};

const html = renderToHTMLString({ content, extensions: serverExtensions });
const markdown = renderToMarkdown({ content, extensions: serverExtensions });
```

<a id="features"></a>
## ![Features](https://img.shields.io/badge/Features-Highlights-7C3AED?style=for-the-badge&logo=simpleicons&logoColor=white)

| Feature Badge | Details |
| --- | --- |
| ![Editor](https://img.shields.io/badge/Editor-TipTap%20v3-111827?style=flat&logo=markdown&logoColor=white) | Rich-text editor with custom extensions, slash command UI, bubble menus, and drag handles. |
| ![AI](https://img.shields.io/badge/AI-Assist-2563EB?style=flat&logo=vercel&logoColor=white) | Streaming AI rewrite/continue/shorten/lengthen/fix/zap flows backed by Vercel AI SDK. |
| ![SSR](https://img.shields.io/badge/SSR-Static%20Render-0F766E?style=flat&logo=nextdotjs&logoColor=white) | Server-safe HTML and Markdown rendering via `@tiptap/static-renderer`. |
| ![Uploads](https://img.shields.io/badge/Uploads-Image%20Paste-22C55E?style=flat&logo=cloudflare&logoColor=white) | Drag/drop and clipboard image uploads with placeholders and local fallback. |
| ![Apps](https://img.shields.io/badge/Apps-Next%20%2B%20RR7-CA4245?style=flat&logo=reactrouter&logoColor=white) | Reference apps for Next.js App Router and React Router v7 SSR. |
| ![Testing](https://img.shields.io/badge/Testing-Playwright-7C3AED?style=flat&logo=testinglibrary&logoColor=white) | E2E coverage for editor flows, slash commands, uploads, and theme switching. |

## ![Repository Layout](https://img.shields.io/badge/Repository-Layout-6366F1?style=for-the-badge&logo=git&logoColor=white)

```
apps/
  web/        Next.js App Router demo
  rr7-ssr/    React Router v7 SSR demo (Express adapter)
packages/
  headless/   @vectorfyco/novel-v3 library (client + server entry points)
  tsconfig/   Shared TypeScript config
```

## ![Packages](https://img.shields.io/badge/Packages-Entry%20Points-0EA5E9?style=for-the-badge&logo=npm&logoColor=white)

| Entry Point | Purpose |
| --- | --- |
| `@vectorfyco/novel-v3` | Client bundle (re-exports the client API). |
| `@vectorfyco/novel-v3/client` | Full client API: components, extensions, plugins, utils. |
| `@vectorfyco/novel-v3/client/core` | UI components only (smaller client bundle). |
| `@vectorfyco/novel-v3/server` | Static rendering and SSR-safe editor creation. |

<a id="configuration"></a>
## ![Configuration](https://img.shields.io/badge/Configuration-Env%20Vars-0EA5E9?style=for-the-badge&logo=zod&logoColor=white)

### ![Next.js Env](https://img.shields.io/badge/Next.js-env%20vars-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)

| Name | Required | Default | Format | Description |
| --- | --- | --- | --- | --- |
| OPENAI_API_KEY | yes | - | string | OpenAI API key for `/api/generate` streaming responses. |
| OPENAI_BASE_URL | no | https://api.openai.com/v1 | URL | Optional OpenAI-compatible base URL override. |
| BLOB_READ_WRITE_TOKEN | no | - | string | Vercel Blob token for `/api/upload` image storage. |
| KV_REST_API_URL | no | - | URL | Upstash KV URL enabling per-IP rate limiting. |
| KV_REST_API_TOKEN | no | - | string | Upstash KV token enabling per-IP rate limiting. |

### ![RR7 Env](https://img.shields.io/badge/RR7%20SSR-env%20vars-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)

| Name | Required | Default | Format | Description |
| --- | --- | --- | --- | --- |
| OPENAI_API_KEY | yes | - | string | OpenAI API key for `/api/generate` in the RR7 app. |
| PORT | no | 3000 | number | Express server port for the SSR build. |

### ![Playwright Env](https://img.shields.io/badge/Playwright-env%20vars-7C3AED?style=for-the-badge&logo=testinglibrary&logoColor=white)

| Name | Required | Default | Format | Description |
| --- | --- | --- | --- | --- |
| PLAYWRIGHT_PORT | no | 3000 | number | Port for the Next.js dev server used in E2E tests. |
| CI | no | - | string | When set, Playwright runs with a single worker. |

<a id="ci-cd"></a>
## ![CI/CD](https://img.shields.io/badge/CI%2FCD-Overview-1F4B99?style=for-the-badge&logo=githubactions&logoColor=white)

- CI workflow runs on PRs and main pushes: install, lint, typecheck, format, build, Playwright install, then unit + E2E tests.
- Release bump workflow runs after a successful main CI run and uses `scripts/release_novel.py` to bump, tag, and push when relevant changes exist.
- Publish workflow triggers on `v*` tags and publishes `@vectorfyco/novel-v3` to npm with provenance.
- The release path filter is scoped to `packages/headless` sources and build configs.

## ![Auth](https://img.shields.io/badge/Auth%20%26%20Routes-None-2563EB?style=for-the-badge&logo=auth0&logoColor=white)

- No built-in authentication or authorization.
- Next.js routes:
  - `POST /api/generate` streams AI text using OpenAI.
  - `POST /api/upload` stores images in Vercel Blob (401 if token is missing).
- RR7 routes:
  - `POST /api/generate` streams AI text.
  - Image uploads expect a `/api/upload` endpoint; add one or proxy to the Next.js implementation.

## ![Telemetry](https://img.shields.io/badge/Telemetry-Vercel%20Analytics-f97316?style=for-the-badge&logo=vercel&logoColor=white)

- `apps/web` includes `@vercel/analytics` in `app/providers.tsx`.
- No repository-managed env vars are required for local dev; configure in your Vercel project if deploying.

## ![Database](https://img.shields.io/badge/Database-None-0F172A?style=for-the-badge&logo=sqlite&logoColor=white)

- No database or migrations in this repo. Persist editor output in your own service if needed.

## ![Operations](https://img.shields.io/badge/Operations-Health%20%26%20Admin-10B981?style=for-the-badge&logo=serverless&logoColor=white)

- No dedicated health endpoint is shipped. Add a route if your deployment requires health checks.
- The React Router SSR app runs on Express; the Next.js app uses its built-in server.

## ![Developer Workflow](https://img.shields.io/badge/Developer-Workflow-6366F1?style=for-the-badge&logo=git&logoColor=white)

Common workspace commands:

```bash
pnpm dev
pnpm -w lint
pnpm -w format
pnpm -w typecheck
pnpm -w build
pnpm -w test
```

Package and app-specific commands:

```bash
pnpm --filter @vectorfyco/novel-v3 test
pnpm --filter @vectorfyco/novel-v3 build
pnpm --filter novel-next-app test:e2e
pnpm --filter novel-next-app test:e2e:install
```

<a id="production"></a>
## ![Production](https://img.shields.io/badge/Production-Readiness-0F766E?style=for-the-badge&logo=serverless&logoColor=white)

- Set `OPENAI_API_KEY` for any AI-assisted functionality.
- Provide `BLOB_READ_WRITE_TOKEN` to persist image uploads (otherwise they stay local in memory).
- Add Upstash KV keys to enable rate limiting in `apps/web`.
- Confirm CI passes on main and tags are pushed before publish.

<a id="architecture"></a>
## ![Architecture](https://img.shields.io/badge/Architecture-Stack%20map-1F2937?style=for-the-badge&logo=planetscale&logoColor=white)

- `packages/headless` bundles the editor UI and extensions for the client and exports SSR-safe rendering helpers.
- `apps/web` is the Next.js App Router demo with AI + upload routes and Playwright coverage.
- `apps/rr7-ssr` is a React Router v7 SSR demo running on Express.
- Uploads use a placeholder plugin with drag/drop/paste hooks; Vercel Blob is optional.

## ![Troubleshooting](https://img.shields.io/badge/Troubleshooting-Playbook-DC2626?style=for-the-badge&logo=redhat&logoColor=white)

- `Missing OPENAI_API_KEY` response: set `OPENAI_API_KEY` in the app environment.
- Upload errors in the editor: set `BLOB_READ_WRITE_TOKEN` or supply your own `/api/upload` endpoint.
- Rate limit 429s from `/api/generate`: configure KV credentials or adjust the limiter.
- Playwright failures: run `pnpm --filter novel-next-app test:e2e:install` and set `PLAYWRIGHT_PORT` if 3000 is busy.

<a id="credits"></a>
## ![Credits](https://img.shields.io/badge/Credits-Attribution-0F172A?style=for-the-badge&logo=github&logoColor=white)

Rectify walked off the original Novel foundation and rebuilt the project with a new monorepo layout,
SSR reference apps, and Playwright coverage. Original project by Steven Tey:
https://github.com/steven-tey/novel

## ![Security](https://img.shields.io/badge/Security-Policy-0B7285?style=for-the-badge&logo=shieldsdotio&logoColor=white)

See `SECURITY.md` for supported versions and vulnerability reporting.

## ![License](https://img.shields.io/badge/License-Apache%202.0-64748B?style=for-the-badge&logo=apache&logoColor=white)

Apache-2.0. See `LICENSE`.
