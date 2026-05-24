const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildAnnouncementEmailTemplate = ({
  recipientName,
  title,
  content,
  type = "notification",
}) => {
  const salutation = recipientName ? `Xin chào ${recipientName},` : "Xin chào bà con,";
  const typeLabel = type === "warning" ? "Cảnh báo" : "Thông báo";
  const subject = `[${typeLabel}] ${title}`;
  const text = [salutation, "", title, "", content].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <p>${escapeHtml(salutation)}</p>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p style="white-space:pre-line;">${escapeHtml(content)}</p>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
};

module.exports = {
  buildAnnouncementEmailTemplate,
};
