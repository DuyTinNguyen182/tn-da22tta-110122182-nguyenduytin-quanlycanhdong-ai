import React, { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Loader2, X } from "lucide-react";

// Tự động giải phóng Object URL để tránh leak memory
const getCroppedImg = async (imageSrc, pixelCrop, targetType) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // set canvas size to match the bounding box
  canvas.width = 1024;
  canvas.height = 1024;

  // draw image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    1024,
    1024
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
      0.92
    );
  });
};

const ImageCropModal = ({ open, imageFile, onClose, onConfirm }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    // Đặt lại trạng thái khi mở ảnh mới
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
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
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !imageFile) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-[0_40px_100px_-40px_rgba(15,23,42,0.7)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Cắt ảnh trước khi quét
            </p>
            <h3 className="text-xl font-bold text-slate-900">
              Chọn đúng vùng lá cần chẩn đoán
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_260px] md:p-6">
          <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-[28px] bg-slate-950">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              classes={{
                containerClassName: "rounded-[28px]",
              }}
            />
            {/* The crop border logic */}
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-2 ring-white/90 ring-offset-0" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  Độ phóng to
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
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Kéo ảnh để căn vị trí, sau đó tăng hoặc giảm zoom để lấy đúng vùng lá.
              </p>
            </div>

            <div className="rounded-[24px] bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                Gợi ý nhanh
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-emerald-800">
                <p>Ưu tiên vùng lá có vết bệnh rõ nhất.</p>
                <p>Đừng để nền trời hoặc đất chiếm quá nhiều trong khung crop.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={submitting}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white transition-colors ${
              submitting
                ? "cursor-not-allowed bg-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang áp dụng
              </>
            ) : (
              "Dùng ảnh này"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
