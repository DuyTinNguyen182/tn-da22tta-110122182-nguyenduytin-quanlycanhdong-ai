const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { FRONTEND_URL } = require("../config/env");
const jwtConfig = require("../config/jwt");
const { sendMail } = require("./mailService");
const {
  buildPasswordResetEmailTemplate,
} = require("../templates/passwordResetEmailTemplate");

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const isAccountLocked = (user) => user?.accountStatus === "locked";

const getPasswordResetSecret = (passwordHash) =>
  `${jwtConfig.SECRET_KEY}:${passwordHash}`;

const registerUser = async (data) => {
  const { fullName, password, gender, phone, address } = data;
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
    gender: gender || "",
    phone: phone || "",
    address: address || "",
  });

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    accountStatus: user.accountStatus,
    role: user.role,
  };
};

const loginUser = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password",
  );
  if (!user) {
    throw new Error("Email không tồn tại!");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Mật khẩu không đúng!");
  }

  if (isAccountLocked(user)) {
    const error = new Error(
      "Tài khoản đã bị khóa. Vui lòng liên hệ Ban quản lý HTX.",
    );
    error.statusCode = 403;
    throw error;
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    jwtConfig.SECRET_KEY,
    {
      expiresIn: jwtConfig.EXPIRES_IN,
    },
  );

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    accountStatus: user.accountStatus,
    role: user.role,
    token,
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id).select(
    "_id fullName email gender phone address accountStatus role",
  );
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  return user;
};

const updateProfile = async (id, profileData) => {
  const { fullName, gender, phone, address } = profileData;
  const email = profileData.email
    ? normalizeEmail(profileData.email)
    : undefined;

  if (email) {
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      throw new Error("Email nay da duoc su dung!");
    }
  }

  const updateData = {
    fullName,
    email,
    phone: phone || "",
    address: address || "",
  };

  if (gender !== undefined) {
    updateData.gender = gender || "";
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("_id fullName email gender phone address accountStatus role");

  if (!updatedUser) {
    throw new Error("Không tìm thấy người dùng");
  }

  return updatedUser;
};

const changePassword = async (id, currentPassword, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải ít nhất 6 ký tự");
  }

  const user = await User.findById(id).select("+password");
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

const requestPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password",
  );

  if (!user) {
    return;
  }

  const resetToken = jwt.sign(
    {
      id: user._id.toString(),
      purpose: "password-reset",
    },
    getPasswordResetSecret(user.password),
    { expiresIn: "15m" },
  );

  const resetUrl = `${FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const mailContent = buildPasswordResetEmailTemplate({
    recipientName: user.fullName,
    resetUrl,
  });

  try {
    await sendMail({
      to: user.email,
      ...mailContent,
    });
  } catch (error) {
    throw new Error(
      "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.",
    );
  }
};

const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new Error("Liên kết đặt lại mật khẩu không hợp lệ");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
  }

  const decodedToken = jwt.decode(token);
  if (!decodedToken?.id || decodedToken?.purpose !== "password-reset") {
    throw new Error("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
  }

  const user = await User.findById(decodedToken.id).select("+password");
  if (!user) {
    throw new Error("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
  }

  try {
    const verifiedToken = jwt.verify(
      token,
      getPasswordResetSecret(user.password),
    );

    if (
      verifiedToken?.id !== user._id.toString() ||
      verifiedToken?.purpose !== "password-reset"
    ) {
      throw new Error("Invalid reset token");
    }
  } catch (error) {
    throw new Error("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
