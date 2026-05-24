const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildDiseaseWarningEmailTemplate = ({
  farmerName,
  title,
  content,
  fieldName,
  plotNames = [],
}) => {
  const plotSummary = plotNames.length > 0 ? plotNames.join(", ") : "Chưa xác định";
  const salutation = farmerName ? `Xin chào ${farmerName},` : "Xin chào bà con,";
  const text = [
    salutation,
    "",
    title,
    "",
    `Cánh đồng: ${fieldName || "Chưa xác định"}`,
    `Thửa liên quan: ${plotSummary}`,
    "",
    content,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <p>${escapeHtml(salutation)}</p>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p><strong>Cánh đồng:</strong> ${escapeHtml(fieldName || "Chưa xác định")}</p>
      <p><strong>Thửa liên quan:</strong> ${escapeHtml(plotSummary)}</p>
      <p style="white-space:pre-line;">${escapeHtml(content)}</p>
    </div>
  `;

  return {
    subject: title,
    text,
    html,
  };
};

module.exports = {
  buildDiseaseWarningEmailTemplate,
};
