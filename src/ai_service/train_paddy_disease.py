import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import argparse
import json
import random
import time
from collections import Counter
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

AUTOTUNE = tf.data.AUTOTUNE
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DEFAULT_CONFIDENCE_THRESHOLD = 0.80
DEFAULT_CONFIDENCE_GAP_THRESHOLD = 0.12

DISPLAY_NAME_MAP = {
    "bacterial_leaf_blight": "Bệnh bạc lá (cháy bìa lá)",
    "bacterial_leaf_streak": "Sọc lá vi khuẩn (sọc trong)",
    "bacterial_panicle_blight": "Bệnh lem lép hạt",
    "blast": "Bệnh đạo ôn",
    "brown_spot": "Bệnh đốm nâu",
    "dead_heart": "Tim chết (sâu đục thân)",
    "downy_mildew": "Bệnh sương mai",
    "hispa": "Bọ hispa (sâu gai) hại lá",
    "normal": "Lá lúa khỏe",
    "tungro": "Bệnh vàng lùn (tungro)",
}

def parse_args():
    parser = argparse.ArgumentParser(description="Huấn luyện mô hình nhận dự đoán bệnh trên lúa")
    parser.add_argument("--data-dir", required=True, help="Đường dẫn tới thư mục chứa train_images")
    parser.add_argument("--output-dir", default="./artifacts/paddy_efficientnet", help="Thư mục lưu model")
    parser.add_argument("--image-size", type=int, default=240)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs-head", type=int, default=10)
    parser.add_argument("--epochs-finetune", type=int, default=25)
    parser.add_argument("--fine-tune-layers", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)

def discover_class_names(train_dir):
    class_names = sorted(path.name for path in train_dir.iterdir() if path.is_dir())
    if not class_names:
        raise FileNotFoundError(f"Không tìm thấy thư mục class nào trong: {train_dir}")
    return class_names

def collect_split_samples(split_dir, class_names):
    paths, labels = [], []
    for class_index, class_name in enumerate(class_names):
        class_dir = split_dir / class_name
        image_paths = [p for p in class_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]

        for p in image_paths:
            paths.append(str(p))
            labels.append(class_index)

    return paths, labels

def decode_image_with_central_crop(path, label, image_size, num_classes):
    image_bytes = tf.io.read_file(path)
    image = tf.io.decode_image(image_bytes, channels=3, expand_animations=False)

    shape = tf.shape(image)
    min_dim = tf.minimum(shape[0], shape[1])
    image = tf.image.resize_with_crop_or_pad(image, min_dim, min_dim)
    image = tf.image.resize(image, [image_size, image_size])

    image = tf.cast(image, tf.float32)
    label_one_hot = tf.one_hot(label, num_classes)
    return image, label_one_hot

def build_augmenter():
    return tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal_and_vertical"),
        tf.keras.layers.RandomRotation(0.10),
        tf.keras.layers.RandomBrightness(0.15),
        tf.keras.layers.RandomContrast(0.15),
    ], name="augmenter")

def build_dataset(paths, labels, image_size, batch_size, num_classes, training, seed):
    dataset = tf.data.Dataset.from_tensor_slices((paths, labels))
    if training:
        dataset = dataset.shuffle(buffer_size=4096, seed=seed)

    dataset = dataset.map(
        lambda path, label: decode_image_with_central_crop(path, label, image_size, num_classes),
        num_parallel_calls=AUTOTUNE
    ).batch(batch_size)

    if training:
        augmenter = build_augmenter()
        dataset = dataset.map(
            lambda images, labels: (augmenter(images, training=True), labels),
            num_parallel_calls=AUTOTUNE
        )
    return dataset.prefetch(AUTOTUNE)

def build_model(num_classes, image_size):
    inputs = tf.keras.Input(shape=(image_size, image_size, 3))
    base_model = tf.keras.applications.EfficientNetB1(
        include_top=False, weights="imagenet", input_tensor=inputs
    )
    base_model.trainable = False
    x = tf.keras.layers.GlobalAveragePooling2D()(base_model.output)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", dtype="float32")(x)
    return tf.keras.Model(inputs, outputs), base_model

def compile_model(model, learning_rate):
    loss_fn = tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss=loss_fn,
        metrics=[
            tf.keras.metrics.CategoricalAccuracy(name="accuracy"),
            tf.keras.metrics.TopKCategoricalAccuracy(k=3, name="top3_accuracy"),
        ],
    )

