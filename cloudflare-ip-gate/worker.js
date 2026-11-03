/**
 * The Stewart Brokerage — IP gate + trusted-device invites
 * ---------------------------------------------------------
 * A Cloudflare Worker that sits in front of the website.
 *
 *  • Visitors from a blocked IP (BLOCKED_IPS) get a 403 page — unless the
 *    device they're on has been trusted through an emailed invite link.
 *  • /__gate/admin  (password protected) — create invites, email them,
 *    see trusted devices, revoke them.
 *  • /__gate/trust?code=…  — the link inside the email. It works ONCE.
 *    The first device that opens it is trusted; the link is then burned,
 *    so forwarding it to anyone else does nothing.
 *
 * Bindings (see wrangler.toml):
 *   GATE_KV         KV namespace (invites + trusted devices)
 *   BLOCKED_IPS     comma-separated IPs or IPv4 CIDRs, e.g. "12.247.0.158"
 *   ADMIN_PASSWORD  secret — `npx wrangler secret put ADMIN_PASSWORD`
 *   SITE_NAME       optional display name
 */

const COOKIE = "tsb_device";
const DEVICE_TTL_DAYS = 400; // browsers cap cookies at ~400 days
const BRAND = { navy: "#0b2545", blue: "#2e7df6", sky: "#f5f9ff" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/__gate/trust") return handleTrust(request, env, url);
    if (path === "/__gate/admin" || path.startsWith("/__gate/admin/")) {
      return handleAdmin(request, env, url);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (isBlocked(ip, env.BLOCKED_IPS)) {
      const device = await getTrustedDevice(request, env);
      if (!device) return blockedPage(env);
      // Keep a "last seen" stamp, without slowing the response down.
      ctx?.waitUntil?.(touchDevice(env, device));
    }

    return fetch(request); // pass through to the real site (GitHub Pages)
  },
};

/* ------------------------------------------------------------------ */
/* IP matching                                                         */
/* ------------------------------------------------------------------ */

export function isBlocked(ip, list) {
  if (!ip || !list) return false;
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((rule) => (rule.includes("/") ? inCidr(ip, rule) : rule === ip));
}

