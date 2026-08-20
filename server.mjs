import 'dotenv/config';
import express from 'express';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.resolve(
  projectDirectory,
  process.env.ROBOT_ASSETS_DIR || 'assets',
);
const modelsDirectory = path.join(assetsDirectory, 'models');
const terrainDirectory = path.join(assetsDirectory, 'terrain');
const frontendDirectory = path.resolve(
  projectDirectory,
  process.env.FRONTEND_DIST_DIR || 'dist',
);
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 5000);

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function modelInfo(urdfPath) {
  const relativeToAssets = path.relative(assetsDirectory, urdfPath);
  const relativeToModels = path.relative(modelsDirectory, urdfPath);
  return {
    filename: path.basename(urdfPath),
    path: path.posix.join('assets', ...relativeToAssets.split(path.sep)),
    tag: [relativeToModels.split(path.sep)[0]],
  };
}

function terrainInfo(objPath) {
  const relativeToAssets = path.relative(assetsDirectory, objPath);
  const relativeToTerrain = path.relative(terrainDirectory, objPath);
  const relativeParent = path.dirname(relativeToTerrain);
  return {
    filename: path.basename(objPath),
    path: path.posix.join('assets', ...relativeToAssets.split(path.sep)),
    tag: relativeParent === '.' ? [] : relativeParent.split(path.sep),
  };
}

const app = express();

app.get('/api/models', (_request, response) => {
  const models = listFiles(modelsDirectory)
    .filter((filename) => filename.toLowerCase().endsWith('.urdf'))
    .sort((left, right) => left.localeCompare(right))
    .map(modelInfo);
  response.json({ status: 'ok', data: models });
});

app.get('/api/terrains', (_request, response) => {
  const terrains = listFiles(terrainDirectory)
    .filter((filename) => filename.toLowerCase().endsWith('.obj'))
    .sort((left, right) => left.localeCompare(right))
    .map(terrainInfo);
  response.json({ status: 'ok', data: terrains });
});

app.use('/assets', express.static(assetsDirectory));

if (existsSync(path.join(frontendDirectory, 'index.html'))) {
  app.use(express.static(frontendDirectory));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(frontendDirectory, 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`Robot control panel: http://${host}:${port}`);
  console.log(`Scene assets: ${assetsDirectory}`);
  if (!existsSync(path.join(frontendDirectory, 'index.html'))) {
    console.log('Frontend dist not found; serving API and URDF assets only.');
  }
});
