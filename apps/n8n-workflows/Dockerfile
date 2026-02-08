FROM alpine/git AS source
WORKDIR /app
ARG VERSION=9fc2f9f
RUN git clone https://github.com/Zie619/n8n-workflows . && git checkout ${VERSION}

FROM python:3.11-slim-bookworm AS base
WORKDIR /app
ENV PATH="/opt/venv/bin:$PATH"

FROM base AS builder
WORKDIR /app
RUN python -m venv /opt/venv
COPY --from=source /app/requirements.txt .
RUN apt-get update && \
    apt-get install -y gcc python3-dev ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM base
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --from=source /app .
ENTRYPOINT ["python", "run.py", "--host", "0.0.0.0", "--port", "8000"]

EXPOSE 8000
