const User = require("../models/userModel");
const Field = require("../models/fieldModel");
const Plot = require("../models/plotModel");
const SeasonDetail = require("../models/seasonDetailModel");
const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const DiaryLog = require("../models/diaryLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const { deleteFieldCascadeById } = require("./fieldService");

/**
 * CRUD cánh đồng (Field) chỉ dành cho admin — Field.user là người tạo bản ghi.
 * Nhánh xóa cánh đồng bên dưới chỉ chạy khi user bị xóa từng tạo Field (thường là admin);
 * nông dân thường không có Field nào gắn user, bước này sẽ không xóa gì.
 */
const deleteUserCascade = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  const id = user._id;

  const fields = await Field.find({ user: id }).select("_id").lean();
  for (const f of fields) {
    await deleteFieldCascadeById(f._id);
  }

  await Promise.all([
    DiaryLog.deleteMany({ user: id }),
    DiseaseLog.deleteMany({ user: id }),
    DiseaseLog.updateMany({ processedBy: id }, { $set: { processedBy: null } }),
    SeasonPlotAssignment.deleteMany({ user: id }),
    SeasonDetail.deleteMany({ user: id }),
    Plot.deleteMany({ user: id }),
  ]);

  await User.deleteOne({ _id: id });

  const out = user.toObject();
  delete out.password;
  return out;
};

module.exports = { deleteUserCascade };
