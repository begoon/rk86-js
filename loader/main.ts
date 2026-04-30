// @ts-nocheck — Deno Deploy playground file; not type-checked under the
// project's Node/Bun tsconfig. Uses Deno globals (Deno.openKv, Deno.serve).
//
// Online RK86 file relay for the rk86.ru emulator.
//
// POST /load
//   body: { "binary": "<base64>", "name": "FILE.RK" }
//   reply: { "id": "<6 chars>" }
//
// GET /file/<name>?<id>
//   serves the binary as application/octet-stream with permissive CORS;
//   <name> in the path is purely a hint for the client (extension-based
//   parser selection on rk86.ru) — the lookup key is the bare query string.
//
// Storage layout (Deno KV, all entries share a 60s TTL):
//   ["meta",  id]    -> { name, chunks, size }
//   ["chunk", id, i] -> Uint8Array (<=32KB)

const CHUNK_SIZE = 32 * 1024;
const TTL_MS = 60_000;
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 6;
const ID_RE = /^[a-z0-9]{6}$/;

const CORS_HEADERS: HeadersInit = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "*",
    "access-control-max-age": "86400",
};

const kv = await Deno.openKv();

function generateId(): string {
    const bytes = new Uint8Array(ID_LENGTH);
    crypto.getRandomValues(bytes);
    let id = "";
    for (let i = 0; i < ID_LENGTH; i++) id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
    return id;
}

function decodeBase64(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
}

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

interface Meta {
    name: string;
    chunks: number;
    size: number;
}

async function handleLoad(request: Request): Promise<Response> {
    let payload: { binary?: unknown; name?: unknown };
    try {
        payload = await request.json();
    } catch {
        return json(400, { error: "invalid json" });
    }
    if (typeof payload.binary !== "string" || typeof payload.name !== "string") {
        return json(400, { error: "expected { binary: string, name: string }" });
    }

    let bytes: Uint8Array;
    try {
        bytes = decodeBase64(payload.binary);
    } catch {
        return json(400, { error: "invalid base64" });
    }
    if (bytes.length === 0) return json(400, { error: "empty binary" });

    const id = generateId();
    const chunks = Math.ceil(bytes.length / CHUNK_SIZE);
    const meta: Meta = { name: payload.name, chunks, size: bytes.length };

    const op = kv.atomic().set(["meta", id], meta, { expireIn: TTL_MS });
    for (let i = 0; i < chunks; i++) {
        const chunk = bytes.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        op.set(["chunk", id, i], chunk, { expireIn: TTL_MS });
    }
    const result = await op.commit();
    if (!result.ok) return json(500, { error: "kv write failed" });

    return json(200, { id });
}

async function handleFile(url: URL): Promise<Response> {
    const id = url.search.slice(1); // bare "?<id>" — no key/value
    if (!ID_RE.test(id)) return new Response("not found", { status: 404, headers: CORS_HEADERS });

    const metaEntry = await kv.get<Meta>(["meta", id]);
    const meta = metaEntry.value;
    if (!meta) return new Response("not found", { status: 404, headers: CORS_HEADERS });

    const buffer = new Uint8Array(meta.size);
    let offset = 0;
    for (let i = 0; i < meta.chunks; i++) {
        const entry = await kv.get<Uint8Array>(["chunk", id, i]);
        if (!entry.value) return new Response("not found", { status: 404, headers: CORS_HEADERS });
        buffer.set(entry.value, offset);
        offset += entry.value.length;
    }

    const headers = new Headers(CORS_HEADERS);
    headers.set("content-type", "application/octet-stream");
    headers.set("content-length", String(meta.size));
    headers.set("content-disposition", `attachment; filename="${meta.name.replace(/"/g, "")}"`);
    return new Response(buffer, { status: 200, headers });
}

Deno.serve(async (request: Request) => {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method === "POST" && url.pathname === "/load") {
        return await handleLoad(request);
    }
    if (request.method === "GET" && url.pathname.startsWith("/file/")) {
        return await handleFile(url);
    }
    if (request.method === "GET" && url.pathname === "/") {
        return new Response("rk86 loader", { headers: { "content-type": "text/plain" } });
    }
    return new Response("not found", { status: 404 });
});
