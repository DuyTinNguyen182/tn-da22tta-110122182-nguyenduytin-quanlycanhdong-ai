const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPasswordResetEmailTemplate = ({ recipientName, resetUrl }) => {
  const salutation = recipientName
    ? `Xin chào ${recipientName},`
    : "Xin chào,";
  const subject = "Yêu cầu đặt lại mật khẩu AgriSmart";
  const text = [
    salutation,
    "",
    "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản AgriSmart.",
    "Vui lòng mở liên kết bên dưới để tạo mật khẩu mới. Liên kết có hiệu lực trong 15 phút.",
    "",
    resetUrl,
    "",
    "Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <p>${escapeHtml(salutation)}</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản AgriSmart.</p>
      <p>Vui lòng bấm nút bên dưới để tạo mật khẩu mới. Liên kết có hiệu lực trong <strong>15 phút</strong>.</p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(resetUrl)}" style="background:#059669;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Nếu nút không hoạt động, bạn có thể sao chép liên kết này vào trình duyệt:</p>
      <p style="word-break:break-all;color:#047857;">${escapeHtml(resetUrl)}</p>
      <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.</p>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
};

module.exports = {
  buildPasswordResetEmailTemplate,
};
