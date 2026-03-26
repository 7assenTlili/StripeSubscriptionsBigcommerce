## What

Serverless function to enable **Stripe Subscriptions** for BigCommerce stores. Since BigCommerce's native Stripe integration does not support recurring subscriptions, this function acts as middleware — listening for order webhooks and automatically enrolling customers in Stripe subscription plans.

See [PLAN.md](PLAN.md) for a detailed architecture overview and POC plan.

## How It Works

1. A customer purchases a subscription product on your BigCommerce store
2. BigCommerce fires a `store/cart/converted` webhook to the Lambda endpoint
3. The Lambda function checks if the purchased product SKU matches configured subscription SKUs
4. If matched, it retrieves the Stripe payment intent from the BigCommerce transaction
5. It uses the payment intent to get the customer ID and payment method from Stripe
6. It creates a Stripe subscription for the customer using the configured price ID

## Contributing

George FitzGibbons

### Prerequisites

- **Node.js 18+**
- **Serverless Framework** — [https://serverless.com/](https://serverless.com/)
- **AWS Account** — [AWS setup guide for Serverless](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- **BigCommerce Store** with API credentials (read permissions for products and orders)
- **Stripe Account** with a subscription product and price configured

### Setup

1. Clone this repository:

```bash
git clone <your-fork-url>
cd StripeSubscriptionsBigcommerce/StripeManager
```

2. Copy the `.env.example` file and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `STORE_HASH` | Your BigCommerce store hash |
| `BC_CLIENT` | BigCommerce API Client ID |
| `BC_TOKEN` | BigCommerce API Access Token |
| `STRIPE_SECRET` | Stripe Secret API Key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_PRICE_ID` | Stripe Price ID for the subscription (`price_XXXX`) |
| `SUBSCRIPTION_SKUS` | Comma-separated product SKUs that trigger subscriptions |

3. Install dependencies:

```bash
npm install
```

4. Deploy:

```bash
sls deploy
```

You will get an API endpoint back:

```
endpoints:
  POST - https://{XXXXXX}.execute-api.us-east-1.amazonaws.com/dev/stripeManager
```

### BigCommerce Webhook Setup

Register a webhook to send order events to your endpoint:

```bash
curl --location --request POST 'https://api.bigcommerce.com/stores/{STORE_HASH}/v2/hooks' \
--header 'X-Auth-Client: YOUR_CLIENT_ID' \
--header 'X-Auth-Token: YOUR_ACCESS_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
 "scope": "store/cart/converted",
 "destination": "https://XXXXXX.execute-api.us-east-1.amazonaws.com/dev/stripeManager",
 "is_active": true
}'
```

### Product Configuration

In BigCommerce, ensure your subscription product has a **SKU** that matches one of the values in your `SUBSCRIPTION_SKUS` environment variable. The SKU should also correspond to a product in your Stripe dashboard.

### Additional Resources

- [Stripe Billing Portal](https://dashboard.stripe.com/test/settings/billing/portal) — Enable customer self-service subscription management
- [Stripe Subscription Overview](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Subscription Models](https://stripe.com/docs/billing/subscriptions/model)
- [Stripe Subscription Changes](https://stripe.com/docs/billing/subscriptions/change)
