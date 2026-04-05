import React, { useState, useEffect } from "react";
import { Plus, Calendar, Leaf, ArrowRight } from "lucide-react";
import api from "../../services/api";
import DiaryTimeline from "./DiaryTimeline";
import { useFeedback } from "../../hooks/useFeedback";

const SeasonManager = ({ field }) => {
  const { toast } = useFeedback();
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null); // Vụ đang chọn để xem nhật ký
  const [isCreating, setIsCreating] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");

  const fetchSeasons = async () => {
    try {
      const res = await api.get(`/seasons?fieldId=${field._id}`);
      setSeasons(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (field) {
      fetchSeasons();
      setSelectedSeason(null); // Reset khi đổi cánh đồng
    }
  }, [field]);

  const handleCreateSeason = async () => {
    if (!newSeasonName) return;
    try {
      await api.post("/seasons", {
        name: newSeasonName,
        fieldId: field._id,
        status: "active"
      });
      setIsCreating(false);
      setNewSeasonName("");
      fetchSeasons();
    } catch (err) {
      toast.error("Lỗi tạo mùa vụ");
    }
  };

  // Nếu đang chọn một vụ, hiển thị Timeline
  if (selectedSeason) {
    return <DiaryTimeline season={selectedSeason} onBack={() => setSelectedSeason(null)} />;
  }

  // Mặc định: Hiển thị danh sách vụ
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Leaf className="text-emerald-600" size={24} />
          Mùa vụ canh tác
        </h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Vụ mới
        </button>
      </div>

      {/* Form tạo vụ mới (Inline) */}
      {isCreating && (
        <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-bold text-emerald-800 mb-2">Bắt đầu vụ mùa mới</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Tên vụ (VD: Vụ Đông Xuân 2024)" 
              className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-500 text-sm"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              autoFocus
            />
            <button onClick={handleCreateSeason} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Lưu</button>
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 text-sm hover:bg-white rounded-lg">Hủy</button>
          </div>
        </div>
      )}

      {/* Danh sách vụ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-4">
        {seasons.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            Chưa có dữ liệu mùa vụ. Hãy tạo vụ đầu tiên!
          </div>
        ) : (
          seasons.map((season) => (
            <div 
              key={season._id}
              onClick={() => setSelectedSeason(season)}
              className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
              
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  season.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {season.status === 'active' ? 'Đang canh tác' : 'Đã kết thúc'}
                </span>
                <ArrowRight size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>

              <h3 className="font-bold text-gray-800 text-lg mb-1">{season.name}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Calendar size={12} /> 
                {new Date(season.startDate).toLocaleDateString("vi-VN")} 
                {season.endDate && ` - ${new Date(season.endDate).toLocaleDateString("vi-VN")}`}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SeasonManager;
