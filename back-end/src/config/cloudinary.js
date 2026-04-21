const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require("./env");

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const plotStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "canh_dong_lua/plots",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }],
  },
});

const diseaseStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "canh_dong_lua/diseases",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1024, height: 1024, crop: "limit", quality: "auto" }],
  },
});

module.exports = { cloudinary, plotStorage, diseaseStorage };
