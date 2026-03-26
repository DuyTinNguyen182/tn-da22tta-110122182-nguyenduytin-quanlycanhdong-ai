const mongoose = require("mongoose");

const diaryLogSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  }, // Mã công việc
  description: { type: String }, // Chi tiết: Phân Ure 50kg...
  date: { type: Date, default: Date.now }, // Ngày thực hiện

  cost: { type: Number, default: 0 }, // Chi phí (VNĐ)
  
  // Quan trọng: Gắn với Vụ nào?
  season: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "SeasonDetail", 
    required: true 
  },

  // (Tuỳ chọn) Áp dụng cụ thể cho Thửa nào? Nếu null => Áp dụng cả cánh đồng
  plot: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Plot",
    default: null
  },

  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DiaryLog", diaryLogSchema);