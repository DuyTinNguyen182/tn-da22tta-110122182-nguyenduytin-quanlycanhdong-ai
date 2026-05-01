const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPlotWarningEmailTemplate = ({ farmerName, rows, selectedActivity, adminName }) => {
  const activityLabel =
    selectedActivity?.activityLabel || rows[0]?.activityLabel || "công việc đã được giao";
  const introLine = `Hệ thống ghi nhận bạn chưa thực hiện "${activityLabel}" cho ${rows.length} thửa ruộng sau:`;

  const textRows = rows.map(
    (row, index) =>
      `${index + 1}. ${row.plotName} | ${row.fieldName} | ${row.seasonLabel} | Diện tích: ${Number(
        row.plotArea || 0
      ).toLocaleString("vi-VN")} m2`
  );

  const text = [
    `Xin chào ${farmerName},`,
    "",
    introLine,
    ...textRows,
    "",
    "Vui lòng sắp xếp thực hiện sớm để đảm bảo tiến độ mùa vụ.",
    adminName ? `Người nhắc: ${adminName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlRows = rows
    .map(
      (row) =>
        `<tr>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;">${escapeHtml(row.plotName)}</td>
          <td style="padding:8px 10px;border:1px solid #e5e7eb;">${escapeHtml(row.fieldName)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <p>Xin chào <strong>${escapeHtml(farmerName)}</strong>,</p>
      <p>${escapeHtml(introLine)}</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:left;">Thửa ruộng</th>
            <th style="padding:8px 10px;border:1px solid #e5e7eb;text-align:left;">Cánh đồng</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>
      <p>Vui lòng sắp xếp thực hiện sớm để đảm bảo tiến độ mùa vụ.</p>
      ${
        adminName
          ? `<p style="margin-top:16px;color:#6b7280;">Người nhắc: ${escapeHtml(adminName)}</p>`
          : ""
      }
    </div>
  `;

  return {
    subject: `[Cảnh báo] Nhắc nhở thực hiện ${activityLabel}`,
    text,
    html,
  };
};

module.exports = {
  buildPlotWarningEmailTemplate,
};
