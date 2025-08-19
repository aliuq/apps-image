FROM alpine/git AS base
WORKDIR /app
ARG VERSION=90c52b1
RUN git clone https://github.com/khoben/telemirror . && git checkout ${VERSION}

FROM python:3.11-slim-bullseye AS build

ENV PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY --from=base /app/requirements.txt /app/requirements.txt
RUN pip install --target=/app/dependencies -r requirements.txt

FROM build AS release

RUN useradd -m apprunner
USER apprunner

ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY --from=base --chown=apprunner: /app /app

ENV PYTHONPATH="${PYTHONPATH}:/app/dependencies"

ARG PORT=8000
EXPOSE ${PORT}

CMD ["python", "main.py"]
