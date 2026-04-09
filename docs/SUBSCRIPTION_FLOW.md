## The Problem

BigCommerce supports Stripe as a payment provider for **one-time purchases**, but it **does not natively support Stripe subscriptions** (recurring billing). When a customer buys a subscription product, BigCommerce processes it as a regular one-time payment — it does not tell Stripe to charge the customer again next month.

## Our Solution

We built a small automated service that sits between BigCommerce and Stripe. Whenever a customer completes a purchase, this service automatically checks if the product is a subscription. If it is, the service sets up recurring billing in Stripe — so the customer is charged automatically each billing cycle without any manual work.

**No changes are needed to the BigCommerce storefront or checkout experience.** The customer shops and pays as usual. Everything happens behind the scenes.

---

## How It Works — The Big Picture

![Subscription Flow Overview](subscription-flow-overview.png)

---

## Step-by-Step Flow

The diagram below shows the exact sequence of events that happen when a customer places an order:

![Subscription Sequence Diagram](subscription-sequence-diagram.png)

---

## What Each System Does

| System | Role | Think of it as... |
|--------|------|-------------------|
| **BigCommerce** | The online store where customers browse and buy products | The storefront and cash register |
| **Our Subscription Service** | Automatically detects subscription purchases and sets up recurring billing | The behind-the-scenes assistant |
| **Stripe** | Processes payments and manages recurring subscriptions | The billing and payments department |

---
