FROM python:3.10.13-slim

WORKDIR /app

# Ép Python in log ra màn hình
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 7860

# Thêm cờ --access-logfile - và --error-logfile - để Gunicorn in log
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]