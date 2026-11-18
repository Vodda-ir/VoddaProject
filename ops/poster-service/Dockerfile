FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libraqm0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir pillow arabic-reshaper python-bidi

WORKDIR /app
COPY app.py /app/app.py
COPY fonts /app/fonts

EXPOSE 3430
CMD ["python", "/app/app.py"]
