#!/bin/bash
set -e

echo "🚀 Inicializando aplicación en producción..."

# Instalar extensión pgvector si no existe
echo "📦 Instalando extensión pgvector..."
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;" || echo "⚠️  pgvector ya instalado o no disponible"

# Ejecutar migraciones de base de datos
echo "🗄️  Ejecutando migraciones de base de datos..."
npm run db:push

echo "✅ Inicialización completada"

# Iniciar la aplicación
echo "🌐 Iniciando servidor..."
exec npm start
