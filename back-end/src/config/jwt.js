module.exports = {
  SECRET_KEY: process.env.JWT_SECRET || process.env.SECRET_KEY,
  EXPIRES_IN: "30d",
  COOKIE_NAME: "token",
};