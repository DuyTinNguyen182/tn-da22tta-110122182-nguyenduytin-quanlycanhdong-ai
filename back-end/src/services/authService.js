const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const registerUser = async (data) => {
  const { fullName, password, phone, address } = data;
  const email = normalizeEmail(data.email);

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new Error("Email nay da duoc su dung!");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

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

const loginUser = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    throw new Error("Email khong ton tai!");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Mat khau khong dung!");
  }

  const token = jwt.sign({ id: user._id, role: user.role }, jwtConfig.SECRET_KEY, {
    expiresIn: jwtConfig.EXPIRES_IN,
  });

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
    token,
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id).select("_id fullName email phone address role");
  if (!user) {
    throw new Error("Khong tim thay nguoi dung");
  }

  return user;
};

const updateProfile = async (id, profileData) => {
  const { fullName, phone, address } = profileData;
  const email = profileData.email ? normalizeEmail(profileData.email) : undefined;

  if (email) {
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      throw new Error("Email nay da duoc su dung!");
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
    throw new Error("Khong tim thay nguoi dung");
  }

  return updatedUser;
};

const changePassword = async (id, currentPassword, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mat khau moi phai it nhat 6 ky tu");
  }

  const user = await User.findById(id).select("+password");
  if (!user) {
    throw new Error("Khong tim thay nguoi dung");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Mat khau hien tai khong dung");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();
};

module.exports = { registerUser, loginUser, getUserById, updateProfile, changePassword };
