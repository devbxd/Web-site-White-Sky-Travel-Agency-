/* Shared helper for calling the LiteAPI hotel platform (liteapi.travel).
   Real calls only run once LITEAPI_KEY is set in the environment (Vercel
   project settings, or a local .env used by `vercel dev`). Until then,
   both endpoints below serve clearly-labelled demo data so the search
   flow can be built and tested end to end. */

const BASE_URL = "https://api.liteapi.travel/v3.0";
const TIMEOUT_MS = 8000;

function hasApiKey() {
  return !!process.env.LITEAPI_KEY;
}

function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
  return { signal: controller.signal, clear: function () { clearTimeout(timer); } };
}

async function liteApiGet(path, params) {
  const url = new URL(BASE_URL + path);
  Object.keys(params || {}).forEach(function (key) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      url.searchParams.set(key, params[key]);
    }
  });
  const t = withTimeout();
  let res;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-API-Key": process.env.LITEAPI_KEY, Accept: "application/json" },
      signal: t.signal
    });
  } catch (err) {
    throw new Error("LiteAPI GET " + path + " timed out or failed: " + err.message);
  } finally {
    t.clear();
  }
  if (!res.ok) {
    const body = await res.text().catch(function () { return ""; });
    throw new Error("LiteAPI GET " + path + " failed: " + res.status + " " + body);
  }
  return res.json();
}

async function liteApiPost(path, body) {
  const t = withTimeout();
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.LITEAPI_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body),
      signal: t.signal
    });
  } catch (err) {
    throw new Error("LiteAPI POST " + path + " timed out or failed: " + err.message);
  } finally {
    t.clear();
  }
  if (!res.ok) {
    const errBody = await res.text().catch(function () { return ""; });
    throw new Error("LiteAPI POST " + path + " failed: " + res.status + " " + errBody);
  }
  return res.json();
}

module.exports = { hasApiKey: hasApiKey, liteApiGet: liteApiGet, liteApiPost: liteApiPost };
