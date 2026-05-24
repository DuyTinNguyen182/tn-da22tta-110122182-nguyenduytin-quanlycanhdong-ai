const announcementService = require("../services/announcementService");

exports.getVisible = async (req, res) => {
  try {
    const data = await announcementService.listVisibleAnnouncements(req.query, req.user);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getUnreadSummary = async (req, res) => {
  try {
    const data = await announcementService.getUnreadAnnouncementSummary(req.user);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.markVisibleAsRead = async (req, res) => {
  try {
    const data = await announcementService.markVisibleAnnouncementsAsRead(req.user);
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

exports.getAdminOptions = async (req, res) => {
  try {
    const data = await announcementService.getAdminAnnouncementOptions();
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
    res.json({ message: "Đã xóa thông báo/cảnh báo" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.removeMany = async (req, res) => {
  try {
    const data = await announcementService.deleteAnnouncements(req.body?.ids || []);
    res.json({
      message: `Đã xóa ${data.deletedCount} thông báo/cảnh báo`,
      ...data,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
