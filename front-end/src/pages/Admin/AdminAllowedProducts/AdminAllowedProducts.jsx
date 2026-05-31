import React, { useEffect, useMemo, useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import AllowedProductTable from "./components/AllowedProductTable";
import AllowedProductFormModal from "./components/AllowedProductFormModal";

const ITEMS_PER_PAGE = 10;

const CATEGORY_OPTIONS = [
  { value: "FERTILIZER", label: "Phân bón" },
  { value: "PESTICIDE", label: "Thuốc BVTV" },
];

const AdminAllowedProducts = () => {
  const { toast, confirm } = useFeedback();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // States bộ lọc & tìm kiếm
  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Trạng thái Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState("");

  // States form
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("PESTICIDE");
  const [targetIssues, setTargetIssues] = useState(""); // Dạng chuỗi cách nhau dấu phẩy
  const [usagePeriods, setUsagePeriods] = useState(""); // Dạng chuỗi cách nhau dấu phẩy
  const [instructions, setInstructions] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/allowed-products");
      setProducts(res.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể tải danh mục vật tư",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Điều kiện 1: Lọc theo danh mục
      const matchCategory = filterCategory
        ? item.category.toUpperCase() === filterCategory
        : true;

      // Điều kiện 2: Lọc theo từ khóa (Tìm theo tên sản phẩm)
      const matchSearch = searchTerm
        ? item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      return matchCategory && matchSearch;
    });
  }, [filterCategory, searchTerm, products]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE),
  );

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Reset về trang 1 khi thay đổi bộ lọc hoặc từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchTerm]);

  const filterCategoryOptions = useMemo(
    () => [{ value: "", label: "Tất cả danh mục" }, ...CATEGORY_OPTIONS],
    [],
  );

  const resetForm = () => {
    setProductName("");
    setCategory("PESTICIDE");
    setTargetIssues("");
    setUsagePeriods("");
    setInstructions("");
    setIsActive(true);
    setEditingId("");
  };

  const openCreateModal = () => {
    setModalMode("create");
    resetForm();
    setIsModalOpen(true);
  };

  const startEdit = (product) => {
    setModalMode("edit");
    setEditingId(product._id);
    setProductName(product.product_name || "");
    setCategory(product.category?.toUpperCase() || "PESTICIDE");
    setTargetIssues((product.target_issues || []).join(", "));
    setUsagePeriods((product.usage_periods || []).join(", "));
    setInstructions(product.instructions || "");
    setIsActive(product.is_active ?? true);
    setIsModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Helper chuyển đổi chuỗi nhập từ UI thành mảng để lưu DB
  const processArrayInput = (str) => {
    if (!str) return [];
    return str
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const handleSubmit = async () => {
    if (!productName.trim() || !instructions.trim()) {
      toast.warning("Vui lòng điền Tên sản phẩm và Hướng dẫn sử dụng");
      return;
    }

    const payload = {
      product_name: productName,
      category: category.toLowerCase(), // Backend lưu chữ thường: 'pesticide', 'fertilizer'
      target_issues: processArrayInput(targetIssues),
      usage_periods: processArrayInput(usagePeriods),
      instructions,
      is_active: isActive,
    };

    setSubmitting(true);
    try {
      if (modalMode === "edit") {
        await api.put(`/allowed-products/${editingId}`, payload);
        toast.success("Cập nhật sản phẩm thành công!");
      } else {
        await api.post("/allowed-products", payload);
        toast.success("Thêm sản phẩm mới thành công!");
      }
      closeTaskModal();
      await fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = await confirm({
      title: "Xóa sản phẩm?",
      message: `Bạn có chắc muốn xóa '${product.product_name}' khỏi danh mục quy định của HTX?`,
      confirmText: "Xóa sản phẩm",
      tone: "danger",
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await api.delete(`/allowed-products/${product._id}`);
      await fetchProducts();
      toast.success("Xóa sản phẩm thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa sản phẩm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Danh mục Vật tư HTX
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý danh mục vật tư được phép sử dụng, cung cấp dữ liệu nền tảng
            cho Trợ lý AI tư vấn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Ô tìm kiếm theo tên */}
          <div className="relative w-full sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 shadow-sm"
            />
          </div>

          {/* Lọc theo danh mục */}
          <div className="w-full sm:w-56 rounded-xl bg-white border border-gray-200 p-1.5 shadow-sm">
            <CustomDropdown
              value={filterCategory}
              onChange={setFilterCategory}
              options={filterCategoryOptions}
              placeholder="Tất cả danh mục"
              icon={Package}
              variant="filter"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-700 w-full sm:w-auto"
          >
            <Plus size={18} /> Thêm sản phẩm
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mt-5">
        <AllowedProductTable
          products={paginatedProducts}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProducts.length}
          onPageChange={setCurrentPage}
          onStartEdit={startEdit}
          onDelete={handleDelete}
        />
      </div>

      <AllowedProductFormModal
        open={isModalOpen}
        modalMode={modalMode}
        submitting={submitting}
        categoryOptions={CATEGORY_OPTIONS}
        productName={productName}
        setProductName={setProductName}
        category={category}
        setCategory={setCategory}
        targetIssues={targetIssues}
        setTargetIssues={setTargetIssues}
        usagePeriods={usagePeriods}
        setUsagePeriods={setUsagePeriods}
        instructions={instructions}
        setInstructions={setInstructions}
        isActive={isActive}
        setIsActive={setIsActive}
        onClose={closeTaskModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AdminAllowedProducts;
