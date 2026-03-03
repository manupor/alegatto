import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function initializeAndStart() {
  console.log('🚀 Inicializando aplicación en producción...');

  try {
    // Ejecutar migraciones de base de datos
    console.log('🗄️  Ejecutando migraciones de base de datos...');
    await execAsync('npm run db:push');
    console.log('✅ Migraciones completadas');
  } catch (err) {
    console.error('⚠️  Error durante migraciones:', err.message);
    console.log('⚠️  Continuando con el inicio del servidor...');
  }

  // Iniciar servidor
  console.log('🌐 Iniciando servidor...');
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
