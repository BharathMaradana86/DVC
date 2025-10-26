import { buildUrl, xhrUpload } from './apiClient';

// Upload dataset files with progress
export const uploadDataset = async ({
    projectId,
    name,
    version,
    description,
    file,
    onProgress,
    onAbortRef,
}) => {
    const url = buildUrl('/api/datasets/upload');
    const form = new FormData();
    form.append('project_id', projectId);
    form.append('name', name);
    form.append('version', version);
    if (description) form.append('description', description);
    form.append('file', file);

    return xhrUpload({ url, formData: form, onProgress, onAbortRef });
};

export const listDatasets = async (skip = 0, limit = 100) => {
    const url = buildUrl(`/api/datasets?skip=${skip}&limit=${limit}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to list datasets');
    return resp.json();
};

export const getDatasetsByProject = async (projectId, skip = 0, limit = 100) => {
    const url = buildUrl(`/api/datasets/project/${projectId}?skip=${skip}&limit=${limit}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to list datasets');
    return resp.json();
};

export const getDataset = async (datasetId) => {
    const url = buildUrl(`/api/datasets/${datasetId}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch dataset');
    return resp.json();
};

export const updateDataset = async (datasetId, updates) => {
    const url = buildUrl(`/api/datasets/${datasetId}`);
    const resp = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!resp.ok) throw new Error('Failed to update dataset');
    return resp.json();
};

export const deleteDataset = async (datasetId) => {
    const url = buildUrl(`/api/datasets/${datasetId}`);
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete dataset');
    return resp.json();
};

export const addDatasetToDVC = async (datasetId, filePath) => {
    const url = buildUrl(`/api/datasets/${datasetId}/dvc/add`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath }),
    });
    if (!resp.ok) throw new Error('Failed to add dataset to DVC');
    return resp.json();
};
