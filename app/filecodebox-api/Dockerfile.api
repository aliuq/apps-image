FROM python:3.9.5-slim-buster AS builder

WORKDIR /app

RUN apt update -y && \
    apt install -y git && \
    git clone https://github.com/vastsa/FileCodeBox.git .

RUN pip install --no-cache-dir virtualenv
RUN virtualenv venv && . venv/bin/activate && pip install --no-cache-dir -r requirements.txt

FROM python:3.9.5-slim-buster

LABEL version="0.0.1"
LABEL repository="https://github.com/vastsa/FileCodeBox"

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 12345

CMD ["/app/venv/bin/python", "main.py"]

VOLUME /app/data
