const mongoose = require("mongoose");

const diaryLogSchema = new mongoose.Schema({
  title: { type: String, required: true }, // VD: Bón phân đợt 1
  description: { type: String }, // Chi tiết: Phân Ure 50kg...
  date: { type: Date, default: Date.now }, // Ngày thực hiện
  
  // Loại công việc (để sau này thống kê)
  type: { 
    type: String, 
    enum: ["material", "labor", "harvest", "disease", "other"], 
    default: "other" 
  }, // material: vật tư, labor: nhân công...

  cost: { type: Number, default: 0 }, // Chi phí (VNĐ)
  
  // Quan trọng: Gắn với Vụ nào?
  season: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Season", 
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