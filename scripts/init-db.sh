#!/bin/bash
# Script to initialize PostgreSQL database with pgvector extension
# This runs automatically on Render after database creation

set -e

echo "Initializing database..."

# Install pgvector extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "pgvector extension installed successfully"

# Run database migrations
npm run db:push

echo "Database initialized successfully"
