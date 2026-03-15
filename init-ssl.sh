#!/bin/bash
cd ~/api-main

# Configuration
DOMAIN="api.a1carehospital.in"
EMAIL="admin@a1carehospital.in"

# 1. Create dummy certificates to allow Nginx to start
mkdir -p ./certbot/conf/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:4096 -days 1\
    -keyout "./certbot/conf/live/$DOMAIN/privkey.pem" \
    -out "./certbot/conf/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=localhost"

# 2. Get the official recommended SSL configuration
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > ./certbot/conf/options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > ./certbot/conf/ssl-dhparams.pem

# 3. Start Nginx
cd ~/api-main && docker compose up -d nginx

# 4. Delete dummy certificates
rm -rf ./certbot/conf/live/$DOMAIN

# 5. Request real certificates
cd ~/api-main && docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL --agree-tos --no-eff-email \
    -d $DOMAIN

# 6. Reload Nginx
cd ~/api-main && docker compose exec nginx nginx -s reload

echo "SSL Bootstrapping complete for $DOMAIN"
