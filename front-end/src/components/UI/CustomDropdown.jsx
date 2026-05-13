import React, { Fragment } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { ChevronDown, Check } from "lucide-react";

/**
 * CustomDropdown — reusable select component built on HeadlessUI Listbox.
 * Uses portal rendering, so it's never clipped by parent overflow.
 *
 * @param {string}   value       - Currently selected value
 * @param {function} onChange    - Callback when value changes
 * @param {Array}    options     - [{ value, label, dot?, badge? }]
 * @param {string}   placeholder - Placeholder text
 * @param {Component} icon      - Optional leading icon component
 * @param {"small"|"default"} size
 * @param {"default"|"active"|"filter"} variant
 * @param {string}   className  - Extra wrapper class
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
}) => {
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

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
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className={`relative ${className}`}>
          <ListboxButton
            className={`flex w-full items-center rounded-xl border font-medium outline-none transition-all ${sizeStyles[size]} ${variantBase[variant]} ${
              open ? variantOpen[variant] : ""
            }`}
          >
            {Icon && (
              <Icon
                size={size === "small" ? 13 : 15}
                className="shrink-0 text-gray-400"
              />
            )}
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
                        <Check size={14} className="shrink-0 text-emerald-600" />
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
