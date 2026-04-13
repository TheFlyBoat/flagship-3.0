# FlagShip 3.0: The Ultimate Career Toolkit 🚀

Welcome to **FlagShip 3.0**, the most advanced, unified, AI-powered career assistant designed to help candidates prepare, apply, and confidently pivot in their professional journeys.

Building upon the robust foundation of FlagShip 2.0, this major iteration completely transforms the experience into a deeply integrated, modular ecosystem with unparalleled multimodal AI capabilities.

## ✨ What's New in FlagShip 3.0

### 1. 🎨 Global UI/UX Modernization & Harmonization
- **Premium Glassmorphism & Branding**: Standardized across the application using consistent `rounded-2xl` structural designs, subtle floating shadows on interaction, and unified layout symmetry.
- **Flawless Pixel Alignment**: Symmetrical interface controls mapping perfectly to the `FlagShip Orange` theme across both Dark and Light modes.
- **Enhanced Accessibility**: Improved text contrast mapping and placeholder opacity management dynamically adjusted via CSS variables.

### 2. 🤖 Deeply Integrated Multimodal Scraping Engine
- **Image OCR JD Extraction**: Say goodbye to copying and pasting. FlagShip 3.0 introduces a brand new **Image OCR Engine**. Users can snap a picture or screenshot a job posting on their mobile phone, upload the image, and the native Gemini-2.5-Pro integration perfectly extracts and formats the text on the fly.
- **CORS-Bypass URL Fetching**: An all-new URL extraction utility built dynamically with a robust proxy cascade (`codetabs` -> `allorigins`) allowing users to scrape Job Descriptions from standard job boards directly via a link.

### 3. 🔍 Role Discovery: Career Explorer
- **AI-Powered Pivoting**: A completely new feature built to suggest career paths based on parsing the applicant's existing CV or explicitly outlined skills.
- **Cross-App Integration**: Embedded promotion for deep-dives using the companion app exactly when users need deeper visual pathing (*FlagShip Chart*).
- **"Teleportation" Action Flow**: Directly bridges Discovery to Practice. Users can click *Practice this Role* from an AI career suggestion and magically get teleported directly into an active Mock AI Interview pre-configured for that exact role.

### 4. 🧠 Adaptive Chat-Based Interview Coach
- **True Scenario Roleplay**: The AI Interviewer dynamically issues "Probing Follow-Ups" natively derived from the candidate's previous response, creating a highly authentic, stress-testing conversational flow.

### 5. 🛠 Advanced Engineering Restructure
- **Clean `/src` Architecture**: Refactored the core application into a standard `src/` hierarchy aligning with enterprise Vite/React scalable structures.
- **Modular Firebase Backend Mapping**: Smashed the massive monolithic Google Cloud Function. Routes are mathematically divided into modular `handlers.ts`, schemas centralized in `schemas.ts`, and core LLM proxy mapping decoupled elegantly via `geminiClient.ts`.
- **Kanban Local IO**: The Application Tracker now natively supports importing and exporting pure `.csv` states, enabling users to seamlessly manipulate their job tracking via Excel/Sheets and securely re-inject the state into the local dashboard avoiding data duplication.

## 🚀 Getting Started

1. Clone this repository.
2. Ensure you have Node `18+` installed.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
5. *(Optional for Dev)* Ensure your `.env.local` is mapping your `GEMINI_API_KEY` for browser direct-fallbacks during local iteration testing.

---
*Built with React, Vite, Tailwind CSS, FireBase, and the Gemini 2.5 SDK.*
