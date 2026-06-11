# Montana COPP Analytic Tool

A two-phase, browser-based analysis tool for Montana Commissioner of Political Practices (COPP) dossiers. Drag and drop CERS/DLam exports (.xlsx, .xls, .csv), validate and correct the data with a full audit trail, then run prewritten or free-form analyses with charts and downloadable reports (XLSX, CSV, PDF).

All parsing, validation, and built-in analysis run entirely in the browser. Data leaves the user's machine only if the optional AI assistant is enabled, and then only the small set of rows relevant to the question is sent through a Netlify serverless function.

## Features

**Phase 1: Upload and Validate**
- Drag-and-drop upload, multiple files, multi-sheet workbooks
- Dossier-aware ingestion: CERS entity dossiers with banner rows, multiple titled sections per sheet (Contributions Given, Contributions Received, Expenditures Made), per-year tabs, and embedded subtotal rows are detected automatically. Sections are consolidated into an "All Transactions" sheet with Entity, Year, Flow, Quarter, and Recipient Type columns derived, subtotal and banner rows excluded, and committee placeholder zeros in Office and Party cleared. Plain tables and CSVs parse exactly as before.
- Entity ID detected from the filename or banner and shown on the file chip
- Automatic column profiling (amounts, dates, contributors, payees, counterparties, parties, offices, elections, report IDs, quarters, cities, ZIPs, types)
- Error scan: blank required fields, duplicate rows, amended-report duplicates (identical rows differing only by Report ID, usually an amendment restating a line), invalid and future dates, non-numeric amounts, negative amounts, stray whitespace, inconsistent capitalization, malformed ZIP codes
- Inline correction, one-click auto-fix for safe issues, or accept-as-is
- Every change recorded in a change log that is appended to all exported reports

**Phase 2: Analyze and Report**
- Analysis scope selector: current sheet, the current file's consolidated All Transactions, or all files combined. Combined scope stacks every uploaded dossier with an Entity column and unlocks the cross-entity reports.
- Library of 22 prewritten reports tuned to campaign finance review. The original 10 (top contributors, type splits, monthly trend, geography, payees, threshold screening, duplicate-contributor detection, completeness, anomaly screen, summary statistics) plus 12 dossier reports: spend by party by year, recipient concentration (top 10 with cumulative share), expenditures by quarter, candidate vs committee/measure split, support vs oppose by target, compliance flag screen (Electioneering, Corporate funds, Refund), amended-report duplicates with potential overcount, filing hygiene from Source Reports (amendment rate, late receipt, missing original documents), contact normalization (address variant clustering), and three cross-entity reports: shared counterparties, opposing activity (one entity supporting a candidate another opposes), and possible inter-entity transfers (date and amount matching between contributions given and received).
- Enhanced workbook export: rebuilds a dossier as a v2-style workbook with a generated Analysis sheet (consolidated line items plus four pivot blocks: spend by party, recipient concentration, quarterly, candidate vs committee). Works per file or for all files combined, where the Analysis sheet carries an Entity column. Pivot blocks are computed values rather than live formulas, so they open identically in any spreadsheet application.
- "Analyze my data" recommends a slate of reports based on the columns and sheets detected; select several or all
- Free-form questions in plain language, answered by a built-in query engine, or by Claude (retrieval-augmented) when deployed with an API key
- Written analysis, key figures, and charts (Chart.js) for every result
- Suggested follow-up reports after each run
- Exports per report or for the full session as XLSX, CSV, and PDF, all including the Phase 1 change log
- Light and dark modes, instructions panel, hover "i" tooltips, session save and resume, sample data

## Project structure

```
index.html                 The entire application (single file)
netlify/functions/ask.js   Optional AI endpoint (keeps the API key server-side)
netlify.toml               Netlify build and header configuration
```

## Deploying with GitHub and Netlify

1. Create a new GitHub repository (e.g., `copp-analytic-tool`) and push these files:
   ```bash
   git init
   git add .
   git commit -m "Montana COPP Analytic Tool v1.0"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/copp-analytic-tool.git
   git push -u origin main
   ```
2. In Netlify, choose **Add new site → Import an existing project → GitHub** and select the repository.
3. Build settings: leave the build command empty, set the publish directory to `.` (the `netlify.toml` handles this).
4. Deploy. The tool is fully functional immediately; the AI assistant is optional.

### Enabling the AI assistant (optional)

1. In Netlify: **Site configuration → Environment variables → Add a variable**
   - Key: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key
2. Redeploy the site.
3. In the tool, check **Use AI assistant** on the "Ask your own question" tab.

The browser ranks rows by relevance to the question and sends only the top matches to the function, which calls the Anthropic API. The key never reaches the browser. If the endpoint is unavailable, the tool falls back to the built-in query engine automatically.

## Local testing

Open `index.html` directly in a browser, or run a local server:
```bash
npx serve .
```
To test the AI function locally:
```bash
npm install -g netlify-cli
netlify dev
```

## Notes for COPP use

- The "Contributions over threshold" report flags single transactions only; verify aggregate per-contributor totals against the applicable per-election limit before drawing conclusions.
- Amended-report duplicates are flagged for review rather than auto-removed: the same transaction restated under a new Report ID is usually an amendment, and which copy to keep is a judgment call that belongs with the analyst. The report shows the potential overcount if both copies are summed.
- Cross-entity shared-counterparty matching is by name. Run Contact normalization first; the same vendor under variant spellings will not match.
- Outputs are screening aids, not legal findings.
- The change log provides the audit trail expected for public records work; it is included in every export and can be downloaded separately as CSV.
