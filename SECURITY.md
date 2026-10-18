# Credentials and private data

Keep real `GEMINI_API_KEY` and `APP_ACCESS_TOKEN` values in ignored local `.dev.vars` configuration or Cloudflare secrets. The browser must never contain the deployment owner's Google API key. This distribution contains placeholder configuration, three labeled example companies, and no creator credentials or private user exports.

The access code authorizes use of one deployment. Share it only intentionally. Each operator should deploy their own instance to use their own Google key. The included shared request limiter is a best-effort abuse control, not a monthly spending cap or individual user account system.

Do not put secrets, private lead data, or draft contents in public issues, screenshots, or commits. If a real key was published, revoke and replace it in the provider account. Deleting a file does not remove Git history. Review access and billing after exposure.

The API rejects cross-origin browser requests and requires an access code. Origin checks supplement authentication. Provider requests are restricted to a fixed Google API host; the client cannot choose the upstream model, tools, or API destination. Prompt sizes and provider response sizes are bounded. Provider error bodies are not returned to the browser.

Search grounding reduces unsupported output but does not prove each company, contact, email, location, grouping, or score is correct. Source labels are not deliverability checks. Inspect the actual sources and review outreach before sending. The included example data has not been rechecked and is excluded from default outreach and exports.

Workspace data is held in page memory. CSV exports may contain private notes; keep them out of public repositories. Search terms, selected records, and writing inputs are sent to the configured providers when those functions are used. Third-party CSS and fonts also make external web requests.

This package has automated checks and is not a comprehensive security audit. Test your own deployment and provider access before sharing it. Report a vulnerability through GitHub's private vulnerability reporting feature if the repository owner enables it; never include real credentials in a public report.
