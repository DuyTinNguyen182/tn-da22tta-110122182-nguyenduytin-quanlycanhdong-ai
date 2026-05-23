import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  MapPinned,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import PaginationControls from "../../../components/Common/PaginationControls";
import CustomCheckbox from "../../../components/UI/CustomCheckbox";

const PAGE_SIZE = 8;

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatDate = (value) => {
  if (!value) return "--/--/----";

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatArea = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} m²`;

const buildOptions = (items = [], relationKey, labelBuilder) => {
  const optionMap = new Map();

  items.forEach((item) => {
    const relation = item?.[relationKey];
    if (!relation?._id || optionMap.has(relation._id)) {
      return;
    }

    optionMap.set(relation._id, {
      value: relation._id,
      label: labelBuilder(relation),
    });
  });

  return Array.from(optionMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "vi"),
  );
};

const matchesFilters = (item, keyword, fieldId, farmerId) => {
  if (fieldId && String(item?.field?._id || "") !== fieldId) {
    return false;
  }

  if (farmerId && String(item?.user?._id || "") !== farmerId) {
    return false;
  }

  if (!keyword) {
    return true;
  }

  const haystack = normalizeText(
    [
      item?.plot?.name,
      item?.field?.name,
      item?.field?.address,
      item?.user?.fullName,
      item?.user?.email,
      item?.user?.phone,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return haystack.includes(keyword);
};

const getPagedItems = (items, page) => {
  const startIndex = (page - 1) * PAGE_SIZE;
  return items.slice(startIndex, startIndex + PAGE_SIZE);
};

const AdminSeasonPlots = () => {
  const { toast, confirm } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seasonDetail, setSeasonDetail] = useState(null);
  const [summary, setSummary] = useState({
    assignedCount: 0,
    availableCount: 0,
    totalActivePlotCount: 0,
    fieldCount: 0,
    farmerCount: 0,
    totalAssignedArea: 0,
    totalAvailableArea: 0,
  });
  const [assignedPlots, setAssignedPlots] = useState([]);
  const [availablePlots, setAvailablePlots] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [farmerFilter, setFarmerFilter] = useState("");
  const [selectedPlotIds, setSelectedPlotIds] = useState([]);
  const [assignedPage, setAssignedPage] = useState(1);
  const [availablePage, setAvailablePage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/season-plot-assignments/active");
      setSeasonDetail(res.data?.seasonDetail || null);
      setSummary(res.data?.summary || {});
      setAssignedPlots(res.data?.assignedPlots || []);
      setAvailablePlots(res.data?.availablePlots || []);
      setSelectedPlotIds([]);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Không thể tải dữ liệu thửa ruộng tham gia mùa vụ.",
      );
    } finally {
      setLoading(false);
    }
  };

  const normalizedKeyword = useMemo(() => normalizeText(keyword), [keyword]);

  const fieldOptions = useMemo(
    () =>
      buildOptions(
        [...assignedPlots, ...availablePlots],
        "field",
        (field) => field.name || "Chưa xác định",
      ),
    [assignedPlots, availablePlots],
  );

  const farmerOptions = useMemo(
    () =>
      buildOptions(
        [...assignedPlots, ...availablePlots],
        "user",
        (user) => user.fullName || "Chưa xác định",
      ),
    [assignedPlots, availablePlots],
  );

  const filteredAssignedPlots = useMemo(
    () =>
      assignedPlots.filter((item) =>
        matchesFilters(item, normalizedKeyword, fieldFilter, farmerFilter),
      ),
    [assignedPlots, normalizedKeyword, fieldFilter, farmerFilter],
  );

  const filteredAvailablePlots = useMemo(
    () =>
      availablePlots.filter((item) =>
        matchesFilters(item, normalizedKeyword, fieldFilter, farmerFilter),
      ),
    [availablePlots, normalizedKeyword, fieldFilter, farmerFilter],
  );

  const assignedTotalPages = Math.max(
    1,
    Math.ceil(filteredAssignedPlots.length / PAGE_SIZE),
  );
  const availableTotalPages = Math.max(
    1,
    Math.ceil(filteredAvailablePlots.length / PAGE_SIZE),
  );

  const pagedAssignedPlots = useMemo(
    () => getPagedItems(filteredAssignedPlots, assignedPage),
    [filteredAssignedPlots, assignedPage],
  );
  const pagedAvailablePlots = useMemo(
    () => getPagedItems(filteredAvailablePlots, availablePage),
    [filteredAvailablePlots, availablePage],
  );

  useEffect(() => {
    if (assignedPage > assignedTotalPages) {
      setAssignedPage(assignedTotalPages);
    }
  }, [assignedPage, assignedTotalPages]);

  useEffect(() => {
    if (availablePage > availableTotalPages) {
      setAvailablePage(availableTotalPages);
    }
  }, [availablePage, availableTotalPages]);

  const selectedAvailablePlotIds = useMemo(() => {
    const availablePlotIdSet = new Set(
      availablePlots.map((item) => String(item?.plot?._id || "")),
    );

    return selectedPlotIds.filter((plotId) => availablePlotIdSet.has(plotId));
  }, [availablePlots, selectedPlotIds]);

  const allFilteredAvailableSelected =
    filteredAvailablePlots.length > 0 &&
    filteredAvailablePlots.every((item) =>
      selectedAvailablePlotIds.includes(String(item?.plot?._id || "")),
    );

  const handleTogglePlotSelection = (plotId) => {
    setSelectedPlotIds((prev) =>
      prev.includes(plotId)
        ? prev.filter((item) => item !== plotId)
        : [...prev, plotId],
    );
  };

  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredAvailablePlots.map((item) =>
      String(item?.plot?._id || ""),
    );

    setSelectedPlotIds((prev) => {
      if (allFilteredAvailableSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...prev, ...filteredIds]));
    });
  };

  const handleAssignSelectedPlots = async () => {
    if (selectedAvailablePlotIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một thửa ruộng để thêm.");
      return;
    }

    const confirmed = await confirm({
      title: "Thêm thửa ruộng vào mùa vụ?",
      message: `Bạn có chắc muốn thêm ${selectedAvailablePlotIds.length} thửa ruộng vào mùa vụ đang hoạt động không?`,
      confirmText: "Thêm vào mùa vụ",
      tone: "primary",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await api.post(
        "/admin/season-plot-assignments/active/plots",
        {
          plotIds: selectedAvailablePlotIds,
        },
      );

      const createdCount = res.data?.createdCount || 0;
      const reactivatedCount = res.data?.reactivatedCount || 0;
      const skippedCount = res.data?.skippedCount || 0;
      const messageParts = [];

      if (createdCount > 0) {
        messageParts.push(`thêm mới ${createdCount} thửa`);
      }
      if (reactivatedCount > 0) {
        messageParts.push(`kích hoạt lại ${reactivatedCount} thửa`);
      }
      if (skippedCount > 0) {
        messageParts.push(`bỏ qua ${skippedCount} thửa đã tồn tại`);
      }

      toast.success(
        messageParts.length > 0
          ? `Đã ${messageParts.join(", ")}.`
          : "Danh sách tham gia mùa vụ đã được cập nhật.",
      );
      await fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Không thể thêm thửa ruộng vào mùa vụ đang hoạt động.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePlot = async (item) => {
    const plotId = item?.plot?._id;
    if (!plotId) {
      return;
    }

    const confirmed = await confirm({
      title: "Gỡ thửa khỏi mùa vụ?",
      message: item.hasLogs
        ? `Thửa "${item.plot?.name}" đã có ${item.diaryLogCount} nhật ký và ${item.diseaseLogCount} báo cáo bệnh. Hệ thống sẽ gỡ khỏi mùa vụ hiện tại nhưng vẫn giữ lại lịch sử.`
        : `Bạn có chắc muốn gỡ thửa "${item.plot?.name}" khỏi mùa vụ đang hoạt động không?`,
      confirmText: "Gỡ khỏi mùa vụ",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await api.delete(
        `/admin/season-plot-assignments/active/plots/${plotId}`,
      );

      if (res.data?.action === "deactivated") {
        toast.success(
          `Đã gỡ "${res.data?.plotName}" khỏi mùa vụ và giữ lại lịch sử liên quan.`,
        );
      } else {
        toast.success(`Đã gỡ "${res.data?.plotName}" khỏi mùa vụ.`);
      }

      await fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Không thể gỡ thửa ruộng khỏi mùa vụ đang hoạt động.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Quản lý thửa ruộng tham gia mùa vụ
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Thêm hoặc gỡ thửa ruộng khỏi mùa vụ đang hoạt động, đồng thời giữ an
            toàn cho dữ liệu nhật ký đã phát sinh.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading || submitting}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} />
          Làm mới
        </button>
      </div>

      {loading ? (
        <LoadingScreen message="Đang tải dữ liệu thửa ruộng theo mùa vụ..." />
      ) : !seasonDetail ? (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CalendarDays size={28} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-gray-800">
            Chưa có mùa vụ nào đang hoạt động
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
            Hãy tạo hoặc kích hoạt một lịch mùa vụ trước, sau đó quay lại đây để
            chọn các thửa ruộng tham gia.
          </p>
          <Link
            to="/admin/season-details"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            <CalendarDays size={16} />
            Mở quản lý lịch mùa vụ
          </Link>
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white shadow-lg">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
                  <CheckCircle2 size={14} />
                  Mùa vụ đang hoạt động
                </div>
                <h2 className="mt-4 text-3xl font-bold">
                  {seasonDetail.seasonLabel || seasonDetail.seasonName}
                </h2>
                <p className="mt-2 text-sm text-emerald-50">
                  Theo dõi tập trung các thửa ruộng đang được đưa vào sản xuất
                  của mùa vụ hiện tại.
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/95">
                  <span className="rounded-full bg-white/10 px-4 py-2">
                    Bắt đầu: {formatDate(seasonDetail.startDate)}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2">
                    Kết thúc: {formatDate(seasonDetail.endDate)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-emerald-100">
                    Đang tham gia
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {summary.assignedCount || 0}
                  </p>
                  <p className="mt-1 text-xs text-emerald-50">
                    {formatArea(summary.totalAssignedArea)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-emerald-100">
                    Có thể thêm
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {summary.availableCount || 0}
                  </p>
                  <p className="mt-1 text-xs text-emerald-50">
                    {formatArea(summary.totalAvailableArea)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-emerald-100">
                    Cánh đồng
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {summary.fieldCount || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-emerald-100">
                    Nông dân
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {summary.farmerCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm theo thửa ruộng, cánh đồng hoặc nông dân..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <select
                value={fieldFilter}
                onChange={(event) => setFieldFilter(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Tất cả cánh đồng</option>
                {fieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={farmerFilter}
                onChange={(event) => setFarmerFilter(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Tất cả nông dân</option>
                {farmerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-gray-800">
                  Danh sách đang tham gia mùa vụ
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filteredAssignedPlots.length} thửa phù hợp với bộ lọc hiện
                  tại.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {summary.assignedCount || 0}/{summary.totalActivePlotCount || 0}{" "}
                thửa đang hoạt động
              </span>
            </div>

            {filteredAssignedPlots.length === 0 ? (
              <div className="px-6 py-14 text-center text-gray-500">
                Không có thửa ruộng nào đang tham gia phù hợp với bộ lọc.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Thửa ruộng
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Cánh đồng
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Nông dân
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Diện tích
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Dữ liệu liên quan
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedAssignedPlots.map((item) => (
                        <tr
                          key={item.assignmentId}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {item.plot?.name || "Chưa xác định"}
                              </p>
                              {/* <p className="mt-1 text-xs text-gray-500">
                                Mã tham gia: {item.assignmentId}
                              </p> */}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2">
                              <MapPinned
                                size={16}
                                className="mt-0.5 text-emerald-600"
                              />
                              <div>
                                <p className="font-medium text-gray-700">
                                  {item.field?.name || "Chưa xác định"}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {item.field?.address ||
                                    "Chưa cập nhật địa bàn"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2">
                              <UserRound
                                size={16}
                                className="mt-0.5 text-sky-600"
                              />
                              <div>
                                <p className="font-medium text-gray-700">
                                  {item.user?.fullName || "Chưa xác định"}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {item.user?.phone || item.user?.email || "--"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {formatArea(item.plot?.area)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                <ClipboardList size={12} />
                                {item.diaryLogCount} nhật ký
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                <AlertCircle size={12} />
                                {item.diseaseLogCount} bệnh hại
                              </span>
                              {item.hasLogs ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                  Giữ lịch sử khi gỡ
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleRemovePlot(item)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 size={15} />
                                Gỡ khỏi mùa vụ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-gray-500">
                    Hiển thị {pagedAssignedPlots.length} trong tổng số{" "}
                    {filteredAssignedPlots.length} thửa đang tham gia.
                  </p>
                  <PaginationControls
                    page={assignedPage}
                    totalPages={assignedTotalPages}
                    onPageChange={setAssignedPage}
                    disabled={submitting}
                  />
                </div>
              </>
            )}
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-gray-800">
                  Danh sách có thể thêm vào mùa vụ
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Chỉ hiển thị các thửa đang canh tác nhưng chưa được đưa vào
                  mùa vụ active.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  disabled={filteredAvailablePlots.length === 0 || submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      allFilteredAvailableSelected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {allFilteredAvailableSelected ? (
                      <Check size={12} strokeWidth={3} />
                    ) : null}
                  </span>
                  Chọn tất cả theo bộ lọc
                </button>

                <button
                  type="button"
                  onClick={handleAssignSelectedPlots}
                  disabled={selectedAvailablePlotIds.length === 0 || submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} />
                  Thêm {selectedAvailablePlotIds.length} thửa đã chọn
                </button>
              </div>
            </div>

            {filteredAvailablePlots.length === 0 ? (
              <div className="px-6 py-14 text-center text-gray-500">
                Không còn thửa ruộng khả dụng phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Chọn
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Thửa ruộng
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Cánh đồng
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Nông dân
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Diện tích
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedAvailablePlots.map((item) => {
                        const plotId = String(item?.plot?._id || "");
                        const checked =
                          selectedAvailablePlotIds.includes(plotId);

                        return (
                          <tr key={plotId} className="hover:bg-gray-50">
                            <td className="px-5 py-4">
                              <CustomCheckbox
                                checked={checked}
                                disabled={submitting}
                                onChange={() =>
                                  handleTogglePlotSelection(plotId)
                                }
                              />
                            </td>
                            <td className="px-5 py-4">
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {item.plot?.name || "Chưa xác định"}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Trạng thái: Đang canh tác
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <MapPinned
                                  size={16}
                                  className="mt-0.5 text-emerald-600"
                                />
                                <div>
                                  <p className="font-medium text-gray-700">
                                    {item.field?.name || "Chưa xác định"}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {item.field?.address ||
                                      "Chưa cập nhật địa bàn"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-2">
                                <UserRound
                                  size={16}
                                  className="mt-0.5 text-sky-600"
                                />
                                <div>
                                  <p className="font-medium text-gray-700">
                                    {item.user?.fullName || "Chưa xác định"}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {item.user?.phone ||
                                      item.user?.email ||
                                      "--"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-700">
                              {formatArea(item.plot?.area)}
                            </td>
                            <td className="px-5 py-4">
                              {item.hadPreviousAssignment ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                  <RefreshCcw size={12} />
                                  Có thể kích hoạt lại từ lịch sử cũ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <Plus size={12} />
                                  Sẵn sàng thêm mới
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-gray-500">
                    Hiển thị {pagedAvailablePlots.length} trong tổng số{" "}
                    {filteredAvailablePlots.length} thửa có thể thêm.
                  </p>
                  <PaginationControls
                    page={availablePage}
                    totalPages={availableTotalPages}
                    onPageChange={setAvailablePage}
                    disabled={submitting}
                  />
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminSeasonPlots;
