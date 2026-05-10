import React from "react";
import { createPortal } from "react-dom";

const ConfirmLogout = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Xác nhận đăng xuất</h3>
        <p className="mb-5 text-sm leading-6 text-gray-600">Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmLogout;
