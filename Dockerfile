# Minimal PHP server for Render
FROM php:8.2-cli

# Install PHP curl extension (proxy.php uses cURL)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev \
    && docker-php-ext-install curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# Render provides $PORT at runtime; default to 10000 for local
ENV PORT=10000
EXPOSE 10000

# Start the built-in PHP server bound to $PORT
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT}"]
