FROM python:3.12.13-alpine3.23 AS build

ENV PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY ./requirements.txt ./requirements.txt
RUN pip install --target=/app/dependencies -r requirements.txt

FROM build AS release

ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY --from=build /app /app
COPY ./main.py ./main.py

ENV PYTHONPATH=/app/dependencies \
    DEBUG=False \
    API_ID= \
    API_HASH=

CMD ["python", "main.py"]
VOLUME /app/session
