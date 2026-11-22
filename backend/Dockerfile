# 1. Use official lightweight Python 3.12 Linux image
FROM python:3.12-slim

# 2. Prevent Python from buffering outputs and writing .pyc files
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Copy and install dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the application code
COPY . .

# 6. Expose FastAPI port
EXPOSE 8000

# 7. Start Uvicorn with auto-reload enabled
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]