import { buildUrl, xhrUpload } from './apiClient';

export const uploadModel = async ({
    projectId,
    name,
    version,
    description,
    framework,
    file,
    onProgress,
    onAbortRef,
}) => {
    const url = buildUrl('/api/models/upload');
    const form = new FormData();
    form.append('project_id', projectId);
    form.append('name', name);
    form.append('version', version);
    if (description) form.append('description', description);
    form.append('framework', framework);
    form.append('file', file);

    return xhrUpload({ url, formData: form, onProgress, onAbortRef });
};

export const listModels = async (skip = 0, limit = 100) => {
    const url = buildUrl(`/api/models?skip=${skip}&limit=${limit}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to list models');
    return resp.json();
};

export const getModelsByProject = async (projectId, skip = 0, limit = 100) => {
    const url = buildUrl(`/api/models/project/${projectId}?skip=${skip}&limit=${limit}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to list models');
    return resp.json();
};

export const getModel = async (modelId) => {
    const url = buildUrl(`/api/models/${modelId}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch model');
    return resp.json();
};

export const updateModel = async (modelId, updates) => {
    const url = buildUrl(`/api/models/${modelId}`);
    const resp = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!resp.ok) throw new Error('Failed to update model');
    return resp.json();
};

export const deleteModel = async (modelId) => {
    const url = buildUrl(`/api/models/${modelId}`);
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete model');
    return resp.json();
};

export const addModelToDVC = async (modelId, modelPath) => {
    const url = buildUrl(`/api/models/${modelId}/dvc/add`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: modelPath }),
    });
    if (!resp.ok) throw new Error('Failed to add model to DVC');
    return resp.json();
};

export const updateModelMetrics = async (modelId, metrics) => {
    const url = buildUrl(`/api/models/${modelId}/metrics`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
    });
    if (!resp.ok) throw new Error('Failed to update model metrics');
    return resp.json();
};
