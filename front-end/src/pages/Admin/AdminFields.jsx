import React, { useEffect, useMemo, useState } from "react";
import { Edit2, MapPin, Plus, Sprout, Trash2, Users } from "lucide-react";
import api from "../../services/api";
import { useFeedback } from "../../hooks/useFeedback";

const emptyFieldForm = {
  name: "",
  address: "",
};

const AdminFields = () => {
  const { toast, confirm } = useFeedback();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm, setFieldForm] = useState(emptyFieldForm);
  const [keyword, setKeyword] = useState("");

  const fetchFields = async () => {
    try {
      setLoading(true);
      const res = await api.get("/fields");
      setFields(res.data || []);
    } catch (error) {
      console.error("Lỗi tải cánh đồng cho admin", error);
      toast.error("Không thể tải danh sách cánh đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const filteredFields = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return fields;

    return fields.filter((field) => {
      return (
        field.name?.toLowerCase().includes(normalized) ||
        field.address?.toLowerCase().includes(normalized)
      );
    });
  }, [fields, keyword]);

  const openCreateModal = () => {
    setEditingField(null);
    setFieldForm(emptyFieldForm);
    setIsModalOpen(true);
  };

  const openEditModal = (field) => {
    setEditingField(field);
    setFieldForm({
      name: field.name || "",
      address: field.address || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveField = async () => {
    try {
      if (editingField) {
        await api.put(`/fields/${editingField._id}`, fieldForm);
      } else {
        await api.post("/fields", fieldForm);
      }

      setIsModalOpen(false);
      setFieldForm(emptyFieldForm);
      setEditingField(null);
      toast.success(editingField ? "Đã cập nhật cánh đồng." : "Đã tạo cánh đồng mới.");
      await fetchFields();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu cánh đồng");
    }
  };

  const handleDeleteField = async (fieldId) => {
    const confirmed = await confirm({
      title: "Xóa cánh đồng?",
      message:
        "Thao tác này sẽ xóa luôn các thửa ruộng, mùa vụ và nhật ký liên quan trong cánh đồng này.",
      confirmText: "Xóa cánh đồng",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/fields/${fieldId}`);
      toast.success("Đã xóa cánh đồng.");
      await fetchFields();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa cánh đồng");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý cánh đồng</h1>
          <p className="mt-1 text-gray-500">
            Admin tạo cánh đồng/khu vực dùng chung để nông dân gắn thửa ruộng và ghi nhật ký.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-emerald-700"
        >
          <Plus size={18} /> Thêm cánh đồng
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo tên cánh đồng hoặc địa bàn..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
          Đang tải dữ liệu cánh đồng...
        </div>
      ) : filteredFields.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
          Chưa có cánh đồng nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredFields.map((field) => (
            <article
              key={field._id}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-4">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <Sprout size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{field.name}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <MapPin size={14} />
                      {field.address || "Chưa cập nhật địa bàn"}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Tạo bởi: {field.createdByName || "Admin"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(field)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteField(field._id)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Thửa ruộng
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-800">{field.plotCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Nông dân
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-800">
                    <Users size={18} className="text-emerald-600" />
                    {field.farmerCount || 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Diện tích
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-800">
                    {Number(field.totalArea || 0).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">m2</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-gray-800">
              {editingField ? "Chỉnh sửa cánh đồng" : "Thêm cánh đồng mới"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tên cánh đồng</label>
                <input
                  type="text"
                  value={fieldForm.name}
                  onChange={(event) =>
                    setFieldForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Ví dụ: Cánh đồng Bắc Kênh"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Địa bàn / địa chỉ mô tả
                </label>
                <textarea
                  rows={3}
                  value={fieldForm.address}
                  onChange={(event) =>
                    setFieldForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Ví dụ: Ấp 2, xã Mỹ An, khu vực bắc kênh"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-xl bg-gray-200 px-4 py-2.5 font-medium text-gray-800 transition-all hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveField}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white transition-all hover:bg-emerald-700"
              >
                {editingField ? "Cập nhật" : "Tạo mới"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFields;
