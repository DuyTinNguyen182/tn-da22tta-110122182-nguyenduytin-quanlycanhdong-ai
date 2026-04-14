from __future__ import annotations

import argparse
import json
import random
import time
from collections import Counter
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

AUTOTUNE = tf.data.AUTOTUNE
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DEFAULT_CONFIDENCE_THRESHOLD = 0.8
DEFAULT_CONFIDENCE_GAP_THRESHOLD = 0.12
DISPLAY_NAME_MAP = {
    "bacterial_leaf_blight": "Bacterial Leaf Blight (Bac la)",
    "bacterial_leaf_streak": "Bacterial Leaf Streak",
    "bacterial_panicle_blight": "Bacterial Panicle Blight",
    "blast": "Rice Blast (Dao on)",
    "brown_spot": "Brown Spot (Dom nau)",
    "dead_heart": "Dead Heart",
    "downy_mildew": "Downy Mildew",
    "hispa": "Hispa",
    "normal": "Healthy Rice Leaf",
    "tungro": "Tungro",
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train a Colab-friendly rice disease classifier for the Paddy Doctor dataset."
    )
    parser.add_argument(
        "--data-dir",
        required=True,
        help="Path to the extracted dataset root containing train_images/ and test_images/.",
    )
    parser.add_argument(
        "--output-dir",
        default="./artifacts/paddy_efficientnetb0",
        help="Directory used to store the trained model and metadata.",
    )
    parser.add_argument(
        "--image-size",
        type=int,
        default=224,
        help="Image size used for training and inference.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size. Use 24 or 16 if Colab GPU RAM is limited.",
    )
    parser.add_argument(
        "--epochs-head",
        type=int,
        default=5,
        help="Epochs for the frozen backbone stage.",
    )
    parser.add_argument(
        "--epochs-finetune",
        type=int,
        default=6,
        help="Epochs for the fine-tuning stage.",
    )
    parser.add_argument(
        "--fine-tune-layers",
        type=int,
        default=40,
        help="How many backbone layers to unfreeze during fine-tuning.",
    )
    parser.add_argument(
        "--val-split",
        type=float,
        default=0.15,
        help="Validation split taken from train_images.",
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=1e-3,
        help="Learning rate for the classifier head stage.",
    )
    parser.add_argument(
        "--fine-tune-learning-rate",
        type=float,
        default=1e-4,
        help="Learning rate for the fine-tuning stage.",
    )
    parser.add_argument(
        "--dropout",
        type=float,
        default=0.3,
        help="Dropout added before the classification layer.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility.",
    )
    return parser.parse_args()


def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    try:
        tf.keras.utils.set_random_seed(seed)
    except AttributeError:
        pass


def enable_mixed_precision_if_available():
    gpus = tf.config.list_physical_devices("GPU")
    if not gpus:
        print("No GPU detected. Training will work, but it will be much slower.")
        return False

    try:
        from tensorflow.keras import mixed_precision

        mixed_precision.set_global_policy("mixed_float16")
        print("Mixed precision enabled for faster Colab training.")
        return True
    except Exception as error:
        print(f"Mixed precision was not enabled: {error}")
        return False


def discover_class_names(train_dir):
    class_names = sorted(path.name for path in train_dir.iterdir() if path.is_dir())
    if not class_names:
        raise FileNotFoundError(f"No class folders were found inside: {train_dir}")
    return class_names


def collect_split_samples(split_dir, class_names):
    paths = []
    labels = []

    for class_index, class_name in enumerate(class_names):
        class_dir = split_dir / class_name
        if not class_dir.exists():
            raise FileNotFoundError(f"Missing expected class directory: {class_dir}")

        image_paths = [
            path
            for path in sorted(class_dir.rglob("*"))
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ]

        paths.extend(str(path) for path in image_paths)
        labels.extend([class_index] * len(image_paths))

    if not paths:
        raise FileNotFoundError(f"No image files were found inside: {split_dir}")

    return paths, labels


def print_distribution(name, labels, class_names):
    counts = Counter(labels)
    print(f"\n{name} distribution:")
    for index, class_name in enumerate(class_names):
        print(f"  {class_name}: {counts.get(index, 0)}")


def decode_image(path, label, image_size):
    image_bytes = tf.io.read_file(path)
    image = tf.io.decode_image(image_bytes, channels=3, expand_animations=False)
    image.set_shape([None, None, 3])
    image = tf.image.resize(
        image, [image_size, image_size], method=tf.image.ResizeMethod.BILINEAR
    )
    image = tf.cast(image, tf.float32)
    return image, label