def main():
    args = parse_args()
    set_seed(args.seed)

    if tf.config.list_physical_devices("GPU"):
        tf.keras.mixed_precision.set_global_policy("mixed_float16")
        print("Trạng thái GPU: Mixed Precision đã được kích hoạt.")

    data_dir = Path(args.data_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    train_dir = data_dir / "train_images"
    if not train_dir.exists():
        raise FileNotFoundError(f"Không tìm thấy thư mục: {train_dir}")

    class_names = discover_class_names(train_dir)
    num_classes = len(class_names)
    display_names = [DISPLAY_NAME_MAP.get(name, name) for name in class_names]

    all_paths, all_labels = collect_split_samples(train_dir, class_names)

    print("\n--- THÔNG TIN BỘ DỮ LIỆU ---")
    print(f"Tổng số ảnh gốc: {len(all_paths)}")

    X_temp, X_test, y_temp, y_test = train_test_split(
        all_paths, all_labels, test_size=0.15, stratify=all_labels, random_state=args.seed
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.1764, stratify=y_temp, random_state=args.seed
    )

    print(f"Số lượng tập Train: {len(X_train)} ảnh")
    print(f"Số lượng tập Validation: {len(X_val)} ảnh")
    print(f"Số lượng tập Test: {len(X_test)} ảnh")
    print("----------------------------\n")

    class_weights_array = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(y_train),
        y=y_train
    )
    class_weight_dict = {i: float(weight) for i, weight in enumerate(class_weights_array)}

    train_dataset = build_dataset(X_train, y_train, args.image_size, args.batch_size, num_classes, True, args.seed)
    val_dataset = build_dataset(X_val, y_val, args.image_size, args.batch_size, num_classes, False, args.seed)
    test_dataset = build_dataset(X_test, y_test, args.image_size, args.batch_size, num_classes, False, args.seed)

    model, base_model = build_model(num_classes, args.image_size)

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(str(output_dir / "best_model.keras"), monitor="val_accuracy", save_best_only=True, verbose=1),
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=6, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6)
    ]

    start_time = time.time()

    print("\n--- GIAI ĐOẠN 1: Huấn luyện lớp Classification ---")
    compile_model(model, learning_rate=1e-3)
    model.fit(
        train_dataset, validation_data=val_dataset, epochs=args.epochs_head,
        class_weight=class_weight_dict, callbacks=callbacks
    )

    print("\n--- GIAI ĐOẠN 2: Fine-Tuning mở rộng ---")
    base_model.trainable = True
    for layer in base_model.layers[:-args.fine_tune_layers]:
        layer.trainable = False

    for layer in base_model.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False

    compile_model(model, learning_rate=1e-4)
    model.fit(
        train_dataset, validation_data=val_dataset, epochs=args.epochs_head + args.epochs_finetune,
        initial_epoch=args.epochs_head, class_weight=class_weight_dict, callbacks=callbacks
    )

    print("\n--- GIAI ĐOẠN 3: ĐÁNH GIÁ TRÊN TẬP TEST BÍ MẬT ---")
    best_model = tf.keras.models.load_model(str(output_dir / "best_model.keras"), compile=False)
    compile_model(best_model, learning_rate=1e-4)

    print("Đang chạy dự đoán trên tập Test để tính toán các chỉ số báo cáo...")
    y_pred_probs = best_model.predict(test_dataset, verbose=1)
    y_pred = np.argmax(y_pred_probs, axis=1)

    acc = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    f1 = f1_score(y_test, y_pred, average='weighted')

    print("\n================ TỔNG KẾT CHỈ SỐ ĐÁNH GIÁ ================")
    print(f"- Accuracy (Độ chính xác): {acc * 100:.2f}%")
    print(f"- Precision (Độ chuẩn xác): {precision * 100:.2f}%")
    print(f"- Recall (Độ phủ):          {recall * 100:.2f}%")
    print(f"- F1-Score:                 {f1 * 100:.2f}%")
    print("==========================================================\n")

    print("--- BÁO CÁO PHÂN LOẠI CHI TIẾT (CLASSIFICATION REPORT) ---")
    print(classification_report(y_test, y_pred, target_names=class_names, digits=4))

    print("--- MA TRẬN NHẦM LẪN (CONFUSION MATRIX) ---")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)
    print("----------------------------------------------------------\n")

    final_keras_path = output_dir / "rice_disease_model.keras"
    best_model.save(str(final_keras_path), include_optimizer=False)

    metadata = {
        "backbone": "EfficientNetB1",
        "image_size": [args.image_size, args.image_size],
        "input_range": "0_255",
        "num_classes": num_classes,
        "class_names": class_names,
        "display_names": display_names,
        "confidence_threshold": DEFAULT_CONFIDENCE_THRESHOLD,
        "confidence_gap_threshold": DEFAULT_CONFIDENCE_GAP_THRESHOLD,
        "test_accuracy": float(acc),
        "training_minutes": round((time.time() - start_time) / 60, 2),
    }
    with open(output_dir / "model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    with open(output_dir / "class_names.json", "w", encoding="utf-8") as f:
        json.dump(class_names, f, ensure_ascii=False, indent=2)

    print(f"Huấn luyện hoàn tất. File .keras được lưu tại thư mục: {output_dir.name}")

if __name__ == "__main__":
    main()
