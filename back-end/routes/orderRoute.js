import express from "express";

import authUser from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";

import {
  placeOrder,
  placeOrderStripe,
  placeOrderRazorpay,
  allOrders,
  userOrders,
  updateStatus,
  stripeWebhook,
  getStripeSession,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// ==========================================
// STRIPE WEBHOOK
// ==========================================
// This route should actually be registered
// in server.js BEFORE express.json().

// ==========================================
// ADMIN
// ==========================================

orderRouter.post("/list", adminAuth, allOrders);

orderRouter.post("/status", adminAuth, updateStatus);

// ==========================================
// PAYMENT
// ==========================================

orderRouter.post("/place", authUser, placeOrder);

orderRouter.post("/stripe", authUser, placeOrderStripe);

orderRouter.post("/razorpay", authUser, placeOrderRazorpay);

// ==========================================
// USER ORDERS
// ==========================================

orderRouter.post("/userorders", authUser, userOrders);

// ==========================================
// STRIPE SESSION
// ==========================================

orderRouter.get("/stripe-session/:sessionId", authUser, getStripeSession);

export default orderRouter;
