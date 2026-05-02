const notifService = require("./notification.service");

async function getMyNotifications(req, res, next) {
  try { return res.json({ notifications: await notifService.getNotifications(req.user.id) }); }
  catch (e) { return next(e); }
}

async function markOneRead(req, res, next) {
  try {
    await notifService.markRead(Number(req.params.id), req.user.id);
    return res.json({ message: "Marked as read" });
  } catch (e) { return next(e); }
}

async function markAllRead(req, res, next) {
  try { await notifService.markAllRead(req.user.id); return res.json({ message: "All read" }); }
  catch (e) { return next(e); }
}

async function announce(req, res, next) {
  try {
    const { title, message, target } = req.body || {};
    if (!title?.trim() || !message?.trim()) { res.status(400); return next(new Error("title and message required")); }
    const result = await notifService.sendAnnouncement({ title: title.trim(), message: message.trim(), target: target || "all" });
    return res.json({ message: `Announcement sent to ${result.sent} users`, ...result });
  } catch (e) { return next(e); }
}

module.exports = { getMyNotifications, markOneRead, markAllRead, announce };