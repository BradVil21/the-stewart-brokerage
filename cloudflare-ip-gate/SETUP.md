# IP block + trusted-device links

This blocks **12.247.0.158** from thestewartbrokerage.com. The one exception is a device
you've approved through an emailed link.

## Why Cloudflare?
The site is hosted on GitHub Pages, and GitHub Pages has no way to block an IP. Cloudflare's
free plan sits in front of the site and runs this small script (a "Worker") on every visit.
Nothing about the website itself changes.

## One-time setup (about 15 minutes)

1. **Put the domain on Cloudflare (free).** Go to dash.cloudflare.com → *Add a domain* →
   `thestewartbrokerage.com` → Free plan. Cloudflare copies your existing DNS records. At your
   domain registrar, change the nameservers to the two that Cloudflare gives you. Make sure the
   GitHub Pages records show an **orange cloud (Proxied)**.
   *Skip this step if the domain is already on Cloudflare.*
2. **Open Terminal in this folder** (`cloudflare-ip-gate`) and run:
   ```
   npx wrangler login
   npx wrangler kv namespace create GATE_KV
   ```
   Copy the `id` it prints into `wrangler.toml`, replacing `PASTE_KV_NAMESPACE_ID_HERE`.
3. **Set your admin password:**
   ```
   npx wrangler secret put ADMIN_PASSWORD
   ```
4. **Deploy:**
   ```
   npx wrangler deploy
   ```

From that point on, anyone on 12.247.0.158 gets an "Access restricted" page.

## Sending someone a device link
1. Go to **https://thestewartbrokerage.com/__gate/admin** and sign in. Any username works;
   use the password from step 3.
2. Enter their name and email, then click **Create link**.
3. Click **Open in my email app**. The message is already written. Check it and send.
4. They open the link **on the device they'll use**. That device is trusted, and the link
   stops working. If the link is forwarded, it does nothing on any other device.

The admin page lists every trusted device. **Revoke** blocks a device again.

## Blocking more IPs later
In `wrangler.toml`, edit `BLOCKED_IPS` (for example `"12.247.0.158, 98.1.2.3"`, or a range
like `"12.247.0.0/24"`), then run `npx wrangler deploy` again.

## Good to know
- Trust lives in a browser cookie. Clearing cookies or switching browsers means they need a
  new link.
- A blocked IP address can belong to a whole office or building, so every device there is
  blocked unless it has been trusted.
