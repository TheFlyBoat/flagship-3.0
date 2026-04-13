---
name: ui-ux-design-reviewer
description: Evaluates the visual design, layout, brand consistency, and User Experience (UX) of the active application. Use this skill when requested to review an application's design, improve its UI/UX, verify accessibility compliance, or generate styling updates for frontend code and design tokens.
---

### Goal
Execute a comprehensive visual design, layout, brand consistency, and UX audit on the active project. Enforce Web Content Accessibility Guidelines (WCAG) and generate actionable code modifications.

### Step 1: Asset Acquisition and Code Ingestion
You must establish the visual context of the application.
* **Visual Sources:** Scan `/mnt/user-data/uploads/` for user-provided screenshots or screen recordings.
* **Source Files:** Read frontend source files (`*.html`, `*.css`, `*.jsx`, `*.tsx`, `*.vue`) and brand assets/design tokens (`theme.js`, `tokens.css`, `tailwind.config.js`).
* **Fallback:** If visual assets are missing, reconstruct the intended visual design strictly from the source code.

### Step 2: Brand Language Extraction
Extract or infer the application's brand parameters before generating improvements.

| Brand Dimension | Extraction Target |
| :--- | :--- |
| Colour Palette | Primary, secondary, accent, background, and text colours. Check for consistency. |
| Typography | Font families, weight scales, size scales, and line heights. Verify clear hierarchy. |
| Spacing System | Margin and padding consistency. Identify the underlying grid or spacing scale. |
| Tone | Professional, playful, bold, or minimal. |
| Components | Visual consistency of interactive elements (buttons, cards, inputs). |

### Step 3: Design Review State Machine
Evaluate the extracted state and categorise findings as Strong, Needs Work, or Problematic across the following domains:

* **Visual Foundations:** Contrast ratios (must strictly meet WCAG AA $4.5:1$ for text), typography hierarchy, spacing scale adherence.
* **Layout & Composition:** Grid alignment, intentional use of negative space, visual hierarchy, responsive behaviour across viewports.
* **Components & UI Patterns:** Consistent interactive states, standardised border-radii, loading states, and designed empty states.
* **UX Flows & Usability:** Call to Action (CTA) prominence, contextual error messages, navigational clarity, and low cognitive load.
* **AI Interaction Design:** Distinct visual states for AI-generated content, streaming legibility, and readable long-form prose.
* **Accessibility:** Keyboard navigability, `aria-labels` on non-text elements, and visible focus states.

### Step 4: Report Generation
Output the findings using the exact Markdown template below.

## App Design Review Report
**Project:** [Project Name]
**Date:** [YYYY-MM-DD]
**Design Tone Detected:** [Tone]
**Brand Consistency:** [Strong / Inconsistent / Undefined]

### Strengths
* [Name $3$-$5$ specific successful implementations]

### Layout & Visual Improvements
**High Priority**
1.  [Element] - [Defect] -> [Resolution]

**Medium Priority**
1.  [Element] - [Defect] -> [Resolution]

### Brand & Style Recommendations
* **Colour:** [Current] -> [Target HEX/RGB values]
* **Typography:** [Current] -> [Target type scale]
* **Spacing:** [Current] -> [Target spacing approach]

### Accessibility Violations
* [Contrast or keyboard navigation failures]

### Step 5: Implementation Offering
Conclude the report by prompting the user to authorise direct modifications. If the user consents:
* **Styling:** Edit target CSS/config files directly.
* **Components:** Generate redesigned React artifacts or update target framework files.
* **Tokens:** Scaffold `tokens.css` or `theme.js` using the recommended palettes.

### Reviewer Principles
* Show, do not just tell. Provide specific HEX values and exact metrics.
* Root subjective aesthetic recommendations in measurable user impact or accessibility rationales.
* Do not overwrite intentional brand personality; refine its execution.
* Prioritise legibility and clarity above pure aesthetics.