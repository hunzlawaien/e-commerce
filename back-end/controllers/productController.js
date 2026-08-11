import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";

// ==========================================
// ADD PRODUCT
// ==========================================

const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      subCategory,
      sizes,
      bestSeller,
    } = req.body;

    // ==========================================
    // VALIDATE BASIC FIELDS
    // ==========================================

    if (!name || !description || !category || !subCategory) {
      return res.status(400).json({
        success: false,
        message: "Name, description, category and subcategory are required.",
      });
    }

    // ==========================================
    // VALIDATE PRICE
    // ==========================================

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid product price.",
      });
    }

    // ==========================================
    // GET IMAGES
    // ==========================================

    const image1 = req.files?.image1?.[0];
    const image2 = req.files?.image2?.[0];
    const image3 = req.files?.image3?.[0];
    const image4 = req.files?.image4?.[0];

    const images = [image1, image2, image3, image4].filter(Boolean);

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required.",
      });
    }

    // ==========================================
    // UPLOAD IMAGES TO CLOUDINARY
    // ==========================================

    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });

        return result.secure_url;
      }),
    );

    // ==========================================
    // PARSE SIZES
    // ==========================================

    let parsedSizes = [];

    try {
      parsedSizes = sizes ? JSON.parse(sizes) : [];
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid product sizes.",
      });
    }

    if (!Array.isArray(parsedSizes) || parsedSizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one product size.",
      });
    }

    // ==========================================
    // CREATE PRODUCT DATA
    // ==========================================

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      category: category.trim(),
      subCategory: subCategory.trim(),
      sizes: parsedSizes,
      bestSeller: bestSeller === "true",
      image: imagesUrl,
      date: Date.now(),
    };

    console.log("PRODUCT DATA:", productData);

    // ==========================================
    // SAVE PRODUCT
    // ==========================================

    const product = new productModel(productData);

    await product.save();

    return res.json({
      success: true,
      message: "Product Added Successfully",
    });
  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// LIST PRODUCTS
// ==========================================

const listProducts = async (req, res) => {
  try {
    const products = await productModel.find({}).sort({ date: -1 });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("LIST PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// REMOVE PRODUCT
// ==========================================

const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    // ==========================================
    // FIND PRODUCT
    // ==========================================

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // ==========================================
    // DELETE PRODUCT
    // ==========================================

    await productModel.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Product Removed",
    });
  } catch (error) {
    console.error("REMOVE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// SINGLE PRODUCT
// ==========================================

const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("SINGLE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { addProduct, listProducts, removeProduct, singleProduct };