def build_augmenter():
    return tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal_and_vertical"),
            tf.keras.layers.RandomRotation(0.08),
            tf.keras.layers.RandomZoom(0.12),
            tf.keras.layers.RandomContrast(0.1),
        ],
        name="augmenter",
    )


def build_dataset(paths, labels, image_size, batch_size, training, seed):
    dataset = tf.data.Dataset.from_tensor_slices((paths, labels))

    if training:
        dataset = dataset.shuffle(
            buffer_size=min(len(paths), 4096),
            seed=seed,
            reshuffle_each_iteration=True,
        )

    dataset = dataset.map(
        lambda path, label: decode_image(path, label, image_size),
        num_parallel_calls=AUTOTUNE,
    )
    dataset = dataset.batch(batch_size)

    if training:
        augmenter = build_augmenter()
        dataset = dataset.map(
            lambda images, labels: (augmenter(images, training=True), labels),
            num_parallel_calls=AUTOTUNE,
        )

    return dataset.prefetch(AUTOTUNE)


def build_model(num_classes, image_size, dropout):
    inputs = tf.keras.Input(shape=(image_size, image_size, 3), name="image")
    base_model = tf.keras.applications.EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=(image_size, image_size, 3),
    )
    base_model.trainable = False

    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D(name="avg_pool")(x)
    x = tf.keras.layers.Dropout(dropout, name="dropout")(x)
    outputs = tf.keras.layers.Dense(
        num_classes,
        activation="softmax",
        dtype="float32",
        name="predictions",
    )(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="paddy_disease_model")
    return model, base_model


def build_optimizer(learning_rate):
    try:
        return tf.keras.optimizers.AdamW(
            learning_rate=learning_rate,
            weight_decay=1e-4,
        )
    except AttributeError:
        return tf.keras.optimizers.Adam(learning_rate=learning_rate)


def compile_model(model, learning_rate):
    model.compile(
        optimizer=build_optimizer(learning_rate),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(),
        metrics=[
            tf.keras.metrics.SparseCategoricalAccuracy(name="accuracy"),
            tf.keras.metrics.SparseTopKCategoricalAccuracy(
                k=3, name="top3_accuracy"
            ),
        ],
    )


def configure_fine_tuning(base_model, fine_tune_layers):
    base_model.trainable = True
    fine_tune_layers = max(1, min(fine_tune_layers, len(base_model.layers)))
    freeze_until = len(base_model.layers) - fine_tune_layers

    for index, layer in enumerate(base_model.layers):
        should_train = index >= freeze_until
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False
        else:
            layer.trainable = should_train


def build_callbacks(output_dir, append_log):
    best_model_path = output_dir / "best_model.keras"
    return [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(best_model_path),
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            mode="max",
            patience=3,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.25,
            patience=2,
            min_lr=1e-6,
            verbose=1,
        ),
        tf.keras.callbacks.CSVLogger(
            filename=str(output_dir / "training_log.csv"),
            append=append_log,
        ),
    ]


def evaluate_model(model, dataset):
    metrics = model.evaluate(dataset, verbose=1, return_dict=True)
    return {key: float(value) for key, value in metrics.items()}


def save_json(path, payload):
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)


def build_display_names(class_names):
    return [DISPLAY_NAME_MAP.get(name, name.replace("_", " ").title()) for name in class_names]


def save_reports(output_dir, model, test_dataset, test_labels, class_names):
    probabilities = model.predict(test_dataset, verbose=1)
    predictions = np.argmax(probabilities, axis=1)

    report = classification_report(
        test_labels,
        predictions,
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )
    matrix = confusion_matrix(test_labels, predictions).tolist()

    save_json(output_dir / "classification_report.json", report)
    save_json(
        output_dir / "confusion_matrix.json",
        {"labels": class_names, "matrix": matrix},
    )


