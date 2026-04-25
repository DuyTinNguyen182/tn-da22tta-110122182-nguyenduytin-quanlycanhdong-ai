const announcementService = require("../services/announcementService");

exports.getVisible = async (req, res) => {
  try {
    const data = await announcementService.listVisibleAnnouncements(req.query);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAdminList = async (req, res) => {
  try {
    const data = await announcementService.listAdminAnnouncements(req.query);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const created = await announcementService.createAnnouncement(req.body);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await announcementService.updateAnnouncement(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    res.json({ message: "Da xoa thong bao/canh bao" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
