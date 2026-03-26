"use strict";
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const BigCommerce = require("node-bigcommerce");

const bigCommerce = new BigCommerce({
  logLevel: "info",
  clientId: process.env.BC_CLIENT,
  accessToken: process.env.BC_TOKEN,
  storeHash: process.env.STORE_HASH,
  responseType: "json",
  apiVersion: "v2"
});

function getSubscriptionSkus() {
  const skus = process.env.SUBSCRIPTION_SKUS || "";
  return skus.split(",").map(s => s.trim()).filter(Boolean);
}

function isSubscriptionProduct(sku) {
  const subscriptionSkus = getSubscriptionSkus();
  return subscriptionSkus.includes(sku);
}

async function getTransactionId(orderDataId) {
  const url = `https://api.bigcommerce.com/stores/${process.env.STORE_HASH}/v3/orders/${orderDataId}/transactions`;
  const response = await axios.get(url, {
    headers: {
      accept: "application/json",
      "X-Auth-Client": process.env.BC_CLIENT,
      "X-Auth-Token": process.env.BC_TOKEN
    }
  });
  console.log("transaction", JSON.stringify(response.data));
  return response.data;
}

async function getOrderDataProducts(orderDataId) {
  const orderData = await bigCommerce.get(
    `/orders/${orderDataId}/products?include=custom_fields`
  );
  return orderData;
}

async function stripePaymentMethods(purchaseIntent) {
  const paymentIntent = await stripe.paymentIntents.retrieve(purchaseIntent);
  return paymentIntent;
}

async function addSubscription(customerId, paymentMethod) {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID environment variable is not configured");
  }
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    default_payment_method: paymentMethod,
    items: [{ price: priceId }]
  });
  return subscription;
}

module.exports.stripeManager = async event => {
  const corsHeaders = {
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ status: 400, message: "Missing request body" })
      };
    }

    const data = JSON.parse(event.body);
    const orderId = data && data.data && data.data.orderId;
    if (!orderId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ status: 400, message: "Missing orderId in webhook payload" })
      };
    }

    const orderItemsData = await getOrderDataProducts(orderId);

    if (!orderItemsData || orderItemsData.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No items found in order" })
      };
    }

    const subscriptionItem = orderItemsData.find(item => isSubscriptionProduct(item.sku));

    if (!subscriptionItem) {
      console.log("No subscription product found in order, skipping");
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "No subscription product in order" })
      };
    }

    console.log("Subscription product found:", subscriptionItem.sku);

    // Get transaction from BigCommerce
    const transactionData = await getTransactionId(orderId);
    if (!transactionData.data || transactionData.data.length === 0) {
      throw new Error("No transaction data found for order");
    }

    const gatewayTransactionId = transactionData.data[0].gateway_transaction_id;
    console.log("Gateway transaction ID:", gatewayTransactionId);

    // Get customer and payment method from Stripe
    const paymentIntent = await stripePaymentMethods(gatewayTransactionId);

    // Create subscription
    const subscription = await addSubscription(
      paymentIntent.customer,
      paymentIntent.payment_method
    );

    console.log("Subscription created:", subscription.id);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Subscription created successfully",
        subscriptionId: subscription.id
      })
    };
  } catch (err) {
    console.error("Error processing subscription:", err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 500,
        message: "Something went wrong processing the subscription"
      })
    };
  }
};
