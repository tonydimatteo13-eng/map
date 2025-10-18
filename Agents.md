Agents.md — Zupee US Skill Map

Overview



A self-updating US map showing state-by-state status for online head‑to‑head skill‑based real‑money (RMG) contests. The app renders a color‑coded map (Green/Yellow/Red), tooltips with reasons + sources, and a right‑rail news feed. n8n runs daily scans, classifies news, and auto‑updates Airtable; changes appear instantly on the map. Hosted at https://n8n.srv1033517.hstgr.cloud/map behind Traefik on the existing VPS. Dark mode supported (prefers‑color‑scheme + toggle).



Roles \& Responsibilities



Map Frontend Agent



Build a Vite + React + Tailwind (+ shadcn/ui) SPA under /map.



Integrate react-simple-maps + us-atlas topojson, tooltips (@floating-ui), TanStack Query, and a virtualized news list.



Read-only JSON via n8n webhooks: /webhook/map/states, /webhook/map/news.



Implement filters (by color/topic), “changed last 30d” toggle, and dark‑mode toggle.



News Harvester Agent (n8n)



Create daily scan workflow: per‑state targeted queries → fetch → dedupe → classify via OpenAI → update Airtable → notify Slack → revalidate frontend.



Create a manual‑review workflow for low-confidence changes and an admin webhook to lock/unlock states.



Classifier Agent (LLM Prompting)



Maintain the OpenAI classification prompt (see below). Tune tags, impact, suggested status, and tooltip text (≤180 chars). Keep a confidence score (0–1).



Data Agent (Airtable)



Create base Zupee US Map with tables states and news (schema below).



Seed initial state statuses + reasons + source links.



DevOps Agent



Add a Traefik‑routed Nginx container serving the SPA at /map (no impact to n8n).



Secure admin webhooks with a token + optional Traefik BasicAuth for /map.



QA/Release Agent



Validate performance budgets (TTI < 1s on desktop, < 2s mobile), tooltip correctness, news linking, and n8n daily run success.



Environment \& Secrets



HOST\_BASE\_URL=https://n8n.srv1033517.hstgr.cloud



PUBLIC\_PATH=/map



AIRTABLE\_API\_KEY=\*\*\* (pat)



AIRTABLE\_BASE\_ID=appXXXXXXXXXXXXXX



AIRTABLE\_TABLE\_STATES=states



AIRTABLE\_TABLE\_NEWS=news



N8N\_PUBLIC\_WEBHOOK\_BASE=https://n8n.srv1033517.hstgr.cloud/webhook/map



OPENAI\_API\_KEY=\*\*\* (if using OpenAI node directly, store in n8n credentials)



NEWS\_SEARCH\_KEYS (e.g., SerpAPI/NewsAPI/GDELT) — optional; can rely on curated sources + RSS



SLACK\_WEBHOOK\_URL=\*\*\* (optional)



ADMIN\_TOKEN=\*\*\* (for admin lock/unlock webhook)



Security: Do not hardcode secrets into the SPA. SPA calls only public read endpoints; all admin mutations go through tokenized webhooks.



Color Semantics \& Rules



Green — Opinion‑friendly: no explicit prohibition; comparables operate; state‑specific opinion letter + geofence/KYC sufficient in practice.



Yellow — Conditional: card‑game restrictions (IN/ME), tournament quirks (AZ/FL), shifting AG sentiment (CA), or pending bills; needs narrow opinions.



Red — No‑go/high friction: statutory/AG hostility, consistent operator exclusion (e.g., WA, MT, SD, SC, CT, DE, LA, AR, TN).



Status changes are proposed by the classifier, aggregated over 30 days, and applied if confidence ≥ 0.75 and the state is not locked.



Airtable Schema



Base: Zupee US Map



Table: states



code (single line, PK; e.g., "CA")



name (single line)



status (single select: green|yellow|red)



reason\_short (single line, ≤180 chars)



reason\_long (long text, markdown)



latest\_link (URL)



latest\_title (single line)



last\_updated (date, ISO)



confidence (number, 0–1)



locked (checkbox)



notes\_admin (long text)



Table: news



state (link to states)



published\_at (date)



source (single line domain)



title (single line)



url (URL)



summary (long text)



topic\_tags (multi select: dfs, sweeps, card, court, ag\_opinion, bill, rulemaking, payments, store\_policy)



impact (single select: none|clarification|tighten|loosen|ban|license\_path)



confidence (number)



status\_change\_from (single select; nullable)



status\_change\_to (single select; nullable)



content\_hash (single line; unique)



Create Airtable views:



States — Review Needed (filter: proposed change flagged by n8n; use a checkbox field apply\_change the workflow watches)



