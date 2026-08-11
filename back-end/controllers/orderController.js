import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import Stripe from "stripe";

// ==========================================
// GLOBAL VARIABLES
// ==========================================

const currency = "usd";
const deliveryCharge = 10;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ==========================================
// HELPER FUNCTION
// GET PRODUCTS + CALCULATE TOTAL
// ==========================================

const prepareOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty");
  }

  const productIds = items.map((item) => item.productId);

  // Remove duplicates
  const uniqueProductIds = [...new Set(productIds)];

  // Get actual products from MongoDB
  const products = await productModel.find({
    _id: { $in: uniqueProductIds },
  });

  if (products.length !== uniqueProductIds.length) {
    throw new Error("One or more products are no longer available");
  }

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  let calculatedAmount = 0;

  const orderItems = [];

  for (const item of items) {
    const { productId, size, quantity } = item;

    // Validate product ID
    if (!productId) {
      throw new Error("Product ID is required");
    }

    // Validate quantity
    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      throw new Error("Invalid product quantity");
    }

    // Find actual product
    const product = productMap.get(productId.toString());

    if (!product) {
      throw new Error("Product not found");
    }

    // Validate size
    if (!size) {
      throw new Error(`Size is required for ${product.name}`);
    }

    if (!product.sizes.includes(size)) {
      throw new Error(`Size ${size} is not available for ${product.name}`);
    }

    // IMPORTANT:
    // Price comes ONLY from MongoDB.
    const actualPrice = Number(product.price);

    if (!Number.isFinite(actualPrice) || actualPrice < 0) {
      throw new Error(`Invalid price for product ${product.name}`);
    }

    const itemTotal = actualPrice * parsedQuantity;

    calculatedAmount += itemTotal;

    // Store a snapshot of the product information
    // at the time of purchase.
    orderItems.push({
      productId: product._id,
      name: product.name,
      price: actualPrice,
      image: product.image,
      size,
      quantity: parsedQuantity,
    });
  }

  // Add delivery charge
  calculatedAmount += deliveryCharge;

  return {
    orderItems,
    calculatedAmount,
  };
};

// ==========================================
// COD ORDER
// ==========================================

