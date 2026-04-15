import React from "react";
import { Check } from "lucide-react";

const CustomCheckbox = ({ checked, onChange, disabled = false, size = 18 }) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`flex shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150 ${
        checked
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200"
          : disabled
            ? "border-gray-200 bg-gray-100 cursor-not-allowed"
            : "border-gray-300 bg-white hover:border-emerald-400"
      }`}
      style={{ width: size, height: size }}
    >
      {checked && (
        <Check
          size={size - 6}
          strokeWidth={3}
          className="animate-checkbox-pop"
        />
      )}
    </button>
  );
};

export default CustomCheckbox;
