import io
import json
import os
from pathlib import Path

import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request
# from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
from PIL import ImageOps

APP_DIR = Path(__file__).resolve().parent
DEFAULT_H5_MODEL_PATH = APP_DIR / "rice_disease_model.h5"
DEFAULT_KERAS_MODEL_PATH = APP_DIR / "rice_disease_model.keras"
DEFAULT_CLASS_NAMES_PATH = APP_DIR / "class_names.json"
DEFAULT_METADATA_PATH = APP_DIR / "model_metadata.json"
LEGACY_CLASS_NAMES = [
    "bacterial_leaf_blight",
    "blast",
    "brown_spot",
    "tungro",
]
DISPLAY_NAME_MAP = {
    "bacterial_leaf_blight": "Bệnh bạc lá",
    "bacterial_leaf_streak": "Bệnh sọc lá vi khuẩn",
    "bacterial_panicle_blight": "Bệnh lem lép hạt",
    "blast": "Bệnh đạo ôn",
    "brown_spot": "Bệnh đốm nâu",
    "dead_heart": "Tim chết (dảnh héo)",
    "downy_mildew": "Bệnh sương mai",
    "hispa": "Bọ hispa hại lá",
    "normal": "Lá lúa khỏe",
    "tungro": "Bệnh vàng lùn (tungro)",
}
RESAMPLE_BILINEAR = (
    Image.Resampling.BILINEAR if hasattr(Image, "Resampling") else Image.BILINEAR
)
DEFAULT_CONFIDENCE_THRESHOLD = 0.8
DEFAULT_CONFIDENCE_GAP_THRESHOLD = 0.12
DEFAULT_REJECT_LOW_CONFIDENCE = True


