import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER
    // ==========================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // ORDER ITEMS
    // ==========================================

    items: {
      type: Array,
      required: true,
    },

    // ==========================================
    // ORDER AMOUNT
    // ==========================================

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // DELIVERY ADDRESS
    // ==========================================

    address: {
      type: Object,
      required: true,
    },

    // ==========================================
    // ORDER STATUS
    // ==========================================

    status: {
      type: String,
      required: true,
      default: "Order Placed",

      enum: [
        "Order Placed",
        "Packing",
        "Shipped",
        "Out for delivery",
        "Delivered",
        "Cancelled",
      ],
    },

    // ==========================================
    // PAYMENT METHOD
    // ==========================================

    paymentMethod: {
      type: String,
      required: true,
      enum: ["COD", "Stripe", "Razorpay"],
    },

    // ==========================================
    // PAYMENT
    // ==========================================

    payment: {
      type: Boolean,
      required: true,
      default: false,
    },

    // ==========================================
    // PAYMENT STATUS
    // ==========================================

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    // ==========================================
    // STRIPE CHECKOUT SESSION
    // ==========================================

    stripeSessionId: {
      type: String,
      default: null,
    },

    // ==========================================
    // STRIPE PAYMENT INTENT
    // ==========================================

    paymentIntentId: {
      type: String,
      default: null,
    },

    // ==========================================
    // DATE
    // ==========================================

    date: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const orderModel =
  mongoose.models.Order || mongoose.model("Order", orderSchema);

export default orderModel;