function ipv4ToInt(ip) {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const part of p) {
    const v = Number(part);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function inCidr(ip, cidr) {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const a = ipv4ToInt(ip);
  const b = ipv4ToInt(base);
  if (a === null || b === null || !(bits >= 0 && bits <= 32)) return false;
  const size = 2 ** (32 - bits);
  return Math.floor(a / size) === Math.floor(b / size);
}

/* ------------------------------------------------------------------ */
/* Trusted devices                                                     */
/* ------------------------------------------------------------------ */

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function getTrustedDevice(request, env) {
  const token = readCookie(request, COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const rec = await env.GATE_KV.get("device:" + token, "json");
  return rec ? { token, ...rec } : null;
}

async function touchDevice(env, device) {
  const day = new Date().toISOString().slice(0, 10);
  if ((device.lastSeen || "").slice(0, 10) === day) return; // once a day is enough
  const { token, ...rec } = device;
  rec.lastSeen = new Date().toISOString();
  await env.GATE_KV.put("device:" + token, JSON.stringify(rec), {
    metadata: meta(rec),
  });
}

function meta(rec) {
  return {
    name: rec.name || "",
    email: rec.email || "",
    trustedAt: rec.trustedAt || "",
    lastSeen: rec.lastSeen || "",
    ua: (rec.ua || "").slice(0, 160),
  };
}

function randomToken(bytes = 24) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* ------------------------------------------------------------------ */
/* /__gate/trust — the link in the email                               */
/* ------------------------------------------------------------------ */

async function handleTrust(request, env, url) {
  const code = url.searchParams.get("code") || "";
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(code)) {
    return page(env, "Link not valid", "<p>This device link isn't valid. Ask for a new one.</p>", 400);
  }

  // Already trusted on this device? Just go in.
  const existing = await getTrustedDevice(request, env);

  const invite = await env.GATE_KV.get("invite:" + code, "json");
  if (!invite) {
    if (existing) return redirectHome(url);
    return page(
      env,
      "Link already used",
      "<p>This link has already been used on another device, or it has expired.</p>" +
        "<p>Each link trusts only one device. If you need access on this device, ask for a new link.</p>",
      410
    );
  }

  // Burn the invite first so it can only ever trust one device.
  await env.GATE_KV.delete("invite:" + code);

  const token = randomToken(32);
  const rec = {
    name: invite.name,
    email: invite.email,
    note: invite.note || "",
    trustedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    ua: request.headers.get("User-Agent") || "",
    ip: request.headers.get("CF-Connecting-IP") || "",
  };
  await env.GATE_KV.put("device:" + token, JSON.stringify(rec), {
    expirationTtl: DEVICE_TTL_DAYS * 86400,
    metadata: meta(rec),
  });

  const body = `
    <p>This device is now trusted. You can use the site normally from here.</p>
    <p class="muted">Access is tied to this browser on this device. If you clear your
    cookies or switch browsers, you'll need a new link.</p>
    <p><a class="btn" href="/">Continue to the site</a></p>`;
  const res = page(env, "Device trusted", body, 200);
  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; Max-Age=${DEVICE_TTL_DAYS * 86400}; Secure; HttpOnly; SameSite=Lax`
  );
  return res;
}

function redirectHome(url) {
  return Response.redirect(url.origin + "/", 302);
}

/* ------------------------------------------------------------------ */
/* /__gate/admin                                                       */
/* ------------------------------------------------------------------ */

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(h.slice(6));
  } catch {
    return false;
  }
  const pass = decoded.slice(decoded.indexOf(":") + 1);
  return timingSafeEqual(pass, env.ADMIN_PASSWORD);
}

async function handleAdmin(request, env, url) {
  if (!env.ADMIN_PASSWORD) {
    return page(env, "Admin not set up", "<p>Set the ADMIN_PASSWORD secret first.</p>", 503);
  }
  if (!isAdmin(request, env)) {
    return new Response("Sign in required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Stewart admin", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }

  const path = url.pathname;
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (request.method === "POST") {
    // Same-origin check — the admin page only posts to itself.
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ error: "Bad origin" }, 403);
    let data = {};
    try {
      data = await request.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }

    if (path === "/__gate/admin/invite") {
      const name = String(data.name || "").trim().slice(0, 100);
      const email = String(data.email || "").trim().slice(0, 200);
      const note = String(data.note || "").trim().slice(0, 200);
      const days = Math.min(Math.max(parseInt(data.days, 10) || 7, 1), 30);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email." }, 400);
      const code = randomToken(24);
      const rec = { name, email, note, createdAt: new Date().toISOString(), days };
      await env.GATE_KV.put("invite:" + code, JSON.stringify(rec), {
        expirationTtl: days * 86400,
        metadata: { name, email, createdAt: rec.createdAt, days },
      });
      return json({ link: `${url.origin}/__gate/trust?code=${code}`, code, days });
    }

    if (path === "/__gate/admin/revoke") {
      const token = String(data.token || "");
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return json({ error: "Bad token" }, 400);
      await env.GATE_KV.delete("device:" + token);
      return json({ ok: true });
    }

    if (path === "/__gate/admin/cancel-invite") {
      const code = String(data.code || "");
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(code)) return json({ error: "Bad code" }, 400);
      await env.GATE_KV.delete("invite:" + code);
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  }

  if (path === "/__gate/admin/list") {
    const [devices, invites] = await Promise.all([
      listPrefix(env, "device:"),
      listPrefix(env, "invite:"),
    ]);
    return json({ devices, invites, blocked: env.BLOCKED_IPS || "" });
  }

  return new Response(adminHtml(env), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'",
    },
  });
}

async function listPrefix(env, prefix) {
  const out = [];
  let cursor;
  do {
    const res = await env.GATE_KV.list({ prefix, cursor });
    for (const k of res.keys) out.push({ id: k.name.slice(prefix.length), ...(k.metadata || {}) });
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return out;
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const BASE_CSS = `
  *{box-sizing:border-box}
  body{margin:0;font-family:"DM Sans",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:${BRAND.sky};color:#1b2b44;line-height:1.55}
  .wrap{max-width:560px;margin:0 auto;padding:56px 20px}
  .card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 10px 30px rgba(11,37,69,.08)}
  h1{color:${BRAND.navy};font-size:26px;margin:0 0 12px}
  .brand{font-weight:700;color:${BRAND.navy};letter-spacing:.02em;margin-bottom:20px;font-size:14px;text-transform:uppercase}
  .muted{color:#5d6b82;font-size:14px}
  .btn{display:inline-block;background:${BRAND.blue};color:#fff;text-decoration:none;border:0;border-radius:10px;padding:12px 18px;font:inherit;font-weight:600;cursor:pointer}
  .btn.secondary{background:#e8eef8;color:${BRAND.navy}}
  .btn.danger{background:#fde8e8;color:#a61b1b;padding:6px 12px;font-size:13px}
`;

function page(env, title, bodyHtml, status = 200) {
  const site = esc(env.SITE_NAME || "The Stewart Brokerage");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} · ${site}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>${BASE_CSS}</style></head><body><div class="wrap"><div class="card">
<div class="brand">${site}</div><h1>${esc(title)}</h1>${bodyHtml}</div></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function blockedPage(env) {
  return page(
    env,
    "Access restricted",
    "<p>This website isn't available from your current network.</p>" +
      '<p class="muted">If you were given a device link by email, open it on this device to get access.</p>',
    403
  );
}

function adminHtml(env) {
  const site = esc(env.SITE_NAME || "The Stewart Brokerage");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Trusted Devices · ${site}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>${BASE_CSS}
  .wrap{max-width:820px}
  .card+.card{margin-top:20px}
  h2{color:${BRAND.navy};font-size:18px;margin:0 0 14px}
  label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}
  input,textarea,select{width:100%;padding:11px 12px;border:1px solid #cfd8e6;border-radius:10px;font:inherit;background:#fff}
  textarea{min-height:170px;resize:vertical}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:600px){.row{grid-template-columns:1fr}.card{padding:22px}}
  .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
  .linkbox{word-break:break-all;background:${BRAND.sky};border-radius:10px;padding:10px 12px;font-family:ui-monospace,Menlo,monospace;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:10px 6px;border-bottom:1px solid #eef2f7;vertical-align:top}
  th{color:#5d6b82;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .err{color:#a61b1b;font-size:14px;margin-top:10px}
  .pill{display:inline-block;background:#fde8e8;color:#a61b1b;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:600;margin:0 6px 6px 0}
  .hidden{display:none}
</style></head><body><div class="wrap">

<div class="card">
  <div class="brand">${site} · Admin</div>
  <h1>Trusted devices</h1>
  <p class="muted">Blocked networks: <span id="blocked"></span></p>
  <p class="muted">Anyone on a blocked network sees an "Access restricted" page. To let one person in,
  send them a device link below. Each link works on the <strong>first device that opens it</strong>, then stops working.</p>
</div>

<div class="card">
  <h2>Send a device link</h2>
  <form id="inviteForm">
    <div class="row">
      <div><label for="name">Recipient name</label><input id="name" autocomplete="off" placeholder="Jane Smith"></div>
      <div><label for="email">Recipient email</label><input id="email" type="email" required autocomplete="off" placeholder="jane@example.com"></div>
    </div>
    <div class="row">
      <div><label for="note">Note (just for you)</label><input id="note" autocomplete="off" placeholder="e.g. Work laptop"></div>
      <div><label for="days">Link expires after</label>
        <select id="days"><option value="1">1 day</option><option value="3">3 days</option><option value="7" selected>7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
    </div>
    <div class="actions"><button class="btn" type="submit">Create link</button></div>
    <div class="err" id="err"></div>
  </form>

  <div id="result" class="hidden">
    <label>Device link</label>
    <div class="linkbox" id="link"></div>
    <label for="subject">Email subject</label>
    <input id="subject">
    <label for="body">Email message</label>
    <textarea id="body"></textarea>
    <div class="actions">
      <a class="btn" id="mailto" href="#">Open in my email app</a>
      <button class="btn secondary" type="button" id="copyBody">Copy message</button>
      <button class="btn secondary" type="button" id="copyLink">Copy link only</button>
    </div>
    <p class="muted">Tell them to open the link <strong>on the device they want to use</strong>, while on that network.</p>
  </div>
</div>

<div class="card">
  <h2>Trusted devices</h2>
  <div id="devices" class="muted">Loading…</div>
</div>

<div class="card">
  <h2>Links not used yet</h2>
  <div id="invites" class="muted">Loading…</div>
</div>

</div>
<script>
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (d) => d ? new Date(d).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}) : "—";
const SITE = ${JSON.stringify(env.SITE_NAME || "The Stewart Brokerage")};

async function post(path, data) {
  const r = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j;
}

function shortUa(ua) {
  if (!ua) return "Unknown device";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" :
             /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Device";
  const br = /Edg\\//.test(ua) ? "Edge" : /Chrome\\//.test(ua) ? "Chrome" : /Firefox\\//.test(ua) ? "Firefox" : /Safari\\//.test(ua) ? "Safari" : "";
  return os + (br ? " · " + br : "");
}

async function load() {
  const r = await fetch("/__gate/admin/list", {cache:"no-store"});
  const d = await r.json();
  $("blocked").innerHTML = (d.blocked || "none").split(",").map(s => '<span class="pill">' + esc(s.trim()) + '</span>').join("");
  $("devices").innerHTML = d.devices.length ? '<table><tr><th>Person</th><th>Device</th><th>Trusted</th><th>Last seen</th><th></th></tr>' +
    d.devices.map(x => '<tr><td>' + esc(x.name || "—") + '<br><span class="muted">' + esc(x.email) + '</span></td><td>' + esc(shortUa(x.ua)) +
      '</td><td>' + fmt(x.trustedAt) + '</td><td>' + fmt(x.lastSeen) + '</td><td><button class="btn danger" data-revoke="' + esc(x.id) + '">Revoke</button></td></tr>').join("") +
    '</table>' : "No trusted devices yet.";
  $("invites").innerHTML = d.invites.length ? '<table><tr><th>Sent to</th><th>Created</th><th>Expires after</th><th></th></tr>' +
    d.invites.map(x => '<tr><td>' + esc(x.name || "—") + '<br><span class="muted">' + esc(x.email) + '</span></td><td>' + fmt(x.createdAt) +
      '</td><td>' + esc(x.days) + ' days</td><td><button class="btn danger" data-cancel="' + esc(x.id) + '">Cancel</button></td></tr>').join("") +
    '</table>' : "None.";
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.dataset.revoke && confirm("Revoke this device? It will be blocked again.")) { await post("/__gate/admin/revoke", {token: t.dataset.revoke}); load(); }
  if (t.dataset.cancel && confirm("Cancel this link? It will stop working.")) { await post("/__gate/admin/cancel-invite", {code: t.dataset.cancel}); load(); }
});

function updateMailto() {
  $("mailto").href = "mailto:" + encodeURIComponent($("email").value) +
    "?subject=" + encodeURIComponent($("subject").value) + "&body=" + encodeURIComponent($("body").value);
}

$("inviteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("err").textContent = "";
  try {
    const res = await post("/__gate/admin/invite", {name: $("name").value, email: $("email").value, note: $("note").value, days: $("days").value});
    const first = ($("name").value.trim().split(/\\s+/)[0]) || "there";
    $("link").textContent = res.link;
    $("subject").value = "Your secure access link for " + SITE;
    $("body").value =
"Hi " + first + ",\\n\\n" +
"Here is your personal access link for " + SITE + ":\\n\\n" + res.link + "\\n\\n" +
"Please open it on the device you'll be using (for example, your work computer) while connected to your usual network. " +
"Once you open it, that device will be trusted and you can use the site normally.\\n\\n" +
"This link works one time only, on one device, and expires in " + res.days + " day" + (res.days == 1 ? "" : "s") + ". " +
"Please don't forward it. If you need access on another device, just reply and I'll send a new link.\\n\\n" +
"Thank you,\\nPetrina Stewart\\n" + SITE;
    updateMailto();
    $("result").classList.remove("hidden");
    $("result").scrollIntoView({behavior:"smooth", block:"start"});
    load();
  } catch (err) { $("err").textContent = err.message; }
});
["subject","body","email"].forEach(id => $(id).addEventListener("input", updateMailto));
async function copy(text, btn) { await navigator.clipboard.writeText(text); const o = btn.textContent; btn.textContent = "Copied"; setTimeout(() => btn.textContent = o, 1400); }
$("copyBody").onclick = (e) => copy($("body").value, e.target);
$("copyLink").onclick = (e) => copy($("link").textContent, e.target);
load();
</script></body></html>`;
}
