import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi F5 trang web, kiểm tra phiên đăng nhập hiện tại bằng cookie
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user || null);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Hàm Đăng nhập
  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });

      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Lỗi kết nối server",
      };
    }
  };

  // Hàm Đăng ký
  const register = async (fullName, email, password) => {
    try {
      await api.post("/auth/register", { fullName, email, password });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Đăng ký thất bại",
      };
    }
  };

  // Hàm Đăng xuất
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Vẫn dọn state local để UI phản ánh đúng trạng thái đăng xuất.
    }

    setUser(null);
  };

  // Hàm Cập nhật thông tin user
  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook custom để dùng nhanh context này ở các trang khác
export const useAuth = () => useContext(AuthContext);
