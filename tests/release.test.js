import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { handleRequest, validateProviderResult } from "../worker.js";

const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(Boolean).join("\n");
const testToken = "test-access-code-only-not-a-real-credential";
const env = { GEMINI_API_KEY: "test-placeholder-key", APP_ACCESS_TOKEN: testToken };

function providerResponse(value, grounded = true) {
    return { candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] },
        ...(grounded ? { groundingMetadata: { groundingChunks: [{ web: { uri: "https://example.com/source", title: "Test source" } }] } } : {}) }] };
}

function apiRequest(input, authorization = `Bearer ${testToken}`, origin = "https://workspace.example") {
    return new Request("https://workspace.example/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: authorization, Origin: origin },
        body: JSON.stringify(input)
    });
}
const input = { purpose: "research", payload: { contents: [{ parts: [{ text: "Test research" }] }], systemInstruction: { parts: [{ text: "Return test JSON" }] } } };

function frontend(fetchImplementation = async () => { throw new Error("Test fetch not configured"); }) {
    const elements = new Map();
    for (const match of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
        const attrs = match[2];
        const values = new Set();
        const element = {
            value: attrs.match(/\bvalue="([^"]*)"/)?.[1] || "",
            checked: /\schecked(?:\s|>|$)/.test(attrs),
            disabled: false, textContent: "", innerHTML: "", className: "", style: {},
            classList: { add: value => values.add(value), remove: value => values.delete(value),
                toggle: (value, force) => force ? values.add(value) : values.delete(value), contains: value => values.has(value) },
            focus() {}, select() {}, click() {}, scrollIntoView() {},
            setAttribute() {}, removeAttribute() {}
        };
        if (match[1] === "select") {
            const body = html.slice(match.index + match[0].length).split("</select>")[0];
            element.value = body.match(/<option[^>]*value="([^"]*)"[^>]*\sselected/)?.[1]
                || body.match(/<option[^>]*value="([^"]*)"/)?.[1] || "";
        }
        elements.set(match[3], element);
    }
    const downloads = [];
    class TestURL extends URL { static createObjectURL(blob) { downloads.push(blob); return "blob:test"; } static revokeObjectURL() {} }
    const context = vm.createContext({
        console, URL: TestURL, Blob, AbortSignal, AbortController, Response, setTimeout: () => 1, clearTimeout() {},
        fetch: fetchImplementation,
        window: { location: { protocol: "https:" }, open() {} },
        document: {
            getElementById(id) { const el = elements.get(id); if (!el) throw new Error(`Missing DOM ID: ${id}`); return el; },
            querySelectorAll() { return []; }, createElement() { return { click() {}, select() {} }; },
            body: { appendChild() {}, removeChild() {} }, execCommand() { return true; }
        }
    });
    vm.runInContext(script, context);
    context.window.onload();
    return { context, elements, downloads, run: source => vm.runInContext(source, context) };
}

test("frontend initializes with three labeled examples and preserves all inline handlers", () => {
    const app = frontend();
    assert.equal(app.run("companiesData.length"), 3);
    assert.equal(app.run("companiesData.every(company => company.isExample)"), true);
    assert.equal(app.elements.get("metricTotalCompanies").textContent, "0");
    assert.equal(app.elements.get("radiusEnabledCheckbox").checked, false);
    assert.equal(app.elements.get("strictLockCheckbox").checked, false);
    assert.equal(app.elements.get("serviceStatusBadge").textContent, "API setup required");
    for (const match of html.matchAll(/\bon(?:click|change|input)="([^"]*)"/g)) {
        for (const call of match[1].matchAll(/(?:^|;)\s*([a-zA-Z_$][\w$]*)\s*\(/g)) {
            assert.equal(app.run(`typeof ${call[1]}`), "function", `Missing handler: ${call[1]}`);
        }
    }
});

test("no access code preserves examples and displays a setup error", async () => {
    const app = frontend();
    await app.run("runLeadScout(false)");
    assert.equal(app.run("companiesData.length"), 3);
    assert.match(app.elements.get("discoveryErrorText").textContent, /access code/i);
    assert.equal(app.elements.get("findLeadsBtn").disabled, false);
});

test("new search replaces examples, appends real results, paginates, and uses changed criteria", async () => {
    const requests = [];
    const app = frontend(async (url, options) => {
        assert.equal(url, "/api/generate");
        const request = JSON.parse(options.body);
        requests.push(request);
        assert.equal(options.headers.Authorization, `Bearer ${testToken}`);
        const offset = requests.length === 1 ? 0 : 20;
        return Response.json(providerResponse({ companies: Array.from({ length: 20 }, (_, index) => ({
            companyName: `Test Company ${index + offset}`, website: `https://company${index + offset}.example`,
            discoverySourceUrl: `https://company${index + offset}.example/about`, location: "Test address",
            townCounty: "Test City", specialization: "Test industry"
        })) }));
    });
    app.elements.get("serviceAccessCodeInput").value = testToken;
    await app.run("runLeadScout(true)");
    assert.equal(app.run("companiesData.length"), 20);
    assert.equal(app.run("companiesData.some(company => company.isExample)"), false);
    await app.run("runLeadScout(true)");
    assert.equal(app.run("companiesData.length"), 40);
    app.run("changePage(1)");
    assert.equal(app.elements.get("pageIndicatorText").textContent, "Page 2 of 2");
    app.elements.get("categoryInput").value = "Test replacement category";
    assert.equal(app.run("isCriteriaDirty()"), true);
    await app.run("runLeadScout(false)");
    assert.match(requests[2].payload.contents[0].parts[0].text, /Test replacement category/);
    assert.equal(app.run("companiesData.length"), 20);
});

