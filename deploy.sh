#!/bin/bash
set -e

echo "Pulling latest code changes..."
git pull origin main

echo "Building app image..."
docker compose build app

echo "Deploying app..."
docker compose up -d --remove-orphans app

echo "Reloading Caddy..."
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

echo "Deployment complete."