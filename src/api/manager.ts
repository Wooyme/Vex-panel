export interface ApiSuccess<T> {
  status: 'ok';
  data: T;
}

export interface ModelInfo {
  filename: string;
  path: string;
  tag: string[];
}

export interface TerrainInfo {
  filename: string;
  path: string;
  tag: string[];
}

export function defaultMotionTopicForModel(model: ModelInfo): string {
  if (/^\/?assets\/models\/g1\//.test(model.path)) {
    return 'robot/g1/mujoco/state';
  }
  const slug = model.path
    .replace(/^\/?assets\/models\//, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '_');
  return `robot/${slug}/motion`;
}

function get<T>(path: string): Promise<T> {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  });
}

export function listModels(): Promise<ApiSuccess<ModelInfo[]>> {
  return get('/api/models');
}

export function listTerrains(): Promise<ApiSuccess<TerrainInfo[]>> {
  return get('/api/terrains');
}
