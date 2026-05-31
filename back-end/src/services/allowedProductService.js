const AllowedProduct = require("../models/allowedProductsModel");

const getProducts = async () => {
  try {
    return await AllowedProduct.find().sort({ createdAt: -1 }).lean();
  } catch (error) {
    throw new Error(`Không thể lấy danh sách sản phẩm: ${error.message}`);
  }
};

const getProductById = async (id) => {
  try {
    const product = await AllowedProduct.findById(id).lean();
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }
    return product;
  } catch (error) {
    throw new Error(`Không thể lấy thông tin sản phẩm: ${error.message}`);
  }
};

const createProduct = async (payload) => {
  try {
    const {
      product_name,
      category,
      target_issues,
      usage_periods,
      instructions,
      is_active,
    } = payload;

    if (!product_name || !product_name.trim())
      throw new Error("Vui lòng cung cấp tên sản phẩm.");
    if (!["pesticide", "fertilizer"].includes(category))
      throw new Error("Danh mục sản phẩm không hợp lệ.");
    if (!instructions || !instructions.trim())
      throw new Error("Vui lòng cung cấp hướng dẫn sử dụng.");

    // Kiểm tra trùng lặp tên sản phẩm (không phân biệt hoa thường)
    const existingProduct = await AllowedProduct.findOne({
      product_name: { $regex: new RegExp(`^${product_name.trim()}$`, "i") },
    }).lean();

    if (existingProduct) {
      throw new Error(`Đã tồn tại sản phẩm với tên "${product_name}"`);
    }

    const newProduct = new AllowedProduct({
      product_name: product_name.trim(),
      category,
      target_issues: Array.isArray(target_issues) ? target_issues : [],
      usage_periods: Array.isArray(usage_periods) ? usage_periods : [],
      instructions: instructions.trim(),
      is_active: is_active !== undefined ? is_active : true,
    });

    await newProduct.save();
    return newProduct;
  } catch (error) {
    throw new Error(`Tạo sản phẩm thất bại: ${error.message}`);
  }
};

const updateProduct = async (id, payload) => {
  try {
    const {
      product_name,
      category,
      target_issues,
      usage_periods,
      instructions,
      is_active,
    } = payload;

    const product = await AllowedProduct.findById(id).lean();
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    const updateData = {};

    if (product_name !== undefined && product_name.trim()) {
      // Kiểm tra trùng tên với sản phẩm khác
      const existingProduct = await AllowedProduct.findOne({
        _id: { $ne: id },
        product_name: { $regex: new RegExp(`^${product_name.trim()}$`, "i") },
      }).lean();

      if (existingProduct)
        throw new Error(`Đã tồn tại sản phẩm với tên "${product_name}"`);

      updateData.product_name = product_name.trim();
    }

    if (category !== undefined) {
      if (!["pesticide", "fertilizer"].includes(category))
        throw new Error("Danh mục sản phẩm không hợp lệ.");
      updateData.category = category;
    }

    if (target_issues !== undefined)
      updateData.target_issues = Array.isArray(target_issues)
        ? target_issues
        : [];
    if (usage_periods !== undefined)
      updateData.usage_periods = Array.isArray(usage_periods)
        ? usage_periods
        : [];
    if (instructions !== undefined && instructions.trim())
      updateData.instructions = instructions.trim();
    if (is_active !== undefined && typeof is_active === "boolean")
      updateData.is_active = is_active;

    const updatedProduct = await AllowedProduct.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    return updatedProduct;
  } catch (error) {
    throw new Error(`Cập nhật sản phẩm thất bại: ${error.message}`);
  }
};

const deleteProduct = async (id) => {
  try {
    const product = await AllowedProduct.findByIdAndDelete(id).lean();
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }
    return product;
  } catch (error) {
    throw new Error(`Xóa sản phẩm thất bại: ${error.message}`);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
