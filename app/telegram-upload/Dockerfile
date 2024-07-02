FROM alpine/git as base
WORKDIR /app
RUN git clone https://github.com/Nekmo/telegram-upload.git .

FROM python:3.9.7-slim-bullseye

LABEL version="0.7.1"
LABEL repository="https://github.com/Nekmo/telegram-upload"

ENV TELEGRAM_UPLOAD_CONFIG_DIRECTORY=/config
ENV PYTHONPATH=/app/
VOLUME /config
VOLUME /files

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN mkdir /app
COPY --from=base /app/requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt
COPY --from=base /app/telegram_upload/ /app/telegram_upload/
WORKDIR /files

ENTRYPOINT ["/usr/local/bin/python", "/app/telegram_upload/management.py"]
