import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  try {
    const { token } = req.headers;

    // No token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized. Login Again.",
      });
    }

    // Verify JWT
    const token_decode = jwt.verify(token, process.env.JWT_SECRET);

    // Store authenticated user ID separately
    // DO NOT put it inside req.body
    req.userId = token_decode.id;

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authUser;
