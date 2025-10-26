import { buildUrl } from './apiClient';

export const createTrainingRun = async (trainingData) => {
    const url = buildUrl('/api/training');
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingData),
    });
    if (!resp.ok) throw new Error('Failed to create training run');
    return resp.json();
};

export const listTrainingRuns = async (skip = 0, limit = 100) => {
    const url = buildUrl(`/api/training?skip=${skip}&limit=${limit}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to list training runs');
    return resp.json();
};

export const getTrainingRunsByProject = async (projectId, skip = 0, limit = 100) => {
    const url = buildUrl(`/api/training/project/${projectId}?skip=${skip}&limit=${limit}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to list training runs');
    return resp.json();
};

export const getTrainingRun = async (trainingId) => {
    const url = buildUrl(`/api/training/${trainingId}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch training run');
    return resp.json();
};

export const getTrainingRunByJobId = async (jobId) => {
    const url = buildUrl(`/api/training/job/${jobId}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch training run');
    return resp.json();
};

export const updateTrainingRun = async (trainingId, updates) => {
    const url = buildUrl(`/api/training/${trainingId}`);
    const resp = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!resp.ok) throw new Error('Failed to update training run');
    return resp.json();
};

export const deleteTrainingRun = async (trainingId) => {
    const url = buildUrl(`/api/training/${trainingId}`);
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete training run');
    return resp.json();
};

export const startTraining = async (trainingId) => {
    const url = buildUrl(`/api/training/${trainingId}/start`);
    const resp = await fetch(url, { method: 'POST' });
    if (!resp.ok) throw new Error('Failed to start training');
    return resp.json();
};

export const completeTraining = async (trainingId, success = true, errorMessage = null) => {
    const url = buildUrl(`/api/training/${trainingId}/complete`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success, error_message: errorMessage }),
    });
    if (!resp.ok) throw new Error('Failed to complete training');
    return resp.json();
};

export const getTrainingStatus = async (trainingId) => {
    const url = buildUrl(`/api/training/${trainingId}/status`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to get training status');
    return resp.json();
};

export const createBatchTraining = async (projectId, trainingConfigs) => {
    const url = buildUrl('/api/training/batch');
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, training_configs: trainingConfigs }),
    });
    if (!resp.ok) throw new Error('Failed to create batch training');
    return resp.json();
};
