const allowedProductService = require("../services/allowedProductService");

exports.getAll = async (req, res) => {
  try {
    const products = await allowedProductService.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await allowedProductService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const product = await allowedProductService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await allowedProductService.updateProduct(
      req.params.id,
      req.body,
    );
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await allowedProductService.deleteProduct(req.params.id);
    res.json({ message: "Đã xóa sản phẩm khỏi danh mục" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
