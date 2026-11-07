# J-2 EAD Tracker

A community tracker for J-2 work permit applications (Form I-765, category C05). People share their receipt block and dates, and everyone can see which blocks are being approved and estimate their own wait.

- Static site on GitHub Pages (`index.html`, `config.js`, `assets/`)
- Data in a private Google Sheet, reached through a Google Apps Script web app (`apps-script/Code.gs`)
- No accounts, no emails, no full receipt numbers

Community-reported data. Not affiliated with USCIS. Not legal advice.

## Run it in demo mode

With `API_URL` empty in `config.js`, the site shows made-up sample cases and a "Demo mode" banner. You can try every screen, including adding and updating a case. Nothing is saved.

## Connect the Google Sheet

1. Sign in with the project Gmail and create a new Google Sheet, for example "J-2 EAD Tracker data".
2. In the sheet, open **Extensions > Apps Script**.
3. Delete what's in `Code.gs`, paste the contents of `apps-script/Code.gs`, and save.
4. In the function menu at the top, choose **setup** and click **Run**. Approve the permissions when asked. This creates the `entries` and `log` tabs.
5. Click **Deploy > New deployment**. Select type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** and copy the web app URL. It ends with `/exec`.
7. Paste the URL into `config.js` as `API_URL`, commit, and wait a minute for GitHub Pages to update.

When you change `Code.gs` later, run **setup** once more (it adds any new columns without touching your data), then use **Deploy > Manage deployments > Edit > Version: New version** so the URL stays the same.

## Moderating

- **Hide an entry:** in the `entries` tab, type `TRUE` in its `hidden` column.
- **Flagged entries:** the `flagged` column notes unusual changes, such as an approved case switched back to waiting.
- **Undo a change:** the `log` tab keeps the values before and after every change. To restore an entry, open Apps Script, paste the entry id into `revertLastChange`, and run it.
- **Removal or correction requests:** people email the contact address in `config.js` with their block and receipt date. Find the row, then hide it or fix it.
- **See edits right away:** the site list is cached for 60 seconds. Run `clearCache` to skip the wait.

## Importing cases from Reddit

Add rows directly to the `entries` tab. Fill `id` with any unique text (for example `r001`), set `source` to `reddit`, and leave `hidden` and `flagged` empty. Use the same values the form uses:

| Column | Values |
|---|---|
| block | 3 digits, e.g. `381` |
| dates | `YYYY-MM-DD` |
| state | 2-letter code, e.g. `PA` |
| country | country of birth exactly as in the list in `assets/data.js`, or empty |
| app_type | `initial` or `renewal` |
| service_center | `PSC` (YSC), `TSC` (SRC), `NSC` (LIN), `CSC` (WAC), `VSC` (EAC), `NBC` (MSC), `HART`, `UNK` |
| asc | `City, ST` from the list in `assets/data.js`, or `OTHER`, or empty |
| bio_code | `1`, `2`, `3`, `5`, `unsure`, or empty |
| status | `received`, `bio_scheduled`, `fingerprints`, `reviewing`, `rfe_sent`, `rfe_response`, `transferred`, `approved` (card not made yet), `card_produced`, `card_mailed`, `card_delivered` (card in hand), `denied` |
| expedite | `no` or `yes` |
| last_checked | the date of the Reddit comment, for cases still waiting |

Don't copy Reddit usernames.

## Optional spam protection (Cloudflare Turnstile)

1. Create a free Turnstile widget at Cloudflare for your site's domain.
2. Put the site key in `config.js` as `TURNSTILE_SITE_KEY`.
3. In Apps Script, open **Project Settings > Script properties** and add `TURNSTILE_SECRET` with the secret key.

Without it, the backend still uses a hidden honeypot field, a minimum time on the form, and a rate limit.

## How the estimate works

Approved cases count as finished waits. Cases still waiting count as "at least this long" up to their last check-in (Kaplan-Meier estimate), so the numbers don't look shorter than real waits. Denied cases are left out. Expedited cases are excluded from the "highest block approved" number.
