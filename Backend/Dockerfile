FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl

COPY app/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

ENV FLASK_APP wsgi.py

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
