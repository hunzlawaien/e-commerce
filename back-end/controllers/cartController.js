import userModel from "../models/userModel.js";

// ==========================================
// ADD TO CART
// ==========================================

const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId, size } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!itemId || !size) {
      return res.status(400).json({
        success: false,
        message: "Product and size are required",
      });
    }

    const userData = await userModel.findById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User account not found. Please login again.",
      });
    }

    let cartData = userData.cartData || {};

    if (!cartData[itemId]) {
      cartData[itemId] = {};
    }

    if (!cartData[itemId][size]) {
      cartData[itemId][size] = 1;
    } else {
      cartData[itemId][size] += 1;
    }

    await userModel.findByIdAndUpdate(userId, {
      cartData,
    });

    return res.json({
      success: true,
      message: "Added to Cart",
    });
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE CART
// ==========================================

const updateCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId, size, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!itemId || !size) {
      return res.status(400).json({
        success: false,
        message: "Product and size are required",
      });
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity",
      });
    }

    const userData = await userModel.findById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User account not found. Please login again.",
      });
    }

    let cartData = userData.cartData || {};

    if (!cartData[itemId]) {
      cartData[itemId] = {};
    }

    if (parsedQuantity === 0) {
      delete cartData[itemId][size];

      if (Object.keys(cartData[itemId]).length === 0) {
        delete cartData[itemId];
      }
    } else {
      cartData[itemId][size] = parsedQuantity;
    }

    await userModel.findByIdAndUpdate(userId, {
      cartData,
    });

    return res.json({
      success: true,
      message: "Cart Updated",
    });
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET USER CART
// ==========================================

const getUserCart = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userData = await userModel.findById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User account not found. Please login again.",
      });
    }

    return res.json({
      success: true,
      cartData: userData.cartData || {},
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { addToCart, updateCart, getUserCart };
