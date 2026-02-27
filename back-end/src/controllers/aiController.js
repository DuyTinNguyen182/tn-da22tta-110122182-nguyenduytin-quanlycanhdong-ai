const axios = require("axios");
const FormData = require("form-data");

exports.diagnoseDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng tải lên hình ảnh lá lúa" });
    }

    // Chuẩn bị form data để gửi sang Python Service
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Gọi sang Python Flask Service (Port 5000)
    const pythonServiceUrl = "http://127.0.0.1:5000/predict";
    const response = await axios.post(pythonServiceUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Trả kết quả về Frontend
    // Sau này có thể lưu kết quả vào MongoDB (Model DiagnosisLog) tại đây
    res.json({
      success: true,
      data: response.data,
      imageName: req.file.originalname
    });

  } catch (error) {
    console.error("AI Service Error:", error.message);
    res.status(500).json({ 
      message: "Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.",
      details: error.message 
    });
  }
};