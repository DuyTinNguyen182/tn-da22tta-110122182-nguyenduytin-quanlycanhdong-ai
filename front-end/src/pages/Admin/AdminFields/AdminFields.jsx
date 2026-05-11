import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import LoadingScreen from "../../../components/Layout/LoadingScreen";
import FieldCard from "./components/FieldCard";
import FieldRelationsDrawer from "./components/FieldRelationsDrawer";
import FieldModal from "./components/FieldModal";

const emptyFieldForm = {
  name: "",
  address: "",
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const AdminFields = () => {
  const { toast, confirm } = useFeedback();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm, setFieldForm] = useState(emptyFieldForm);
  const [keyword, setKeyword] = useState("");
  const [detailFieldId, setDetailFieldId] = useState(null);
  const [detailKeyword, setDetailKeyword] = useState("");
  const [fieldPlotsMap, setFieldPlotsMap] = useState({});
  const [detailLoadingMap, setDetailLoadingMap] = useState({});

  const fetchFields = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  useEffect(() => {
    if (detailFieldId && !fields.some((field) => field._id === detailFieldId)) {
      setDetailFieldId(null);
      setDetailKeyword("");
    }
  }, [detailFieldId, fields]);

  const filteredFields = useMemo(() => {
    const normalized = normalizeText(keyword);
    if (!normalized) return fields;

    return fields.filter((field) => {
      const haystack = normalizeText([field.name, field.address].filter(Boolean).join(" "));
      return haystack.includes(normalized);
    });
  }, [fields, keyword]);

  const activeDetailField = useMemo(
    () => fields.find((field) => field._id === detailFieldId) || null,
    [detailFieldId, fields]
  );

  const detailPlots = useMemo(
    () => (detailFieldId ? fieldPlotsMap[detailFieldId] || [] : []),
    [detailFieldId, fieldPlotsMap]
  );

  const isDetailLoading = detailFieldId ? Boolean(detailLoadingMap[detailFieldId]) : false;

  const fetchFieldPlots = async (fieldId, options = {}) => {
    if (!fieldId) {
      return [];
    }

    const { force = false } = options;
    if (!force && fieldPlotsMap[fieldId]) {
      return fieldPlotsMap[fieldId];
    }

    try {
      setDetailLoadingMap((prev) => ({ ...prev, [fieldId]: true }));
      const res = await api.get("/plots", { params: { fieldId } });
      const plots = res.data || [];
      setFieldPlotsMap((prev) => ({ ...prev, [fieldId]: plots }));
      return plots;
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải danh sách thửa ruộng của cánh đồng.");
      return [];
    } finally {
      setDetailLoadingMap((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

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

  const openDetailDrawer = async (field) => {
    setDetailFieldId(field._id);
    setDetailKeyword("");
    await fetchFieldPlots(field._id);
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
      setFieldPlotsMap((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      if (detailFieldId === fieldId) {
        setDetailFieldId(null);
        setDetailKeyword("");
      }
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
          <p className="mt-1 text-sm text-gray-500">
            Theo dõi nhanh từng cánh đồng và mở chi tiết để xem nông dân đang quản lý những thửa nào.
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
              onViewDetails={openDetailDrawer}
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

      <FieldRelationsDrawer
        open={Boolean(activeDetailField)}
        field={activeDetailField}
        plots={detailPlots}
        loading={isDetailLoading}
        keyword={detailKeyword}
        onKeywordChange={setDetailKeyword}
        onClose={() => {
          setDetailFieldId(null);
          setDetailKeyword("");
        }}
      />
    </div>
  );
};

export default AdminFields;
