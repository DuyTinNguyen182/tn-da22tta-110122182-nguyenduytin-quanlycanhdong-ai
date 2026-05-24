import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays } from "lucide-react";
import api from "../../../services/api";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import { useFeedback } from "../../../hooks/useFeedback";
import DiseaseMonitoringSummaryCards from "./components/DiseaseMonitoringSummaryCards.jsx";
import DiseaseMonitoringFilterBar from "./components/DiseaseMonitoringFilterBar.jsx";
import DiseaseMonitoringTable from "./components/DiseaseMonitoringTable.jsx";
import DiseaseWarningModal from "./components/DiseaseWarningModal.jsx";
import {
  PAGE_SIZE,
  buildWarningFormFromPreview,
  filterLogsByTimeRange,
  formatSeasonLabel,
  isInToday,
} from "./adminDiseaseMonitoringUtils.jsx";

const AdminDiseaseMonitoring = () => {
  const { toast } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fields, setFields] = useState([]);
  const [activeSeason, setActiveSeason] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [warningLoadingLogId, setWarningLoadingLogId] = useState("");
  const [warningSubmitting, setWarningSubmitting] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningPreviewLoading, setWarningPreviewLoading] = useState(false);
  const [selectedWarningLogId, setSelectedWarningLogId] = useState("");
  const [warningPreview, setWarningPreview] = useState(null);
  const [warningForm, setWarningForm] = useState(null);
  const [filters, setFilters] = useState({
    fieldId: "",
    timeRange: "all",
    status: "",
  });

  const fieldOptions = useMemo(
    () => [
      { value: "", label: "Tất cả cánh đồng" },
      ...(fields || []).map((field) => ({
        value: field._id,
        label: field.name,
      })),
    ],
    [fields],
  );

  const updateLogInState = useCallback((updatedLog) => {
    if (!updatedLog?._id) return;

    setLogs((prev) =>
      prev.map((item) => (item._id === updatedLog._id ? updatedLog : item)),
    );
  }, []);

  const fetchBaseData = useCallback(async () => {
    try {
      setLoading(true);

      const [fieldRes, activeSeasonRes] = await Promise.all([
        api.get("/fields"),
        api.get("/season-details/active"),
      ]);

      setFields(fieldRes.data || []);
      setActiveSeason(activeSeasonRes.data || null);
    } catch (error) {
      console.error("Lỗi tải dữ liệu theo dõi dịch bệnh:", error);
      toast.error(
        error.response?.data?.message ||
          "Không thể tải dữ liệu theo dõi dịch bệnh",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLogs = useCallback(
    async (
      fieldId = "",
      seasonDetailId = "",
      status = "",
      { silent = false } = {},
    ) => {
      if (!seasonDetailId) {
        setLogs([]);
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const res = await api.get("/disease-logs", {
          params: {
            seasonId: seasonDetailId,
            ...(fieldId ? { fieldId } : {}),
            ...(status ? { status } : {}),
          },
        });

        setLogs(res.data || []);
      } catch (error) {
        console.error("Lỗi tải danh sách bệnh theo mùa vụ hiện tại:", error);
        toast.error(
          error.response?.data?.message || "Không thể tải danh sách bệnh",
        );
        setLogs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  useEffect(() => {
    if (loading) return;

    fetchLogs(filters.fieldId, activeSeason?._id || "", filters.status, {
      silent: true,
    });
  }, [activeSeason?._id, fetchLogs, filters.fieldId, filters.status, loading]);

  const filteredLogs = useMemo(
    () => filterLogsByTimeRange(logs, filters.timeRange),
    [filters.timeRange, logs],
  );

  const summary = useMemo(
    () => ({
      total: filteredLogs.length,
      todayCount: logs.filter((log) =>
        isInToday(log.detectedAt || log.createdAt),
      ).length,
      fieldCount: new Set(
        filteredLogs.map((log) => log.fieldId).filter(Boolean),
      ).size,
      unprocessedCount: filteredLogs.filter((log) => log.status !== "processed")
        .length,
      processedCount: filteredLogs.filter((log) => log.status === "processed")
        .length,
      warnedCount: filteredLogs.filter((log) => log.warningSent).length,
    }),
    [filteredLogs, logs],
  );

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.fieldId, filters.timeRange, filters.status]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const closeWarningModal = () => {
    setWarningModalOpen(false);
    setWarningPreviewLoading(false);
    setWarningPreview(null);
    setWarningForm(null);
    setSelectedWarningLogId("");
  };

  const handleOpenWarningModal = async (log) => {
    if (!log?._id) return;

    try {
      setWarningLoadingLogId(log._id);
      setSelectedWarningLogId(log._id);
      setWarningModalOpen(true);
      setWarningPreviewLoading(true);
      setWarningPreview(null);
      setWarningForm(null);

      const res = await api.get(`/disease-logs/${log._id}/warning-preview`);
      setWarningPreview(res.data);
      setWarningForm(buildWarningFormFromPreview(res.data?.form));
    } catch (error) {
      console.error("Lỗi tải trước form cảnh báo bệnh:", error);
      toast.error(
        error.response?.data?.message || "Không thể chuẩn bị nội dung cảnh báo",
      );
      closeWarningModal();
    } finally {
      setWarningPreviewLoading(false);
      setWarningLoadingLogId("");
    }
  };

  const handleWarningFormChange = (field, value) => {
    setWarningForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitWarning = async () => {
    if (!selectedWarningLogId || !warningForm) return;

    if (!warningForm.title.trim()) {
      toast.warning("Vui lòng nhập tiêu đề cảnh báo.");
      return;
    }

    if (!warningForm.content.trim()) {
      toast.warning("Vui lòng nhập nội dung cảnh báo.");
      return;
    }

    try {
      setWarningSubmitting(true);

      const res = await api.post(
        `/disease-logs/${selectedWarningLogId}/warnings`,
        {
          title: warningForm.title.trim(),
          content: warningForm.content.trim(),
        },
      );

      updateLogInState(res.data?.log);
      toast.success(
        `Đã gửi cảnh báo đến ${res.data?.recipients?.length || 0} nông dân.`,
      );
      closeWarningModal();
    } catch (error) {
      console.error("Lỗi gửi cảnh báo bệnh:", error);
      toast.error(
        error.response?.data?.message || "Không thể gửi cảnh báo bệnh",
      );
    } finally {
      setWarningSubmitting(false);
    }
  };

  if (loading && !activeSeason && logs.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-8">
        <LoadingScreen message="Đang tải theo dõi dịch bệnh..." />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 lg:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Theo dõi dịch bệnh
            </h1>
            {/* <p className="mt-1 text-sm text-gray-500">
              Theo dõi log bệnh trong mùa vụ hiện tại và gửi cảnh báo nhanh đến nông
              dân trong cùng cánh đồng.
            </p> */}
          </div>

          {activeSeason ? (
            <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <CalendarDays size={16} />
              Mùa vụ hiện tại: {formatSeasonLabel(activeSeason)}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <AlertTriangle size={16} />
              Chưa có mùa vụ đang canh tác
            </div>
          )}
        </div>

        <DiseaseMonitoringSummaryCards summary={summary} />

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Danh sách ghi nhận
              </h2>
              {/* <p className="mt-1 text-sm text-gray-500">
                Admin chỉ xem trạng thái xử lý do nông dân cập nhật và chủ động
                gửi cảnh báo khi cần.
              </p> */}
            </div>

            <DiseaseMonitoringFilterBar
              filters={filters}
              fieldOptions={fieldOptions}
              onFilterChange={handleFilterChange}
            />
          </div>

          <DiseaseMonitoringTable
            activeSeason={activeSeason}
            loading={loading}
            refreshing={refreshing}
            paginatedLogs={paginatedLogs}
            filteredLogs={filteredLogs}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onOpenWarningModal={handleOpenWarningModal}
            warningLoadingLogId={warningLoadingLogId}
          />
        </section>
      </div>

      <DiseaseWarningModal
        open={warningModalOpen}
        preview={warningPreview}
        form={warningForm}
        loading={warningPreviewLoading}
        submitting={warningSubmitting}
        onClose={closeWarningModal}
        onChange={handleWarningFormChange}
        onSubmit={handleSubmitWarning}
      />
    </div>
  );
};

export default AdminDiseaseMonitoring;
