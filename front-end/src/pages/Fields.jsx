import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Layers,
  LayoutGrid,
  MapPin,
  Plus,
  Sprout,
  Tractor,
  Trash2,
  X,
} from "lucide-react";
import api from "../services/api";
import { useFeedback } from "../hooks/useFeedback";
import LoadingScreen from "../components/Layout/LoadingScreen";
import CustomDropdown from "../components/UI/CustomDropdown";

const emptyPlotForm = {
  name: "",
  area: "",
  status: "active",
  addressDetail: "",
};

const statusOptions = [
  {
    value: "active",
    label: "Đang canh tác",
    dot: "bg-emerald-500",
  },
  {
    value: "inactive",
    label: "Chờ vụ mới",
    dot: "bg-orange-400",
  },
];

const Fields = () => {
  const { toast, confirm } = useFeedback();
  const [fields, setFields] = useState([]);
  const [plots, setPlots] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [loadingFields, setLoadingFields] = useState(true);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [plotForm, setPlotForm] = useState(emptyPlotForm);

  const fetchFields = async (preferredFieldId) => {
    try {
      setLoadingFields(true);
      const res = await api.get("/fields");
      const fieldList = res.data || [];
      setFields(fieldList);

      if (fieldList.length === 0) {
        setSelectedField(null);
        setPlots([]);
        return;
      }

      const nextField =
        fieldList.find((field) => field._id === preferredFieldId) ||
        fieldList.find((field) => field._id === selectedField?._id) ||
        fieldList[0];

      setSelectedField(nextField);
      await fetchPlots(nextField._id);
    } catch (error) {
      console.error("Lỗi tải danh sách cánh đồng", error);
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchPlots = async (fieldId) => {
    if (!fieldId) {
      setPlots([]);
      return;
    }

    try {
      setLoadingPlots(true);
      const res = await api.get("/plots", { params: { fieldId } });
      setPlots(res.data || []);
    } catch (error) {
      console.error("Lỗi tải danh sách thửa ruộng", error);
    } finally {
      setLoadingPlots(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const openCreatePlotModal = () => {
    setEditingPlot(null);
    setPlotForm(emptyPlotForm);
    setIsPlotModalOpen(true);
  };

  const openEditPlotModal = (plot) => {
    setEditingPlot(plot);
    setPlotForm({
      name: plot.name || "",
      area: plot.area || "",
      status: plot.status || "active",
      addressDetail: plot.addressDetail || "",
    });
    setIsPlotModalOpen(true);
  };

  const handleSavePlot = async () => {
    if (!selectedField) return;

    if (!plotForm.name.trim()) {
      toast.warning("Vui lòng nhập tên thửa.");
      return;
    }

    if (!Number.isFinite(Number(plotForm.area)) || Number(plotForm.area) <= 0) {
      toast.warning("Diện tích phải lớn hơn 0.");
      return;
    }

    try {
      if (editingPlot) {
        await api.put(`/plots/${editingPlot._id}`, plotForm);
      } else {
        await api.post("/plots", { ...plotForm, fieldId: selectedField._id });
      }

      setIsPlotModalOpen(false);
      setPlotForm(emptyPlotForm);
      setEditingPlot(null);
      await fetchFields(selectedField._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu thửa ruộng");
    }
  };

  const handleDeletePlot = async (plotId) => {
    const confirmed = await confirm({
      title: "Xóa thửa ruộng?",
      message:
        "Thao tác này chỉ nên dùng với thửa chưa phát sinh lịch sử. Nếu thửa đã có mùa vụ hoặc nhật ký, hệ thống sẽ tự chặn xóa.",
      confirmText: "Xóa thửa",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/plots/${plotId}`);
      toast.success("Đã xóa thửa ruộng.");
      await fetchFields(selectedField?._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa thửa ruộng");
    }
  };

  const totalArea = useMemo(
    () => plots.reduce((sum, plot) => sum + Number(plot.area || 0), 0),
    [plots]
  );

  if (loadingFields && fields.length === 0) {
    return <LoadingScreen fullScreen={true} message="Đang chuẩn bị không gian canh tác..." />;
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-gray-50 font-sans">
      <aside className="z-10 flex w-[300px] shrink-0 flex-col border-r border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-1.5">
              <Sprout size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-bold text-gray-800">Cánh đồng HTX</h2>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Chọn cánh đồng để quản lý các thửa ruộng.
          </p>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {loadingFields ? (
            <div className="flex flex-col items-center py-10 text-center text-gray-400">
              <div className="mb-3 rounded-2xl bg-gray-100 p-4">
                <MapPin size={24} className="text-gray-300" />
              </div>
              <p className="text-sm">Đang tải...</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-gray-400">
              <div className="mb-3 rounded-2xl bg-gray-100 p-4">
                <MapPin size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Chưa có cánh đồng nào.</p>
              <p className="mt-1 text-xs text-gray-400">Nhờ admin HTX tạo trước.</p>
            </div>
          ) : (
            fields.map((field) => {
              const isSelected = selectedField?._id === field._id;
              return (
                <button
                  key={field._id}
                  onClick={() => {
                    setSelectedField(field);
                    fetchPlots(field._id);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-emerald-200 bg-emerald-50/80 shadow-sm shadow-emerald-100"
                      : "border-transparent hover:bg-gray-50 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Sprout size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={`truncate text-sm font-semibold ${
                          isSelected ? "text-emerald-800" : "text-gray-700"
                        }`}
                      >
                        {field.name}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {field.address || "Chưa cập nhật địa bàn"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium text-gray-500">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5">{field.plotCount || 0} thửa</span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5">{field.farmerCount || 0} nông dân</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="relative flex flex-1 flex-col bg-gray-50/60">
        {selectedField ? (
          <>
            <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
              <div>
                <h1 className="text-xl font-bold text-gray-800">{selectedField.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-gray-400" />
                    {selectedField.address || "Chưa có địa bàn"}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Layers size={13} />
                    {plots.length} thửa
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600 ring-1 ring-emerald-100">
                    {totalArea.toLocaleString()} m²
                  </span>
                </div>
              </div>

              <button
                onClick={openCreatePlotModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
              >
                <Plus size={16} /> Thêm thửa
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <span>Tên thửa</span>
                  <span>Diện tích</span>
                  <span>Trạng thái</span>
                  <span>Địa chỉ chi tiết</span>
                  <span className="text-right">Thao tác</span>
                </div>

                <div className="divide-y divide-gray-50">
                  {loadingPlots ? (
                    <LoadingScreen message="Đang tải danh sách thửa ruộng..." />
                  ) : plots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-gray-400">
                      <div className="mb-3 rounded-2xl bg-gray-100 p-4">
                        <LayoutGrid size={28} className="text-gray-300" />
                      </div>
                      <p className="font-medium text-gray-500">
                        Bạn chưa có thửa ruộng nào trong cánh đồng này
                      </p>
                      <button
                        onClick={openCreatePlotModal}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 ring-1 ring-emerald-100 transition-all hover:bg-emerald-100"
                      >
                        <Plus size={14} /> Thêm thửa đầu tiên
                      </button>
                    </div>
                  ) : (
                    plots.map((plot) => (
                      <div
                        key={plot._id}
                        className="group grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-emerald-50/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-gray-50 p-2 text-emerald-600">
                            <Tractor size={16} />
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{plot.name}</p>
                        </div>

                        <span className="inline-flex w-fit rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-600 ring-1 ring-gray-200/50">
                          {Number(plot.area || 0).toLocaleString()} m²
                        </span>

                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
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
                          {plot.status === "active" ? "Đang canh tác" : "Chờ vụ mới"}
                        </span>

                        <p className="truncate text-xs text-gray-600" title={plot.addressDetail || "Chưa bổ sung"}>
                          {plot.addressDetail || <span className="italic text-gray-400">Chưa bổ sung</span>}
                        </p>

                        <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => openEditPlotModal(plot)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Sửa"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePlot(plot._id)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <div className="mb-4 rounded-2xl bg-gray-100 p-5">
              <LayoutGrid size={40} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-600">Chưa có cánh đồng để chọn</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-400">
              Khi admin tạo cánh đồng cho hợp tác xã, bạn sẽ chọn ở đây để thêm thửa ruộng.
            </p>
          </div>
        )}
      </section>

      {isPlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-dropdown-enter">
            {/* Gradient header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingPlot ? "Cập nhật thửa ruộng" : "Thêm thửa ruộng mới"}
                </h3>
                <p className="mt-0.5 text-xs text-emerald-200">
                  Cánh đồng: {selectedField?.name || "-"}
                </p>
              </div>
              <button
                onClick={() => setIsPlotModalOpen(false)}
                className="rounded-lg p-1.5 text-emerald-200 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Tên thửa
                </label>
                <input
                  type="text"
                  value={plotForm.name}
                  onChange={(e) =>
                    setPlotForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Ví dụ: Thửa số 1"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Diện tích (m²)
                  </label>
                  <input
                    type="number"
                    value={plotForm.area}
                    onChange={(e) =>
                      setPlotForm((prev) => ({ ...prev, area: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Trạng thái
                  </label>
                  <CustomDropdown
                    value={plotForm.status}
                    onChange={(val) =>
                      setPlotForm((prev) => ({ ...prev, status: val }))
                    }
                    options={statusOptions}
                    placeholder="Chọn trạng thái"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Địa chỉ chi tiết
                </label>
                <textarea
                  rows={2}
                  value={plotForm.addressDetail}
                  onChange={(e) =>
                    setPlotForm((prev) => ({ ...prev, addressDetail: e.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Ấp 2, gần kênh Ngang, lô trong cùng"
                />
              </div>

              <button
                onClick={handleSavePlot}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
              >
                {editingPlot ? "Lưu thay đổi" : "Tạo thửa ruộng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fields;
