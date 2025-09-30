FROM alpine/git AS source
WORKDIR /app
ARG VERSION=03609df
RUN git clone https://github.com/Zie619/n8n-workflows . && git checkout ${VERSION}

FROM python:3.9-slim AS base
WORKDIR /app
ENV PATH="/opt/venv/bin:$PATH"

FROM base AS builder
WORKDIR /app
RUN python -m venv /opt/venv
COPY --from=source /app/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM base
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --from=source /app .
ENTRYPOINT ["python", "run.py", "--host", "0.0.0.0", "--port", "8000"]

EXPOSE 8000