const placeOrder = async (req, res) => {
  try {
    const userId = req.userId;

    const { items, address } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    // Verify user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get REAL products/prices from database
    const { orderItems, calculatedAmount } = await prepareOrderItems(items);

    // Create order
    const orderData = {
      userId,
      items: orderItems,
      amount: calculatedAmount,
      address,
      paymentMethod: "COD",
      payment: false,
      paymentStatus: "pending",
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);

    await newOrder.save();

    // Clear cart
    await userModel.findByIdAndUpdate(userId, {
      cartData: {},
    });

    return res.json({
      success: true,
      message: "Order Placed Successfully",
    });
  } catch (error) {
    console.error("COD ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// STRIPE CHECKOUT
// ==========================================

const placeOrderStripe = async (req, res) => {
  try {
    const userId = req.userId;

    const { items, address } = req.body;

    const frontendUrl = process.env.FRONTEND_URL;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is not configured",
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    // Verify user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // GET REAL PRODUCTS FROM DATABASE
    // ==========================================

    const { orderItems, calculatedAmount } = await prepareOrderItems(items);

    // ==========================================
    // CREATE PENDING ORDER
    // ==========================================

    const orderData = {
      userId,
      items: orderItems,
      amount: calculatedAmount,
      address,
      paymentMethod: "Stripe",
      payment: false,
      paymentStatus: "pending",
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);

    await newOrder.save();

    // ==========================================
    // STRIPE LINE ITEMS
    // ==========================================

    const line_items = orderItems.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Delivery charge
    line_items.push({
      price_data: {
        currency,
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    // ==========================================
    // CREATE STRIPE CHECKOUT SESSION
    // ==========================================

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items,

      success_url: `${frontendUrl}/verify?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${frontendUrl}/cart`,

      customer_email: user.email,

      metadata: {
        orderId: newOrder._id.toString(),
        userId: userId.toString(),
      },

      payment_intent_data: {
        metadata: {
          orderId: newOrder._id.toString(),
          userId: userId.toString(),
        },
      },
    });

    // ==========================================
    // SAVE STRIPE SESSION ID
    // ==========================================

    await orderModel.findByIdAndUpdate(newOrder._id, {
      stripeSessionId: session.id,
    });

    return res.json({
      success: true,
      session_url: session.url,
    });
  } catch (error) {
    console.error("STRIPE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// STRIPE WEBHOOK
// ==========================================

const stripeWebhook = async (req, res) => {
  console.log("======================================");
  console.log("STRIPE WEBHOOK RECEIVED");
  console.log("======================================");

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    console.error("NO STRIPE SIGNATURE");
    return res.status(400).send("Missing Stripe signature");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("STRIPE WEBHOOK SIGNATURE ERROR:", error.message);

    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  console.log("STRIPE EVENT:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        console.log("CHECKOUT SESSION:", session.id);

        console.log("PAYMENT STATUS:", session.payment_status);

        console.log("METADATA:", session.metadata);

        const orderId = session.metadata?.orderId;

        if (!orderId) {
          console.error("NO ORDER ID IN METADATA");
          break;
        }

        if (session.payment_status !== "paid") {
          console.log("PAYMENT NOT PAID:", session.payment_status);
          break;
        }

        const order = await orderModel.findById(orderId);

        if (!order) {
          console.error("ORDER NOT FOUND:", orderId);
          break;
        }

        console.log("ORDER FOUND:", order._id.toString());

        if (order.payment === true) {
          console.log("ORDER ALREADY PAID");
          break;
        }

        await orderModel.findByIdAndUpdate(orderId, {
          payment: true,
          paymentStatus: "paid",
          paymentIntentId: session.payment_intent,
        });

        await userModel.findByIdAndUpdate(order.userId, {
          cartData: {},
        });

        console.log("======================================");

        console.log("PAYMENT VERIFIED SUCCESSFULLY");

        console.log("ORDER ID:", orderId);

        console.log("PAYMENT INTENT:", session.payment_intent);

        console.log("======================================");

        break;
      }

      default:
        console.log("Unhandled Stripe event:", event.type);
    }

    return res.json({
      received: true,
    });
  } catch (error) {
    console.error("STRIPE WEBHOOK PROCESSING ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

// ==========================================
// GET STRIPE SESSION STATUS
// ==========================================

const getStripeSession = async (req, res) => {
  try {
    const userId = req.userId;

    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Retrieve session directly from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Stripe session",
      });
    }

    // Find order
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Make sure this order belongs to logged-in user
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized order",
      });
    }

    return res.json({
      success: true,
      paymentStatus: session.payment_status,
      orderPayment: order.payment,
      orderId: order._id,
    });
  } catch (error) {
    console.error("STRIPE SESSION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment status",
    });
  }
};

// ==========================================
// RAZORPAY
// ==========================================

const placeOrderRazorpay = async (req, res) => {
  return res.status(501).json({
    success: false,
    message: "Razorpay is not implemented yet",
  });
};

// ==========================================
// ALL ORDERS - ADMIN
// ==========================================

const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({}).sort({ date: -1 });

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("ALL ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch orders",
    });
  }
};

// ==========================================
// USER ORDERS
// ==========================================

const userOrders = async (req, res) => {
  try {
    // User ID comes from JWT
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const orders = await orderModel.find({ userId }).sort({ date: -1 });

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("USER ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch orders",
    });
  }
};

// ==========================================
// UPDATE ORDER STATUS - ADMIN
// ==========================================

const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const allowedStatuses = [
      "Order Placed",
      "Packing",
      "Shipped",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;

    await order.save();

    return res.json({
      success: true,
      message: "Status Updated",
    });
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update order status",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

export {
  placeOrder,
  placeOrderStripe,
  placeOrderRazorpay,
  allOrders,
  userOrders,
  updateStatus,
  stripeWebhook,
  getStripeSession,
};
