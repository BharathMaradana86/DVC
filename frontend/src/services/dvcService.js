import { buildUrl } from './apiClient';

export const initializeDVC = async (projectId) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/init`);
    const resp = await fetch(url, { method: 'POST' });
    if (!resp.ok) throw new Error('Failed to initialize DVC');
    return resp.json();
};

export const addToDVC = async (projectId, filePath, dvcPath = null) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/add`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath, dvc_path: dvcPath }),
    });
    if (!resp.ok) throw new Error('Failed to add to DVC');
    return resp.json();
};

export const pushToRemote = async (projectId, filePath = null) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/push`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath }),
    });
    if (!resp.ok) throw new Error('Failed to push to remote');
    return resp.json();
};

export const pullFromRemote = async (projectId, filePath = null) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/pull`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath }),
    });
    if (!resp.ok) throw new Error('Failed to pull from remote');
    return resp.json();
};

export const getDVCStatus = async (projectId, filePath = null) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/status${filePath ? `?file_path=${filePath}` : ''}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to get DVC status');
    return resp.json();
};

export const listTrackedFiles = async (projectId) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/files`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to list tracked files');
    return resp.json();
};

export const createPipeline = async (projectId, pipelineConfig) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/pipeline`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipelineConfig),
    });
    if (!resp.ok) throw new Error('Failed to create pipeline');
    return resp.json();
};

export const runPipeline = async (projectId, pipelineName = null) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/run`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_name: pipelineName }),
    });
    if (!resp.ok) throw new Error('Failed to run pipeline');
    return resp.json();
};

export const getMetrics = async (projectId) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/metrics`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to get metrics');
    return resp.json();
};

export const setMetrics = async (projectId, metricsFile, metricsData) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/metrics`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics_file: metricsFile, metrics_data: metricsData }),
    });
    if (!resp.ok) throw new Error('Failed to set metrics');
    return resp.json();
};

export const commitChanges = async (projectId, message) => {
    const url = buildUrl(`/api/dvc/project/${projectId}/commit`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    if (!resp.ok) throw new Error('Failed to commit changes');
    return resp.json();
};
