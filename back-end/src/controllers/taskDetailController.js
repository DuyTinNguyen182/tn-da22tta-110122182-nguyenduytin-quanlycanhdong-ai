const taskDetailService = require("../services/taskDetailService");

exports.getAll = async (req, res) => {
  try {
    const taskDetails = await taskDetailService.getTaskDetails({
      taskId: req.query.taskId || "",
    });
    res.json(taskDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const taskDetail = await taskDetailService.createTaskDetail(req.body);
    res.status(201).json(taskDetail);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const taskDetail = await taskDetailService.updateTaskDetail(req.params.id, req.body);
    res.json(taskDetail);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await taskDetailService.deleteTaskDetail(req.params.id);
    res.json({ message: "Đã xóa chi tiết công việc" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
