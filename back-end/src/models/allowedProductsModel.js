const mongoose = require("mongoose");

const allowedProductSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["pesticide", "fertilizer"],
      required: true,
    },
    target_issues: [
      {
        type: String,
        // VD: ["đạo ôn", "khô vằn", "còi cọc", "vàng lá"]
      },
    ],
    usage_periods: [
      {
        type: String,
        // VD: ["bón lót", "bón thúc", "đẻ nhánh", "10 ngày tuổi"]
      },
    ],
    instructions: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AllowedProduct", allowedProductSchema);
