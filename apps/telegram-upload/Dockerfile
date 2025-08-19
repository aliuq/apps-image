FROM alpine/git AS source
WORKDIR /app
ARG VERSION=c700f86
RUN git clone https://github.com/Nekmo/telegram-upload . && git checkout ${VERSION}

FROM python:3.9.7-slim-bullseye AS build
WORKDIR /app
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

COPY --from=source /app/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.9.7-slim-bullseye
WORKDIR /app
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
ENV TELEGRAM_UPLOAD_CONFIG_DIRECTORY=/config
ENV PYTHONPATH=/app/

COPY --from=source /app/telegram_upload /app/telegram_upload
COPY --from=build /venv /venv

ENTRYPOINT ["python", "/app/telegram_upload/management.py"]

VOLUME /config
VOLUME /files
