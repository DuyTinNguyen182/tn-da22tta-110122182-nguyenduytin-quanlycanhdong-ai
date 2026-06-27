````markdown
# XÂY DỰNG HỆ THỐNG QUẢN LÝ CÁNH ĐỒNG VÀ HỖ TRỢ DỰ ĐOÁN MỘT SỐ BỆNH TRÊN LÚA

## Thông tin chung

**Trường**: Trường Kỹ thuật & Công nghệ - Đại học Trà Vinh  
**Khoa**: Công nghệ thông tin
**Loại**: Đồ án tốt nghiệp ngành Công nghệ thông tin khoá 2022 - 2026

**Giảng viên hướng dẫn**: ThS. Phạm Minh Đương  
**Sinh viên thực hiện**: Nguyễn Duy Tín - 110122182 - DA22TTA

---

## Công nghệ sử dụng

- **Frontend**:
  `ReactJS`, `Vite`, `Tailwind CSS`

- **Backend & Database**:
  `NodeJS`, `ExpressJS`, `MongoDB`, `Cloudinary`

- **AI Service & API**:
  `Python`, `Flask`, `TensorFlow / Keras (Mô hình EfficientNet-B1)`, `OpenAI API (LLM)`

---

## Hướng dẫn cài đặt

### Yêu cầu môi trường

- **NodeJS**: `22.x`
- **Python**: `3.10.x`
- **MongoDB**: `8.x`

> _Lưu ý: Yêu cầu kết nối Internet để sử dụng các dịch vụ bên ngoài (OpenAI, Cloudinary, Resend, Open-Meteo)._

### Sao chép mã nguồn dự án

```bash
git clone [https://github.com/DuyTinNguyen182/tn-da22tta-110122182-nguyenduytin-quanlycanhdong-ai.git](https://github.com/DuyTinNguyen182/tn-da22tta-110122182-nguyenduytin-quanlycanhdong-ai.git)
cd tn-da22tta-110122182-nguyenduytin-quanlycanhdong-ai
```
````

### Cấu hình biến môi trường

#### 1. Tệp cấu hình Backend

Tạo tệp `.env` trong thư mục `src/back-end` với nội dung:

```env
PORT=4000
FRONTEND_URL=http://localhost:5173
MONGO_URI=<MongoDB Connection String>
JWT_SECRET=<JWT Secret Key>
OPENAI_API_KEY=<OpenAI API Key>
OPENAI_MODEL=gpt-4o-mini
PYTHON_AI_SERVICE_URL=[http://127.0.0.1:5000/predict](http://127.0.0.1:5000/predict)
AI_SERVICE_TIMEOUT_MS=60000
CLOUDINARY_CLOUD_NAME=<Cloudinary Cloud Name>
CLOUDINARY_API_KEY=<Cloudinary API Key>
CLOUDINARY_API_SECRET=<Cloudinary API Secret>
SMTP_CONNECTION_TIMEOUT=10000
RESEND_API_KEY=<Resend API Key>
RESEND_FROM_NAME=<Sender Name>
RESEND_FROM_EMAIL=<Sender Email>
RESEND_TIMEOUT=10000

```

#### 2. Tệp cấu hình Frontend

Tạo tệp `.env` trong thư mục `src/front-end` với nội dung:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_OPEN_METEO_URL=[https://api.open-meteo.com/v1/forecast](https://api.open-meteo.com/v1/forecast)

```

### Khởi chạy Backend (Máy chủ)

Di chuyển đến thư mục backend, cài đặt các thư viện và khởi chạy máy chủ:

```bash
cd src/back-end
npm install
node server.js

```

### Khởi chạy Frontend (Giao diện người dùng)

Mở một terminal mới, di chuyển đến thư mục frontend, cài đặt các thư viện và khởi chạy:

```bash
cd src/front-end
npm install
npm run dev

```

### Khởi chạy AI Service (Dịch vụ trí tuệ nhân tạo)

Mở một terminal mới, di chuyển đến thư mục AI Service, kích hoạt môi trường ảo và khởi chạy dịch vụ:

```bash
cd src/ai_service
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py

```

> **Lưu ý:** Sau khi hoàn tất khởi chạy các dịch vụ, hệ thống sẽ hoạt động tại địa chỉ: `http://localhost:5173`

---

## Giấy phép

© 2026 Bản quyền thuộc về Nguyễn Duy Tín - Đại học Trà Vinh

```

```
