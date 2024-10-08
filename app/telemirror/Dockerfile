FROM alpine/git as base
WORKDIR /app
RUN git clone https://github.com/khoben/telemirror.git .

FROM python:3.11-slim-bullseye as build

ENV PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY --from=base /app/requirements.txt /app/requirements.txt
RUN pip install --target=/app/dependencies -r requirements.txt

FROM build as release

LABEL version="0.0.2"
LABEL repository="https://github.com/khoben/telemirror"

RUN useradd -m apprunner
USER apprunner

ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY --from=base --chown=apprunner: /app /app

ENV PYTHONPATH="${PYTHONPATH}:/app/dependencies"

ARG PORT=8000
EXPOSE ${PORT}

CMD ["python", "main.py"]
