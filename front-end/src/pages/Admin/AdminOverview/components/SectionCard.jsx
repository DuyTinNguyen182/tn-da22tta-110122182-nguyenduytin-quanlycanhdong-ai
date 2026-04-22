import React from "react";

const SectionCard = ({ title, actions, children }) => (
  <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {actions}
    </div>
    {children}
  </section>
);

export default SectionCard;
