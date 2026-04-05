import React, { useState, useEffect } from "react";
import { Plus, Calendar, DollarSign, Trash2, Edit3, ArrowLeft } from "lucide-react";
import api from "../../services/api";
import { useFeedback } from "../../hooks/useFeedback";

const DiaryTimeline = ({ season, onBack }) => {
  const { toast, confirm } = useFeedback();
  const [logs, setLogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    type: "other",
    cost: 0,
  });

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/diary-logs?seasonId=${season._id}`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (season) fetchLogs();
  }, [season]);

  const handleSubmit = async () => {
    try {
      await api.post("/diary-logs", { ...formData, seasonId: season._id });
      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        type: "other",
        cost: 0,
      });
      fetchLogs();
    } catch (err) {
      toast.error("Lỗi lưu nhật ký");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Xóa nhật ký?",
      message: "Bạn có chắc muốn xóa nhật ký này?",
      confirmText: "Xóa nhật ký",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/diary-logs/${id}`);
      fetchLogs();
    } catch (err) { console.error(err); }
  };

  // Tính tổng chi phí
  const totalCost = logs.reduce((acc, log) => acc + (log.cost || 0), 0);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header của Nhật ký */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{season.name}</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={12} /> Bắt đầu: {new Date(season.startDate).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-bold">Tổng chi phí</p>
          <p className="text-emerald-600 font-bold text-lg">{totalCost.toLocaleString()} đ</p>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 relative">
        <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gray-200"></div>

        {logs.map((log) => (
          <div key={log._id} className="relative pl-10 mb-6 group">
            {/* Dấu chấm trên timeline */}
            <div className={`absolute left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
              log.type === 'material' ? 'bg-blue-500' : 
              log.type === 'labor' ? 'bg-orange-500' : 'bg-emerald-500'
            }`}></div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {new Date(log.date).toLocaleDateString("vi-VN")}
                  </span>
                  <h4 className="font-bold text-gray-800 text-sm mt-0.5">{log.title}</h4>
                  {log.description && <p className="text-xs text-gray-500 mt-1">{log.description}</p>}
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-gray-700 text-sm">
                    -{log.cost?.toLocaleString()} đ
                  </span>
                  <button onClick={() => handleDelete(log._id)} className="text-gray-300 hover:text-red-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Nút thêm mới nằm cuối timeline */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="ml-10 flex items-center gap-2 text-emerald-600 font-medium text-sm hover:underline"
        >
          <Plus size={16} /> Ghi chép công việc mới
        </button>
      </div>

      {/* Modal Thêm Nhật Ký */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Ghi chép công việc</h3>
            <div className="space-y-3">
              <input 
                type="text" placeholder="Tên công việc (VD: Bón phân đợt 1)" 
                className="w-full p-2 border rounded-lg text-sm"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="w-1/2 p-2 border rounded-lg text-sm"
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                />
                <input 
                  type="number" placeholder="Chi phí (VNĐ)" 
                  className="w-1/2 p-2 border rounded-lg text-sm"
                  value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                />
              </div>
              <select 
                className="w-full p-2 border rounded-lg text-sm"
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="other">Khác</option>
                <option value="material">Vật tư (Phân, Thuốc, Giống)</option>
                <option value="labor">Nhân công</option>
                <option value="harvest">Thu hoạch</option>
              </select>
              <textarea 
                placeholder="Ghi chú thêm..." 
                className="w-full p-2 border rounded-lg text-sm h-20"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              ></textarea>
              <button onClick={handleSubmit} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold mt-2">Lưu lại</button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-gray-500 py-2 text-sm">Hủy bỏ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryTimeline;
