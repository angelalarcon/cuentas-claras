// API del historial + página principal con los datos ya incrustados.
const USERS = ["Angel", "Nelson"];
const TYPES = ["expense", "settlement"];
const COLUMNS =
  "id, type, description, amount, paid_by, contribution, split_people, split_paid_parts, created_at";

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });

const fail = (status, error) => json({ error }, { status });

async function listRecords(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM records ORDER BY created_at ASC`,
  ).all();
  return results;
}

async function etagFor(text) {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(text),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `"${hex}"`;
}

const isPosInt = (v) => Number.isInteger(v) && v >= 0;

// Valida los campos comunes; devuelve un mensaje de error o null.
function validate(body, { partial = false } = {}) {
  const has = (k) => body[k] !== undefined;
  if (!partial || has("description")) {
    if (typeof body.description !== "string" || !body.description.trim())
      return "description requerida";
    if (body.description.length > 200) return "description demasiado larga";
  }
  if (!partial || has("amount")) {
    if (typeof body.amount !== "number" || !(body.amount > 0) || body.amount > 1e7)
      return "amount inválido";
  }
  if (!partial || has("contribution")) {
    if (typeof body.contribution !== "number" || !Number.isFinite(body.contribution))
      return "contribution inválida";
  }
  for (const k of ["split_people", "split_paid_parts"]) {
    if (has(k) && body[k] !== null && !isPosInt(body[k])) return `${k} inválido`;
  }
  if (!partial) {
    if (!TYPES.includes(body.type)) return "type inválido";
    if (!USERS.includes(body.paid_by)) return "paid_by inválido";
  }
  return null;
}

async function handleApi(request, env, url) {
  const match = url.pathname.match(/^\/api\/records(?:\/([\w-]+))?\/?$/);
  if (!match) return fail(404, "no encontrado");
  const id = match[1];
  const method = request.method;

  if (!id && method === "GET") {
    const text = JSON.stringify(await listRecords(env));
    const etag = await etagFor(text);
    if (request.headers.get("if-none-match") === etag)
      return new Response(null, { status: 304, headers: { etag, "cache-control": "no-store" } });
    return new Response(text, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        etag,
      },
    });
  }

  let body = {};
  if (method === "POST" || method === "PATCH") {
    try {
      body = await request.json();
    } catch {
      return fail(400, "JSON inválido");
    }
    if (!body || typeof body !== "object") return fail(400, "JSON inválido");
  }

  if (!id && method === "POST") {
    const error = validate(body);
    if (error) return fail(400, error);
    // el cliente manda su propio id: si la misma petición llega dos veces
    // (doble clic, reintento por mala conexión) no se duplica el registro
    const recordId =
      typeof body.id === "string" && /^[\w-]{8,64}$/.test(body.id)
        ? body.id
        : crypto.randomUUID();
    const row = await env.DB.prepare(
      `INSERT INTO records (id, type, description, amount, paid_by, contribution, split_people, split_paid_parts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING
       RETURNING ${COLUMNS}`,
    )
      .bind(
        recordId,
        body.type,
        body.description.trim(),
        body.amount,
        body.paid_by,
        body.contribution,
        body.split_people ?? null,
        body.split_paid_parts ?? null,
      )
      .first();
    if (!row) {
      const existing = await env.DB.prepare(
        `SELECT ${COLUMNS} FROM records WHERE id = ?`,
      )
        .bind(recordId)
        .first();
      return json(existing, { status: 200 });
    }
    return json(row, { status: 201 });
  }

  if (id && method === "PATCH") {
    const error = validate(body, { partial: true });
    if (error) return fail(400, error);
    const fields = ["description", "amount", "contribution", "split_people", "split_paid_parts"]
      .filter((k) => body[k] !== undefined);
    if (!fields.length) return fail(400, "nada que actualizar");
    const values = fields.map((k) =>
      k === "description" ? body[k].trim() : body[k],
    );
    const row = await env.DB.prepare(
      `UPDATE records SET ${fields.map((k) => `${k} = ?`).join(", ")}
       WHERE id = ? RETURNING ${COLUMNS}`,
    )
      .bind(...values, id)
      .first();
    return row ? json(row) : fail(404, "no encontrado");
  }

  if (id && method === "DELETE") {
    await env.DB.prepare("DELETE FROM records WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  }

  return fail(405, "método no permitido");
}

// Incrusta el historial en el HTML para que la primera pintura ya tenga datos.
async function serveIndex(request, env, url) {
  const assetUrl = new URL("/", url);
  const [asset, records] = await Promise.all([
    env.ASSETS.fetch(new Request(assetUrl, { headers: request.headers })),
    listRecords(env).catch(() => null),
  ]);
  if (!asset.ok || !records) return asset;
  const html = await asset.text();
  const payload = JSON.stringify({ at: Date.now(), rows: records }).replace(
    /</g,
    "\\u003c",
  );
  const out = html.replace(
    "<!--INITIAL_RECORDS-->",
    `<script>window.__INITIAL_RECORDS__=${payload}</script>`,
  );
  return new Response(out, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html"))
        return await serveIndex(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err);
      return url.pathname.startsWith("/api/")
        ? fail(500, "error del servidor")
        : env.ASSETS.fetch(request);
    }
  },
};
