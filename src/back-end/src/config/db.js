const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Đã kết nối MongoDB Atlas");
  } catch (error) {
    console.error("Lỗi kết nối DB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;