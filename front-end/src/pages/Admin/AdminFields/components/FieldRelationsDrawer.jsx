import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Search,
  Tractor,
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

const FieldRelationsDrawer = ({
  open,
  field,
  plots,
  loading,
  keyword,
  onKeywordChange,
  onClose,
}) => {
  const [expandedState, setExpandedState] = useState({
    fieldId: null,
    farmerIds: [],
  });
  const farmerGroups = useMemo(() => buildFarmerGroups(plots), [plots]);
  const expandedFarmerIds =
    expandedState.fieldId === field?._id ? expandedState.farmerIds : [];

  const filteredGroups = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) {
      return farmerGroups;
    }

    return farmerGroups.filter((group) => {
      const farmerHaystack = normalizeText(
        [group.fullName, group.email, group.phone].filter(Boolean).join(" "),
      );

      if (farmerHaystack.includes(normalizedKeyword)) {
        return true;
      }

      return group.plots.some((plot) => {
        const plotHaystack = normalizeText(
          [plot.name, plot.status].filter(Boolean).join(" "),
        );
        return plotHaystack.includes(normalizedKeyword);
      });
    });
  }, [farmerGroups, keyword]);

  const stats = useMemo(() => {
    const activePlotCount = plots.filter(
      (plot) => plot.status === "active",
    ).length;

    return {
      activePlotCount,
      inactivePlotCount: plots.length - activePlotCount,
    };
  }, [plots]);

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

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 px-6 py-3 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="mt-2 text-2xl font-bold">{field.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-50">
                <MapPin size={15} />
                {field.address || "Chưa cập nhật địa bàn"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {/* Card 1 */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="font-bold uppercase tracking-tight text-white">
                Đang canh tác
              </span>
              <div className="flex items-center gap-1.5 font-bold text-white">
                <CheckCircle2 size={14} />
                <span>{stats.activePlotCount}</span> thửa
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="font-bold uppercase tracking-tight text-white">
                Chờ vụ mới
              </span>
              <div className="flex items-center gap-1.5 font-bold text-white">
                <AlertCircle size={14} />
                <span>{stats.inactivePlotCount}</span> thửa
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 bg-white px-6 py-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Tìm nông dân hoặc tên thửa..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Có {farmerGroups.length} nông dân trong cánh đồng này. Bấm vào từng
            người để xem các thửa họ đang quản lý.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <LoadingScreen message="Đang tải danh sách nông dân và thửa ruộng..." />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Search size={22} />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-700">
                {plots.length === 0
                  ? "Cánh đồng này chưa có thửa ruộng nào."
                  : "Không tìm thấy nông dân hoặc thửa phù hợp."}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {plots.length === 0
                  ? "Khi có thửa được tạo trong cánh đồng, hệ thống sẽ nhóm theo nông dân quản lý tại đây."
                  : "Thử nhập một phần tên nông dân, số điện thoại hoặc tên thửa để lọc nhanh."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <article
                  key={group._id}
                  className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleFarmer(group._id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-emerald-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                          <Users size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-gray-800">
                            {group.fullName}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {group.plotCount} thửa •{" "}
                            {group.totalArea.toLocaleString("vi-VN")} m²
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        {group.phone && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                            <Phone size={12} />
                            {group.phone}
                          </span>
                        )}
                        {group.email && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                            <Mail size={12} />
                            {group.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                          Phụ trách
                        </span>
                        <span className="mt-1 block text-base font-bold text-emerald-700">
                          {group.plotCount} thửa
                        </span>
                      </span>
                      <span
                        className={`rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-transform ${
                          expandedFarmerIds.includes(group._id)
                            ? "rotate-180"
                            : ""
                        }`}
                      >
                        <ChevronDown size={16} />
                      </span>
                    </div>
                  </button>

                  {expandedFarmerIds.includes(group._id) ? (
                    <div className="space-y-3 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
                      {group.plots.map((plot) => (
                        <div
                          key={plot._id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                              <Tractor size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {plot.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Diện tích{" "}
                                {Number(plot.area || 0).toLocaleString("vi-VN")}{" "}
                                m²
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                plot.status === "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {plot.status === "active" ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <AlertCircle size={12} />
                              )}
                              {plot.status === "active"
                                ? "Đang canh tác"
                                : "Chờ vụ mới"}
                            </span>
                            {/* {plot.imageUrl ? (
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                                Có ảnh
                              </span>
                            ) : null} */}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default FieldRelationsDrawer;
