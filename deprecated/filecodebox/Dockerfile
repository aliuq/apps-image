FROM alpine/git AS source
WORKDIR /app
RUN git clone https://github.com/vastsa/FileCodeBox.git .

FROM python:3.9.5-slim-buster AS builder
WORKDIR /app

COPY --from=source /app/requirements.txt ./requirements.txt
RUN python -m venv /venv && \
    /venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.9.5-slim-buster
WORKDIR /app

ENV PATH="/venv/bin:$PATH"
ENV TZ=Asia/Shanghai

COPY --from=source /app .
COPY --from=builder /venv /venv

CMD ["python", "main.py"]

VOLUME /app/data
EXPOSE 12345
