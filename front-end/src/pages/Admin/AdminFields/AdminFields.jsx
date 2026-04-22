import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import FieldCard from "./components/FieldCard";
import FieldModal from "./components/FieldModal";

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
          <h1 className="text-2xl font-bold text-gray-800">Quản lý cánh đồng</h1>
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
        <LoadingScreen message="Đang tải dữ liệu cánh đồng..." />
      ) : filteredFields.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
          Chưa có cánh đồng nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredFields.map((field) => (
            <FieldCard
              key={field._id}
              field={field}
              onEdit={openEditModal}
              onDelete={handleDeleteField}
            />
          ))}
        </div>
      )}

      <FieldModal
        open={isModalOpen}
        editingField={editingField}
        fieldForm={fieldForm}
        onChange={(update) => setFieldForm((prev) => ({ ...prev, ...update }))}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveField}
      />
    </div>
  );
};

export default AdminFields;
