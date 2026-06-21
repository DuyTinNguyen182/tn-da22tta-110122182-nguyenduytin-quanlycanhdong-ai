import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Filter } from "lucide-react";

const findSelectedOption = (options, value) => {
  for (const option of options) {
    if (option.value === value) {
      return option;
    }

    const child = (option.children || []).find((item) => item.value === value);
    if (child) {
      return {
        ...child,
        label: `${option.label} / ${child.label}`,
      };
    }
  }

  return null;
};

const TaskFilterDropdown = ({
  value,
  onChange,
  options = [],
  className = "",
}) => {
  const wrapperRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [hoveredParent, setHoveredParent] = useState(null);

  const selectedOption = useMemo(
    () => findSelectedOption(options, value),
    [options, value],
  );
  const displayLabel = selectedOption?.label || "Tất cả việc";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setHoveredParent(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setHoveredParent(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const cancelCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredParent(null);
      closeTimerRef.current = null;
    }, 120);
  };

  const handleSelect = (nextValue) => {
    cancelCloseTimer();
    onChange(nextValue);
    setOpen(false);
    setHoveredParent(null);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium outline-none transition-all ${
          open
            ? "border-emerald-300 bg-white ring-2 ring-emerald-200"
            : "border-gray-100 bg-gray-50/80 hover:border-gray-200"
        }`}
      >
        <Filter size={13} className="shrink-0 text-gray-400" />
        {/* Thêm title cho text trên nút button */}
        <span
          className="flex-1 truncate text-left text-gray-700"
          title={displayLabel}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        // Đổi w-[220px] thành w-max min-w-[220px] max-w-[320px]
        <div className="absolute left-0 top-full z-[100] mt-1.5 w-max min-w-[220px] max-w-[320px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl shadow-gray-200/50">
          {options.map((option) => {
            const hasChildren =
              Array.isArray(option.children) && option.children.length > 0;
            const isSelected = option.value === value;
            const showChildren = hasChildren && hoveredParent === option.value;

            return (
              <div
                key={option.value}
                className="relative"
                onMouseEnter={() => {
                  cancelCloseTimer();
                  setHoveredParent(option.value);
                }}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {/* Thêm title cho text cấp 1 */}
                  <span
                    title={option.label}
                    className={`flex-1 truncate text-sm ${isSelected ? "font-semibold" : ""}`}
                  >
                    {option.label}
                  </span>
                  {hasChildren && (
                    <ChevronRight
                      size={14}
                      className="shrink-0 text-gray-400"
                    />
                  )}
                  {isSelected && (
                    <Check size={14} className="shrink-0 text-emerald-600" />
                  )}
                </button>

                {showChildren && (
                  // Đổi w-[240px] thành w-max min-w-[240px] max-w-[350px]
                  <div
                    className="absolute left-full top-0 ml-1 w-max min-w-[240px] max-w-[350px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl shadow-gray-200/50"
                    onMouseEnter={() => {
                      cancelCloseTimer();
                      setHoveredParent(option.value);
                    }}
                    onMouseLeave={scheduleClose}
                  >
                    {option.children.map((child) => {
                      const isChildSelected = child.value === value;

                      return (
                        <button
                          key={child.value}
                          type="button"
                          onClick={() => handleSelect(child.value)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            isChildSelected
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {/* Thêm title cho text cấp 2 */}
                          <span
                            title={child.label}
                            className={`flex-1 truncate text-sm ${
                              isChildSelected ? "font-semibold" : ""
                            }`}
                          >
                            {child.label}
                          </span>
                          {isChildSelected && (
                            <Check
                              size={14}
                              className="shrink-0 text-emerald-600"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskFilterDropdown;
