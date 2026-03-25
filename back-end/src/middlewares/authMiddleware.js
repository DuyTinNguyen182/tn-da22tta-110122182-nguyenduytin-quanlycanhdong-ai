const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");

const protect = (req, res, next) => {
  const token = req.cookies?.[jwtConfig.COOKIE_NAME];

  if (!token) {
    res
      .status(401)
      .json({ message: "Unauthorized - No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.SECRET_KEY);
    req.user = decoded;
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
