FROM alpine/git AS source
WORKDIR /app
RUN git clone https://github.com/aahnik/tgcf.git . && git checkout f0d5859

FROM python:3.10-slim-bullseye AS builder
WORKDIR /app
COPY --from=source /app .
RUN pip install --no-cache-dir poetry && \
    python -m venv /venv && \
    poetry build && \
    /venv/bin/pip install --no-cache-dir dist/*.whl

FROM python:3.10-slim-bullseye
WORKDIR /app
ENV VENV_PATH="/venv"
ENV PATH="$VENV_PATH/bin:$PATH"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        tesseract-ocr && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /venv /venv

CMD ["tgcf-web"]

EXPOSE 8501
