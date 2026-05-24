import React from "react";
import { BellRing, CheckCircle2, ClipboardList, Clock3 } from "lucide-react";

const DiseaseMonitoringSummaryCards = ({ summary }) => {
  const cards = [
    {
      key: "total",
      label: "Tổng ghi nhận",
      value: summary.total,
      icon: ClipboardList,
      valueClassName: "text-gray-900",
      iconClassName: "bg-gray-100 text-gray-700",
    },
    {
      key: "unprocessed",
      label: "Chưa xử lý",
      value: summary.unprocessedCount,
      icon: Clock3,
      valueClassName: "text-amber-600",
      iconClassName: "bg-amber-100 text-amber-700",
    },
    {
      key: "processed",
      label: "Đã xử lý",
      value: summary.processedCount,
      icon: CheckCircle2,
      valueClassName: "text-emerald-600",
      iconClassName: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "warning",
      label: "Đã gửi cảnh báo",
      value: summary.warnedCount,
      icon: BellRing,
      valueClassName: "text-sky-600",
      iconClassName: "bg-sky-100 text-sky-700",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.key}
            className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                  {card.label}
                </p>
                <p className={`mt-2 text-3xl font-bold ${card.valueClassName}`}>
                  {card.value}
                </p>
              </div>

              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconClassName}`}
              >
                <Icon size={20} />
              </div>
            </div>

            {/* <p className="mt-3 text-sm text-gray-500">
              {card.key === "total"
                ? `${summary.todayCount} ghi nhận trong hôm nay`
                : card.key === "unprocessed"
                  ? `${summary.fieldCount} cánh đồng ghi nhận bệnh`
                  : card.key === "processed"
                    ? "Admin chỉ xem trạng thái do nông dân cập nhật"
                    : "Có thể gửi lại cảnh báo nếu cần"}
            </p> */}
          </div>
        );
      })}
    </div>
  );
};

export default DiseaseMonitoringSummaryCards;
