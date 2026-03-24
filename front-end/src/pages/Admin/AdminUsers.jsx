import React from 'react';

const AdminUsers = () => {
  return (
    <div className="p-8 h-full bg-gray-50 flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Quản lý người dùng</h1>
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <p className="text-gray-600">Danh sách người dùng, phân quyền và các chức năng liên quan...</p>
      </div>
    </div>
  );
};

export default AdminUsers;