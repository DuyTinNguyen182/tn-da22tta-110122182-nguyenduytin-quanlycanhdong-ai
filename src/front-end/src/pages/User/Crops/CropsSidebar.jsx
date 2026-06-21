import React from "react";
import { MapPin, Sprout } from "lucide-react";

const CropsSidebar = ({
  fields,
  selectedField,
  onSelectField,
}) => {
  return (
    <aside className="z-10 flex w-[280px] xl:w-[300px] flex-col border-r border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 p-1.5">
            <Sprout size={16} className="text-emerald-600" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Cánh đồng</h2>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-gray-400">
            <div className="mb-3 rounded-2xl bg-gray-100 p-4">
              <MapPin size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Chưa có cánh đồng nào có thửa.</p>
          </div>
        ) : (
          fields.map((field) => {
            const isSelected = selectedField?._id === field._id;
            return (
              <button
                key={field._id}
                onClick={() => onSelectField(field)}
                className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-200 bg-emerald-50/80 shadow-sm shadow-emerald-100"
                    : "border-transparent hover:bg-gray-50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                      isSelected
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`truncate text-sm font-semibold transition-colors ${
                        isSelected ? "text-emerald-800" : "text-gray-700"
                      }`}
                    >
                      {field.name}
                    </h3>
                    <p className="truncate text-xs text-gray-400">
                      {field.address || "Chưa có địa bàn"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default CropsSidebar;
