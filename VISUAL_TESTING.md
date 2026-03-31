# Visual E2E Testing — Antigravity Browser Agent

## Prerequisites

- Antigravity IDE open with this project
- Test PDF available: `minta-ajanlatkeres.pdf` (in project root)

---

## Reporting Results

After each test, save the results:

```
Save all screenshots to test-results/ folder with the test number in the filename (e.g. test-01-entry-page.png, test-02-gdpr-blocking.png).
After all tests are done, create test-results/REPORT.md with:
- Date and time of the test run
- PASS/FAIL status for each test
- Screenshots embedded as markdown images
- Any issues or bugs found
```

---

## Test 0: Start Dev Server & Login

Copy this into the Antigravity agent:

```
Run the following in the terminal:
cd "c:/Users/mzolt/Desktop/Mobile/off" && npm run dev

Wait until you see "Ready" or "started server on" in the terminal output before proceeding.
Then open http://localhost:3000 in the browser.
Click "Bejelentkezés ügyfélként" and sign in with Google.
After login, navigate to http://localhost:3000/quote-request and confirm the page loads.
```

---

## Test 1: Quote Request Entry Page

```
Open http://localhost:3000/quote-request in the browser (must be logged in first — see Test 0).

Verify:
1. "Új ajánlatkérés" heading is visible
2. File upload area is visible with text "Dokumentum feltöltése (PDF, DWG, DOCX, JPG, PNG) — vagy húzza ide"
3. Textarea placeholder is visible
4. GDPR checkbox with "adatkezelési tájékoztató" link is visible
5. Cloudflare Turnstile widget is visible
6. "Elemzés indítása" button is disabled (greyed out)
Take a screenshot.
```

---

## Test 2: GDPR + Turnstile Blocking

```
On http://localhost:3000/quote-request:

1. Type "50m² lakás felújítás festéssel és burkolással Budapest" into the textarea
2. Do NOT check the GDPR checkbox
3. Verify "Elemzés indítása" button is still disabled
4. Check the GDPR checkbox
5. Wait for Turnstile to show "Sikeres" (green checkmark)
6. Verify "Elemzés indítása" button is now enabled (orange, clickable)
Take a screenshot.
```

---

## Test 3: File Upload — Drag & Drop

```
On http://localhost:3000/quote-request:

1. Drag the file "minta-ajanlatkeres.pdf" onto the upload area
2. Verify a spinner appears with "Dokumentum feldolgozása..."
3. Wait for parsing to complete
4. Verify the textarea is now filled with extracted text
5. Verify a file badge appears showing "minta-ajanlatkeres.pdf" with an X button
Take a screenshot.
```

---

## Test 4: File Upload — Click Button

```
On http://localhost:3000/quote-request:

1. Click the "Dokumentum feltöltése" button
2. Select "minta-ajanlatkeres.pdf" from the file dialog
3. Wait for parsing to complete
4. Verify the textarea is filled and file badge is visible
Take a screenshot.
```

---

## Test 5: File Upload — Error Handling

```
On http://localhost:3000/quote-request:

1. Try to upload a .exe file or a file larger than 10MB
2. Verify a red error message appears
3. Verify the textarea remains empty
Take a screenshot.
```

---

## Test 6: Full Quote Flow — Text Input

```
On http://localhost:3000/quote-request:

1. Type: "Szeretnék egy 65 m²-es panellakást felújítani Budapesten, a XIII. kerületben. Festés, burkolás és villanyszerelés kellene. A fürdőszoba kb 5 m², a konyha 8 m². Jövő hónaptól kezdenénk."
2. Check GDPR checkbox
3. Wait for Turnstile success
4. Click "Elemzés indítása"
5. Verify redirect to /quote-request/[sessionId]
6. Verify chat UI loads with the user message displayed
7. Wait for AI response (loading spinner → text appears)
8. Verify AI response is in Hungarian and asks relevant follow-up questions
Take a screenshot of the chat with the AI response.
```

---

## Test 7: Full Quote Flow — PDF Upload

```
On http://localhost:3000/quote-request:

1. Upload "minta-ajanlatkeres.pdf" via the upload button
2. Wait for text extraction
3. Check GDPR checkbox
4. Wait for Turnstile success
5. Click "Elemzés indítása"
6. Verify redirect to chat page
7. Wait for AI response
8. Verify AI recognized work types from the PDF (festés, burkolás, villanyszerelés, etc.)
Take a screenshot.
```

---

## Test 8: Chat — File Upload During Conversation

```
On the chat page (after starting a quote):

1. Verify the chat input area has a file attachment button (Paperclip icon)
2. Click the attachment button and upload "minta-ajanlatkeres.pdf"
3. Verify a spinner appears while parsing
4. Verify the extracted text appears as a new message
5. Wait for AI response to the uploaded content
Take a screenshot.
```

---

## Test 9: Chat — AI Quote Generation

```
On the chat page, have a conversation:

1. If AI asks questions, answer them:
   - Location: "Budapest, XIII. kerület"
   - Property: "65 m² panellakás"
   - Work: "festés, burkolás, villanyszerelés"
   - Timeline: "jövő hónap"
2. Wait for AI to generate a quote (look for "---AJÁNLAT_KEZDET---")
3. Verify the quote contains:
   - "Projekt összefoglaló"
   - "Helyszín"
   - "Munkanemek és becsült árak" with line items
   - "Becsült nettó összeg" and "Becsült bruttó összeg"
4. Verify prices are in Ft and seem reasonable
Take a screenshot of the full quote.
```

---

## Test 10: Chat — Export to PDF

```
On the chat page after a quote is generated:

1. Look for an export/download button
2. Click it
3. Verify a PDF is downloaded or generated
4. Verify the PDF contains the quote details
Take a screenshot.
```

---

## Test 11: Mobile Responsiveness

```
Set browser viewport to iPhone 12 Pro (390x844).

1. Open http://localhost:3000/quote-request
2. Verify all elements are visible and properly stacked vertically
3. Verify the upload button, textarea, GDPR checkbox, and Turnstile fit the screen
4. Verify "Elemzés indítása" button is full width or properly aligned
5. Start a quote and verify the chat UI works on mobile
Take screenshots at each step.
```

---

## Expected Results Summary

| Test | What to verify |
|------|---------------|
| 1 | All UI elements present on entry page |
| 2 | Button disabled without GDPR + Turnstile |
| 3 | Drag & drop file upload works |
| 4 | Click-to-upload works |
| 5 | Invalid file shows error |
| 6 | Full text flow → chat with AI |
| 7 | Full PDF flow → chat with AI |
| 8 | File upload inside chat works |
| 9 | AI generates structured quote |
| 10 | PDF export works |
| 11 | Mobile responsive layout |
