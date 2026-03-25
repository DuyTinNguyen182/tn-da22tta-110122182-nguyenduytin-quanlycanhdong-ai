const authService = require("../services/authService");
const jwtConfig = require("../config/jwt");

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
});

const register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({ message: "Đăng ký thành công!", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const data = await authService.loginUser(email, password);
    const { token, ...userData } = data;

    res.cookie(jwtConfig.COOKIE_NAME, token, getCookieOptions());

    res.status(200).json({
      message: "Đăng nhập thành công!",
      user: userData,
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);

    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Không thể lấy thông tin người dùng" });
  }
};

const logout = async (req, res) => {
  res.clearCookie(jwtConfig.COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({ message: "Đăng xuất thành công" });
};

module.exports = { register, login, getMe, logout };
