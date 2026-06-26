const axios = require("axios");
const FormData = require("form-data");
const { PYTHON_AI_SERVICE_URL } = require("../config/env");

/**
 * Gửi ảnh sang Python AI Service để chẩn đoán
 * @param {Object} file - Object file từ multer (req.file)
 * @returns {Object} Dữ liệu phản hồi từ AI
 */
exports.scanImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await axios.post(PYTHON_AI_SERVICE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data;
  } catch (error) {
    // Chuẩn hóa lỗi axios để Controller dễ dàng bóc tách mã lỗi HTTP
    if (axios.isAxiosError(error) && error.response) {
      const customError = new Error("Lỗi từ AI Service");
      customError.isAxiosError = true;
      customError.status = error.response.status;
      customError.data = error.response.data;
      throw customError;
    }

    throw error;
  }
};
