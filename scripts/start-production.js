import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function initializeAndStart() {
  console.log('🚀 Inicializando aplicación en producción...');

  try {
    // Intentar instalar pgvector
    console.log('📦 Instalando extensión pgvector...');
    try {
      await execAsync(`psql ${process.env.DATABASE_URL} -c "CREATE EXTENSION IF NOT EXISTS vector;"`);
      console.log('✅ pgvector instalado');
    } catch (err) {
      console.log('⚠️  pgvector ya instalado o no disponible:', err.message);
    }

    // Ejecutar migraciones
    console.log('🗄️  Ejecutando migraciones de base de datos...');
    await execAsync('npm run db:push');
    console.log('✅ Migraciones completadas');

  } catch (err) {
    console.error('❌ Error durante inicialización:', err.message);
    console.log('⚠️  Continuando con el inicio del servidor...');
  }

  // Iniciar servidor
  console.log('🌐 Iniciando servidor...');
  const { spawn } = await import('child_process');
  const server = spawn('node', ['dist/index.cjs'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  server.on('error', (err) => {
    console.error('❌ Error al iniciar servidor:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    process.exit(code);
  });
}

initializeAndStart();
