# How Stripe Subscriptions Work with BigCommerce

> **Audience:** Non-technical stakeholders, project managers, business owners
>
> This document explains how we handle recurring subscription billing for customers who purchase subscription products through a BigCommerce store.

---

## The Problem

BigCommerce supports Stripe as a payment provider for **one-time purchases**, but it **does not natively support Stripe subscriptions** (recurring billing). When a customer buys a subscription product, BigCommerce processes it as a regular one-time payment — it does not tell Stripe to charge the customer again next month.

## Our Solution

We built a small automated service that sits between BigCommerce and Stripe. Whenever a customer completes a purchase, this service automatically checks if the product is a subscription. If it is, the service sets up recurring billing in Stripe — so the customer is charged automatically each billing cycle without any manual work.

**No changes are needed to the BigCommerce storefront or checkout experience.** The customer shops and pays as usual. Everything happens behind the scenes.

---

## How It Works — The Big Picture

![Subscription Flow Overview](subscription-flow-overview.png)

<details>
<summary>View interactive diagram (GitHub only)</summary>

```mermaid
flowchart LR
    A["🛒 Customer\nPlaces Order"] --> B["🏪 BigCommerce\nProcesses Payment"]
    B --> C["⚡ Our Service\n(Automatic)"]
    C --> D{"Is this a\nsubscription\nproduct?"}
    D -- Yes --> E["💳 Stripe Creates\nRecurring Subscription"]
    D -- No --> F["✅ Nothing else needed\n(One-time purchase)"]
    E --> G["🔄 Stripe Charges Customer\nEvery Billing Cycle"]

    style A fill:#e3f2fd,stroke:#1565c0,color:#000
    style B fill:#fff3e0,stroke:#e65100,color:#000
    style C fill:#f3e5f5,stroke:#6a1b9a,color:#000
    style D fill:#fff9c4,stroke:#f57f17,color:#000
    style E fill:#e8f5e9,stroke:#2e7d32,color:#000
    style F fill:#f5f5f5,stroke:#616161,color:#000
    style G fill:#e8f5e9,stroke:#2e7d32,color:#000
```

</details>

---

## Step-by-Step Flow

The diagram below shows the exact sequence of events that happen when a customer places an order:

![Subscription Sequence Diagram](subscription-sequence-diagram.png)

<details>
<summary>View interactive diagram (GitHub only)</summary>

```mermaid
sequenceDiagram
    actor Customer
    participant BC as 🏪 BigCommerce Store
    participant Service as ⚡ Our Subscription Service
    participant Stripe as 💳 Stripe

    Customer->>BC: 1. Browses store and adds<br/>subscription product to cart
    Customer->>BC: 2. Completes checkout<br/>and pays with credit card
    BC->>Stripe: 3. Processes the one-time<br/>payment through Stripe
    Stripe-->>BC: 4. Payment confirmed ✅

    Note over BC,Service: BigCommerce automatically notifies our service

    BC->>Service: 5. Sends order notification<br/>(webhook)
    Service->>BC: 6. Asks BigCommerce:<br/>"What products were in this order?"
    BC-->>Service: 7. Returns product details<br/>(including product SKU)

    alt Product IS a subscription product
        Service->>BC: 8. Asks BigCommerce:<br/>"What payment method was used?"
        BC-->>Service: 9. Returns payment transaction ID
        Service->>Stripe: 10. Looks up the customer<br/>and their credit card on file
        Stripe-->>Service: 11. Returns customer and<br/>payment method details
        Service->>Stripe: 12. Creates a recurring<br/>subscription for this customer
        Stripe-->>Service: 13. Subscription created ✅
        Note over Stripe: Stripe now automatically charges<br/>the customer every billing cycle
    else Product is NOT a subscription product
        Note over Service: No action needed —<br/>it was a regular one-time purchase
    end
```

</details>

---

## What Each System Does

| System | Role | Think of it as... |
|--------|------|-------------------|
| **BigCommerce** | The online store where customers browse and buy products | The storefront and cash register |
| **Our Subscription Service** | Automatically detects subscription purchases and sets up recurring billing | The behind-the-scenes assistant |
| **Stripe** | Processes payments and manages recurring subscriptions | The billing and payments department |

---

## Plain English Summary

Here is what happens in simple terms:

1. **A customer visits the BigCommerce store** and purchases a product that we have marked as a subscription (for example, a monthly coffee delivery or a software license).

2. **BigCommerce processes the payment** through Stripe, just like any normal purchase. The customer pays once and receives a confirmation.

3. **BigCommerce sends a notification** to our automated service saying "Hey, a new order was just placed."

4. **Our service checks the order** by asking BigCommerce what products were purchased. It looks at the product codes (SKUs) to determine if any of them are subscription products.

5. **If it finds a subscription product**, our service retrieves the payment details from the original transaction and tells Stripe: "This customer should be billed automatically every month (or whatever the billing cycle is) using the same payment method they just used."

6. **Stripe takes over from here.** It automatically charges the customer's credit card on each billing cycle, sends them invoices, and handles any payment issues — all without any manual intervention.

7. **If no subscription product is found** in the order, our service does nothing. It was just a regular one-time purchase.

---

## Key Benefits

- **Zero manual work** — Subscriptions are created automatically; no one needs to manually set up recurring billing for each customer.
- **Seamless customer experience** — The customer checks out normally on BigCommerce. They don't see anything different.
- **No changes to BigCommerce** — We don't modify the store, the checkout, or any BigCommerce settings. Our service works alongside the existing setup.
- **Stripe handles billing** — Once a subscription is created, Stripe manages all future charges, retries on failed payments, and invoice generation.
- **Configurable** — We can easily change which products are treated as subscriptions by updating a simple configuration setting.

---

## Frequently Asked Questions

**Q: Does the customer need to do anything different at checkout?**
No. The checkout experience is exactly the same. The subscription setup happens automatically after they pay.

**Q: What if a customer buys both a subscription product and a regular product in the same order?**
Our service only creates a subscription for the subscription product. The regular product is treated as a normal one-time purchase.

**Q: How does the customer manage their subscription (cancel, update payment, etc.)?**
Stripe provides a customer billing portal that can be embedded in the BigCommerce "My Account" page, allowing customers to manage their subscriptions self-service.

**Q: What happens if the automatic payment fails on the next billing cycle?**
Stripe has built-in retry logic and will attempt to charge the card multiple times. It also sends email notifications to the customer about failed payments.

**Q: Is this secure?**
Yes. All sensitive payment data is handled by Stripe — our service never stores credit card numbers. Communication between all systems uses encrypted connections (HTTPS).
