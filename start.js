const { spawn } = require('child_process');
const path = require('path');

console.log("🚀 Iniciando Multi-Asistente RAG...");

// Iniciar Backend
console.log("Iniciando Backend (FastAPI)...");
const backendProcess = spawn(
  path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
  ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000', '--host', '0.0.0.0'],
  { cwd: path.join(__dirname, 'backend'), shell: true }
);

backendProcess.stdout.on('data', (data) => process.stdout.write(`[BACKEND] ${data}`));
backendProcess.stderr.on('data', (data) => process.stderr.write(`[BACKEND] ${data}`));

// Iniciar Frontend
console.log("Iniciando Frontend (Next.js)...");
const frontendProcess = spawn(
  'npm.cmd',
  ['run', 'dev'],
  { cwd: path.join(__dirname, 'frontend'), shell: true }
);

frontendProcess.stdout.on('data', (data) => process.stdout.write(`[FRONTEND] ${data}`));
frontendProcess.stderr.on('data', (data) => process.stderr.write(`[FRONTEND] ${data}`));

console.log("=========================================");
console.log("🌐 Frontend disponible en: http://localhost:3000");
console.log("⚙️  Backend disponible en:  http://localhost:8000");
console.log("=========================================\n");

process.on('SIGINT', () => {
  console.log("\nApagando servidores...");
  backendProcess.kill();
  frontendProcess.kill();
  process.exit();
});
