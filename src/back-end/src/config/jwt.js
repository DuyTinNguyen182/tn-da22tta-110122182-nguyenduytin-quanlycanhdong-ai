const { JWT_SECRET } = require("./env");

module.exports = {
  SECRET_KEY: JWT_SECRET,
  EXPIRES_IN: "30d",
  COOKIE_NAME: "token",
};