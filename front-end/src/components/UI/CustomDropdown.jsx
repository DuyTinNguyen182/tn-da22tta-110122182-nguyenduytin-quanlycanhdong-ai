import React, { Fragment } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { ChevronDown, Check, X as XIcon } from "lucide-react";

/**
 * CustomDropdown — reusable select component built on HeadlessUI Listbox.
 * Uses portal rendering, so it's never clipped by parent overflow.
 *
 * @param {string|array}   value       - Currently selected value or array when multi
 * @param {function} onChange    - Callback when value changes
 * @param {Array}    options     - [{ value, label, dot?, badge? }]
 * @param {string}   placeholder - Placeholder text
 * @param {Component} icon      - Optional leading icon component
 * @param {"small"|"default"} size
 * @param {"default"|"active"|"filter"} variant
 * @param {string}   className  - Extra wrapper class
 * @param {boolean}  multi      - Enable multi-select mode
 */
const CustomDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Chọn...",
  icon: Icon,
  size = "default",
  variant = "default",
  className = "",
  multi = false,
  disabled = false,
}) => {
  // Normalize selected values
  const selectedValues = multi
    ? Array.isArray(value)
      ? value
      : value
        ? [value]
        : []
    : value;

  const selectedOption = multi
    ? null
    : options.find((opt) => opt.value === value);

  const displayLabel = multi
    ? selectedValues.length === 0
      ? placeholder
      : null
    : selectedOption?.label || placeholder;

  const sizeStyles = {
    small: "px-2.5 py-1.5 text-xs gap-1.5",
    default: "px-3 py-2 text-sm gap-2",
  };

  const variantBase = {
    default: "border-gray-200 bg-white hover:border-gray-300",
    active: "border-emerald-200 bg-emerald-50 hover:border-emerald-300",
    filter: "border-gray-100 bg-gray-50/80 hover:border-gray-200",
  };

  const variantOpen = {
    default: "ring-2 ring-emerald-200 border-emerald-300",
    active: "ring-2 ring-emerald-200 border-emerald-400",
    filter: "ring-2 ring-emerald-200 border-emerald-300",
  };

  return (
    <Listbox
      value={value}
      onChange={onChange}
      multiple={multi}
      disabled={disabled}
    >
      {({ open }) => (
        <div className={`relative ${className}`}>
          <ListboxButton
            disabled={disabled}
            className={`flex w-full items-center rounded-xl border font-medium outline-none transition-all ${sizeStyles[size]} ${variantBase[variant]} ${
              open ? variantOpen[variant] : ""
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {Icon && (
              <Icon
                size={size === "small" ? 13 : 15}
                className="shrink-0 text-gray-400"
              />
            )}
            {/* Display tags when multi-select is enabled and items are selected */}
            {multi ? (
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {selectedValues.length === 0 ? (
                  <span className="text-gray-400">{placeholder}</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedValues.map((val) => {
                      const opt = options.find((o) => o.value === val) || {};
                      return (
                        <span
                          key={val}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                        >
                          <span className="max-w-[140px] truncate">
                            {opt.label || val}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = selectedValues.filter(
                                (v) => v !== val,
                              );
                              onChange(next);
                            }}
                            className="flex items-center justify-center p-1 text-emerald-600 hover:text-emerald-800"
                            aria-label={`Xóa ${opt.label || val}`}
                          >
                            <XIcon size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <span
                className={`flex-1 truncate text-left ${
                  selectedOption
                    ? variant === "active"
                      ? "font-semibold text-emerald-800"
                      : "text-gray-700"
                    : "text-gray-400"
                }`}
              >
                {displayLabel}
              </span>
            )}
            <ChevronDown
              size={size === "small" ? 13 : 15}
              className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions
              anchor="bottom start"
              className="z-[9999] mt-1.5 w-[var(--button-width)] min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl shadow-gray-200/50 focus:outline-none"
            >
              {options.map((opt) => (
                <ListboxOption
                  key={opt.value}
                  value={opt.value}
                  className={({ active, selected }) =>
                    `flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors ${
                      selected
                        ? "bg-emerald-50 text-emerald-700"
                        : active
                          ? "bg-gray-50 text-gray-700"
                          : "text-gray-700"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      {opt.dot && (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${opt.dot}`}
                        />
                      )}
                      <span
                        className={`flex-1 truncate text-sm ${
                          selected ? "font-semibold" : ""
                        }`}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${opt.badge.className}`}
                        >
                          {opt.badge.text}
                        </span>
                      )}
                      {selected && (
                        <Check
                          size={14}
                          className="shrink-0 text-emerald-600"
                        />
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      )}
    </Listbox>
  );
};

export default CustomDropdown;
