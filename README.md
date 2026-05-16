# FlagShip 3.0

**🔗 Live app: [flagship-v3.web.app](https://flagship-v3.web.app/)**

The complete AI career toolkit — analyse your CV, discover new roles, prep for interviews, review your portfolio, and track every application, all in one place.

FlagShip 3.0 is a full rebuild on top of v2.0, adding a new Career Explorer tool, multimodal job description input (image OCR, URL scraping), a chat-based adaptive interview coach, and a modular Firebase backend. The UI is unified around a glassmorphism design with a FlagShip Orange accent across both light and dark modes.

---

## Features

### ATS Optimiser
Analyse your CV against a job description and get a detailed fit report:
- **Fit score** (0–100) with keyword matching and gap analysis
- **Missing and matching keywords** highlighted side by side
- **Skill gap breakdown** — per-skill view of what's in your CV vs. what the role requires
- **Tone analysis** with targeted suggestions
- **Radar chart** showing match quality across multiple dimensions
- **One-click** save to the Application Tracker

**Job description input options (new in 3.0):**
- Paste text directly
- Upload an image or mobile screenshot — Gemini 2.5 Pro extracts the text via OCR
- Paste a URL — a proxy cascade fetches and parses the job posting automatically

### Career Explorer (new in 3.0)
AI-powered role discovery based on your CV or a skills summary:
- Suggests career paths aligned to your existing experience
- Each suggestion links to **Flagship Chart** for deeper visual career mapping
- **"Practice this Role"** button launches the Interview Coach pre-configured for that exact role — no manual setup required

### AI Interview Coach
Conversational mock interview with adaptive follow-up questions:
- Chat-based format that feels like a real interview, not a quiz
- The AI issues **probing follow-ups** derived from your previous answers, not a fixed question list
- Feedback covers STAR method compliance, conceptual clarity, strategic thinking, and ethical awareness for AI/tech roles
- Per-answer scores with positives and areas for improvement
- Launch directly from a tracked application or a Career Explorer suggestion

### Application Tracker
Kanban board for managing your job search pipeline:
- Statuses: **Applied → Interview → Offer → Rejected**
- **CSV import and export** — edit your pipeline in Excel or Sheets, then re-import (new in 3.0)
- Applications persisted to `localStorage` across sessions
- Launch Interview Coach for any tracked role in one click

### Portfolio Reviewer
Submit your portfolio alongside a target role and receive:
- Overall score with first impression summary
- Strengths and improvement areas
- Alignment score against the specific role
- Presentation clarity and impact/results sub-scores
- Suggested project ideas to close skill gaps

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| AI / LLM | Google Gemini 2.5 Pro (`@google/genai`) |
| Charts | Recharts (ATS radar chart) |
| PDF Support | jsPDF (export), pdfjs-dist (read PDF CVs) |
| Word Doc Support | Mammoth (read .docx CVs) |
| Diffing | diff (CV change tracking) |
| Backend | Firebase Cloud Functions |
| Hosting | Firebase Hosting |
| Styling | Tailwind CSS, glassmorphism, light/dark theme |
| Storage | localStorage (applications, theme), sessionStorage (CV) |

---

## Project Structure

```
flagship-3.0/
├── src/                        # Frontend application
│   ├── components/
│   │   ├── ats/                # ATS Optimiser
│   │   ├── explorer/           # Career Explorer (new in 3.0)
│   │   ├── interview/          # Adaptive Interview Coach
│   │   ├── tracker/            # Application Tracker (with CSV I/O)
│   │   ├── portfolio/          # Portfolio Reviewer
│   │   └── common/             # Shared: Logo, ThemeToggle, SplashScreen, Onboarding
│   ├── services/               # Client-side API service layer
│   ├── App.tsx                 # Root component — view routing, global state, persistence
│   └── types.ts                # Shared TypeScript interfaces and enums
├── functions/
│   └── src/
│       ├── handlers.ts         # Modular route handlers (one per feature)
│       ├── schemas.ts          # Centralised Gemini response schemas
│       └── geminiClient.ts     # LLM proxy — decoupled from business logic
├── .agents/
│   └── skills/                 # Agent skill definitions
├── index.html
├── vite.config.ts
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- [Firebase CLI](https://firebase.google.com/docs/cli) (for deployment only)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/TheFlyBoat/flagship-3.0.git
cd flagship-3.0
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install Cloud Functions dependencies:

```bash
cd functions && npm install && cd ..
```

4. Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

5. Start the development server:

```bash
npm run dev
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Compile the app for production into `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Backend Architecture

The Firebase Cloud Functions backend was fully refactored in 3.0 — the monolithic function from v2 is replaced by a modular structure:

- **`handlers.ts`** — one handler per feature (ATS, interview, explorer, portfolio). Each is independently testable and deployable.
- **`schemas.ts`** — all Gemini response schemas in one place, keeping handlers clean and making schema changes easy to track.
- **`geminiClient.ts`** — the LLM proxy layer, decoupled from any feature-specific logic. Swap models or providers here without touching handlers.

This structure also makes it straightforward to add rate limiting, authentication, or logging at the handler level without impacting others.

---

## Job Description Input Methods

One of the bigger UX improvements in 3.0 is how job descriptions get into the app. Three methods are supported:

**Text paste** — the original method, always available.

**Image OCR** — the user uploads a screenshot or photo of a job posting (e.g. from a mobile). Gemini 2.5 Pro extracts and formats the text. Useful when a posting is only accessible via an app or behind a login.

**URL fetch** — the user pastes a job board link. A proxy cascade (`codetabs` → `allorigins`) fetches the page content and extracts the job description, bypassing CORS restrictions that would block a direct browser fetch.

---

## Deployment

The app deploys to Firebase Hosting with Firebase Cloud Functions for the backend.

1. Build the frontend:

```bash
npm run build
```

2. Set your Gemini API key as a Firebase secret:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

3. Deploy:

```bash
firebase deploy
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key from [AI Studio](https://aistudio.google.com/app/apikey) |

---

## The FlagShip Suite

FlagShip 3.0 is part of a broader set of tools built for job seekers at different stages:

| App | Purpose | Link |
|---|---|---|
| **Flagship Chart** | Discover where you could go — interactive AI career path visualisation | [flagshipchart.web.app](https://flagshipchart.web.app/) |
| **FlagShip 2.0** | First version of the job application toolkit | [flagship-2-0...run.app](https://flagship-2-0-886464197309.us-west1.run.app/) |
| **FlagShip 3.0** | Full-featured toolkit with Career Explorer, image OCR, and adaptive interviews | [flagship-v3.web.app](https://flagship-v3.web.app/) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push and open a pull request

---

## License

This project is private and not currently licensed for public distribution. Contact the repository owner for usage inquiries.
