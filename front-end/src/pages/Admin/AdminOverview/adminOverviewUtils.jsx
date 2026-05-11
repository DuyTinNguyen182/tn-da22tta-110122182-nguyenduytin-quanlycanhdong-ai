/* eslint-disable react-refresh/only-export-components */
import React from "react";

export const CURRENT_YEAR = new Date().getFullYear();
export const ROWS_PER_PAGE = 10;

export const buildDefaultFilters = (seasonId = "", year = String(CURRENT_YEAR)) => ({
  fieldId: "",
  seasonId,
  year,
  taskId: "",
  taskDetailId: "",
  status: "all",
});

export const buildQueryParams = (filters) => {
  const params = {};

  if (filters.fieldId) params.fieldId = filters.fieldId;
  if (filters.seasonId) params.seasonId = filters.seasonId;
  if (filters.year) params.year = filters.year;
  if (filters.taskId) params.taskId = filters.taskId;
  if (filters.taskDetailId) params.taskDetailId = filters.taskDetailId;
  if (filters.status) params.status = filters.status;

  return params;
};

export const getFarmerGroupKey = (row) =>
  String(row?.recipientKey || row?.farmerId || row?.farmerEmail || "")
    .trim()
    .toLowerCase();

export const buildWarningSessionKey = (recipientKey, filters) =>
  JSON.stringify({
    recipientKey: String(recipientKey || "").trim().toLowerCase(),
    fieldId: filters?.fieldId || "",
    seasonId: filters?.seasonId || "",
    year: filters?.year || "",
    taskId: filters?.taskId || "",
    taskDetailId: filters?.taskDetailId || "",
  });

export const summarizeLabels = (values, maxItems = 2) => {
  const uniqueValues = Array.from(
    new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))
  );

  if (uniqueValues.length === 0) return "--";
  if (uniqueValues.length <= maxItems) return uniqueValues.join(", ");

  return `${uniqueValues.slice(0, maxItems).join(", ")} +${uniqueValues.length - maxItems}`;
};

export const getStatusClasses = (status) =>
  status === "done"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";

export const getStatusText = (status) => {
  if (status === "done") return "Đã làm";
  if (status === "pending") return "Chưa làm";
  return "Tất cả";
};

export const formatCurrentSeasonBanner = (currentSeason) => {
  if (!currentSeason?.seasonName || !currentSeason?.startDate) {
    return {
      content: "Không có mùa vụ nào đang canh tác.",
      className: "bg-amber-50 text-amber-900",
    };
  }

  const start = new Date(currentSeason.startDate);
  const now = new Date();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));

  return {
    content: (
      <>
        Mùa vụ hiện tại:{" "}
        <span className="font-bold">
          {currentSeason.seasonName} {start.getFullYear()}
        </span>
        . Ngày bắt đầu:{" "}
        <span className="font-semibold">{start.toLocaleDateString("vi-VN")}</span>. Mùa vụ đã bắt
        đầu được <span className="font-semibold">{diffDays >= 0 ? diffDays : 0}</span> ngày.
      </>
    ),
    className: "bg-emerald-50 text-emerald-900",
  };
};
