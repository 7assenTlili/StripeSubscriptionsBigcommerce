# Running the Serverless Project Locally & Testing with BigCommerce

## Prerequisites

```bash
npm install -g serverless
npm install -g ngrok        # or use a free alternative like localtunnel
cd StripeManager && npm install
```

---

## Step 1 — Create a `.env` file

Create `/StripeManager/.env` with your real credentials:

```ini
STORE_HASH=your_bc_store_hash
BC_CLIENT=your_bc_client_id
BC_TOKEN=your_bc_access_token
STRIPE_SECRET=sk_test_...
STRIPE_PRICE_ID=price_...
SUBSCRIPTION_SKUS=SKU-001,SKU-002   # comma-separated SKUs that trigger subscriptions
```

> ⚠️ Add `.env` to `.gitignore` — never commit it.

---

## Step 2 — Start the local server

Use `serverless-offline` to emulate API Gateway locally:

```bash
cd StripeManager

# Install serverless-offline (one-time)
npm install --save-dev serverless-offline

# Start the local server (reads .env via serverless-dotenv-plugin)
npx serverless offline
```

The handler will be available at:
```
POST http://localhost:3000/dev/stripeManager
```

---

## Step 3 — Expose localhost to the internet with ngrok

BigCommerce webhooks **must call a public HTTPS URL**. Use ngrok to create a tunnel:

```bash
# In a new terminal tab
ngrok http 3000
```

ngrok will print something like:
```
Forwarding  https://a1b2c3d4.ngrok-free.app -> http://localhost:3000
```

Your public endpoint becomes:
```
https://a1b2c3d4.ngrok-free.app/dev/stripeManager
```

---

## Step 4 — Register the webhook in BigCommerce

Go to your BigCommerce store and create a webhook that fires on order creation.  
You can do this via the BigCommerce API:

```bash
curl -X POST \
  https://api.bigcommerce.com/stores/YOUR_STORE_HASH/v3/hooks \
  -H 'X-Auth-Token: YOUR_BC_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "scope": "store/order/statusUpdated",
    "destination": "https://a1b2c3d4.ngrok-free.app/dev/stripeManager",
    "is_active": true
  }'
```

> Replace `YOUR_STORE_HASH`, `YOUR_BC_TOKEN`, and the ngrok URL with your actual values.

---

## Step 5 — Test end-to-end

1. Place a test order in your BigCommerce store that contains one of your `SUBSCRIPTION_SKUS` products.
2. Complete checkout using a Stripe test card (e.g., `4242 4242 4242 4242`).
3. BigCommerce fires the webhook → ngrok forwards it to your local `serverless offline` server.
4. Watch your terminal for logs:
   ```
   Subscription product found: SKU-001
   Gateway transaction ID: pi_...
   Subscription created: sub_...
   ```

---

## Step 6 — Test manually with curl (without placing a real order)

Grab a real `orderId` from your BigCommerce store and call the endpoint directly:

```bash
curl -X POST http://localhost:3000/dev/stripeManager \
  -H 'Content-Type: application/json' \
  -d '{"data": {"orderId": 123}}'
```

---

## Serverless Offline — add to `serverless.yml`

Add `serverless-offline` to the plugins list so it picks up automatically:

```yaml
plugins:
  - serverless-dotenv-plugin
  - serverless-offline       # ← add this line
```

---

## Quick Troubleshooting

| Problem | Fix |
|---|---|
| `STRIPE_PRICE_ID` not found | Check your `.env` file is in the `StripeManager/` folder |
| ngrok URL expired | Free ngrok sessions expire; restart `ngrok http 3000` and update the BC webhook |
| Webhook not firing | Ensure the BigCommerce webhook `scope` matches the order status change you trigger |
| 500 from Stripe | Use `sk_test_` keys in `.env`, not live keys, during local testing |
