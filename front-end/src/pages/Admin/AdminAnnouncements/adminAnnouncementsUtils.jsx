import { BellRing, TriangleAlert } from "lucide-react";

export const EMPTY_FORM = {
  type: "notification",
  title: "",
  content: "",
  isVisible: true,
  targetMode: "all_farmers",
  fieldId: "",
  userIds: [],
};

export const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "notification", label: "Thông báo" },
  { value: "warning", label: "Cảnh báo" },
];

export const VISIBILITY_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "visible", label: "Đang hiển thị" },
  { value: "hidden", label: "Đang ẩn" },
];

export const FORM_TYPE_OPTIONS = TYPE_OPTIONS.filter(
  (option) => option.value !== "all",
);

export const TARGET_MODE_OPTIONS = [
  { value: "all_farmers", label: "Tất cả nông dân" },
  { value: "field_users", label: "Nông dân theo cánh đồng" },
  { value: "selected_users", label: "Một hoặc vài nông dân" },
];

export const TYPE_STYLES = {
  notification: {
    label: "Thông báo",
    icon: BellRing,
    badgeClassName: "bg-sky-100 text-sky-700",
  },
  warning: {
    label: "Cảnh báo",
    icon: TriangleAlert,
    badgeClassName: "bg-amber-100 text-amber-700",
  },
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Chưa cập nhật";

export const getRecipientSummary = (item) => {
  if (item.targetMode === "field_users") {
    return item.targetFieldName
      ? `Nông dân trên ${item.targetFieldName}`
      : "Theo cánh đồng đã chọn";
  }

  if (item.targetMode === "selected_users") {
    return `${item.recipientCount || 0} nông dân`;
  }

  return `Tất cả nông dân (${item.recipientCount || 0})`;
};

export const createFormFromItem = (item) => ({
  type: item.type || "notification",
  title: item.title || "",
  content: item.content || "",
  isVisible: item.isVisible === true,
  targetMode: item.targetMode || "all_farmers",
  fieldId: item.targetFieldId || "",
  userIds: Array.isArray(item.audienceUserIds) ? item.audienceUserIds : [],
});
