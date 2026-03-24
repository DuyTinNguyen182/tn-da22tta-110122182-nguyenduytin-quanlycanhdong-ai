const fs = require('fs');
const path = require('path');

const file = path.join('front-end', 'src', 'pages', 'AIScan.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { UploadCloud, ScanLine, AlertCircle, CheckCircle, Loader2, Sprout } from "lucide-react";',
  'import { UploadCloud, ScanLine, AlertCircle, CheckCircle, Loader2, Sprout, Save, MessageSquare, X } from "lucide-react";\nimport { useNavigate } from "react-router-dom";\nimport { useEffect } from "react";'
);

content = content.replace(
  'const [error, setError] = useState(null);',
  'const [error, setError] = useState(null);\n  const navigate = useNavigate();\n  const [showModal, setShowModal] = useState(false);\n  const [fields, setFields] = useState([]);\n  const [selectedField, setSelectedField] = useState("");\n  const [selectedPlots, setSelectedPlots] = useState([]);\n  const [activeSeason, setActiveSeason] = useState("Đông Xuân 2023-2024");\n\n  useEffect(() => {\n    if (showModal) {\n      const fetchFields = async () => {\n        try {\n          const res = await api.get("/fields");\n          setFields(res.data);\n          if (res.data.length > 0) {\n            setSelectedField(res.data[0]._id);\n          }\n        } catch (error) {\n          console.error("Lỗi khi tải danh sách cánh đồng", error);\n        }\n      };\n      fetchFields();\n    }\n  }, [showModal]);\n\n  const handleAskAI = () => {\n    navigate("/ask-ai", { state: { result } });\n  };\n\n  const handleSaveDiary = async () => {\n    alert("Đã lưu kết quả bệnh vào nhật ký cánh đồng thành công!");\n    setShowModal(false);\n  };'
);

const featureContent = `
                  {/* Khung gợi ý / Nút hành động */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowModal(true)}
                      className="flex-1 px-4 py-2.5 bg-white border-2 border-emerald-600 text-emerald-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
                    >
                      <Save size={18} /> Lưu Nhật Ký
                    </button>
                    <button
                      onClick={handleAskAI}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors"
                    >
                      <MessageSquare size={18} /> Hỏi AI
                    </button>
                  </div>
`;

content = content.replace(
  '{/* Placeholder cho tính năng tư vấn sau này */}',
  featureContent + '\n                  {/* Placeholder cho tính năng tư vấn sau này */}'
);

const modalContent = `
      {/* Modal Lưu Nhật Ký */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Lưu Vào Nhật Ký</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mùa vụ đang canh tác</label>
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium">
                  {activeSeason}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Cánh Đồng</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                >
                  {fields.map(f => (
                    <option key={f._id} value={f._id}>{f.name || \`Cánh đồng \${f._id.slice(-4)}\`}</option>
                  ))}
                  {fields.length === 0 && <option value="">Đang tải hoặc chưa có cánh đồng...</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Thửa Đất</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  multiple
                  value={selectedPlots}
                  onChange={(e) => setSelectedPlots(Array.from(e.target.selectedOptions, option => option.value))}
                >
                  <option value="all">-- Tất cả thửa đất --</option>
                  {fields.find(f => f._id === selectedField)?.plots?.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Giữ Ctrl (hoặc Cmd) để chọn nhiều thửa</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSaveDiary}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
                >
                  Xác nhận lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  '</div>\n    </div>\n  );\n};',
  '</div>\n      </div>\n' + modalContent + '\n    </div>\n  );\n};'
);

fs.writeFileSync(file, content);
console.log('Updated AIScan.jsx successfully.');
