# Despliegue en Render - LexAI CR

Esta guía te ayudará a desplegar tu aplicación LexAI CR en Render.

## Prerrequisitos

1. Cuenta en [Render](https://render.com)
2. Repositorio Git (GitHub, GitLab, o Bitbucket)
3. Todas las claves API necesarias

## Pasos para Desplegar

### 1. Preparar el Repositorio

Asegúrate de que todos los cambios estén en tu repositorio Git:

```bash
git add .
git commit -m "Preparar para despliegue en Render"
git push origin main
```

### 2. Crear Servicios en Render

#### Opción A: Usando render.yaml (Recomendado)

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"Blueprint"**
3. Conecta tu repositorio
4. Render detectará automáticamente el archivo `render.yaml`
5. Click en **"Apply"**

#### Opción B: Configuración Manual

**Crear Base de Datos:**
1. Click en **"New +"** → **"PostgreSQL"**
2. Nombre: `lexai-cr-db`
3. Database: `lexai_cr`
4. Plan: Starter (o el que prefieras)
5. PostgreSQL Version: 16
6. Click **"Create Database"**

**Instalar pgvector:**
Después de crear la base de datos:
1. Ve a la pestaña **"Shell"** de tu base de datos
2. Ejecuta: `CREATE EXTENSION IF NOT EXISTS vector;`

**Crear Web Service:**
1. Click en **"New +"** → **"Web Service"**
2. Conecta tu repositorio
3. Configuración:
   - **Name:** `lexai-cr`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Starter

### 3. Configurar Variables de Entorno

En la sección **"Environment"** de tu Web Service, agrega:

```bash
# Database (Auto-generada si usas Blueprint)
DATABASE_URL=<conexión desde tu PostgreSQL de Render>

# Requeridas
NODE_ENV=production
SESSION_SECRET=<tu-session-secret-aqui>
OPENAI_API_KEY=<tu-openai-api-key-aqui>

# AI Integrations (opcional - si usas endpoint personalizado)
AI_INTEGRATIONS_OPENAI_BASE_URL=<tu-endpoint-personalizado>
AI_INTEGRATIONS_OPENAI_API_KEY=<tu-api-key-personalizada>

# Email
RESEND_API_KEY=<tu-resend-api-key-aqui>

# Google OAuth
GOOGLE_CLIENT_ID=<tu-google-client-id-aqui>
GOOGLE_CLIENT_SECRET=<tu-google-client-secret-aqui>

# Stripe
STRIPE_SECRET_KEY=<tu-stripe-secret-key-aqui>

# Tilopay (opcional - para pagos en Costa Rica)
TILOPAY_API_KEY=<tu-tilopay-api-key-aqui>
TILOPAY_API_USER=<tu-tilopay-user-aqui>
TILOPAY_API_PASSWORD=<tu-tilopay-password-aqui>

# App URL (actualiza con tu URL de Render)
APP_URL=https://tu-app.onrender.com

# Port (Render lo asigna automáticamente)
PORT=10000
```

### 4. Inicializar Base de Datos

Después del primer despliegue:

1. Ve a la pestaña **"Shell"** de tu Web Service
2. Ejecuta: `npm run db:push`

O usa el script incluido:
```bash
./scripts/init-db.sh
```

### 5. Configurar Google OAuth (Importante)

Actualiza las URLs autorizadas en Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. APIs & Services → Credentials
4. Edita tu OAuth 2.0 Client ID
5. Agrega a **Authorized redirect URIs**:
   ```
   https://lexai-cr.onrender.com/api/auth/google/callback
   ```
6. Agrega a **Authorized JavaScript origins**:
   ```
   https://lexai-cr.onrender.com
   ```

### 6. Configurar Stripe Webhooks

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. URL: `https://lexai-cr.onrender.com/api/stripe/webhook`
4. Selecciona los eventos que necesites
5. Copia el **Signing secret** y actualiza `STRIPE_WEBHOOK_SECRET` en Render

## Verificación Post-Despliegue

1. **Verifica que la app esté corriendo:**
   - Visita tu URL de Render
   - Verifica que cargue correctamente

2. **Verifica la base de datos:**
   - Intenta crear una cuenta
   - Verifica que el login funcione

3. **Verifica las integraciones:**
   - Prueba Google OAuth
   - Verifica que el chat AI funcione
   - Prueba el procesamiento de documentos

## Troubleshooting

### Error: "vector extension not found"
```bash
# En la Shell de tu base de datos PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "Cannot find module"
- Verifica que `npm install` se ejecute en el build command
- Revisa los logs de build en Render

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté configurada correctamente
- Asegúrate de que la base de datos esté en la misma región

### Aplicación lenta en arranque
- Render free tier tiene cold starts
- Considera upgrade a plan pagado para mejor rendimiento

## Monitoreo

- **Logs:** Render Dashboard → Tu servicio → Logs
- **Métricas:** Render Dashboard → Tu servicio → Metrics
- **Shell:** Para debugging directo en el servidor

## Actualizaciones

Render despliega automáticamente cuando haces push a tu rama principal:

```bash
git add .
git commit -m "Nueva funcionalidad"
git push origin main
```

## Costos Estimados

- **Starter Plan (Web Service):** $7/mes
- **Starter Plan (PostgreSQL):** $7/mes
- **Total:** ~$14/mes

**Plan Free disponible** con limitaciones:
- Web service se duerme después de 15 min de inactividad
- PostgreSQL gratis por 90 días

## Soporte

- [Documentación de Render](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Status de Render](https://status.render.com)

## Notas Importantes

⚠️ **AI_INTEGRATIONS_OPENAI_BASE_URL**: Si usas `localhost:1106`, esto NO funcionará en producción. Necesitas:
- Desplegar tu servicio de modelfarm también
- O usar la API de OpenAI directamente (ya configurada con `OPENAI_API_KEY`)

⚠️ **Backups**: Configura backups automáticos en Render para tu base de datos PostgreSQL

⚠️ **Dominios Personalizados**: Puedes agregar tu propio dominio en Render → Settings → Custom Domain
