import React from "react";
import { Eye, EyeOff, X } from "lucide-react";
import {
  TYPE_STYLES,
  formatDateTime,
  getRecipientSummary,
} from "../adminAnnouncementsUtils.jsx";

const getRecipientNames = (item, farmers = []) => {
  const farmerNameById = new Map(
    (farmers || []).map((farmer) => [
      String(farmer._id || ""),
      farmer.fullName || "",
    ]),
  );

  const names = [];

  if (Array.isArray(item.recipients)) {
    item.recipients.forEach((recipient) => {
      const recipientId = String(recipient?._id || recipient || "");
      const recipientName =
        recipient?.fullName || farmerNameById.get(recipientId) || "";

      if (recipientName.trim()) {
        names.push(recipientName.trim());
      }
    });
  }

  if (Array.isArray(item.audienceUserIds)) {
    item.audienceUserIds.forEach((recipientId) => {
      const recipientName = farmerNameById.get(String(recipientId || ""));

      if (recipientName?.trim()) {
        names.push(recipientName.trim());
      }
    });
  }

  return Array.from(new Set(names));
};

const AnnouncementDetailModal = ({ item, farmers = [], onClose }) => {
  if (!item) return null;

  const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.notification;
  const Icon = typeStyle.icon;
  const recipientNames = getRecipientNames(item, farmers);

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-5">
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${typeStyle.badgeClassName}`}
            >
              <Icon size={14} />
              {typeStyle.label}
            </span>

            <h3 className="mt-3 text-xl font-bold text-gray-900 break-words">
              {item.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-2xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
            aria-label="Đóng cửa sổ xem chi tiết"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Người nhận
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {getRecipientSummary(item)}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Trạng thái
                </p>

                <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                  {item.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                  {item.isVisible ? "Đang hiển thị" : "Đang ẩn"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Danh sách nông dân nhận
                </p>

                <div className="mt-3 max-h-28 space-y-2 overflow-y-auto pr-1">
                  {recipientNames.length ? (
                    recipientNames.map((name) => (
                      <p
                        key={name}
                        className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                      >
                        {name}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-gray-500">
                      Chưa có dữ liệu người nhận
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Nội dung đầy đủ
              </p>

              <div className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-gray-700">
                {item.content}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Ngày tạo
                </p>

                <p className="mt-2 text-sm font-medium text-gray-700">
                  {formatDateTime(item.createdAt)}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Cập nhật gần nhất
                </p>

                <p className="mt-2 text-sm font-medium text-gray-700">
                  {formatDateTime(item.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer cố định */}
        <div className="border-t border-gray-100 bg-white px-6 py-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailModal;
