import React from "react";
import { Loader2 } from "lucide-react";

const LoadingScreen = ({ message = "Đang tải dữ liệu...", fullScreen = false }) => {
  return (
    <div className={`flex w-full flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm ${fullScreen ? 'min-h-[calc(100vh-80px)]' : 'h-full min-h-[400px] flex-1'}`}>
      <div className="relative flex flex-col items-center justify-center space-y-6">
        {/* Vòng sáng viền ngoài */}
        <div className="absolute -inset-4 animate-pulse rounded-full bg-emerald-100 opacity-50 blur-xl"></div>
        
        {/* Spinner */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl shadow-emerald-100 ring-1 ring-gray-100">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        </div>
        
        {/* Text */}
        <div className="flex flex-col items-center space-y-1">
          <p className="text-lg font-semibold text-gray-800">{message}</p>
          <p className="text-sm text-gray-500">Vui lòng chờ giây lát</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
