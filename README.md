# XÂY DỰNG HỆ THỐNG QUẢN LÝ CÁNH ĐỒNG VÀ HỖ TRỢ DỰ ĐOÁN MỘT SỐ BỆNH TRÊN LÚA

## Thông tin chung

**Trường**: Trường Kỹ thuật & Công nghệ - Đại học Trà Vinh  
**Khoa**: Công nghệ thông tin  
**Loại**: Đồ án tốt nghiệp ngành Công nghệ thông tin khoá 2022 - 2026  
**Giảng viên hướng dẫn**: ThS. Phạm Minh Đương

**Sinh viên thực hiện**: Nguyễn Duy Tín - 110122182 - DA22TTA  
**Email**: `duytinnguyen84@gmail.com`  
**SĐT**: `0794325729`

---

## Mục tiêu và Kiến trúc

### Mục tiêu

- Xây dựng một hệ thống quản lý cánh đồng toàn diện, hỗ trợ quản lý thửa ruộng, mùa vụ, nhật ký canh tác và nhật ký bệnh.

- Ứng dụng trí tuệ nhân tạo (sử dụng mô hình EfficientNet-B1 kết hợp Transfer Learning) để dự đoán bệnh trên lúa thông qua hình ảnh.

- Tích hợp trợ lý ảo dựa trên API của mô hình ngôn ngữ lớn (LLM) nhằm tư vấn kỹ thuật canh tác và hướng xử lý bệnh kịp thời.

- Cung cấp giao diện người dùng trực quan, ổn định và dễ sử dụng cho cả nông dân và cán bộ quản lý hệ thống.

### Kiến trúc hệ thống

- Hệ thống được phát triển dựa trên kiến trúc Client-Server và giao tiếp qua chuẩn RESTful API.

- **Nền tảng chính:** Triển khai trên nền tảng MERN Stack (MongoDB, ExpressJS, ReactJS, NodeJS).

- **Kiến trúc dịch vụ:** Áp dụng kiến trúc Microservices để tách biệt module xử lý AI thành một dịch vụ hoạt động độc lập.

- **Thành phần công nghệ cụ thể:**
- **Front-end (Giao diện):** Xây dựng theo kiến trúc Single Page Application (SPA) bằng ReactJS, Vite và Tailwind CSS.

- **Back-end (Máy chủ):** Xử lý logic và API bằng NodeJS và framework ExpressJS.

- **Database & Storage:** Lưu trữ dữ liệu với MongoDB và hình ảnh qua Cloudinary.

- **AI Service (Dịch vụ trí tuệ nhân tạo):** Phát triển độc lập bằng Python, Flask và TensorFlow để chạy mô hình EfficientNet-B1.

- **LLM:** Kết nối với OpenAI API để vận hành chức năng tư vấn.

---

## Công nghệ sử dụng

- **Frontend**:
  `ReactJS`, `Vite`, `Tailwind CSS`

- **Backend & Database**:
  `NodeJS`, `ExpressJS`, `MongoDB`, `Cloudinary`

- **AI Service & API**:
  `Python`, `Flask`, `TensorFlow / Keras`, `Mô hình EfficientNet-B1`, `OpenAI API (LLM)`

---

## Hướng dẫn cài đặt

### Yêu cầu môi trường

- **NodeJS**: `22.x`
- **Python**: `3.10.x`
- **MongoDB**: `8.x`

> _Lưu ý: Yêu cầu kết nối Internet để sử dụng các dịch vụ bên ngoài (OpenAI, Cloudinary, Resend, Open-Meteo)._

### Sao chép mã nguồn dự án

```bash
git clone https://github.com/DuyTinNguyen182/tn-da22tta-110122182-nguyenduytin-quanlycanhdong-ai.git
cd tn-da22tta-110122182-nguyenduytin-quanlycanhdong-ai
```

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
PYTHON_AI_SERVICE_URL=http://127.0.0.1:5000/predict
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
VITE_OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast

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
