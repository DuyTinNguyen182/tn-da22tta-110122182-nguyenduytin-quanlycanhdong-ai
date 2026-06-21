import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Image,
  Layers,
  LayoutGrid,
  MapPin,
  Plus,
  Sprout,
  Tractor,
  Trash2,
  X,
} from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import CustomDropdown from "../../../components/UI/CustomDropdown";

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const emptyPlotForm = {
  name: "",
  area: "",
  status: "active",
  imageFile: null,
};

const statusOptions = [
  {
    value: "active",
    label: "Đang canh tác",
    dot: "bg-emerald-500",
  },
  {
    value: "inactive",
    label: "Đang nghỉ",
    dot: "bg-orange-400",
  },
];

const Fields = () => {
  const { toast, confirm } = useFeedback();
  const [fields, setFields] = useState([]);
  const [fieldKeyword, setFieldKeyword] = useState("");
  const [plots, setPlots] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [loadingFields, setLoadingFields] = useState(true);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [plotForm, setPlotForm] = useState(emptyPlotForm);
  const [imagePreview, setImagePreview] = useState(null);
  const imageInputRef = useRef(null);

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
    setImagePreview(null);
    setIsPlotModalOpen(true);
  };

  const openEditPlotModal = (plot) => {
    setEditingPlot(plot);
    setPlotForm({
      name: plot.name || "",
      area: plot.area || "",
      status: plot.status || "active",
      imageFile: null,
    });
    setImagePreview(plot.imageUrl || null);
    setIsPlotModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlotForm((prev) => ({ ...prev, imageFile: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setPlotForm((prev) => ({ ...prev, imageFile: null }));
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSavePlot = async () => {
    if (!selectedField) return;

    const plotName = plotForm.name.trim();
    if (!plotName) {
      toast.warning("Vui lòng nhập tên thửa.");
      return;
    }

    const isDuplicateName = plots.some(
      (p) =>
        p.name.trim().toLowerCase() === plotName.toLowerCase() &&
        p._id !== editingPlot?._id,
    );
    if (isDuplicateName) {
      toast.warning(`Tên thửa "${plotName}" đã tồn tại trong cánh đồng này.`);
      return;
    }

    const areaValue = Number(plotForm.area);
    if (!Number.isFinite(areaValue) || areaValue <= 0) {
      toast.warning("Diện tích phải là một số lớn hơn 0.");
      return;
    }

    if (areaValue > 1000000) {
      toast.warning(
        "Diện tích quá lớn (vượt quá 100 hecta), vui lòng kiểm tra lại.",
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", plotForm.name.trim());
      formData.append("area", plotForm.area);
      formData.append("status", plotForm.status);
      if (!editingPlot) {
        formData.append("fieldId", selectedField._id);
      }
      if (plotForm.imageFile) {
        formData.append("image", plotForm.imageFile);
      }

      if (editingPlot) {
        await api.put(`/plots/${editingPlot._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Cập nhật thửa ruộng thành công.");
      } else {
        await api.post("/plots", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Tạo thửa ruộng thành công.");
      }

      setIsPlotModalOpen(false);
      setPlotForm(emptyPlotForm);
      setEditingPlot(null);
      setImagePreview(null);
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
    [plots],
  );

  const filteredFields = useMemo(() => {
    const keyword = normalizeText(fieldKeyword);
    if (!keyword) return fields;

    return fields.filter((field) => {
      const haystack = normalizeText(
        [field.name, field.address].filter(Boolean).join(" "),
      );
      return haystack.includes(keyword);
    });
  }, [fieldKeyword, fields]);

  const visibleFields = filteredFields;

  if (loadingFields && fields.length === 0) {
    return (
      <LoadingScreen
        fullScreen={true}
        message="Đang chuẩn bị không gian canh tác..."
      />
    );
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
          <div className="relative mt-3">
            <MapPin
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={fieldKeyword}
              onChange={(e) => setFieldKeyword(e.target.value)}
              placeholder="Tìm cánh đồng..."
              className="w-full rounded-xl border border-gray-100 bg-gray-50/80 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {loadingFields ? (
            <div className="flex flex-col items-center py-10 text-center text-gray-400">
              <div className="mb-3 rounded-2xl bg-gray-100 p-4">
                <MapPin size={24} className="text-gray-300" />
              </div>
              <p className="text-sm">Đang tải...</p>
            </div>
          ) : visibleFields.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-gray-400">
              <div className="mb-3 rounded-2xl bg-gray-100 p-4">
                <MapPin size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {fieldKeyword.trim()
                  ? "Không tìm thấy cánh đồng phù hợp."
                  : "Chưa có cánh đồng nào."}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {fieldKeyword.trim()
                  ? "Thử nhập từ khóa ngắn hơn hoặc một phần tên cánh đồng."
                  : "Nhờ admin HTX tạo trước."}
              </p>
            </div>
          ) : (
            visibleFields.map((field) => {
              const isSelected = selectedField?._id === field._id;
              const isOwned = Number(field.myPlotCount || 0) > 0;
              return (
                <button
                  key={field._id}
                  onClick={() => {
                    setSelectedField(field);
                    fetchPlots(field._id);
                  }}
                  className={`w-full relative rounded-xl border p-3 text-left transition-all duration-200 ${
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
                    <span className="rounded-md bg-gray-100 px-2 py-0.5">
                      {field.plotCount || 0} thửa
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5">
                      {field.farmerCount || 0} nông dân
                    </span>
                    {isOwned && (
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-white font-semibold shadow-sm ring-1 ring-emerald-200">
                        Bạn có {field.myPlotCount} thửa
                      </span>
                    )}
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
                <h1 className="text-xl font-bold text-gray-800">
                  {selectedField.name}
                </h1>
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
                  {/* <span>Địa chỉ chi tiết</span> */}
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
                            {plot.imageUrl ? (
                              <img
                                src={plot.imageUrl}
                                alt={plot.name}
                                onClick={() => {
                                  if (plot.imageUrl) {
                                    window.open(
                                      plot.imageUrl,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  }
                                }}
                                className="cursor-pointer h-10 w-10 rounded-lg object-cover ring-1 ring-gray-200"
                              />
                            ) : (
                              <Tractor size={16} />
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-800">
                            {plot.name}
                          </p>
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
                          {plot.status === "active"
                            ? "Đang canh tác"
                            : "Chờ vụ mới"}
                        </span>

                        {/* <p className="truncate text-xs text-gray-600" title="">
                          <span className="italic text-gray-400">Theo địa chỉ cánh đồng</span>
                        </p> */}

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
            <h3 className="text-lg font-bold text-gray-600">
              Chưa có cánh đồng để chọn
            </h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-400">
              Khi admin tạo cánh đồng cho hợp tác xã, bạn sẽ chọn ở đây để thêm
              thửa ruộng.
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
                    min="0.1"
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

              {/* Ảnh thửa ruộng */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <Image size={13} /> Ảnh thửa ruộng
                </label>
                {imagePreview ? (
                  <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      onClick={() => {
                        if (imagePreview) {
                          window.open(
                            imagePreview,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }
                      }}
                      className="cursor-pointer h-40 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-600 shadow-sm hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                    <p className="px-3 py-1.5 text-xs text-gray-500">
                      {plotForm.imageFile
                        ? plotForm.imageFile.name
                        : "Ảnh hiện tại"}
                    </p>
                  </div>
                ) : (
                  <label
                    htmlFor="plot-image-upload"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 py-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                  >
                    <Image size={22} className="text-gray-300" />
                    <p className="text-xs font-medium text-gray-400">
                      Nhấp để chọn ảnh
                    </p>
                    <p className="text-[11px] text-gray-300">
                      JPG, PNG, WebP — tối đa 10MB
                    </p>
                  </label>
                )}
                <input
                  id="plot-image-upload"
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlotModalOpen(false)}
                  className="w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePlot}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg"
                >
                  {editingPlot ? "Lưu thay đổi" : "Tạo thửa ruộng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fields;