News — Recent (sort by published\_at desc)



n8n — Workflows

A) Daily State Scan (import JSON in separate file below)



Nodes (high-level):



Cron (06:00 America/Chicago)



Airtable: List states (locked≠true)



Function (Build Queries) — compose per‑state queries with site filters:



Attorney General site, Gaming Commission, Legislature bill tracker, AP/Reuters/local majors



Example query template: ({StateName} OR {StateAbbrev}) (attorney general OR gaming commission OR bill OR regulation OR online gaming OR skill) site:.gov OR site:apnews.com OR site:reuters.com



HTTP Request — call news/search APIs (or curated RSS)



Function (Normalize Results) — title, url, source, published\_at, snippet



HTTP Request (Fetch Body) — optional: fetch article HTML



Function (Extract Text) — lightweight readability fallback



OpenAI (Classification) — prompt below



Function (Aggregate 30d) — compute suggested status + tooltip; require confidence≥0.75



IF (Change) — if suggested≠current \& not locked



Airtable: Update states — set status, reason\_short, latest\_link/title, last\_updated, confidence



Airtable: Create news rows — include tags/impact/confidence; set old→new if changed



Slack (optional) — alert on flips



HTTP Request — POST /webhook/map/revalidate to hint SPA to refetch



B) Manual Review \& Admin Lock



Webhook (POST /webhook/map/admin/lock) — body {code, lock:true|false, token}



Airtable Update state.locked



Webhook (POST /webhook/map/admin/apply-change) — applies queued change from States — Review Needed



Classifier Prompt (OpenAI node)

SYSTEM: You are a gaming-regulations analyst for online head-to-head skill-based cash contests (non-casino, non-sweepstakes).

USER: Today={{today}}; State={{$json.state\_code}} ({{$json.state\_name}})

Article:

Title: {{$json.title}}

Source: {{$json.source}}

Published: {{$json.published\_at}}

URL: {{$json.url}}

Body (truncated): {{$json.body\_excerpt}}

TASKS:

1\) is\_relevant: true|false (only if it affects online skill cash contests or their app-store/payment viability)

2\) impact: one of \[ban,tighten,loosen,clarification,license\_path,none]

3\) topic\_tags: subset of \[dfs,sweeps,card,court,ag\_opinion,bill,rulemaking,payments,store\_policy]

4\) stance: + | 0 | -

5\) confidence: 0..1

6\) suggested\_status: green|yellow|red (explain in ≤180 chars as `tooltip`)

Return strict JSON with keys: {is\_relevant, impact, topic\_tags, stance, confidence, suggested\_status, tooltip}

Frontend — Vite SPA Build Prompt (for Codex)



Goal: Create a production-ready SPA at /map with:



U.S. SVG map colored by status; hover tooltip with reason/link/time/confidence



Right-rail news feed; filter controls; dark-mode toggle



Data from GET /webhook/map/states and GET /webhook/map/news?state=XX (same origin)



Stack: Vite + React + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + react-simple-maps + @floating-ui/react + react-virtualized



Instructions:



Scaffold Vite + TS; configure Tailwind with dark mode class; install deps.



Add a config.ts reading PUBLIC\_PATH and base URLs; ensure assets work under /map.



Implement modules:



api/client.ts — fetchers for /webhook/map/states and /webhook/map/news with TanStack Query



components/MapUS.tsx — react-simple-maps + topojson; color mapping; mouse handlers



components/Tooltip.tsx — floating tooltip with reason/link/time/confidence



components/Legend.tsx — color chips + filters (color/topic) + changed‑last‑30d toggle



components/NewsFeed.tsx — virtualized list; cards with \[STATE] • time • source • title • tags and old→new pill when present



components/Header.tsx — title, dark‑mode toggle, last sync time



pages/App.tsx — layout grid (map left, feed right), responsive



Colors: green #0f8554, yellow #ffff33, red #cc3333, default #d1dbdd.



Dark mode: follow prefers-color-scheme, store toggle in localStorage.



Performance: lazy‑load NewsFeed; prefetch states JSON on idle; keep main bundle < 250KB gz.



Build to dist/ and ensure paths work from /map (set base:'/map/' in vite.config.ts).



Acceptance: tooltips show correct reason\_short + latest\_link, news feed filters by clicked state, and the map repaints within 1s after refetch.



DevOps — Docker/Traefik/Nginx



docker-compose service



services:

&nbsp; zupee-map:

&nbsp;   image: nginx:alpine

&nbsp;   container\_name: zupee-map

&nbsp;   restart: always

&nbsp;   volumes:

&nbsp;     - ./zupee-map/dist:/usr/share/nginx/html:ro

