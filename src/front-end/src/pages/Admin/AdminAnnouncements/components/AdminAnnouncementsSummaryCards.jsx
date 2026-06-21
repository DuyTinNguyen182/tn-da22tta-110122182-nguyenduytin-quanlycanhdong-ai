import React from "react";

const AdminAnnouncementsSummaryCards = ({ summary }) => (
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        Tổng mục
      </p>
      <p className="mt-2 text-3xl font-bold text-gray-900">
        {summary.totalCount}
      </p>
    </div>

    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        Đang hiển thị
      </p>
      <p className="mt-2 text-3xl font-bold text-emerald-600">
        {summary.visibleCount}
      </p>
    </div>

    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        Thông báo
      </p>
      <p className="mt-2 text-3xl font-bold text-sky-600">
        {summary.notificationCount}
      </p>
    </div>

    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        Cảnh báo
      </p>
      <p className="mt-2 text-3xl font-bold text-amber-600">
        {summary.warningCount}
      </p>
    </div>
  </div>
);

export default AdminAnnouncementsSummaryCards;
