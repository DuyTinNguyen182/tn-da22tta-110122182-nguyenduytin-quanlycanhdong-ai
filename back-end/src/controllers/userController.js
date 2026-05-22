const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const userService = require("../services/userService");

// GET tất cả user
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET user theo ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE user (Admin tạo user mới)
const createUser = async (req, res) => {
  try {
    const { fullName, email, password, phone, address, role } = req.body;

    // Kiểm tra email tồn tại
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo user mới
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      phone: phone || "",
      address: address || "",
      role: role || "farmer",
    });

    res.status(201).json({
      message: "Tạo tài khoản thành công!",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// UPDATE user
const updateUser = async (req, res) => {
  try {
    const { fullName, email, password, phone, address, role } = req.body;
    const userId = req.params.id;

    // Kiểm tra email trùng (nếu đổi email)
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Email này đã được sử dụng!" });
      }
    }

    const updateData = {
      fullName,
      email,
      phone,
      address,
      role,
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Mật khẩu phải ít nhất 6 ký tự" });
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json({
      message: "Cập nhật thành công!",
      user: updatedUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE user — cascade thửa/vụ/nhật ký; cánh đồng chỉ khi user là người tạo Field (admin), khớp quyền CRUD cánh đồng
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.id === userId) {
      return res.status(403).json({ message: "Không thể xóa tài khoản của chính mình" });
    }

    const deletedUser = await userService.deleteUserCascade(userId);

    res.status(200).json({
      message: "Xóa người dùng thành công!",
      user: deletedUser,
    });
  } catch (error) {
    if (error.message === "Không tìm thấy người dùng") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
