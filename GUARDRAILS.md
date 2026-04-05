# GUARDRAILS — Regression Protection

All existing, working features are protected. No new development, refactor, or bugfix
may modify, remove, or break any existing functionality.

If a PR breaks any existing feature → it MUST be rejected.

---

## Rule

**You may only modify what is necessary to complete your task.**
If it works, don't touch it. It doesn't matter if it "would be cleaner",
"would be better", or "should be refactored" — if it works, it stays.

This applies to:
- Developers
- AI agents (PR review agent, Antigravity, Claude, etc.)
- Any automated tool that modifies code

---

## Protected Features

The following features are part of the system. Backward-incompatible changes are forbidden.

### Full OfferFlow System (tenant side)
- Dashboard, Offers, Works, Diary, Supply, Tasks, Billing, Statistics
- Tenant/Worker/Client roles and permissions
- Clerk authentication and session management
- Prisma models and relations — existing fields MUST NOT be removed, only extended (with defaults)
- Zustand stores — existing state and actions
- Inngest workflows and async jobs
- Gmail OAuth integration
- Stripe subscription and webhooks
- Szamlazz.hu integration
- PriceList and TenantPriceList pricing
- RAG knowledge base
- All existing API routes and server actions

### Client Quote Flow
- Entry page: file upload (drag&drop + button), textarea, GDPR checkbox, Turnstile CAPTCHA
- File type whitelist (PDF, DOCX, XLSX, XLS, JPG, PNG, DWG), 10MB limit
- AI chat: Hungarian responses, work type recognition, progress tracking, contact collection
- EstimateCard: email sending, refinement, decline, export
- Export: PDF/Excel with prices and without prices
- Bell icon and notification system
- History session lifecycle (draft → active → completed → declined)
- QuoteAuditLog logging
- GDPR data deletion and data export

### Infrastructure
- PR review agent: suggestions only, no auto-fix
- PR review agent: protected files cannot be modified
- CI/CD pipeline (GitHub Actions → AWS deploy)
- Vercel deployment (off/moff)

---

## How to Apply

1. **Before development**: review which files you will modify
2. **If a file contains existing logic**: only modify the necessary part, leave the rest untouched
3. **If you need to delete something**: ask first whether it is truly necessary
4. **During PR review**: verify the diff does not remove or modify existing features
5. **If in doubt**: don't merge, ask

---

## Testing Protocol

After every feature completion, run ALL THREE levels of testing before merging.

### Level 1: Unit / Integration Tests (Vitest)

Run the Nullable tests — zero network calls, zero DB, instant feedback:

```bash
cd tests && npx vitest run --config vitest.nullables.config.ts
```

All 19 tests must pass. If any fail, the new code broke an infrastructure wrapper.

### Level 2: Feature Verification (Antigravity Agent)

After completing a new feature, send this to the Antigravity agent to verify it works.
Replace [FEATURE DESCRIPTION] with what you built:

```
The dev server is running at localhost:3000. Authentication is handled — go directly to the relevant page.

Verify the following new feature: [FEATURE DESCRIPTION]

Test each acceptance criteria individually. Take a screenshot at each step.
Save screenshots to test-results/ folder.
Create test-results/REPORT.md with PASS/FAIL for each criterion.
```

### Level 3: Regression Smoke Test (Antigravity Agent)

Run this AFTER every feature to verify nothing broke. This is the full regression suite.
Copy and paste the entire block below into the Antigravity agent:

```
The dev server is running at localhost:3000. Run a full regression smoke test on the client quote flow.

ENTRY PAGE (http://localhost:3000/quote-request):
1. Page loads with "Új ajánlatkérés" heading
2. File upload area visible with drag&drop zone
3. Textarea with placeholder visible
4. GDPR checkbox with "adatkezelési tájékoztatót" link visible
5. Turnstile widget visible
6. "Elemzés indítása" button is disabled
7. Type "teszt" (less than 10 chars) — button stays disabled
8. Type "65 m²-es lakás felújítás Budapesten festés és burkolás" — button still disabled (no GDPR)
9. Check GDPR checkbox — button still disabled (no Turnstile on prod, auto-pass on test)
10. After Turnstile passes — button becomes enabled
Take screenshot.

FILE UPLOAD:
11. Click the upload button — file dialog opens
12. Upload a PDF file — spinner appears, text extracted into textarea
13. File badge appears with filename and X button
14. Click X — file badge disappears, textarea clears
Take screenshot.

CHAT FLOW:
15. Fill in valid text, check GDPR, wait for Turnstile, click "Elemzés indítása"
16. Redirects to /quote-request/[sessionId]
17. AI responds in Hungarian
18. AI shows "Ajánlat készültség: X/4" progress
19. Answer AI questions with: "Budapest XIII. kerület, 65 m² panellakás, jövő hónaptól"
20. AI asks for contact details
21. Provide: "Teszt Elek, +36 30 123 4567, teszt@teszt.hu"
22. AI generates quote with ---AJÁNLAT_KEZDET--- markers
Take screenshot.

ESTIMATE CARD:
23. EstimateCard appears with orange header "Becsült ajánlat"
24. "Küldés emailben kivitelezőnek" button visible
25. Click it — email input field appears with X close button
26. Type an email — "Tételek + árak" and "Csak tételek" buttons appear
27. Optional message textarea visible
28. Close with X — email input disappears
29. "Ajánlat pontosítása a chatben" button visible
30. "Nem kérem, köszönöm" button visible
31. "Exportálás" dropdown visible
Take screenshot.

EXPORT:
32. Click "Exportálás" — dropdown opens
33. Dropdown shows 4 options: PDF with prices, Excel with prices, PDF items-only, Excel items-only
34. Click "PDF letöltés" (with prices) — print dialog opens with formatted PDF
35. Verify PDF has: Offerflow header, date, project summary, item table, totals, disclaimer
Take screenshot.

DECLINE:
36. Click "Nem kérem, köszönöm" — message sent to AI
37. AI acknowledges decline
Take screenshot.

Save all screenshots to test-results/regression/ folder.
Create test-results/regression/REPORT.md with PASS/FAIL for each numbered item (1-37).
Report total: X/37 passed.
```

### Passing Criteria

- **Level 1**: 19/19 Vitest tests pass
- **Level 2**: All acceptance criteria of the new feature pass
- **Level 3**: 37/37 regression smoke test items pass

All three levels must pass before merging to main.
