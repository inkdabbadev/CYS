# Vercel /CYS form to Google Sheets

Flow: your-domain/CYS -> POST /api/entries (Vercel) -> Apps Script -> your spreadsheet.
The page stays on your domain. The secret stays on the servers.

## Google setup

1. Open your linked spreadsheet and choose Extensions -> Apps Script.
2. Replace Code.gs with the updated local Code.gs. No HTML file is required in Apps Script.
3. In Project Settings -> Script Properties, add GIVEAWAY_API_SECRET with a long random value (at least 32 random bytes). Keep it private and use exactly the same value in Vercel.
4. Save the script, select setup in the editor's function dropdown, click Run, and authorize access. This creates Giveaway Entries without changing existing tabs.
5. Deploy -> New deployment -> Web app. Execute as: Me. Who has access: Anyone. Copy the URL ending in /exec. Keep the spreadsheet itself Restricted.
6. If updating the earlier deployment, use Manage deployments -> Edit -> New version -> Deploy. This removes the earlier browser-callable submitEntry implementation from that deployment. Remove any obsolete deployments still running old versions.

## Vercel setup

1. Deploy the repository with the Other framework preset, no build command, and the project root as the output directory. Keep api/entries.js at the project root's api directory. vercel.json maps /CYS and /CYS/ to index.html.
2. Project Settings -> Environment Variables: add APPS_SCRIPT_URL (the Google /exec URL) and GIVEAWAY_API_SECRET (the same secret set in Google). Enable Production, and Preview if needed.
3. Redeploy after adding or changing variables.
4. Open your-domain/CYS in a private browser window. Submit a test entry and verify a new row in Giveaway Entries. Test duplicate email/phone rejection, then delete your test row.

If /CYS belongs to a larger Vercel project, copy api/entries.js into that project's root api folder and update the existing page with the changed form script. Merge the function configuration into its existing vercel.json; preserve unrelated routes and configuration.

## Behavior and limits

Saved columns: UTC submission time, name, email, phone, preference, contact consent. Validation runs on Google, where a script lock serializes duplicate checks and writes. Email is compared without case, phone without punctuation; local/international country-code variants are not equated. Success requires server confirmation. Errors preserve form data. User text is escaped against spreadsheet formulas.

The public Vercel API has no CAPTCHA or per-person identity verification. The secret authenticates Vercel to Google, not individual entrants. Vercel and Apps Script quotas apply. No winner selection or email sending is included.

Local mock tests cannot verify Google authorization, deployed versions, real writes or Vercel environment variables. Complete the live test after setup.

References:
https://developers.google.com/apps-script/guides/web
https://vercel.com/docs/functions/runtimes/node-js
https://vercel.com/docs/environment-variables
