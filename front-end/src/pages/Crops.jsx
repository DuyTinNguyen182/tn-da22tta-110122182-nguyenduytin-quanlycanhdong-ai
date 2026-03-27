import React, { useState, useEffect, useMemo } from "react";
import {
  Sprout,
  Calendar,
  DollarSign,
  Plus,
  Search,
  MapPin,
  ChevronDown,
  Edit2,
  Trash2,
  Layers,
  CalendarDays,
  CheckSquare,    // Icon kết thúc
  Filter          // Icon bộ lọc
} from "lucide-react";
import api from "../services/api";

const Crops = () => {
  // --- STATE ---
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [seasonCatalogs, setSeasonCatalogs] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  
  const [logs, setLogs] = useState([]);
  const [plots, setPlots] = useState([]); 
  const [loading, setLoading] = useState(false);

  // Filter State
  const [filterPlotId, setFilterPlotId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  
  // Form State
  const [editingLog, setEditingLog] = useState(null);
  const [logForm, setLogForm] = useState({
    taskType: null,
    description: "",
    cost: "",
    date: new Date().toISOString().split('T')[0],
    plotId: ""
  });

  const [seasonForm, setSeasonForm] = useState({ 
    seasonId: "", 
    startDate: new Date().toISOString().split('T')[0],
    editingSeasonId: null 
  });
  const [editingSeasonName, setEditingSeasonName] = useState(false);

  // Xác định vụ hiện tại có đang active không
  const currentSeason = useMemo(() => seasons.find(s => s._id === selectedSeasonId), [seasons, selectedSeasonId]);
  const isSeasonActive = currentSeason?.status === 'active';
  
  // Kiểm tra xem có season active nào không
  const hasActiveSeasons = useMemo(() => {
    if (!selectedField) return false;
    return seasons.some(s => s.status === 'active');
  }, [seasons, selectedField]);

  // --- API CALLS ---

  useEffect(() => {
    fetchFields();
    fetchSeasonCatalogs();
    fetchTaskTypes();
  }, []);

  const fetchTaskTypes = async () => {
    try {
      const res = await api.get("/tasks");
      setTaskTypes(res.data || []);
    } catch (err) {
      console.error("Lỗi tải danh mục công việc:", err);
    }
  };

  const fetchSeasonCatalogs = async () => {
    try {
      const res = await api.get("/seasons");
      setSeasonCatalogs(res.data || []);
    } catch (err) {
      console.error("Lỗi tải danh mục mùa vụ:", err);
    }
  };

  const fetchFields = async () => {
    try {
      const res = await api.get("/fields");
      setFields(res.data);
      if (res.data.length > 0 && !selectedField) {
        handleSelectField(res.data[0]);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách ruộng:", err);
    }
  };

  const handleSelectField = async (field) => {
    setSelectedField(field);
    setLogs([]);
    setSeasons([]);
    setSelectedSeasonId("");
    // Reset filters
    setFilterPlotId("");
    setFilterTaskId("");
    
    try {
      const seasonRes = await api.get(`/season-details`, { params: { fieldId: field._id } });
      setSeasons(seasonRes.data);
      if (seasonRes.data.length > 0) {
        setSelectedSeasonId(seasonRes.data[0]._id);
      }
      const plotRes = await api.get(`/plots`, { params: { fieldId: field._id } });
      setPlots(plotRes.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu chi tiết:", err);
    }
  };

  useEffect(() => {
    if (selectedSeasonId) {
      fetchLogs(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchLogs = async (seasonId) => {
    setLoading(true);
    try {
      const res = await api.get(`/diary-logs`, { params: { seasonId } });
      setLogs(res.data);
    } catch (err) {
      console.error("Lỗi tải nhật ký:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS: SEASON ---
  const handleCreateSeason = async () => {
    if (!selectedField || !seasonForm.seasonId) {
      alert("Vui lòng chọn mùa vụ");
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const payload = {
        seasonId: seasonForm.seasonId,
        year: currentYear,
        fieldId: selectedField._id,
        startDate: seasonForm.startDate,
        status: "active"
      };

      if (seasonForm.editingSeasonId) {
        // Cập nhật mùa vụ
        const res = await api.put(`/season-details/${seasonForm.editingSeasonId}`, payload);
        const updatedSeasons = seasons.map(s => s._id === seasonForm.editingSeasonId ? res.data : s);
        setSeasons(updatedSeasons);
        alert("Đã cập nhật mùa vụ thành công!");
      } else {
        // Tạo mùa vụ mới
        const res = await api.post("/season-details", payload);
        setSeasons([res.data, ...seasons]);
        setSelectedSeasonId(res.data._id);
        alert("Đã tạo vụ mới thành công!");
      }

      setIsSeasonModalOpen(false);
      setSeasonForm({ 
        seasonId: "", 
        startDate: new Date().toISOString().split('T')[0],
        editingSeasonId: null
      });
      setEditingSeasonName(false);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi tạo/cập nhật vụ mới");
    }
  };

  // Mở modal sửa mùa vụ
  const handleOpenEditSeasonModal = () => {
    if (currentSeason) {
      setSeasonForm({
        seasonId: currentSeason.seasonId || currentSeason.season?._id || "",
        startDate: currentSeason.startDate.split('T')[0],
        editingSeasonId: currentSeason._id
      });
      setEditingSeasonName(true);
      setIsSeasonModalOpen(true);
    }
  };

  // XỬ LÝ KẾT THÚC VỤ
  const handleEndSeason = async () => {
    if (!selectedSeasonId) return;
    
    const confirmEnd = window.confirm(
      "Bạn có chắc chắn muốn kết thúc vụ mùa này không?\n\nSau khi kết thúc, trạng thái sẽ chuyển sang 'Đã thu hoạch' và bạn KHÔNG THỂ thêm nhật ký mới."
    );

    if (confirmEnd) {
      try {
        const finishedAt = new Date();
        const res = await api.put(`/season-details/${selectedSeasonId}/finish`, {
          status: "completed",
          endDate: finishedAt
        });

        // Cập nhật state local
        const updatedSeasons = seasons.map(s => 
          s._id === selectedSeasonId ? { ...s, status: "completed", endDate: finishedAt.toISOString() } : s
        );
        setSeasons(updatedSeasons);
        alert("Đã kết thúc vụ mùa thành công!");
      } catch (err) {
        console.error(err);
        alert("Lỗi khi kết thúc vụ mùa.");
      }
    }
  };

  // --- HANDLERS: LOGS (CRUD) ---
  const openLogModal = (log = null) => {
    if (!isSeasonActive && !log) return; // Chặn mở form thêm mới nếu vụ đã đóng

    if (log) {
      const foundTask =
        taskTypes.find((t) => t._id === log.taskId) ||
        taskTypes.find((t) => (t.name || t.label || "") === (log.taskName || log.title || "")) ||
        null;
      setEditingLog(log);
      setLogForm({
        taskType: foundTask,
        description: log.description,
        cost: log.cost,
        date: log.date ? log.date.split('T')[0] : new Date().toISOString().split('T')[0],
        plotId: log.plot?._id || log.plot || ""
      });
    } else {
      setEditingLog(null);
      setLogForm({
        taskType: null,
        description: "",
        cost: "",
        date: new Date().toISOString().split('T')[0],
        plotId: ""
      });
    }
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async () => {
    if (!selectedSeasonId || !logForm.taskType) {
      alert("Vui lòng chọn loại công việc!");
      return;
    }

    const payload = {
      taskId: logForm.taskType._id,
      description: logForm.description,
      cost: Number(logForm.cost),
      date: logForm.date,
      seasonId: selectedSeasonId,
      plotId: logForm.plotId || null
    };

    try {
      if (editingLog) {
        await api.put(`/diary-logs/${editingLog._id}`, payload);
      } else {
        await api.post("/diary-logs", payload);
      }
      setIsLogModalOpen(false);
      fetchLogs(selectedSeasonId);
    } catch (err) {
      console.error(err);
      alert("Lỗi lưu nhật ký");
    }
  };

  const handleDeleteLog = async (id) => {
    if (!isSeasonActive) {
        alert("Không thể xóa nhật ký của vụ đã kết thúc.");
        return;
    }
    if (!window.confirm("Bạn chắc chắn muốn xóa nhật ký này?")) return;
    try {
      await api.delete(`/diary-logs/${id}`);
      fetchLogs(selectedSeasonId);
    } catch (err) {
      alert("Lỗi xóa nhật ký");
    }
  };

  // --- FILTER LOGIC ---
  // --- FILTER LOGIC ---
  const filteredLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      // 1. Lọc theo Thửa
      const matchPlot = filterPlotId 
        ? (
            // Trường hợp 1: Nhật ký thuộc đúng thửa đang chọn
            (log.plot?._id === filterPlotId || log.plot === filterPlotId) || 
            // Trường hợp 2: Nhật ký không thuộc thửa nào (áp dụng toàn cánh đồng) -> Vẫn hiện
            !log.plot 
          )
        : true;
      
      // 2. Lọc theo Công việc (dựa trên Title/Label)
      const matchTask = filterTaskId
        ? log.taskId === filterTaskId
        : true;

      return matchPlot && matchTask;
    });

    // Sắp xếp mới nhất lên đầu theo ngày nhật ký.
    // Nếu cùng ngày thì ưu tiên nhật ký có createdAt mới hơn (giờ-phút-giây).
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();

      if (dateB !== dateA) {
        return dateB - dateA;
      }

      const createdA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const createdB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return createdB - createdA;
    });
  }, [logs, filterPlotId, filterTaskId]);

  const totalCost = filteredLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 overflow-hidden font-sans">
      
      {/* --- LEFT: DANH SÁCH RUỘNG --- */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col shadow-lg z-10">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Chọn Cánh Đồng</h2>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full bg-gray-50 pl-10 pr-4 py-2 rounded-xl border border-transparent focus:bg-white focus:border-emerald-200 outline-none text-sm transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {fields.map((field) => (
            <div
              key={field._id}
              onClick={() => handleSelectField(field)}
              className={`p-3 rounded-xl cursor-pointer border transition-all ${
                selectedField?._id === field._id
                  ? "bg-emerald-50 border-emerald-200 shadow-sm"
                  : "bg-white border-transparent hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedField?._id === field._id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${selectedField?._id === field._id ? 'text-emerald-800' : 'text-gray-700'}`}>
                    {field.name}
                  </h3>
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{field.address}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- RIGHT: NHẬT KÝ MÙA VỤ --- */}
      <div className="flex-1 flex flex-col bg-gray-50/50 relative">
        {selectedField ? (
          <>
            {/* HEADER */}
            <div className="bg-white px-8 py-5 border-b border-gray-200 shadow-sm z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-800">{selectedField.name}</h1>
                        
                        {/* Dropdown Chọn Vụ */}
                        {seasons.length > 0 && (
                            <div className="relative group">
                            <select
                                value={selectedSeasonId}
                                onChange={(e) => setSelectedSeasonId(e.target.value)}
                                className={`appearance-none border text-sm font-bold py-1.5 pl-4 pr-8 rounded-lg cursor-pointer outline-none focus:ring-2 ${
                                    isSeasonActive 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 focus:ring-emerald-500/20"
                                    : "bg-gray-100 border-gray-300 text-gray-600 focus:ring-gray-500/20"
                                }`}
                            >
                                {seasons.map(s => (
                                <option key={s._id} value={s._id}>{s.name} ({s.status === 'active' ? 'Đang canh tác' : 'Đã kết thúc'})</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70 pointer-events-none" />
                            </div>
                        )}

                        {/* Nút Tạo/Sửa Vụ Mới - Chỉ hiện khi không có active season */}
                        {!hasActiveSeasons && (
                          <button 
                            onClick={() => {
                              setSeasonForm({ 
                                seasonId: "", 
                                startDate: new Date().toISOString().split('T')[0],
                                editingSeasonId: null
                              });
                              setEditingSeasonName(false);
                              setIsSeasonModalOpen(true);
                            }}
                            className="p-1.5 bg-gray-100 hover:bg-emerald-100 text-gray-500 hover:text-emerald-600 rounded-lg transition-colors"
                            title="Tạo vụ mới"
                          >
                            <Plus size={16} />
                          </button>
                        )}

                        {/* Nút Sửa Mùa Vụ - Hiện khi đã tạo xong một vụ */}
                        {currentSeason && isSeasonActive && (
                          <button 
                            onClick={handleOpenEditSeasonModal}
                            className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded-lg transition-colors"
                            title="Sửa tên mùa vụ"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}

                        {/* NÚT KẾT THÚC VỤ (CHỈ HIỆN KHI ACTIVE) */}
                        {selectedSeasonId && isSeasonActive && (
                            <button
                                onClick={handleEndSeason}
                                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold transition-all"
                                title="Kết thúc vụ mùa hiện tại"
                            >
                                <CheckSquare size={14} />
                                Kết thúc vụ
                            </button>
                        )}
                    </div>

                    {/* NÚT GHI NHẬT KÝ (CHỈ HIỆN KHI ACTIVE) */}
                    {selectedSeasonId && isSeasonActive ? (
                        <button
                        onClick={() => openLogModal()}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1 rounded-lg font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                        >
                        <Plus size={20} /> Ghi Nhật Ký
                        </button>
                    ) : (
                        selectedSeasonId && (
                            <div className="px-4 py-1 bg-gray-100 text-gray-500 font-bold rounded-lg border border-gray-200 text-sm flex items-center gap-2">
                                <CheckSquare size={16} /> Vụ đã kết thúc
                            </div>
                        )
                    )}
                </div>

                {/* FILTER BAR & INFO */}
                <div className="flex items-center justify-between gap-4 mt-2">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <Filter size={14} />
                            <span className="font-semibold text-xs uppercase text-gray-400">Lọc:</span>
                            
                            {/* Lọc theo Thửa */}
                            <select 
                                value={filterPlotId}
                                onChange={(e) => setFilterPlotId(e.target.value)}
                                className="bg-transparent outline-none font-medium text-gray-700 hover:text-emerald-600 cursor-pointer"
                            >
                                <option value="">Tất cả các thửa</option>
                                {plots.filter(p => p.status === "active").map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                            
                            <span className="text-gray-300">|</span>

                            {/* Lọc theo Công việc */}
                            <select 
                                value={filterTaskId}
                                onChange={(e) => setFilterTaskId(e.target.value)}
                                className="bg-transparent outline-none font-medium text-gray-700 hover:text-emerald-600 cursor-pointer"
                            >
                                <option value="">Tất cả công việc</option>
                              {taskTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-gray-400" />
                            <span>Bắt đầu: {currentSeason?.startDate ? new Date(currentSeason.startDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                        </div>
                        {currentSeason?.status === "completed" && currentSeason?.endDate && (
                          <div className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-gray-400" />
                            <span>Kết thúc: {new Date(currentSeason.endDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            <span>Chi phí: <strong className="text-emerald-600">{totalCost.toLocaleString()} đ</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT: Danh sách Nhật ký (Timeline) */}
            <div className="flex-1 p-8 overflow-y-auto">
              {loading ? (
                <div className="text-center py-10 text-gray-400">Đang tải nhật ký...</div>
              ) : !selectedSeasonId ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Sprout size={48} className="mb-4 text-gray-300" />
                  <p>Vui lòng tạo hoặc chọn một vụ mùa.</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <p>{logs.length === 0 ? "Chưa có nhật ký nào cho vụ này." : "Không tìm thấy nhật ký phù hợp bộ lọc."}</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {filteredLogs.map((log, index) => {
                    return (
                      <div key={log._id} className="relative pl-8 group">
                        {/* Timeline Line */}
                        {index !== filteredLogs.length - 1 && (
                          <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-gray-200 group-last:hidden"></div>
                        )}
                        
                        {/* Dot Icon */}
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 bg-gray-100 text-gray-600">
                           <div className="w-2 h-2 rounded-full bg-current"></div>
                        </div>

                        {/* Card Content */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="font-bold text-gray-800 text-lg">{log.taskName || log.title}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                  <Calendar size={12} />
                                  {new Date(log.date).toLocaleDateString('vi-VN')}
                                  {log.plot && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                                        <Layers size={12} /> {log.plot.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                               <div className="text-right">
                                  <div className="text-sm font-bold text-gray-800 flex items-center justify-end gap-1">
                                    {log.cost?.toLocaleString()} <span className="text-xs text-gray-400 font-normal">VNĐ</span>
                                  </div>
                               </div>
                               {/* Actions - Chỉ hiện nếu Vụ đang Active */}
                               {isSeasonActive && (
                                 <div className="flex gap-1 ml-2">
                                    <button onClick={() => openLogModal(log)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                      <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteLog(log._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                      <Trash2 size={16} />
                                    </button>
                                 </div>
                               )}
                            </div>
                          </div>
                          
                          {log.description && (
                            <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                              {log.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <Sprout size={64} className="text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-600">Chọn Cánh Đồng</h3>
          </div>
        )}
      </div>

      {/* --- MODAL: THÊM / SỬA NHẬT KÝ --- */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">
                {editingLog ? "Cập nhật Nhật Ký" : "Ghi Nhật Ký Mới"}
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {/* Chọn loại công việc */}
              <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Chọn công việc</label>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {taskTypes.map((task) => {
                  const isSelected = logForm.taskType?._id === task._id;
                  return (
                    <button
                      key={task._id}
                      onClick={() => setLogForm({ ...logForm, taskType: task })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        isSelected
                          ? `bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200`
                          : "bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`text-[10px] font-bold text-center ${isSelected ? "text-emerald-700" : "text-gray-600"}`}>
                        {task.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Form chi tiết */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Ngày thực hiện</label>
                    <input
                      type="date"
                      value={logForm.date}
                      onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Chi phí (VNĐ)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={logForm.cost}
                        onChange={(e) => setLogForm({ ...logForm, cost: e.target.value })}
                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium"
                        placeholder="0"
                      />
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Áp dụng cho thửa (Tuỳ chọn)</label>
                   <select
                      value={logForm.plotId}
                      onChange={(e) => setLogForm({ ...logForm, plotId: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium"
                   >
                      <option value="">-- Toàn bộ cánh đồng --</option>
                      {plots.filter(p => p.status === "active").map(p => (
                        <option key={p._id} value={p._id}>{p.name} ({p.area} m²)</option>
                      ))}
                   </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Mô tả chi tiết</label>
                  <textarea
                    rows={3}
                    value={logForm.description}
                    onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none text-sm font-medium resize-none"
                    placeholder="Chi tiết công việc..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={() => setIsLogModalOpen(false)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">Hủy</button>
              <button onClick={handleSaveLog} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all">
                {editingLog ? "Lưu Thay Đổi" : "Tạo Nhật Ký"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: TẠO/SỬA VỤ MỚI --- */}
      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">
                {editingSeasonName ? "Sửa Mùa Vụ" : "Bắt Đầu Vụ Mùa Mới"}
              </h3>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Chọn tên mùa vụ</label>
                  <div className="relative">
                    <select
                      value={seasonForm.seasonId}
                      onChange={(e) => setSeasonForm({...seasonForm, seasonId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-medium appearance-none"
                      autoFocus
                    >
                      <option value="">-- Chọn mùa vụ --</option>
                      {seasonCatalogs.map((season) => (
                        <option key={season._id} value={season._id}>{season.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 pointer-events-none" />
                  </div>
                  {seasonForm.seasonId && (
                    <p className="text-xs text-emerald-600 mt-2 font-medium">
                      Tên vụ: <strong>{(seasonCatalogs.find((s) => s._id === seasonForm.seasonId)?.name || "") + " " + new Date().getFullYear()}</strong>
                    </p>
                  )}
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Ngày bắt đầu</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={seasonForm.startDate}
                      onChange={(e) => setSeasonForm({...seasonForm, startDate: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-medium"
                    />
                    <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
               </div>
               <button
                onClick={handleCreateSeason}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold mt-2 shadow-lg shadow-emerald-200"
               >
                 {editingSeasonName ? "Lưu Thay Đổi" : "Tạo Vụ Mới"}
               </button>
               <button 
                onClick={() => {
                  setIsSeasonModalOpen(false);
                  setEditingSeasonName(false);
                  setSeasonForm({ 
                    seasonId: "", 
                    startDate: new Date().toISOString().split('T')[0],
                    editingSeasonId: null
                  });
                }} 
                className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 font-medium"
               >
                 Đóng
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Crops;