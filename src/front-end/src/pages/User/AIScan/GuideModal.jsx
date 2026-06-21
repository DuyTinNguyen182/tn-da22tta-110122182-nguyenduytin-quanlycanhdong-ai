import React from "react";
import { BookOpen, CheckCircle2, X } from "lucide-react";

const GUIDE_SECTIONS = [
  {
    title: "Ảnh nên chụp thế nào",
    items: [
      "Chụp gần vùng lá có dấu hiệu bất thường, để lá chiếm phần lớn khung hình.",
      "Ưu tiên ánh sáng đều, tránh ngược nắng hoặc ảnh quá tối.",
      "Nếu lá rung hoặc mờ, hãy chụp lại trước khi gửi AI.",
    ],
  },
  {
    title: "Khi nào nên crop",
    items: [
      "Khi ảnh có nhiều nền thừa như bầu trời, bờ ruộng hoặc các lá không liên quan.",
      "Khi bạn muốn tập trung vào đúng vùng bị đốm, cháy lá hoặc vàng lá.",
    ],
  },
  {
    title: "Đọc kết quả thế nào",
    items: [
      "Độ tin cậy càng cao thì dự đoán càng ổn định.",
      "Nếu top 1 và top 2 quá sát nhau, nên đối chiếu thêm ngoài thực tế.",
      "Bạn có thể lưu nhật ký hoặc chuyển sang AI tư vấn ngay sau khi quét.",
    ],
  },
];

const GuideModal = ({ open, onClose }) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border border-white/15 bg-white shadow-[0_40px_100px_-40px_rgba(15,23,42,0.65)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:h-11 sm:w-11">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-700">Hướng dẫn nhanh</p>
              <h3 className="break-words text-lg font-bold leading-snug text-slate-900 sm:text-xl">Cách chụp và đọc kết quả AI</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-5 md:grid-cols-3 md:p-6">
          {GUIDE_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="min-w-0 rounded-[22px] border border-slate-200 bg-slate-50 p-4 sm:rounded-[24px]"
            >
              <h4 className="break-words text-base font-semibold text-slate-900">{section.title}</h4>
              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <div key={item} className="flex min-w-0 items-start gap-3">
                    <CheckCircle2
                      size={16}
                      className="mt-1 shrink-0 text-emerald-600"
                    />
                    <p className="min-w-0 break-words text-sm leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-4 text-right sm:px-5 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 sm:w-auto"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
