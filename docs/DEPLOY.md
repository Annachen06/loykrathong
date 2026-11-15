# Deploying

- Day-to-day work goes on the `thai-temple-fair` branch. Nothing there changes the live site.
- The live site (Cloudflare Workers) builds from the `production` branch with `npm run build`, then `npx wrangler deploy` publishes `dist/` (see `wrangler.jsonc`).
- To release: after the owner confirms, fast-forward `production` to `thai-temple-fair` (`git push origin thai-temple-fair:production`). Cloudflare builds and publishes in 1-2 minutes.
- Firestore / Realtime Database rules (`firestore.rules`, `database.rules.json`) are not deployed this way; paste them in the Firebase console when they change.
