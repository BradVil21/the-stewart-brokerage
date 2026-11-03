import worker, { isBlocked } from "./worker.js";
const store = new Map();
const KV = {
  async get(k, t) { const v = store.get(k); return v == null ? null : t === "json" ? JSON.parse(v.value) : v.value; },
  async put(k, value, o = {}) { store.set(k, { value, metadata: o.metadata }); },
  async delete(k) { store.delete(k); },
  async list({ prefix }) { return { keys: [...store].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata })), list_complete: true }; },
};
const env = { GATE_KV: KV, BLOCKED_IPS: "12.247.0.158, 10.0.0.0/8", ADMIN_PASSWORD: "s3cret" };
globalThis.fetch = async () => new Response("SITE OK");
const ctx = { waitUntil() {} };
const req = (path, { ip = "1.2.3.4", cookie, auth, method = "GET", body } = {}) => {
  const h = { "CF-Connecting-IP": ip, "User-Agent": "Mozilla/5.0 (Macintosh; Mac OS X) Chrome/120 Safari/537" };
  if (cookie) h.Cookie = cookie;
  if (auth) h.Authorization = "Basic " + btoa("admin:" + auth);
  if (body) h["Content-Type"] = "application/json";
  return new Request("https://thestewartbrokerage.com" + path, { method, headers: h, body: body && JSON.stringify(body) });
};
const ok = (c, m) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok ", m); };

ok(isBlocked("12.247.0.158", env.BLOCKED_IPS) && isBlocked("10.4.5.6", env.BLOCKED_IPS) && !isBlocked("12.247.0.159", env.BLOCKED_IPS), "ip matching");
ok((await (await worker.fetch(req("/"), env, ctx)).text()) === "SITE OK", "normal visitor passes");
ok((await worker.fetch(req("/", { ip: "12.247.0.158" }), env, ctx)).status === 403, "blocked IP gets 403");
ok((await worker.fetch(req("/quote/", { ip: "12.247.0.158" }), env, ctx)).status === 403, "blocked on subpages");
ok((await worker.fetch(req("/__gate/admin"), env, ctx)).status === 401, "admin needs password");
ok((await worker.fetch(req("/__gate/admin", { auth: "wrong" }), env, ctx)).status === 401, "wrong password rejected");
ok((await worker.fetch(req("/__gate/admin", { auth: "s3cret" }), env, ctx)).status === 200, "admin page loads");
const inv = await (await worker.fetch(req("/__gate/admin/invite", { auth: "s3cret", method: "POST", body: { name: "Jane Smith", email: "jane@x.com", days: 7 } }), env, ctx)).json();
ok(inv.link.includes("/__gate/trust?code="), "invite created");
const path = new URL(inv.link).pathname + new URL(inv.link).search;
const t1 = await worker.fetch(req(path, { ip: "12.247.0.158" }), env, ctx);
const setCookie = t1.headers.get("Set-Cookie");
ok(t1.status === 200 && setCookie.startsWith("tsb_device="), "first device trusted");
const cookie = setCookie.split(";")[0];
ok((await (await worker.fetch(req("/", { ip: "12.247.0.158", cookie }), env, ctx)).text()) === "SITE OK", "trusted device passes from blocked IP");
ok((await worker.fetch(req(path, { ip: "12.247.0.158" }), env, ctx)).status === 410, "second device can't reuse link");
ok((await worker.fetch(req("/", { ip: "12.247.0.158", cookie: "tsb_device=fakefakefakefakefakefake" }), env, ctx)).status === 403, "forged cookie blocked");
const list = await (await worker.fetch(req("/__gate/admin/list", { auth: "s3cret" }), env, ctx)).json();
ok(list.devices.length === 1 && list.devices[0].email === "jane@x.com", "device listed");
await worker.fetch(req("/__gate/admin/revoke", { auth: "s3cret", method: "POST", body: { token: list.devices[0].id } }), env, ctx);
ok((await worker.fetch(req("/", { ip: "12.247.0.158", cookie }), env, ctx)).status === 403, "revoked device blocked again");
