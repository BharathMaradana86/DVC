import { buildUrl } from './apiClient';

export const listProjects = async () => {
    const resp = await fetch(buildUrl('/api/projects'));
    if (!resp.ok) throw new Error('Failed to fetch projects');
    return resp.json();
};

export const createProject = async (projectData) => {
    console.log(projectData);
    const resp = await fetch(buildUrl('/api/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
    });
    if (!resp.ok) throw new Error('Failed to create project');
    return resp.json();
};

export const getProject = async (projectId) => {
    const resp = await fetch(buildUrl(`/api/projects/${projectId}`));
    if (!resp.ok) throw new Error('Failed to fetch project');
    return resp.json();
};

export const updateProject = async (projectId, updates) => {
    const resp = await fetch(buildUrl(`/api/projects/${projectId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!resp.ok) throw new Error('Failed to update project');
    return resp.json();
};

export const deleteProject = async (projectId) => {
    const resp = await fetch(buildUrl(`/api/projects/${projectId}`), {
        method: 'DELETE',
    });
    if (!resp.ok) throw new Error('Failed to delete project');
    return resp.json();
};
