# Huấn luyện mô hình bệnh lúa (Google Colab)

Repo này đã có sẵn script huấn luyện để dùng với Colab tại `ai_service/train_paddy_disease.py`.

## Vì sao chọn cấu hình này

- Backbone: `EfficientNetB0`
- Kích thước ảnh mặc định: `224`
- Chiến lược huấn luyện: 2 giai đoạn
- Mục tiêu: độ chính xác tốt mà không làm Colab train quá chậm

Đây là cấu hình cân bằng cho bộ dữ liệu Paddy Doctor với khoảng 19k ảnh train và 10 lớp.

## Quy trình Colab đề xuất

1. Tải dataset trực tiếp từ Kaggle vào `/content`.
2. Đưa script huấn luyện vào môi trường Colab.
3. Chạy script với cấu hình cân bằng mặc định.
4. Chép các file sau về lại thư mục [`ai_service`](./):

- `rice_disease_model.h5`
- `class_names.json`
- `model_metadata.json`

## Tải Kaggle trực tiếp trên Colab

Cài đặt thư viện phụ thuộc:

```python
!pip install -q tensorflow scikit-learn
!pip install -q kaggle
```

Xác thực Kaggle API.

Upload file `kaggle.json` từ tài khoản Kaggle của bạn:

```python
from google.colab import files
files.upload()
```

```bash
!mkdir -p ~/.kaggle
!cp kaggle.json ~/.kaggle/kaggle.json
!chmod 600 ~/.kaggle/kaggle.json
```

Tải và giải nén dataset trực tiếp từ Kaggle:

```bash
!kaggle datasets download -d dasa7753912/new-paddy-doctor-paddy-disease-classification -p /content/datasets --unzip
!ls /content/datasets
!ls /content/datasets/paddy-disease-classification
```

Lúc này dataset sẽ nằm ở đường dẫn:

```text
/content/datasets/paddy-disease-classification
```

## Cách đưa script huấn luyện vào Colab

Dùng cách upload trực tiếp file script, làm theo các bước sau:

1. Upload file `train_paddy_disease.py` vào Colab (khung Files bên trái).
2. Đảm bảo file nằm ở đường dẫn `/content/train_paddy_disease.py`.
3. Chạy lệnh huấn luyện bên dưới:

```bash
!python /content/train_paddy_disease.py \
  --data-dir /content/datasets/paddy-disease-classification \
  --output-dir /content/rice-model-artifacts
```

## Ví dụ preset cân bằng

```bash
!python /content/train_paddy_disease.py \
  --data-dir /content/datasets/paddy-disease-classification \
  --output-dir /content/rice-model-artifacts \
  --image-size 224 \
  --batch-size 32 \
  --epochs-head 5 \
  --epochs-finetune 6 \
  --fine-tune-layers 40
```

## Các preset đề xuất

Preset cân bằng:

- `--image-size 224`
- `--batch-size 32`
- `--epochs-head 5`
- `--epochs-finetune 6`
- `--fine-tune-layers 40`

Preset nhanh hơn:

- `--image-size 192`
- `--batch-size 48`
- `--epochs-head 4`
- `--epochs-finetune 4`
- `--fine-tune-layers 24`

Preset ưu tiên độ chính xác cao:

- `--image-size 260`
- `--batch-size 24`
- `--epochs-head 6`
- `--epochs-finetune 8`
- `--fine-tune-layers 60`

## Đầu ra kỳ vọng

Script sẽ ghi các file sau vào `--output-dir`:

- `best_model.keras`
- `rice_disease_model.h5`
- `rice_disease_model.keras`
- `class_names.json`
- `model_metadata.json`
- `classification_report.json`
- `confusion_matrix.json`
- `history.json`
- `training_log.csv`

## Tích hợp vào dự án này

Chép các file đã train vào thư mục [`ai_service`](./), ghi đè model cũ nếu cần.

Dịch vụ Flask hiện tại đọc các file:

- `rice_disease_model.h5`
- `class_names.json`
- `model_metadata.json`

Dịch vụ vẫn có cơ chế fallback an toàn nếu thiếu `class_names.json`, nhưng với model 10 lớp bạn nên giữ đủ cả 3 file này.

## Ước tính thời gian

Thời gian train ước tính trên Colab T4 GPU:

- Preset nhanh hơn: khoảng 15 đến 25 phút
- Preset cân bằng: khoảng 25 đến 40 phút
- Preset ưu tiên độ chính xác cao: khoảng 40 đến 65 phút

Thời gian thực tế phụ thuộc vào loại GPU, tốc độ I/O, và việc dataset được lưu trực tiếp trong `/content` hay đọc qua Drive.
