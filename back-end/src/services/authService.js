const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");

// 1. Logic Đăng Ký
const registerUser = async (data) => {
  const { fullName, email, password, phone, address } = data;

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
    phone: phone || "",
    address: address || "",
  });

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
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
    phone: user.phone,
    address: user.address,
    role: user.role,
    token: token,
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id).select("_id fullName email phone address role");
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  return user;
};

const updateProfile = async (id, profileData) => {
  const { fullName, email, phone, address } = profileData;

  if (email) {
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      throw new Error("Email này đã được sử dụng!");
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      fullName,
      email,
      phone: phone || "",
      address: address || "",
    },
    { new: true, runValidators: true }
  ).select("_id fullName email phone address role");

  if (!updatedUser) {
    throw new Error("Không tìm thấy người dùng");
  }

  return updatedUser;
};

const changePassword = async (id, currentPassword, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải ít nhất 6 ký tự");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Mật khẩu hiện tại không đúng");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();
};

module.exports = { registerUser, loginUser, getUserById, updateProfile, changePassword };
