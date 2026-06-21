const User = require("../models/userModel");
const Field = require("../models/fieldModel");
const Plot = require("../models/plotModel");

const SeasonPlotAssignment = require("../models/seasonPlotAssignmentModel");
const DiaryLog = require("../models/farmingLogModel");
const DiseaseLog = require("../models/diseaseLogModel");
const { deleteFieldCascadeById } = require("./fieldService");

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
    Plot.deleteMany({ user: id }),
  ]);

  await User.deleteOne({ _id: id });

  const out = user.toObject();
  delete out.password;
  return out;
};

module.exports = { deleteUserCascade };
