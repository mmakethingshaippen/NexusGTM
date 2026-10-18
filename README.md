# NexusGTM

A browser workspace for company research, location grouping, contact research, AI-assisted outreach writing, analytics, an editable lead tracker, and CSV exports.

Three clearly labeled example companies are included so visitors can explore the interface. Their contact details and scores have not been rechecked. A successful search replaces these examples. Examples are excluded from outreach, analytics totals, and exports.

No creator API credentials, personal profile, private notes, or user exports are included. Each operator uses their own accounts and API key.

## What runs where

The HTML interface and a Cloudflare Worker are deployed together. The browser calls `/api/generate` on that website. The Worker calls the Google Gemini API with a key stored as a server secret. Company and contact research use Google Search grounding. Drafting uses the selected company context and the user's writing inputs.

The code supports the **Google Gemini API**. Keys for OpenAI, Anthropic, and other providers require a different backend implementation.

GitHub hosts the source code. **GitHub Pages alone cannot run the included backend.** Use the deployment instructions below for search and AI drafting. Double-clicking `public/index.html` displays the interface but cannot run its backend.

## Requirements

- [Node.js](https://nodejs.org/) 22 or newer, subject to the installed Wrangler version's requirements.
- A [Cloudflare account](https://dash.cloudflare.com/).
- Your own [Gemini API key](https://aistudio.google.com/apikey).
- API access to a model that supports `generateContent` and Google Search grounding.

The default model is `gemini-3.8-flash`, configured in `wrangler.jsonc`. If your account does not have access, choose a compatible model from [Google's model documentation](https://ai.google.dev/gemini-api/docs/models). A Gemini app subscription does not automatically supply API access to this project. API requests and search grounding may incur charges; check your provider's quotas and pricing.

## 1. Download and install

Extract the ZIP or clone the repository. Open a terminal in the project folder, alongside `package.json` and `wrangler.jsonc`.

```sh
npm install
npm test
```

On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd` and `npx.cmd` instead of `npm` and `npx`.

## 2. Set your own credentials

| Setting | Purpose | Where to put it |
| --- | --- | --- |
| `GEMINI_API_KEY` | Your Google AI Studio API key | Local `.dev.vars` or a Cloudflare server secret |
| `APP_ACCESS_TOKEN` | A random access code you choose, at least 24 characters long | Local `.dev.vars` or a Cloudflare server secret; enter it in the running app |
| `GEMINI_MODEL` | A compatible Gemini model ID | `wrangler.jsonc`; this setting is not secret |

Generate the access code with a password manager. The service access code authorizes use of your deployment; it is separate from your Google API key. Keep both private.

For local development, copy `.dev.vars.example` to `.dev.vars` and replace the placeholder values with your own values. The real `.dev.vars` file is ignored by Git.

PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
npm run dev
```

macOS/Linux:

```sh
cp .dev.vars.example .dev.vars
npm run dev
```

Open the HTTP address shown by Wrangler. In **Advanced filters & search connection**, keep **Hosted Gemini service** selected. Enter your `APP_ACCESS_TOKEN` in **Service access code**. Do not enter the Google API key into the website. The access code stays in the open page and must be entered again after a reload.

Run a search and generate an AI draft to test your provider access. The badge changes after a successful provider response; entering a URL or access code alone does not establish a connection. `/api/health` reports configuration only, not a successful Google request.

## 3. Deploy the website and backend

```sh
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_ACCESS_TOKEN
npm run deploy
```

Enter secret values at the prompts. Wrangler may ask to create the Worker when first adding a secret; allow that creation and complete the commands. The local `.dev.vars` file is not your production secret configuration.

Deployment prints your actual HTTPS website address. Open it and enter that deployment's service access code. Test search, contact research, and drafting again. You can change the Worker name in `wrangler.jsonc` if the default is unavailable. If you already use rate limiting namespace `1001` in another Worker, select a different positive integer string in the `ratelimits` setting to avoid sharing its counters.

The Worker applies a shared best-effort limit of 10 accepted requests per minute. This is not a spending cap. Set provider quotas and monitor billing. People who know the service access code share the deployment owner's API usage. To use their own API key, other users should fork/download this project and deploy their own instance.

## 4. Upload to GitHub

Upload the extracted project contents, retaining the two subfolders:

```text
README.md
SECURITY.md
package.json
wrangler.jsonc
.gitignore
.dev.vars.example
worker.js
public/
  index.html
  _headers
tests/
  release.test.js
```

Uploading only the ZIP saves an archive rather than a browsable source project. If you use GitHub's website uploader, drag the extracted files and folders into the upload area. Include `.gitignore` and `.dev.vars.example`.

Do not upload `.dev.vars`, `.env`, credential files, private lead exports, `node_modules`, or `.wrangler`. The browser uploader does not enforce your local `.gitignore`. Check the filenames before publishing.

GitHub displays your account identity, and Git commits can include your configured author name and email. If desired, use a GitHub-provided no-reply email in your Git settings. The supplied archive contains no Git history or author metadata. This package does not publish a repository automatically.

## Features and limits

- Search aims for up to 20 companies. Fewer results are valid when sufficient evidence cannot be found. No generated catalog or sample fallback is inserted when a request fails.
- The three examples demonstrate the interface and remain visibly labeled until a successful search. **Add 20 more** starts a fresh search while the examples are loaded. Subsequent additions preserve live records.
- Company grouping, contact evidence labels, and scores assist research. They are not guarantees of ownership, accuracy, deliverability, or business suitability. The score is a local heuristic, not a customer rating.
- Strict Site-Lock checks the discovery URL's hostname and path. Broader contact research can enrich the same companies. The application does not independently prove every directory listing or ownership relationship.
- Research responses without Google grounding sources are rejected. Grounding does not independently verify every field; inspect the source pages before outreach. **Latest research sources** displays the returned Google source links and, when supplied, Search Suggestions. Review Google's current [grounding requirements](https://ai.google.dev/gemini-api/docs/google-search) before changing their presentation.
- Radius search starts unchecked, with a 50-mile value. The research prompt requests the radius; there is no independent geospatial distance check.
- The writing assistant retains message mode, tone, length, user ideas, reply context, refinements, draft history, and human approval. A rewrite resets approval. Gmail and Outlook buttons open composers; they do not send messages.
- The tracker, analytics, filters, custom columns, and company/location exports are retained from the supplied interface.
- Workspace records, notes, and drafts are held in page memory. Reloading can lose them. Export important work. This package does not add a database or account synchronization.
- The optional **Custom Cloudflare Worker Proxy URL** mode retains the imported external search schema. You must supply your own compatible and secured external service; it is not required for the default setup. Drafting continues through the included same-origin Worker.

## Data sent during use

Search terms, selected company context, talking points, incoming reply text, and draft text can be sent to your Worker and Google's API when you use those features. Review the providers' terms for your account. This package does not add application analytics or prompt logging. Cloudflare and Google may retain service data under their own policies.

The HTML loads Tailwind styles and Google Fonts from third parties. These receive ordinary web requests. The application is not fully offline.

## Troubleshooting

| Message or problem | Check |
| --- | --- |
| API setup required | Configure server secrets, then enter the service access code in Advanced filters. |
| HTML file cannot run the backend / API route not found | Use `npm run dev` or your deployed Worker address, not a file URL or GitHub Pages alone. |
| Missing or incorrect service access code | Enter `APP_ACCESS_TOKEN`, not the Google API key. |
| Google HTTP 400/404 | Confirm the model ID and feature compatibility. |
| Google HTTP 401/403 | Check the server key, restrictions, and project/model access. |
| HTTP 429 | Check provider quota/billing and the shared request limit; retry later. |
| No grounding sources or incomplete JSON | Narrow the search and retry. Existing records are preserved when the request fails. |
| Search works but drafting fails | Test model JSON output support and draft inputs; drafting is a separate request. |
| Data disappears after reload | Export important work first; persistent storage is not implemented. |

## Checks and deployment status

Run `npm test` for automated checks covering frontend script execution, preserved examples, search replacement and append behavior, source URL matching, exports, backend authentication, input limits, provider errors, and mocked grounded responses.

Tests use simulated provider responses. They do not demonstrate live Google access or research accuracy. Real API requests and cloud deployment require your own credentials. After setup, test at least two different industries/locations, sources, contact research, AI drafting/refinement, approval reset, additional results, pagination, and exports on your deployment. Review the layout at desktop and mobile widths.

## Official references

- [Google API key setup](https://ai.google.dev/gemini-api/docs/api-key)
- [Gemini model selection](https://ai.google.dev/gemini-api/docs/models)
- [Google Search grounding](https://ai.google.dev/gemini-api/docs/google-search)
- [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare server secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