&nbsp;     - ./zupee-map/nginx.conf:/etc/nginx/conf.d/default.conf:ro

&nbsp;   labels:

&nbsp;     - "traefik.enable=true"

&nbsp;     - "traefik.http.routers.zupee-map.rule=Host(`n8n.srv1033517.hstgr.cloud`) \&\& PathPrefix(`/map`)"

&nbsp;     - "traefik.http.routers.zupee-map.entrypoints=websecure"

&nbsp;     - "traefik.http.routers.zupee-map.tls=true"

&nbsp;     - "traefik.http.middlewares.zupee-map-stripprefix.stripprefix.prefixes=/map"

&nbsp;     - "traefik.http.routers.zupee-map.middlewares=zupee-map-stripprefix"



nginx.conf



server {

&nbsp; listen 80;

&nbsp; server\_name \_;

&nbsp; root /usr/share/nginx/html;

&nbsp; location / { try\_files $uri /index.html; }

}



Build locally (pnpm build), copy dist/ to ./zupee-map/dist, and bring up the service. Traefik routes https://n8n.../map to this container.



n8n — Importable Workflow Skeletons



Replace {{PLACEHOLDER}} values before import.



A) Daily State Scan — minimal JSON



{

&nbsp; "name": "Zupee – Daily State Scan",

&nbsp; "nodes": \[

&nbsp;   {"parameters":{"triggerTimes":{"item":\[{"mode":"everyDay","hour":6,"minute":0}]}},"id":"Cron","name":"Cron","type":"n8n-nodes-base.cron","typeVersion":1},

&nbsp;   {"parameters":{"operation":"list","application":"{{AIRTABLE\_BASE\_ID}}","table":"states","additionalOptions":{"filterByFormula":"{locked} != 1"}},"id":"ListStates","name":"Airtable – List States","type":"n8n-nodes-base.airtable","typeVersion":2},

&nbsp;   {"parameters":{"functionCode":"// Build search queries per state\\nreturn items.map(it=>({json:{state\_code:it.json.code,state\_name:it.json.name,query:`\\n(${it.json.name} OR ${it.json.code}) (attorney general OR gaming commission OR bill OR regulation OR online gaming OR skill) site:.gov OR site:apnews.com OR site:reuters.com`}}));"},"id":"BuildQueries","name":"Function – Build Queries","type":"n8n-nodes-base.function","typeVersion":2},

&nbsp;   {"parameters":{"url":"https://newsapi.org/v2/everything","options":{"queryParametersUi":{"parameter":\[{"name":"q","value":"={{$json.query}}"},{"name":"pageSize","value":"15"}]},"headersUi":{"parameter":\[{"name":"Authorization","value":"Bearer {{NEWSAPI\_KEY}}"}]}}},"id":"NewsSearch","name":"HTTP – News Search","type":"n8n-nodes-base.httpRequest","typeVersion":4},

&nbsp;   {"parameters":{"functionCode":"// Normalize to array of articles\\nconst out=\[];\\nfor (const a of (items\[0].json.articles||\[])){\\n out.push({json:{state\_code:$json.state\_code,title:a.title,url:a.url,source:(a.source\&\&a.source.name)||'',published\_at:a.publishedAt||'',snippet:a.description||''}});}\\nreturn out;"},"id":"Normalize","name":"Function – Normalize","type":"n8n-nodes-base.function","typeVersion":2},

&nbsp;   {"parameters":{"resource":"chat","model":"gpt-4o-mini","messages":\[{"role":"system","content":"You are a gaming-regulations analyst for online head-to-head skill-based cash contests (non-casino, non-sweepstakes). Return strict JSON."},{"role":"user","content":"State: {{$json.state\_code}}\\nTitle: {{$json.title}}\\nSource: {{$json.source}}\\nPublished: {{$json.published\_at}}\\nURL: {{$json.url}}\\nSnippet: {{$json.snippet}}\\nTASKS:\\n1) is\_relevant true/false\\n2) impact one of \[ban,tighten,loosen,clarification,license\_path,none]\\n3) topic\_tags subset of \[dfs,sweeps,card,court,ag\_opinion,bill,rulemaking,payments,store\_policy]\\n4) stance +|0|-\\n5) confidence 0..1\\n6) suggested\_status green|yellow|red and tooltip (<=180 chars)\\nReturn JSON: {is\_relevant,impact,topic\_tags,stance,confidence,suggested\_status,tooltip}"}],"jsonOutput":true}},"id":"Classify","name":"OpenAI – Classify","type":"n8n-nodes-base.openAi","typeVersion":4},

&nbsp;   {"parameters":{"functionCode":"// Aggregate and decide change (simplified demo)\\nreturn items.map(it=>{const s=it.json; const conf=Number(s.confidence||0); const change=(s.is\_relevant\&\&conf>=0.75)?s.suggested\_status:null; return {json:{...s,apply:change}}});"},"id":"Decide","name":"Function – Decide","type":"n8n-nodes-base.function","typeVersion":2},

&nbsp;   {"parameters":{"operation":"update","application":"{{AIRTABLE\_BASE\_ID}}","table":"states","updateAllFields":false,"updateFields":{"Status":"={{$json.apply}}","reason\_short":"={{$json.tooltip}}","latest\_link":"={{$json.url}}","latest\_title":"={{$json.title}}","last\_updated":"={{ new Date().toISOString() }}","confidence":"={{$json.confidence}}"}},"id":"UpdateState","name":"Airtable – Update State","type":"n8n-nodes-base.airtable","typeVersion":2},

&nbsp;   {"parameters":{"operation":"create","application":"{{AIRTABLE\_BASE\_ID}}","table":"news","additionalFields":{"simplify":true},"fields":{"state":"={{$json.state\_code}}","title":"={{$json.title}}","url":"={{$json.url}}","source":"={{$json.source}}","published\_at":"={{$json.published\_at}}","topic\_tags":"={{$json.topic\_tags}}","impact":"={{$json.impact}}","confidence":"={{$json.confidence}}"}} ,"id":"CreateNews","name":"Airtable – Create News","type":"n8n-nodes-base.airtable","typeVersion":2}

&nbsp; ],

