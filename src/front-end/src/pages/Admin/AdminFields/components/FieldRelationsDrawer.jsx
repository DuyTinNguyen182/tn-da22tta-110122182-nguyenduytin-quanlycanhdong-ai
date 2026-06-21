import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  Search,
  Tractor,
  Trash2,
  Users,
  X,
} from "lucide-react";
import LoadingScreen from "../../../../components/Layout/LoadingScreen";

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildFarmerGroups = (plots = []) => {
  const grouped = new Map();

  plots.forEach((plot) => {
    const farmer = plot.user || {};
    const farmerId = farmer._id || `unknown-${plot._id}`;
    const existing = grouped.get(farmerId) || {
      _id: farmerId,
      fullName: farmer.fullName || "Chưa xác định",
      email: farmer.email || "",
      phone: farmer.phone || "",
      plotCount: 0,
      totalArea: 0,
      plots: [],
    };

    existing.plotCount += 1;
    existing.totalArea += Number(plot.area || 0);
    existing.plots.push(plot);
    grouped.set(farmerId, existing);
  });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      plots: group.plots.sort((left, right) =>
        left.name.localeCompare(right.name, "vi"),
      ),
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "vi"));
};

const getStatusMeta = (status) =>
  status === "active"
    ? {
        label: "Đang canh tác",
        icon: CheckCircle2,
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      }
    : {
        label: "Đang nghỉ",
        icon: AlertCircle,
        className: "bg-orange-50 text-orange-700 ring-orange-100",
      };

