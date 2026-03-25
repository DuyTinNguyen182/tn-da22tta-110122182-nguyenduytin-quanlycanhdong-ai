const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");

// 1. Logic Đăng Ký
const registerUser = async (data) => {
  const { fullName, email, password } = data;

  // Kiểm tra email tồn tại chưa
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new Error("Email này đã được sử dụng!");
  }

  // Mã hóa mật khẩu (Salt 10 vòng)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Lưu vào DB
  const user = await User.create({
    fullName,
    email,
    password: hashedPassword,
  });

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
};

// 2. Logic Đăng Nhập
const loginUser = async (email, password) => {
  // Tìm user theo email
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Email không tồn tại!");
  }

  // So sánh mật khẩu nhập vào vs mật khẩu đã mã hóa
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Mật khẩu không đúng!");
  }

  // Tạo Token (Thẻ bài) có hạn dùng 30 ngày
  const token = jwt.sign(
    { id: user._id, role: user.role },
    jwtConfig.SECRET_KEY,
    { expiresIn: jwtConfig.EXPIRES_IN }
  );

  // Trả về thông tin user (trừ pass) và token
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    token: token,
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id).select("_id fullName email role");
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  return user;
};

module.exports = { registerUser, loginUser, getUserById };