&nbsp; "connections":{

&nbsp;   "Cron":{"main":\[\[{"node":"Airtable – List States","type":"main","index":0}]]},

&nbsp;   "Airtable – List States":{"main":\[\[{"node":"Function – Build Queries","type":"main","index":0}]]},

&nbsp;   "Function – Build Queries":{"main":\[\[{"node":"HTTP – News Search","type":"main","index":0}]]},

&nbsp;   "HTTP – News Search":{"main":\[\[{"node":"Function – Normalize","type":"main","index":0}]]},

&nbsp;   "Function – Normalize":{"main":\[\[{"node":"OpenAI – Classify","type":"main","index":0}]]},

&nbsp;   "OpenAI – Classify":{"main":\[\[{"node":"Function – Decide","type":"main","index":0}]]},

&nbsp;   "Function – Decide":{"main":\[\[{"node":"Airtable – Update State","type":"main","index":0},{"node":"Airtable – Create News","type":"main","index":0}]]}

&nbsp; }

}



This is a minimal skeleton for Codex to expand: add dedupe by content\_hash, skip if locked=true, add Slack + revalidate calls, and guard against nulls.



B) Admin Lock Webhook — minimal JSON



{

&nbsp; "name": "Zupee – Admin Lock/Unlock",

&nbsp; "nodes": \[

&nbsp;   {"parameters":{"path":"map/admin/lock","methods":\["POST"],"responseMode":"onReceived"},"id":"Webhook","name":"Webhook","type":"n8n-nodes-base.webhook","typeVersion":1},

&nbsp;   {"parameters":{"functionCode":"const { code, lock, token } = $json;\\nif (token !== $env.ADMIN\_TOKEN) { return \[{json:{status:403,message:'Forbidden'}}]; }\\nreturn \[{json:{code,locked:!!lock}}];"},"id":"Gate","name":"Function – Gate","type":"n8n-nodes-base.function","typeVersion":2},

&nbsp;   {"parameters":{"operation":"update","application":"{{AIRTABLE\_BASE\_ID}}","table":"states","updateAllFields":false,"updateFields":{"locked":"={{$json.locked}}"},"options":{"idField":"code"}},"id":"Update","name":"Airtable – Update","type":"n8n-nodes-base.airtable","typeVersion":2}

&nbsp; ],

&nbsp; "connections":{"Webhook":{"main":\[\[{"node":"Function – Gate","type":"main","index":0}]]},"Function – Gate":{"main":\[\[{"node":"Airtable – Update","type":"main","index":0}]]}}

}

QA Checklist



Map paints within 1s, tooltips accurate; dark mode honors system + toggle.



News feed shows newest first; clicking a state filters feed and pins tooltip.



A real test article flips a state from Yellow→Green and triggers Slack alert.



Locking a state blocks auto changes; manual apply works via admin webhook.



Handoff Notes



Keep a living State Matrix doc (admin-only) with citations; link it from the app’s footer (private).



Keep the classifier prompt stable; version changes in Git to avoid churn.



Schedule a weekly legal review of auto-changes in Airtable.

