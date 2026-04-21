const multer = require("multer");
const { plotStorage, diseaseStorage } = require("../config/cloudinary");

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

const imageFilter = (_req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc WebP"), false);
  }
};

const uploadPlotImage = multer({
  storage: plotStorage,
  fileFilter: imageFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
}).single("image");

const uploadDiseaseImage = multer({
  storage: diseaseStorage,
  fileFilter: imageFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
}).single("image");

// Wrap multer để bắt lỗi và truyền tiếp
const wrapMulter = (uploader) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File ảnh vượt quá giới hạn 10MB" });
    }
    return res.status(400).json({ message: err.message || "Lỗi upload ảnh" });
  });
};

module.exports = {
  uploadPlotImage: wrapMulter(uploadPlotImage),
  uploadDiseaseImage: wrapMulter(uploadDiseaseImage),
};
