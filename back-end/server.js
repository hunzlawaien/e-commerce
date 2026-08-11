import express from "express";
import cors from "cors";
import "dotenv/config";

import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import userRouter from "./routes/userRoutes.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";

import { stripeWebhook } from "./controllers/orderController.js";

// ==========================================
// APP CONFIG
// ==========================================

const app = express();

const port = process.env.PORT || 4000;

// ==========================================
// DATABASE / CLOUDINARY
// ==========================================

connectDB();
connectCloudinary();

// ==========================================
// CORS
// ==========================================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an origin
      // such as Postman/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// ==========================================
// STRIPE WEBHOOK
//
// IMPORTANT:
// This MUST come before express.json()
// ==========================================

app.post(
  "/api/order/webhook",
  express.raw({
    type: "application/json",
  }),
  stripeWebhook,
);

// ==========================================
// JSON BODY PARSER
// ==========================================

app.use(express.json());

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/user", userRouter);

app.use("/api/product", productRouter);

app.use("/api/cart", cartRouter);

app.use("/api/order", orderRouter);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.status(200).send("API WORKING");
});

// ==========================================
// START SERVER (local development only)
// ==========================================

if (process.env.NODE_ENV !== "production") {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server started on PORT: ${port}`);
  });
}

// ==========================================
// EXPORT FOR VERCEL
// ==========================================

export default app;
