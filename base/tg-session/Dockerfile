FROM python:3.10.0-alpine3.15 AS build

ENV PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN pip install --target=/app/dependencies telethon qrcode python-dotenv

FROM build AS release

ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY --from=build /app /app
COPY ./main.py ./main.py

ENV PYTHONPATH=/app/dependencies
ENV DEBUG=False
ENV API_ID=
ENV API_HASH=

CMD ["python", "main.py"]
VOLUME /app/session
