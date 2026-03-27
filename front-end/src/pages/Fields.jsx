import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MapPin,
  MoreVertical,
  Trash2,
  Edit2,
  Tractor,
  Layers,
  LayoutGrid,
  AlertCircle,
  CheckCircle2,
  Sprout
} from "lucide-react";
import api from "../services/api";
import SeasonManager from "../components/Season/SeasonManager";

const LOCATION_API_BASE = "https://provinces.open-api.vn/api";

const Fields = () => {
  // --- STATE ---
  const [fields, setFields] = useState([]);
  const [plots, setPlots] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [loadingPlots, setLoadingPlots] = useState(false);

  // Modal State
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  
  // Form State
  const [editingItem, setEditingItem] = useState(null);
  const [fieldForm, setFieldForm] = useState({ name: "", address: "" });
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("");
  const [selectedWardCode, setSelectedWardCode] = useState("");
  const [loadingAddressData, setLoadingAddressData] = useState(false);
  const [addressDataError, setAddressDataError] = useState("");
  const [plotForm, setPlotForm] = useState({ name: "", area: "", status: "active" });
  const [activeTab, setActiveTab] = useState("plots"); // 'plots' hoặc 'seasons'

  const getSelectedProvince = () => provinces.find((p) => String(p.code) === String(selectedProvinceCode));
  const getSelectedDistrict = () => districts.find((d) => String(d.code) === String(selectedDistrictCode));
  const getSelectedWard = () => wards.find((w) => String(w.code) === String(selectedWardCode));

  const composeAddress = (wardName, districtName, provinceName) => {
    if (wardName && districtName && provinceName) return `${wardName}, ${districtName}, ${provinceName}`;
    if (districtName && provinceName) return `${districtName}, ${provinceName}`;
    if (provinceName) return provinceName;
    return "";
  };

  const fetchProvinces = async () => {
    try {
      setLoadingAddressData(true);
      setAddressDataError("");
      const res = await fetch(`${LOCATION_API_BASE}/p/`);
      if (!res.ok) throw new Error("Không tải được dữ liệu tỉnh/thành");
      const data = await res.json();
      setProvinces(data || []);
    } catch (err) {
      setAddressDataError(err.message || "Lỗi tải dữ liệu địa chỉ");
    } finally {
      setLoadingAddressData(false);
    }
  };

  const fetchDistricts = async (provinceCode) => {
    if (!provinceCode) {
      setDistricts([]);
      return;
    }
    try {
      setLoadingAddressData(true);
      setAddressDataError("");
      const res = await fetch(`${LOCATION_API_BASE}/p/${provinceCode}?depth=2`);
      if (!res.ok) throw new Error("Không tải được danh sách quận/huyện");
      const data = await res.json();
      setDistricts(data?.districts || []);
    } catch (err) {
      setAddressDataError(err.message || "Lỗi tải dữ liệu quận/huyện");
      setDistricts([]);
    } finally {
      setLoadingAddressData(false);
    }
  };

  const fetchWards = async (districtCode) => {
    if (!districtCode) {
      setWards([]);
      return;
    }
    try {
      setLoadingAddressData(true);
      setAddressDataError("");
      const res = await fetch(`${LOCATION_API_BASE}/d/${districtCode}?depth=2`);
      if (!res.ok) throw new Error("Không tải được danh sách phường/xã");
      const data = await res.json();
      setWards(data?.wards || []);
    } catch (err) {
      setAddressDataError(err.message || "Lỗi tải dữ liệu phường/xã");
      setWards([]);
    } finally {
      setLoadingAddressData(false);
    }
  };

  // --- 1. API: FIELDS ---
  const fetchFields = async () => {
    try {
      const res = await api.get("/fields");
      setFields(res.data);
      // Nếu chưa chọn field nào và có dữ liệu, chọn cái đầu tiên
      if (!selectedField && res.data.length > 0) {
        handleSelectField(res.data[0]);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách ruộng:", err);
    }
  };

  const handleSaveField = async () => {
    try {
      if (editingItem) {
        // Update
        await api.put(`/fields/${editingItem._id}`, fieldForm);
      } else {
        // Create
        await api.post("/fields", fieldForm);
      }
      setIsFieldModalOpen(false);
      fetchFields();
      setFieldForm({ name: "", address: "" });
      setIsCustomAddress(false);
      setSelectedProvinceCode("");
      setSelectedDistrictCode("");
      setSelectedWardCode("");
      setEditingItem(null);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi lưu thông tin ruộng");
    }
  };

  const handleDeleteField = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa ruộng này và toàn bộ thửa bên trong?")) return;
    try {
      await api.delete(`/fields/${id}`);
      // Nếu đang chọn field bị xóa thì reset
      if (selectedField?._id === id) {
        setSelectedField(null);
        setPlots([]);
      }
      fetchFields();
    } catch (err) {
      alert("Không thể xóa ruộng này");
    }
  };

  // --- 2. API: PLOTS ---
  const fetchPlots = async (fieldId) => {
    setLoadingPlots(true);
    try {
      // Gọi API: GET /plots?fieldId=...
      const res = await api.get(`/plots`, { params: { fieldId } });
      setPlots(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách thửa:", err);
    } finally {
      setLoadingPlots(false);
    }
  };

  const handleSelectField = (field) => {
    setSelectedField(field);
    fetchPlots(field._id);
  };

  const handleSavePlot = async () => {
    if (!selectedField) return;

    try {
      if (editingItem) {
        // Update: PUT /plots/:id
        await api.put(`/plots/${editingItem._id}`, plotForm);
      } else {
        // Create: POST /plots (kèm fieldId)
        await api.post("/plots", { ...plotForm, fieldId: selectedField._id });
      }
      setIsPlotModalOpen(false);
      fetchPlots(selectedField._id); // Reload plots
      setPlotForm({ name: "", area: "", status: "active" });
      setEditingItem(null);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi lưu thông tin thửa");
    }
  };

  const handleDeletePlot = async (id) => {
    if (!window.confirm("Xóa thửa ruộng này?")) return;
    try {
      await api.delete(`/plots/${id}`);
      fetchPlots(selectedField._id);
    } catch (err) {
      alert("Lỗi khi xóa thửa");
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    fetchFields();
  }, []);

  useEffect(() => {
    if (isFieldModalOpen && provinces.length === 0) {
      fetchProvinces();
    }
  }, [isFieldModalOpen, provinces.length]);

  useEffect(() => {
    const province = getSelectedProvince();
    const district = getSelectedDistrict();
    const ward = getSelectedWard();

    if (isCustomAddress) return;

    setFieldForm((prev) => ({
      ...prev,
      address: composeAddress(ward?.name, district?.name, province?.name),
    }));
  }, [selectedProvinceCode, selectedDistrictCode, selectedWardCode, isCustomAddress]);

  // --- HELPERS: OPEN MODALS ---
  const openFieldModal = (field = null) => {
    setEditingItem(field);
    const nextForm = field ? { name: field.name, address: field.address || "" } : { name: "", address: "" };
    setFieldForm(nextForm);
    setIsCustomAddress(Boolean(nextForm.address));
    setSelectedProvinceCode("");
    setSelectedDistrictCode("");
    setSelectedWardCode("");
    setDistricts([]);
    setWards([]);
    setIsFieldModalOpen(true);
  };

  const handleProvinceChange = async (value) => {
    setSelectedProvinceCode(value);
    setSelectedDistrictCode("");
    setSelectedWardCode("");
    setDistricts([]);
    setWards([]);
    await fetchDistricts(value);
  };

  const handleDistrictChange = async (value) => {
    setSelectedDistrictCode(value);
    setSelectedWardCode("");
    setWards([]);
    await fetchWards(value);
  };

  const openPlotModal = (plot = null) => {
    setEditingItem(plot);
    setPlotForm(plot 
      ? { name: plot.name, area: plot.area, status: plot.status } 
      : { name: "", area: "", status: "active" }
    );
    setIsPlotModalOpen(true);
  };

  // Tính tổng diện tích hiển thị
  const totalArea = plots.reduce((acc, p) => acc + (Number(p.area) || 0), 0);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 overflow-hidden font-sans">
      
      {/* --- LEFT SIDEBAR: LIST FIELDS --- */}
      <div className="w-[380px] bg-white border-r border-gray-200 flex flex-col shadow-lg z-10">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-800 tracking-tight">Danh sách Ruộng</h2>
              <p className="text-xs text-gray-400 mt-1">Quản lý khu vực canh tác</p>
            </div>
            <button
              onClick={() => openFieldModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm ruộng..."
              className="w-full bg-gray-50 pl-11 pr-4 py-2.5 rounded-xl border border-transparent focus:bg-white focus:border-emerald-100 focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all text-sm font-medium text-gray-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {fields.map((field) => (
            <div
              key={field._id}
              onClick={() => handleSelectField(field)}
              className={`group relative rounded-2xl p-4 cursor-pointer transition-all duration-300 border ${
                selectedField?._id === field._id
                  ? "bg-emerald-50/80 border-emerald-200 shadow-sm"
                  : "bg-white border-transparent hover:border-gray-100 hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              {selectedField?._id === field._id && (
                <div className="absolute left-0 top-4 bottom-4 w-1 bg-emerald-500 rounded-r-full"></div>
              )}
              
              <div className="flex justify-between items-start pl-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${selectedField?._id === field._id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                    <Sprout size={20} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${selectedField?._id === field._id ? 'text-emerald-900' : 'text-gray-700'}`}>
                      {field.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <MapPin size={10} />
                      {field.address || "Chưa cập nhật vị trí"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); openFieldModal(field); }} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 shadow-sm">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteField(field._id); }} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-600 shadow-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- RIGHT MAIN: PLOT TABLE --- */}
      <div className="flex-1 flex flex-col bg-gray-50/50 relative">
        {selectedField ? (
          <>
            {/* Header */}
            <div className="bg-white px-8 py-6 border-b border-gray-200 shadow-sm flex justify-between items-center z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-800">{selectedField.name}</h1>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-md tracking-wider">Chi tiết</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5"><MapPin size={16} className="text-gray-400"/> {selectedField.address}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-emerald-600 flex items-center gap-1.5"><Layers size={16}/> {plots.length} thửa</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-emerald-600">Tổng: {totalArea.toLocaleString()} m²</span>
                </div>
              </div>
              <button
                onClick={() => openPlotModal()}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
              >
                <Plus size={18} strokeWidth={2.5} /> Thêm Thửa Mới
              </button>
            </div>

            {/* Table Content */}
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Tên thửa</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Diện tích (m²)</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingPlots ? (
                      <tr><td colSpan={4} className="py-10 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
                    ) : plots.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <div className="p-4 bg-gray-50 rounded-full mb-3">
                              <Sprout size={32} className="text-gray-300" />
                            </div>
                            <p>Chưa có thửa ruộng nào</p>
                            <button onClick={() => openPlotModal()} className="text-emerald-600 font-semibold text-sm mt-2 hover:underline">Tạo thửa ngay</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      plots.map((plot) => (
                        <tr key={plot._id} className="hover:bg-emerald-50/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-50 text-emerald-600 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                <Tractor size={18} />
                              </div>
                              <span className="font-semibold text-gray-700">{plot.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs">
                              {plot.area?.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              plot.status === "active" 
                                ? "bg-green-50 text-green-600 border-green-200" 
                                : "bg-orange-50 text-orange-600 border-orange-200"
                            }`}>
                              {plot.status === "active" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                              {plot.status === "active" ? "Đang canh tác" : "Chờ vụ mới"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openPlotModal(plot)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Sửa"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeletePlot(plot._id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <LayoutGrid size={64} strokeWidth={1} className="text-gray-300 mb-6" />
            <h3 className="text-xl font-bold text-gray-600">Chưa chọn Cánh Đồng</h3>
            <p className="text-sm mt-2 max-w-xs text-center text-gray-400">Chọn một cánh đồng từ danh sách bên trái hoặc tạo mới để bắt đầu quản lý.</p>
          </div>
        )}
      </div>

      {/* --- MODAL FIELD --- */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">
                {editingItem ? "Cập nhật Ruộng" : "Thêm Ruộng Mới"}
              </h3>
              <button onClick={() => setIsFieldModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tên hiển thị</label>
                <input
                  type="text"
                  value={fieldForm.name}
                  onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                  placeholder="Ví dụ: Ruộng ông Bảy"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Địa chỉ / Khu vực</label>
                <select
                  value={isCustomAddress ? "__custom__" : "__structured__"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__custom__") {
                      setIsCustomAddress(true);
                      return;
                    }
                    setIsCustomAddress(false);
                    setFieldForm({ ...fieldForm, address: "" });
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                >
                  <option value="__structured__">Chọn theo tỉnh/thành thật</option>
                  <option value="__custom__">Nhập thủ công</option>
                </select>

                {!isCustomAddress && (
                  <div className="mt-3 space-y-3">
                    <select
                      value={selectedProvinceCode}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                    >
                      <option value="">Chọn Tỉnh / Thành phố</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>{province.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedDistrictCode}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={!selectedProvinceCode}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Chọn Quận / Huyện</option>
                      {districts.map((district) => (
                        <option key={district.code} value={district.code}>{district.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedWardCode}
                      onChange={(e) => setSelectedWardCode(e.target.value)}
                      disabled={!selectedDistrictCode}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Chọn Phường / Xã (tuỳ chọn)</option>
                      {wards.map((ward) => (
                        <option key={ward.code} value={ward.code}>{ward.name}</option>
                      ))}
                    </select>

                    {loadingAddressData && (
                      <p className="text-xs text-gray-500">Đang tải dữ liệu địa chỉ...</p>
                    )}
                    {addressDataError && (
                      <p className="text-xs text-red-500">{addressDataError}</p>
                    )}
                    {fieldForm.address && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        Địa chỉ đã chọn: {fieldForm.address}
                      </p>
                    )}
                  </div>
                )}
                {isCustomAddress && (
                  <input
                    type="text"
                    value={fieldForm.address}
                    onChange={(e) => setFieldForm({ ...fieldForm, address: e.target.value })}
                    className="mt-3 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                    placeholder="Nhập địa chỉ cụ thể"
                  />
                )}
              </div>
              <button
                onClick={handleSaveField}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all mt-2"
              >
                {editingItem ? "Lưu Thay Đổi" : "Tạo Mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PLOT --- */}
      {isPlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">
                {editingItem ? "Sửa Thửa Ruộng" : "Thêm Thửa Mới"}
              </h3>
              <button onClick={() => setIsPlotModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tên thửa</label>
                <input
                  type="text"
                  value={plotForm.name}
                  onChange={(e) => setPlotForm({ ...plotForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                  placeholder="Ví dụ: Thửa số 1"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Diện tích (m²)</label>
                <input
                  type="number"
                  value={plotForm.area}
                  onChange={(e) => setPlotForm({ ...plotForm, area: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Trạng thái</label>
                <div className="relative">
                  <select
                    value={plotForm.status}
                    onChange={(e) => setPlotForm({ ...plotForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none appearance-none font-medium cursor-pointer"
                  >
                    <option value="active">Đang canh tác</option>
                    <option value="inactive">Chờ vụ mới</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
              </div>
              <button
                onClick={handleSavePlot}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all mt-2"
              >
                {editingItem ? "Lưu Thay Đổi" : "Hoàn Tất"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fields;