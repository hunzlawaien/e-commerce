import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // ==========================================
    // PRODUCT NAME
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // DESCRIPTION
    // ==========================================

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // PRICE
    // ==========================================

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // IMAGES
    // ==========================================

    image: {
      type: [String],
      required: true,
    },

    // ==========================================
    // CATEGORY
    // ==========================================

    category: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // SUB CATEGORY
    // ==========================================

    subCategory: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // SIZES
    // ==========================================

    sizes: {
      type: [String],
      required: true,
    },

    // ==========================================
    // BEST SELLER
    // ==========================================

    bestSeller: {
      type: Boolean,
      default: false,
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

const productModel =
  mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;