def _resolve_path(env_name, fallback_path):
    configured = os.getenv(env_name, "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return fallback_path


def _default_model_path():
    if DEFAULT_KERAS_MODEL_PATH.exists():
        return DEFAULT_KERAS_MODEL_PATH
    return DEFAULT_H5_MODEL_PATH


def _load_json(path):
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _resolve_float_setting(env_name, metadata, metadata_key, default_value):
    raw_value = os.getenv(env_name, "").strip()
    if raw_value:
        try:
            return float(raw_value)
        except ValueError:
            pass

    metadata_value = metadata.get(metadata_key)
    if metadata_value is not None:
        try:
            return float(metadata_value)
        except (TypeError, ValueError):
            pass

    return float(default_value)


def _resolve_bool_setting(env_name, metadata, metadata_key, default_value):
    raw_value = os.getenv(env_name, "").strip().lower()
    if raw_value:
        if raw_value in {"1", "true", "yes", "on"}:
            return True
        if raw_value in {"0", "false", "no", "off"}:
            return False

    metadata_value = metadata.get(metadata_key)
    if isinstance(metadata_value, bool):
        return metadata_value

    return bool(default_value)


def _resolve_class_metadata():
    metadata_path = _resolve_path(
        "RICE_DISEASE_METADATA_PATH", DEFAULT_METADATA_PATH
    )
    class_names_path = _resolve_path(
        "RICE_DISEASE_CLASS_NAMES_PATH", DEFAULT_CLASS_NAMES_PATH
    )

    metadata = _load_json(metadata_path) or {}
    class_names = metadata.get("class_names")
    if not class_names:
        class_names = _load_json(class_names_path)
    if not class_names:
        class_names = LEGACY_CLASS_NAMES

    display_names = metadata.get("display_names")
    if isinstance(display_names, dict):
        display_names = [display_names.get(name, _pretty_name(name)) for name in class_names]
    elif not isinstance(display_names, list) or len(display_names) != len(class_names):
        display_names = [_display_name(name) for name in class_names]

    input_range = metadata.get("input_range", "0_1")
    return metadata, class_names, display_names, input_range


def _pretty_name(class_name):
    return class_name.replace("_", " ").title()


def _display_name(class_name):
    return DISPLAY_NAME_MAP.get(class_name, _pretty_name(class_name))


def _patch_keras_dense_compatibility():
    dense_init = tf.keras.layers.Dense.__init__
    if getattr(dense_init, "_rice_leaf_compat", False):
        return

    def patched_init(self, *args, **kwargs):
        kwargs.pop("quantization_config", None)
        return dense_init(self, *args, **kwargs)

    patched_init._rice_leaf_compat = True
    tf.keras.layers.Dense.__init__ = patched_init


def _resolve_target_size(model, metadata):
    input_shape = getattr(model, "input_shape", None)
    if input_shape and len(input_shape) >= 4 and input_shape[1] and input_shape[2]:
        return int(input_shape[1]), int(input_shape[2])

    metadata_size = metadata.get("image_size")
    if (
        isinstance(metadata_size, list)
        and len(metadata_size) == 2
        and all(isinstance(v, int) for v in metadata_size)
    ):
        return tuple(metadata_size)

    return (224, 224)


def prepare_image(image, target_size, input_range):
    if image.mode != "RGB":
        image = image.convert("RGB")

    image = image.resize(target_size, RESAMPLE_BILINEAR)
    # image = ImageOps.pad(image, target_size, method=RESAMPLE_BILINEAR, color=(0, 0, 0))
    image = tf.keras.preprocessing.image.img_to_array(image).astype("float32")
    if input_range == "0_1":
        image = image / 255.0

    return np.expand_dims(image, axis=0)


def _build_response(probabilities, class_names, display_names):
    predicted_index = int(np.argmax(probabilities))
    confidence = float(np.max(probabilities))

    top_indices = np.argsort(probabilities)[::-1][: min(3, len(class_names))]
    top_predictions = [
        {
            "class_name": class_names[index],
            "disease": display_names[index],
            "confidence": float(probabilities[index]),
        }
        for index in top_indices
    ]
    runner_up_confidence = (
        float(probabilities[top_indices[1]]) if len(top_indices) > 1 else 0.0
    )
    confidence_gap = confidence - runner_up_confidence
    is_low_confidence = (
        confidence < CONFIDENCE_THRESHOLD
        or confidence_gap < CONFIDENCE_GAP_THRESHOLD
    )
    warning_messages = []
    if confidence < CONFIDENCE_THRESHOLD:
        warning_messages.append(
            f"do tin cay duoi nguong {CONFIDENCE_THRESHOLD * 100:.0f}%"
        )
    if confidence_gap < CONFIDENCE_GAP_THRESHOLD and len(top_predictions) > 1:
        warning_messages.append(
            f"ket qua gan nhat chi chenh {confidence_gap * 100:.1f}% so voi du doan thu 2"
        )
    warning = None
    if warning_messages:
        warning = (
            "Ket qua AI chua du chac chan, nen kiem tra them bang anh ro hon hoac doi chieu voi chuyen gia "
            f"({'; '.join(warning_messages)})."
        )

    return {
        "class_name": class_names[predicted_index],
        "disease": display_names[predicted_index],
        "confidence": confidence,
        "runner_up_confidence": runner_up_confidence,
        "confidence_gap": confidence_gap,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "confidence_gap_threshold": CONFIDENCE_GAP_THRESHOLD,
        "is_low_confidence": is_low_confidence,
        "warning": warning,
        "labels": class_names,
        "all_scores": probabilities.tolist(),
        "top_predictions": top_predictions,
    }


def _build_rejected_response(result):
    return {
        "status": "rejected",
        "error_code": "UNSUPPORTED_IMAGE",
        "message": "Ảnh tải lên không đủ điều kiện để chẩn đoán bệnh lá lúa.",
        "guidance": "Vui lòng sử dụng ảnh cận cảnh lá lúa rõ nét, đủ ánh sáng, không bị mờ.",
        "prediction": result,
    }


app = Flask(__name__)
# CORS(app)
try:
    app.json.ensure_ascii = False
except AttributeError:
    app.config["JSON_AS_ASCII"] = False

_patch_keras_dense_compatibility()
MODEL_PATH = _resolve_path("RICE_DISEASE_MODEL_PATH", _default_model_path())
MODEL = tf.keras.models.load_model(MODEL_PATH, compile=False)
MODEL_METADATA, CLASS_NAMES, DISPLAY_NAMES, INPUT_RANGE = _resolve_class_metadata()
CONFIDENCE_THRESHOLD = _resolve_float_setting(
    "RICE_DISEASE_CONFIDENCE_THRESHOLD",
    MODEL_METADATA,
    "confidence_threshold",
    DEFAULT_CONFIDENCE_THRESHOLD,
)
CONFIDENCE_GAP_THRESHOLD = _resolve_float_setting(
    "RICE_DISEASE_CONFIDENCE_GAP_THRESHOLD",
    MODEL_METADATA,
    "confidence_gap_threshold",
    DEFAULT_CONFIDENCE_GAP_THRESHOLD,
)
REJECT_LOW_CONFIDENCE = _resolve_bool_setting(
    "RICE_DISEASE_REJECT_LOW_CONFIDENCE",
    MODEL_METADATA,
    "reject_low_confidence",
    DEFAULT_REJECT_LOW_CONFIDENCE,
)
MODEL_OUTPUT_UNITS = int(MODEL.output_shape[-1])
if len(CLASS_NAMES) != MODEL_OUTPUT_UNITS:
    raise RuntimeError(
        "Model output size does not match the number of class names. "
        "Please keep rice_disease_model.h5, class_names.json, and "
        "model_metadata.json from the same training run."
    )
TARGET_SIZE = _resolve_target_size(MODEL, MODEL_METADATA)


@app.get("/health")
def health_check():
    return jsonify(
        {
            "status": "ok",
            "model_path": str(MODEL_PATH),
            "num_classes": len(CLASS_NAMES),
            "target_size": list(TARGET_SIZE),
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "confidence_gap_threshold": CONFIDENCE_GAP_THRESHOLD,
            "reject_low_confidence": REJECT_LOW_CONFIDENCE,
        }
    )


@app.post("/predict")
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    file_bytes = file.read()
    if not file_bytes:
        return jsonify({"error": "Uploaded file is empty"}), 400

    try:
        image = Image.open(io.BytesIO(file_bytes))
    except UnidentifiedImageError:
        return jsonify({"error": "Uploaded file is not a valid image"}), 400

    processed_image = prepare_image(image, TARGET_SIZE, INPUT_RANGE)
    prediction = MODEL.predict(processed_image, verbose=0)[0]
    result = _build_response(prediction, CLASS_NAMES, DISPLAY_NAMES)

    print("=== Prediction Scores ===")
    for class_name, display_name, score in zip(
        CLASS_NAMES, DISPLAY_NAMES, result["all_scores"]
    ):
        print(f"{class_name} | {display_name}: {score:.4f}")
    print("=========================")

    if REJECT_LOW_CONFIDENCE and result["is_low_confidence"]:
        return jsonify(_build_rejected_response(result)), 422

    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5000, debug=True)

# if __name__ == "__main__":
#     port = int(os.environ.get("PORT", 5000))
#     app.run(host="0.0.0.0", port=port)
