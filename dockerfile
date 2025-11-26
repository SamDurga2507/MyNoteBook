FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create templates directory
RUN mkdir -p templates

EXPOSE 9000

CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "9000"]