test("strict URL matching rejects lookalike hosts and unrelated paths", () => {
    const app = frontend();
    assert.equal(app.run('verifyStrictSiteLockUrl("https://directory.example/listings/company", "directory.example/listings")'), true);
    assert.equal(app.run('verifyStrictSiteLockUrl("https://directory.example.evil.test/listings", "directory.example")'), false);
    assert.equal(app.run('verifyStrictSiteLockUrl("https://unrelated.example/directory.example", "directory.example")'), false);
    assert.equal(app.run('verifyStrictSiteLockUrl("https://directory.example/listings-fake", "directory.example/listings")'), false);
});

test("default exports exclude examples and CSV formula values are escaped", async () => {
    const app = frontend();
    app.run('exportCsv("all_companies")');
    const csv = await app.downloads[0].text();
    assert.equal(csv.split("\n").length, 1);
    assert.equal(app.run('sanitizeCsvCell("=1+1")'), '"\'=1+1"');
    assert.equal(app.run("requireApprovalGate()"), false);
});

test("AI draft generation uses the backend, preserves settings, and resets approval", async () => {
    let sent;
    const app = frontend(async (url, options) => {
        sent = JSON.parse(options.body);
        return Response.json(providerResponse({ subject: "Test subject", body: "Test draft from the provider." }, false));
    });
    app.elements.get("serviceAccessCodeInput").value = testToken;
    app.elements.get("assistantTalkingPoints").value = "Test user talking points";
    app.elements.get("humanApprovalCheckbox").checked = true;
    await app.run('runAiWritingAssistant("generate")');
    assert.equal(sent.purpose, "draft");
    assert.match(sent.payload.contents[0].parts[0].text, /Test user talking points/);
    assert.equal(app.elements.get("draftBodyInput").value, "Test draft from the provider.");
    assert.equal(app.elements.get("humanApprovalCheckbox").checked, false);
});

test("backend rejects missing authentication, missing setup, and cross-origin calls", async () => {
    const failIfCalled = () => { throw new Error("Unauthorized upstream call"); };
    assert.equal((await handleRequest(apiRequest(input, ""), env, failIfCalled)).status, 401);
    assert.equal((await handleRequest(apiRequest(input), {}, failIfCalled)).status, 503);
    assert.equal((await handleRequest(apiRequest(input, `Bearer ${testToken}`, "https://other.example"), env, failIfCalled)).status, 403);
});

test("backend applies input limits and honors the shared rate limiter", async () => {
    assert.equal((await handleRequest(apiRequest({ ...input, padding: "x".repeat(61000) }), env)).status, 400);
    const limitedEnv = { ...env, REQUEST_LIMITER: { limit: async () => ({ success: false }) } };
    assert.equal((await handleRequest(apiRequest(input), limitedEnv)).status, 429);
});

test("backend forces Google tools, keeps provider keys off URLs, and accepts grounded results", async () => {
    const response = await handleRequest(apiRequest(input), env, async (url, options) => {
        assert.equal(new URL(url).hostname, "generativelanguage.googleapis.com");
        assert.equal(new URL(url).search, "");
        assert.equal(options.headers["x-goog-api-key"], env.GEMINI_API_KEY);
        const body = JSON.parse(options.body);
        assert.deepEqual(body.tools, [{ google_search: {} }]);
        assert.equal(body.generationConfig.responseMimeType, undefined);
        return Response.json(providerResponse({ companies: [{ companyName: "Test Company", discoverySourceUrl: "https://example.com/source" }] }));
    });
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.doesNotMatch(body, new RegExp(env.GEMINI_API_KEY));
});

test("ungrounded and malformed provider responses fail without accepting fabricated records", () => {
    assert.throws(() => validateProviderResult(providerResponse({ companies: [] }, false), "research"), /No Google Search/);
    const response = providerResponse({ companies: [{ companyName: "No source" }, { companyName: "Test Company", discoverySourceUrl: "https://example.com", website: "javascript:alert(1)" }] });
    const parsed = JSON.parse(validateProviderResult(response, "research").candidates[0].content.parts[0].text);
    assert.equal(parsed.companies.length, 1);
    assert.equal(parsed.companies[0].website, "");
});

test("provider failures return sanitized errors and health only reports configuration", async () => {
    const response = await handleRequest(apiRequest(input), env, async () => new Response("sensitive upstream diagnostics", { status: 403 }));
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /sensitive upstream/);
    const health = await handleRequest(new Request("https://workspace.example/api/health"), env);
    assert.deepEqual(await health.json(), { configured: true, providerTested: false });
});

test("public defaults contain no provider keys, account details, or direct Google API calls", () => {
    assert.doesNotMatch(html, /AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z_-]{30,}|C:\\Users\\|generativelanguage\.googleapis\.com/);
    assert.equal((html.match(/id="serviceAccessCodeInput"/g) || []).length, 1);
});