def main():
    args = parse_args()
    set_seed(args.seed)
    enable_mixed_precision_if_available()

    data_dir = Path(args.data_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    train_dir = data_dir / "train_images"
    test_dir = data_dir / "test_images"

    if not train_dir.exists():
        raise FileNotFoundError(
            f"Dataset not found. Expected directory is missing: {train_dir}"
        )

    class_names = discover_class_names(train_dir)
    display_names = build_display_names(class_names)

    all_train_paths, all_train_labels = collect_split_samples(train_dir, class_names)
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        all_train_paths,
        all_train_labels,
        test_size=args.val_split,
        stratify=all_train_labels,
        random_state=args.seed,
    )

    if test_dir.exists():
        test_paths, test_labels = collect_split_samples(test_dir, class_names)
    else:
        print("No test_images directory found. Validation split will also be used as test.")
        test_paths, test_labels = val_paths, val_labels

    print(f"Classes ({len(class_names)}): {class_names}")
    print(f"Train samples: {len(train_paths)}")
    print(f"Validation samples: {len(val_paths)}")
    print(f"Test samples: {len(test_paths)}")
    print_distribution("Train", train_labels, class_names)
    print_distribution("Validation", val_labels, class_names)
    print_distribution("Test", test_labels, class_names)

    train_dataset = build_dataset(
        train_paths,
        train_labels,
        args.image_size,
        args.batch_size,
        training=True,
        seed=args.seed,
    )
    val_dataset = build_dataset(
        val_paths,
        val_labels,
        args.image_size,
        args.batch_size,
        training=False,
        seed=args.seed,
    )
    test_dataset = build_dataset(
        test_paths,
        test_labels,
        args.image_size,
        args.batch_size,
        training=False,
        seed=args.seed,
    )

    model, base_model = build_model(
        num_classes=len(class_names),
        image_size=args.image_size,
        dropout=args.dropout,
    )

    training_started_at = time.time()
    compile_model(model, args.learning_rate)

    histories = {}
    if args.epochs_head > 0:
        print("\nStage 1/2 - train classification head")
        history = model.fit(
            train_dataset,
            validation_data=val_dataset,
            epochs=args.epochs_head,
            callbacks=build_callbacks(output_dir, append_log=False),
            verbose=1,
        )
        histories["head"] = history.history

    if args.epochs_finetune > 0:
        print("\nStage 2/2 - fine tune top backbone layers")
        configure_fine_tuning(base_model, args.fine_tune_layers)
        compile_model(model, args.fine_tune_learning_rate)
        history = model.fit(
            train_dataset,
            validation_data=val_dataset,
            epochs=args.epochs_head + args.epochs_finetune,
            initial_epoch=args.epochs_head,
            callbacks=build_callbacks(output_dir, append_log=True),
            verbose=1,
        )
        histories["finetune"] = history.history

    best_model_path = output_dir / "best_model.keras"
    if best_model_path.exists():
        model = tf.keras.models.load_model(best_model_path)

    val_metrics = evaluate_model(model, val_dataset)
    test_metrics = evaluate_model(model, test_dataset)
    save_reports(output_dir, model, test_dataset, test_labels, class_names)

    final_h5_path = output_dir / "rice_disease_model.h5"
    final_keras_path = output_dir / "rice_disease_model.keras"
    model.save(str(final_h5_path), include_optimizer=False)
    model.save(str(final_keras_path), include_optimizer=False)

    save_json(output_dir / "class_names.json", class_names)
    save_json(
        output_dir / "model_metadata.json",
        {
            "backbone": "EfficientNetB0",
            "image_size": [args.image_size, args.image_size],
            "input_range": "0_255",
            "confidence_threshold": DEFAULT_CONFIDENCE_THRESHOLD,
            "confidence_gap_threshold": DEFAULT_CONFIDENCE_GAP_THRESHOLD,
            "num_classes": len(class_names),
            "class_names": class_names,
            "display_names": display_names,
            "train_samples": len(train_paths),
            "val_samples": len(val_paths),
            "test_samples": len(test_paths),
            "epochs_head": args.epochs_head,
            "epochs_finetune": args.epochs_finetune,
            "fine_tune_layers": args.fine_tune_layers,
            "batch_size": args.batch_size,
            "seed": args.seed,
            "val_metrics": val_metrics,
            "test_metrics": test_metrics,
            "training_minutes": round((time.time() - training_started_at) / 60, 2),
        },
    )
    save_json(output_dir / "history.json", histories)

    print("\nTraining finished.")
    print(f"Best model (.keras): {best_model_path}")
    print(f"Portable model (.h5): {final_h5_path}")
    print(f"Class names: {output_dir / 'class_names.json'}")
    print(f"Metadata: {output_dir / 'model_metadata.json'}")
    print(f"Validation metrics: {val_metrics}")
    print(f"Test metrics: {test_metrics}")


if __name__ == "__main__":
    main()
