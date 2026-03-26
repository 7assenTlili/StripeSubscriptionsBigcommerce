# Stripe Subscriptions for BigCommerce — POC Plan

## Problem

Stripe subscriptions are **not natively supported** in BigCommerce when using the native Stripe integration. BigCommerce handles one-time payments through Stripe, but does not automatically create recurring subscriptions in Stripe when a customer purchases a subscription-type product.

## Solution Overview

This repository implements a **serverless function** (AWS Lambda) that bridges the gap between BigCommerce and Stripe by:

1. Listening for BigCommerce **webhook events** when an order is placed
2. Detecting whether the purchased product is a **subscription product** (by matching SKUs)
3. Retrieving the **payment method** used for the order from Stripe
4. Automatically creating a **Stripe subscription** for the customer

This approach requires no modifications to the BigCommerce storefront or Stripe's native integration — it works as a **middleware layer** triggered by webhooks.

## Architecture

```
┌──────────────────┐       Webhook (store/cart/converted)       ┌──────────────────────┐
│                  │ ─────────────────────────────────────────▶  │   AWS API Gateway     │
│   BigCommerce    │                                            │         +             │
│     Store        │ ◀──── BigCommerce API (order/product data) │   AWS Lambda          │
│                  │                                            │   (handler.js)        │
└──────────────────┘                                            └──────────┬───────────┘
                                                                           │
                                                                           │ Stripe API
                                                                           │ (payment intent → subscription)
                                                                           ▼
                                                                ┌──────────────────────┐
                                                                │      Stripe          │
                                                                │  (Subscriptions +    │
                                                                │   Billing Portal)    │
                                                                └──────────────────────┘
```

## How It Works (Step by Step)

### 1. Customer Places Order
A customer purchases a product on your BigCommerce store that has been designated as a subscription product (identified by matching SKU).

### 2. BigCommerce Fires Webhook
When the cart converts to an order, BigCommerce sends a `store/cart/converted` webhook to the Lambda function endpoint with the `orderId`.

### 3. Lambda Validates the Order
The serverless function:
- Fetches order details and product data from the **BigCommerce API**
- Checks if any product SKU matches the configured subscription product SKUs (via `SUBSCRIPTION_SKUS` environment variable)

### 4. Lambda Creates the Subscription
If a subscription product is found:
- Retrieves the **transaction ID** (Stripe payment intent) from BigCommerce
- Uses the Stripe API to look up the **customer ID** and **payment method** from the payment intent
- Creates a new **Stripe subscription** using the configured price ID

### 5. Stripe Manages Recurring Billing
From this point, Stripe handles all recurring billing, invoicing, and payment collection automatically.

## Configuration

All configuration is done via environment variables (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `STORE_HASH` | Your BigCommerce store hash |
| `BC_CLIENT` | BigCommerce API Client ID |
| `BC_TOKEN` | BigCommerce API Access Token |
| `STRIPE_SECRET` | Stripe Secret API Key |
| `STRIPE_PRICE_ID` | Stripe Price ID for the subscription plan |
| `SUBSCRIPTION_SKUS` | Comma-separated list of product SKUs that trigger subscriptions |

## Prerequisites

1. **BigCommerce Store** with Stripe as a payment provider
2. **Stripe Account** with a configured subscription product and price
3. **AWS Account** for deploying the Lambda function
4. **Node.js 18+** installed locally
5. **Serverless Framework** CLI installed (`npm install -g serverless`)

## Deployment Steps

1. Clone this repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies: `cd StripeManager && npm install`
4. Deploy: `sls deploy`
5. Register the BigCommerce webhook pointing to your Lambda endpoint
6. Ensure BigCommerce product SKUs match the `SUBSCRIPTION_SKUS` values

## Key Improvements Made (POC)

| Area | Before | After |
|------|--------|-------|
| **Runtime** | Node.js 10.x (EOL) | Node.js 18.x |
| **HTTP Client** | `request` (deprecated) | `axios` |
| **Config** | Hardcoded SKUs and price IDs | Environment variables |
| **SKU Bug** | Always-truthy condition | Proper SKU array matching |
| **Error Handling** | Generic 500 errors | Detailed error logging |
| **Validation** | None | Input validation + null checks |
| **Documentation** | Basic README | Architecture docs + `.env.example` |

## Future Enhancements (Beyond POC)

- [ ] **Webhook signature validation** — Verify BigCommerce webhook signatures to prevent spoofed requests
- [ ] **Multiple subscription tiers** — Map different SKUs to different Stripe price IDs
- [ ] **Stripe Customer Portal** — Embed Stripe's billing portal in BigCommerce "My Account" page
- [ ] **Idempotency** — Prevent duplicate subscriptions if webhook is delivered multiple times
- [ ] **Unit tests** — Add Jest-based test suite with mocked API calls
- [ ] **Monitoring** — Add CloudWatch alarms for Lambda errors
- [ ] **CI/CD pipeline** — Automate deployment with GitHub Actions
