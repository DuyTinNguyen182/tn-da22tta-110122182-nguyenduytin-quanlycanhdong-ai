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
} from "lucide-react";
import api from "../services/api";
import { useFeedback } from "../hooks/useFeedback";

const emptyPlotForm = {
  name: "",
  area: "",
  status: "active",
  addressDetail: "",
};

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

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-gray-50 font-sans">
      <aside className="z-10 flex w-[360px] flex-col border-r border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800">Cánh đồng hợp tác xã</h2>
            <p className="mt-1 text-sm text-gray-500">
              Chọn cánh đồng có thửa ruộng của bạn và tiến hành khai báo.
            </p>
          </div>

        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loadingFields ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
              Đang tải danh sách cánh đồng...
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
              Chưa có cánh đồng nào. Hãy nhờ admin hợp tác xã tạo trước.
            </div>
          ) : (
            fields.map((field) => (
              <button
                key={field._id}
                onClick={() => {
                  setSelectedField(field);
                  fetchPlots(field._id);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selectedField?._id === field._id
                    ? "border-emerald-200 bg-emerald-50 shadow-sm"
                    : "border-transparent bg-white hover:border-gray-100 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div
                      className={`rounded-xl p-2.5 ${
                        selectedField?._id === field._id
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Sprout size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{field.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} />
                        {field.address || "Admin chưa cập nhật địa bàn"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                    {field.plotCount || 0} thửa toàn cánh đồng
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                    {field.farmerCount || 0} nông dân tham gia
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="relative flex flex-1 flex-col bg-gray-50/60">
        {selectedField ? (
          <>
            <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800">{selectedField.name}</h1>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    Cánh đồng chung
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-gray-400" />
                    {selectedField.address || "Chưa có địa bàn"}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <Layers size={16} />
                    {plots.length} thửa của bạn
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span className="text-emerald-600">
                    Tổng diện tích: {totalArea.toLocaleString()} m2
                  </span>
                </div>
              </div>

              <button
                onClick={openCreatePlotModal}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
              >
                <Plus size={18} /> Thêm thửa ruộng
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="grid grid-cols-[1.3fr_0.8fr_0.9fr_1.4fr_0.8fr] gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <span>Tên thửa</span>
                  <span>Diện tích</span>
                  <span>Trạng thái</span>
                  <span>Địa chỉ chi tiết</span>
                  <span className="text-right">Thao tác</span>
                </div>

                <div className="divide-y divide-gray-50">
                  {loadingPlots ? (
                    <div className="px-6 py-12 text-center text-sm text-gray-500">
                      Đang tải danh sách thửa ruộng...
                    </div>
                  ) : plots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-gray-400">
                      <div className="mb-3 rounded-full bg-gray-50 p-4">
                        <LayoutGrid size={32} className="text-gray-300" />
                      </div>
                      <p className="font-medium text-gray-500">
                        Bạn chưa có thửa ruộng nào trong cánh đồng này
                      </p>
                      <button
                        onClick={openCreatePlotModal}
                        className="mt-3 text-sm font-semibold text-emerald-600 hover:underline"
                      >
                        Thêm thửa đầu tiên
                      </button>
                    </div>
                  ) : (
                    plots.map((plot) => (
                      <div
                        key={plot._id}
                        className="grid grid-cols-[1.3fr_0.8fr_0.9fr_1.4fr_0.8fr] items-center gap-4 px-6 py-4 transition-colors hover:bg-emerald-50/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-gray-50 p-2 text-emerald-600">
                            <Tractor size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{plot.name}</p>
                            <p className="text-xs text-gray-500">
                              Gắn với cánh đồng {selectedField.name}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex w-fit rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-600">
                          {Number(plot.area || 0).toLocaleString()} m2
                        </span>

                        <span
                          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                            plot.status === "active"
                              ? "border-green-200 bg-green-50 text-green-600"
                              : "border-orange-200 bg-orange-50 text-orange-600"
                          }`}
                        >
                          {plot.status === "active" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <AlertCircle size={12} />
                          )}
                          {plot.status === "active" ? "Đang canh tác" : "Chờ vụ mới"}
                        </span>

                        <p className="text-sm text-gray-600">
                          {plot.addressDetail || "Chưa bổ sung địa chỉ chi tiết"}
                        </p>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditPlotModal(plot)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePlot(plot._id)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
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
            <LayoutGrid size={64} className="mb-6 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-600">Chưa có cánh đồng để chọn</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-400">
              Khi admin tạo cánh đồng cho hợp tác xã, bạn sẽ chọn ở đây để thêm thửa ruộng của
              mình.
            </p>
          </div>
        )}
      </section>

      {isPlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {editingPlot ? "Cập nhật thửa ruộng" : "Thêm thửa ruộng mới"}
                </h3>
                <p className="text-sm text-gray-500">
                  Cánh đồng đang chọn: {selectedField?.name || "-"}
                </p>
              </div>
              <button
                onClick={() => setIsPlotModalOpen(false)}
                className="text-2xl text-gray-400 transition-colors hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                  Tên thửa
                </label>
                <input
                  type="text"
                  value={plotForm.name}
                  onChange={(event) =>
                    setPlotForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Ví dụ: Thửa số 1"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                    Diện tích (m2)
                  </label>
                  <input
                    type="number"
                    value={plotForm.area}
                    onChange={(event) =>
                      setPlotForm((prev) => ({ ...prev, area: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                    Trạng thái
                  </label>
                  <select
                    value={plotForm.status}
                    onChange={(event) =>
                      setPlotForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  >
                    <option value="active">Đang canh tác</option>
                    <option value="inactive">Chờ vụ mới</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                  Địa chỉ chi tiết
                </label>
                <textarea
                  rows={3}
                  value={plotForm.addressDetail}
                  onChange={(event) =>
                    setPlotForm((prev) => ({ ...prev, addressDetail: event.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Ví dụ: Ấp 2, gần kênh Ngang, lô trong cùng"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Địa chỉ này để mô tả thực địa. Thống kê vẫn dựa trên cánh đồng do admin quản lý.
                </p>
              </div>

              <button
                onClick={handleSavePlot}
                className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
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
