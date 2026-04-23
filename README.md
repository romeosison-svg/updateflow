# Updateflow

Next.js + TypeScript app for turning messy meeting notes or transcripts into project-ready outputs for EMs and PMs.

## Features

- One-page interface
- Large textarea for meeting notes or transcripts
- Helper text for sanitised-only input
- Generates all current MVP outputs in one click:
  - RAID Log
  - Internal Stakeholder Update
  - External Stakeholder Update
  - Short Status Update
  - Action List
- Separate output cards with per-card copy actions
- Server route for generation
- Prompt-driven generation via model call
- Copy-to-clipboard support
- Loading state and basic error handling
- Sample transcript buttons

## Tech stack

- Next.js App Router
- TypeScript
- React

## Local setup

1. Install Node.js 20 or newer.
2. Create a `.env.local` file in the project root:

```bash
OPENAI_API_KEY=your_api_key_here
# Optional
OPENAI_MODEL=gpt-4.1
```

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

You can also copy `.env.example` to `.env.local` and then fill in your real values.

## How it works

- The UI lives in `app/page.tsx`
- The server route lives in `app/api/generate/route.ts`
- Prompt-building logic lives in `lib/prompts.ts`
- Model call logic lives in `lib/generate.ts`
- Global styling lives in `app/globals.css`

## API

`POST /api/generate`

Request body:

```json
{
  "transcript": "raw meeting transcript or notes"
}
```

Notes:

- prompt assembly is defined in `lib/prompts.ts`
- generation happens via a model call in `lib/generate.ts`

## Deployment

This app is ready for standard Next.js deployment on Vercel.

Environment variables required:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1
```

Deployment notes:

- Set the environment variables in the Vercel project dashboard before deploying.
- Access control such as password protection should be configured in Vercel, not in the app.
- The app keeps the landing page at `/` and the product experience at `/app`.

## Project structure

```text
app/
  api/
    generate/
      route.ts
  globals.css
  layout.tsx
  page.tsx
lib/
  generate.ts
  output.ts
  prompts.ts
package.json
README.md
tsconfig.json
```

## Notes

- The app follows a prompt-driven flow: `UI -> API route -> prompt builder -> model call -> output`
- No auth, billing, database, analytics, or integrations are included in this MVP.
