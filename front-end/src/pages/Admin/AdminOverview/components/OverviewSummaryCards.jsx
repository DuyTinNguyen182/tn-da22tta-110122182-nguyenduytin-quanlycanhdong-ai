import React from "react";

const OverviewSummaryCards = ({ summary, selectedTaskLabel, matchedSeasonText }) => {
  const cards = [
    {
      label: "Đang hiển thị",
      value: `${summary.visibleCount} thửa`,
      valueClassName: "text-xl text-gray-900",
    },
    {
      label: "Công việc đang theo dõi",
      value: selectedTaskLabel,
      valueClassName: "text-xl text-gray-900",
    },
    {
      label: "Phạm vi mùa vụ",
      value: matchedSeasonText,
      valueClassName: "text-xl text-gray-900",
    },
    {
      label: "Nông dân cần nhắc",
      value: summary.pendingFarmerCount,
      valueClassName: "text-3xl text-amber-600",
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            {card.label}
          </p>
          <p className={`mt-3 font-bold ${card.valueClassName}`}>{card.value}</p>
        </div>
      ))}
    </section>
  );
};

export default OverviewSummaryCards;
