# Boxy — AI Agent for 3D Product Design (CAD)

Conversational CAD. Describe a product, watch an agent plan, sketch, extrude,
shell, pattern, and rig it in 3D — with a self-critique pass between major steps.
Connected to your tools over **MCP** and extensible with **addins**.

## Setup

```bash
# 1. install
cd server && npm install
cd ../client && npm install

# 2. add keys
cp server/.env.example server/.env
# edit OPENROUTER_API_KEY, LLM_MODEL, GOOGLE_CLIENT_ID/SECRET, SESSION_SECRET

# 3. run (two terminals, or use concurrently)
cd server && npm run dev   # :8787 — API + OpenRouter proxy + MCP
cd client && npm run dev   # :5173 — open this in your browser
```

Google redirect URI: `http://localhost:5173/api/auth/google/callback`
(For Codespaces, set `OAUTH_BASE` in `.env` to your forwarded `:5173` host and use that for the redirect URI.)

## What's inside

**Agent (BoxyDSL)** — sketch + extrude, shell, linear/circular pattern, lathe, boolean (CSG),
fillet, joints with key-bound rigging, plus a periodic critique pass that inspects the
rendered snapshot and corrects spatial issues.

**MCP server** — JSON-RPC at `POST /mcp/v1/rpc` with API key auth (`x-boxy-key`). External
agents (Claude Desktop, custom clients) can drive Boxy designs.

**Addin system** — drop a folder into `server/addins/<id>/` to register tools and an
optional UI panel. Example included at `server/addins/example-units/`.

## MCP usage

Generate a key on the Addins page in the app (`/addins`). Then from any MCP client:

```http
POST /mcp/v1/rpc
x-boxy-key: bxy_xxx
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

Tools (core): `design.list`, `design.get`, `design.create`,
`design.append_ops`, `design.replace_ops`, `design.snapshot`.

## Writing an addin

```js
// server/addins/my-addin/index.js
export default {
  id: 'my-addin',
  name: 'My Addin',
  panel: { url: '/addins/my-addin/panel.html', title: 'Panel' },  // optional iframe UI
  tools: [
    {
      name: 'do_thing',                    // exposed as my-addin.do_thing
      description: '…',
      input: { type: 'object', properties: { x: { type: 'number' } } },
      run: async ({ userId, params }) => ({ result: params.x * 2 }),
    },
  ],
};
```

Restart the server to load. Panel HTML can `parent.postMessage({ boxy_call, tool, args })` and the host responds with `{ boxy_reply, result }`.

## Storage

Users, designs, messages, API keys persist to `server/db/boxy.json` (auto-created). No Supabase, no native deps.
