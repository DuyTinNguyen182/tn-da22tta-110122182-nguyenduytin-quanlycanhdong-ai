import React, { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import { Loader2, ScanLine, X } from "lucide-react";

const UI_TEXT = {
  eyebrow: "Cắt ảnh trước khi quét",
  title: "Chọn đúng vùng lá cần chẩn đoán",
  dragHint:
    "Kéo ảnh để căn vị trí, sau đó tăng hoặc giảm zoom để lấy đúng vùng lá.",
  zoomLabel: "Độ phóng to",
  quickTips: "Gợi ý nhanh",
  cancel: "Hủy",
  confirm: "Dùng ảnh này",
  loading: "Đang áp dụng",
  frameHint: "Khung vuông giúp AI đọc vùng lá ổn định hơn.",
};

const QUICK_TIPS = [
  "Ưu tiên vùng lá có vết bệnh rõ nhất.",
  "Tránh để trời, đất hoặc nền tạp chiếm quá nhiều trong khung crop.",
];

const getCroppedImg = async (imageSrc, pixelCrop, targetType) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 1024;
  canvas.height = 1024;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    1024,
    1024,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      targetType,
      0.92,
    );
  });
};

const ImageCropModal = ({ open, imageFile, onClose, onConfirm }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(true);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setImageLoading(true);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onCropComplete = useCallback((_, nextPixels) => {
    setCroppedAreaPixels(nextPixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;

    setSubmitting(true);

    try {
      const targetType =
        imageFile.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels, targetType);
      const extension = targetType === "image/png" ? "png" : "jpg";
      const baseName = imageFile.name.replace(/\.[^.]+$/, "");

      const file = new File([blob], `${baseName}-crop.${extension}`, {
        type: targetType,
      });

      await onConfirm(file);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !imageFile) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[18px] border border-white/15 bg-white shadow-[0_40px_100px_-40px_rgba(15,23,42,0.7)] sm:max-h-[94vh]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">
              {UI_TEXT.eyebrow}
            </p>
            <h3 className="text-lg font-bold text-slate-900 md:text-xl">
              {UI_TEXT.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body  */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 md:overflow-hidden md:px-0 md:py-0">
          {/* Thêm md:h-[65vh] và md:min-h-[520px] để ép khung chứa phải cao lên, ảnh sẽ to ra tối đa */}
          <div className="flex min-w-0 flex-col gap-4 md:grid md:h-[65vh] md:min-h-[520px] md:grid-cols-[minmax(0,1fr)_280px] md:gap-6 md:p-6">
            {/* Vùng Cropper */}
            <div className="flex h-[min(58dvh,360px)] min-h-[280px] min-w-0 flex-col rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,#152238_0%,#050816_75%)] p-3 shadow-inner shadow-slate-950/30 sm:min-h-[320px] md:h-full md:min-h-0 md:rounded-[28px]">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                <ScanLine size={14} />
                <span className="min-w-0 break-words">{UI_TEXT.frameHint}</span>
              </div>

              {/* Vùng không gian hiển thị ảnh sẽ tự động lấp đầy phần cao còn lại */}
              <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[16px] bg-slate-950 ring-1 ring-white/10">
                {imageLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center text-white/90">
                    <Loader2 className="animate-spin" />
                  </div>
                )}

                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onMediaLoaded={() => setImageLoading(false)}
                  classes={{
                    containerClassName: "rounded-[16px]",
                  }}
                />

                <div className="pointer-events-none absolute inset-0 z-10 rounded-[16px] ring-2 ring-white/90" />
              </div>
            </div>

            {/* Vùng Controls (Gợi ý và thanh trượt) */}
            <div className="flex min-w-0 flex-col gap-4 overflow-y-visible md:overflow-visible">
              <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {UI_TEXT.zoomLabel}
                  </p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {zoom.toFixed(2)}x
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
                />

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>1.0x</span>
                  <span>3.0x</span>
                </div>

                <p className="mt-3 break-words text-xs leading-5 text-slate-500">
                  {UI_TEXT.dragHint}
                </p>
              </div>

              <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4 sm:rounded-[24px]">
                <p className="text-sm font-semibold text-emerald-900">
                  {UI_TEXT.quickTips}
                </p>
                <div className="mt-3 space-y-2">
                  {QUICK_TIPS.map((tip) => (
                    <div
                      key={tip}
                      className="break-words rounded-2xl bg-white/75 px-3 py-2.5 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-100"
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-row items-center gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4 justify-between sm:justify-end md:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {UI_TEXT.cancel}
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={submitting}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white transition-colors sm:w-auto ${
              submitting
                ? "cursor-not-allowed bg-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            aria-disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {UI_TEXT.loading}
              </>
            ) : (
              UI_TEXT.confirm
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
