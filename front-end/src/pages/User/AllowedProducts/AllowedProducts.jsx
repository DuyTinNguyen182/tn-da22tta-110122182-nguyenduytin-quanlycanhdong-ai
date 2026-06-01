import React, { useEffect, useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";
import api from "../../../services/api";
import { useFeedback } from "../../../hooks/useFeedback";
import CustomDropdown from "../../../components/UI/CustomDropdown";
import AllowedProductTable from "./components/AllowedProductTable";
import AllowedProductDetailModal from "./components/AllowedProductDetailModal";

const ITEMS_PER_PAGE = 10;

const CATEGORY_OPTIONS = [
  { value: "FERTILIZER", label: "Phân bón" },
  { value: "PESTICIDE", label: "Thuốc BVTV" },
];

const AllowedProducts = () => {
  const { toast } = useFeedback();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingProduct, setViewingProduct] = useState(null);

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
      const matchCategory = filterCategory
        ? item.category.toUpperCase() === filterCategory
        : true;

      if (!searchTerm) return matchCategory;

      const lower = searchTerm.toLowerCase();
      const nameMatch = item.product_name?.toLowerCase().includes(lower);
      const targetIssuesText = (item.target_issues || [])
        .join(", ")
        .toLowerCase();
      const usagePeriodsText = (item.usage_periods || [])
        .join(", ")
        .toLowerCase();
      const matchSearch =
        nameMatch ||
        targetIssuesText.includes(lower) ||
        usagePeriodsText.includes(lower);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchTerm]);

  const filterCategoryOptions = useMemo(
    () => [{ value: "", label: "Tất cả danh mục" }, ...CATEGORY_OPTIONS],
    [],
  );

  const openViewDetail = (product) => setViewingProduct(product);
  const closeDetailModal = () => setViewingProduct(null);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Danh mục Vật tư</h1>
          <p className="text-sm text-gray-500 mt-1">
            Danh mục vật tư được HTX khuyến nghị sử dụng.
          </p>
        </div>

        <div className="flex flex-nowrap items-center gap-3 flex-1 min-w-0 justify-end overflow-x-auto pb-1">
          <div className="relative w-[16rem] sm:w-[18rem] lg:w-[22rem] shrink-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tên sản phẩm, trị bệnh hoặc dùng cho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600"
                aria-label="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative w-[12rem] sm:w-[14rem] shrink-0 rounded-xl bg-white border border-gray-200 p-1.5 shadow-sm">
            <CustomDropdown
              value={filterCategory}
              onChange={setFilterCategory}
              options={filterCategoryOptions}
              placeholder="Tất cả danh mục"
              icon={Package}
              variant="filter"
            />
            {filterCategory && (
              <button
                type="button"
                onClick={() => setFilterCategory("")}
                className="absolute right-11 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Xóa bộ lọc danh mục"
              >
                <X size={14} />
              </button>
            )}
          </div>
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
          onView={openViewDetail}
        />
      </div>

      <AllowedProductDetailModal
        product={viewingProduct}
        onClose={closeDetailModal}
      />
    </div>
  );
};

export default AllowedProducts;
