const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  const token = req.cookies?.[jwtConfig.COOKIE_NAME];

  if (!token) {
    res
      .status(401)
      .json({ message: "Unauthorized - No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.SECRET_KEY);

    const user = await User.findById(decoded.id).select("_id role fullName email phone address");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  const userRole = (req.user?.role || "").toLowerCase();
  if (!req.user || userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }

  next();
};

module.exports = { protect, isAdmin };