const FieldRelationsDrawer = ({
  open,
  field,
  plots,
  loading,
  keyword,
  deletingPlotId,
  onKeywordChange,
  onDeletePlot,
  onClose,
}) => {
  const [expandedState, setExpandedState] = useState({
    fieldId: null,
    farmerIds: [],
  });

  const farmerGroups = useMemo(() => buildFarmerGroups(plots), [plots]);
  const expandedFarmerIds =
    expandedState.fieldId === field?._id ? expandedState.farmerIds : [];

  useEffect(() => {
    if (open && field?._id) {
      setExpandedState({ fieldId: field._id, farmerIds: [] });
    }
  }, [field?._id, open]);

  const normalizedKeyword = useMemo(() => normalizeText(keyword), [keyword]);

  const filteredGroups = useMemo(() => {
    if (!normalizedKeyword) {
      return farmerGroups;
    }

    return farmerGroups.flatMap((group) => {
      const farmerHaystack = normalizeText(
        [group.fullName, group.email, group.phone].filter(Boolean).join(" "),
      );
      const farmerMatches = farmerHaystack.includes(normalizedKeyword);
      const matchingPlots = group.plots.filter((plot) =>
        normalizeText(
          [plot.name, plot.status].filter(Boolean).join(" "),
        ).includes(normalizedKeyword),
      );

      if (farmerMatches) {
        return [{ ...group, visiblePlots: group.plots }];
      }

      if (matchingPlots.length > 0) {
        return [{ ...group, visiblePlots: matchingPlots }];
      }

      return [];
    });
  }, [farmerGroups, normalizedKeyword]);

  const stats = useMemo(() => {
    const activePlotCount = plots.filter(
      (plot) => plot.status === "active",
    ).length;
    const totalArea = plots.reduce(
      (sum, plot) => sum + Number(plot.area || 0),
      0,
    );

    return {
      activePlotCount,
      farmerCount: farmerGroups.length,
      inactivePlotCount: plots.length - activePlotCount,
      totalArea,
    };
  }, [farmerGroups.length, plots]);

  const visiblePlotCount = useMemo(
    () =>
      filteredGroups.reduce(
        (sum, group) => sum + (group.visiblePlots || group.plots).length,
        0,
      ),
    [filteredGroups],
  );

  const allVisibleFarmerIds = useMemo(
    () => filteredGroups.map((group) => group._id),
    [filteredGroups],
  );

  const allVisibleExpanded =
    Boolean(normalizedKeyword) ||
    (allVisibleFarmerIds.length > 0 &&
      allVisibleFarmerIds.every((id) => expandedFarmerIds.includes(id)));

  const toggleFarmer = (farmerId) => {
    setExpandedState((prev) => {
      const currentIds = prev.fieldId === field?._id ? prev.farmerIds : [];
      const nextIds = currentIds.includes(farmerId)
        ? currentIds.filter((id) => id !== farmerId)
        : [...currentIds, farmerId];

      return {
        fieldId: field?._id || null,
        farmerIds: nextIds,
      };
    });
  };

  const toggleAllVisible = () => {
    setExpandedState({
      fieldId: field?._id || null,
      farmerIds: allVisibleExpanded ? [] : allVisibleFarmerIds,
    });
  };

  if (!open || !field) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Đóng chi tiết cánh đồng"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[920px] flex-col overflow-hidden bg-slate-50 shadow-2xl">
        <header className="border-b border-emerald-100 bg-white">
          <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Chi tiết cánh đồng
              </p>
              <h2 className="mt-1 truncate text-xl font-bold">{field.name}</h2>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-emerald-50">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">
                  {field.address || "Chưa cập nhật địa bàn"}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase text-gray-400">
                Nông dân
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {stats.farmerCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase text-gray-400">
                Đang canh tác
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-700">
                {stats.activePlotCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase text-gray-400">
                Đang nghỉ
              </p>
              <p className="mt-1 text-lg font-bold text-orange-600">
                {stats.inactivePlotCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase text-gray-400">
                Diện tích
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {stats.totalArea.toLocaleString("vi-VN")} m²
              </p>
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={keyword}
                onChange={(event) => onKeywordChange(event.target.value)}
                placeholder="Tìm nông dân, SĐT, email hoặc tên thửa..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="flex items-center justify-between gap-2 lg:justify-end">
              <p className="text-xs font-medium text-gray-500">
                Hiển thị {visiblePlotCount}/{plots.length} thửa
              </p>
              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={
                  filteredGroups.length === 0 || Boolean(normalizedKeyword)
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                {normalizedKeyword
                  ? "Đang tự mở"
                  : allVisibleExpanded
                    ? "Thu gọn"
                    : "Mở tất cả"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <LoadingScreen message="Đang tải danh sách nông dân và thửa ruộng..." />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Search size={20} />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-700">
                {plots.length === 0
                  ? "Cánh đồng này chưa có thửa ruộng nào."
                  : "Không tìm thấy dữ liệu phù hợp."}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {plots.length === 0
                  ? "Khi có thửa được tạo, hệ thống sẽ nhóm theo nông dân quản lý tại đây."
                  : "Thử nhập một phần tên nông dân, số điện thoại, email hoặc tên thửa."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => {
                const displayPlots = group.visiblePlots || group.plots;
                const isExpanded =
                  Boolean(normalizedKeyword) ||
                  expandedFarmerIds.includes(group._id);

                return (
                  <article
                    key={group._id}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFarmer(group._id)}
                      className="grid w-full grid-cols-1 gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-50/50 lg:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <Users size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="truncate text-sm font-bold text-gray-900">
                              {group.fullName}
                            </h3>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                              {group.plotCount} thửa
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              {group.totalArea.toLocaleString("vi-VN")} m²
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            {group.phone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone size={12} />
                                {group.phone}
                              </span>
                            ) : null}
                            {group.email ? (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <Mail size={12} />
                                <span className="truncate">{group.email}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:justify-end">
                        {normalizedKeyword &&
                        displayPlots.length !== group.plotCount ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Khớp {displayPlots.length} thửa
                          </span>
                        ) : null}
                        <span
                          className={`rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="border-t border-gray-100 bg-slate-50">
                        <div className="hidden grid-cols-[minmax(180px,1.4fr)_120px_130px_88px] gap-3 border-b border-gray-100 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 md:grid">
                          <span>Thửa ruộng</span>
                          <span>Diện tích</span>
                          <span>Trạng thái</span>
                          <span className="text-right">Thao tác</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {displayPlots.map((plot) => {
                            const statusMeta = getStatusMeta(plot.status);
                            const StatusIcon = statusMeta.icon;
                            const isDeleting = deletingPlotId === plot._id;

                            return (
                              <div
                                key={plot._id}
                                className="grid grid-cols-1 gap-3 px-4 py-2.5 transition-colors hover:bg-white md:grid-cols-[minmax(180px,1.4fr)_120px_130px_88px] md:items-center"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                                    {plot.imageUrl ? (
                                      <img
                                        src={plot.imageUrl}
                                        alt={plot.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Tractor size={16} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">
                                      {plot.name}
                                    </p>
                                    {/* {plot.imageUrl ? (
                                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-sky-600">
                                        <ImageIcon size={11} />
                                        Có ảnh
                                      </p>
                                    ) : null} */}
                                  </div>
                                </div>

                                <span className="w-fit rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-semibold text-gray-600 ring-1 ring-gray-100">
                                  {Number(plot.area || 0).toLocaleString(
                                    "vi-VN",
                                  )}{" "}
                                  m²
                                </span>

                                <span
                                  className={`inline-flex w-fit items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ${statusMeta.className}`}
                                >
                                  <StatusIcon size={12} />
                                  {statusMeta.label}
                                </span>

                                <div className="flex justify-start md:justify-end">
                                  <button
                                    type="button"
                                    onClick={() => onDeletePlot?.(plot)}
                                    disabled={isDeleting}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
                                    title="Xóa thửa ruộng"
                                  >
                                    <Trash2 size={14} />
                                    {isDeleting ? "Đang xóa" : "Xóa"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default FieldRelationsDrawer;
