import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SideHeading } from '../../components/SideHeading/SideHeading';
import { Popup } from '../../components/Popup/Popup';

const TrainModelModal = ({ projectName, onClose }) => {
    const [modelArch, setModelArch] = React.useState('YOLOv5');
    const [version, setVersion] = React.useState('v3 (auto)');
    const [datasetA, setDatasetA] = React.useState('training-v3');
    const [datasetB, setDatasetB] = React.useState('');
    const [epochs, setEpochs] = React.useState(100);
    const [batch, setBatch] = React.useState(32);
    const [lr, setLr] = React.useState(0.001);
    const [reason, setReason] = React.useState('');
    const [configFile, setConfigFile] = React.useState(null);
    const [weightsFile, setWeightsFile] = React.useState(null);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [trainSplit, setTrainSplit] = React.useState(70);
    const [valSplit, setValSplit] = React.useState(20);
    const [testSplit, setTestSplit] = React.useState(10);
    const abortRef = React.useRef(null);

    return (
        <div className='w-[720px]'>
            <p className='font-bold mb-4'>Train New Model - {projectName}</p>
            <div className='space-y-4'>
                <div className='flex items-center gap-4'>
                    <label className='w-56'>Model Architecture</label>
                    <select className='border rounded p-2 w-60' value={modelArch} onChange={(e) => setModelArch(e.target.value)}>
                        <option>YOLOv5</option>
                        <option>SSD</option>
                        <option>Faster R-CNN</option>
                        <option>Custom</option>
                    </select>
                </div>
                <div className='flex items-center gap-4'>
                    <label className='w-56'>Version</label>
                    <select className='border rounded p-2 w-60' value={version} onChange={(e) => setVersion(e.target.value)}>
                        <option>v3 (auto)</option>
                        <option>v2</option>
                        <option>v1</option>
                    </select>
                    <p className='text-sm text-gray-500'>Previous: v1, v2 → New: v3</p>
                </div>
                <div className='flex items-center gap-4'>
                    <label className='w-56'>Training Dataset A</label>
                    <select className='border rounded p-2 w-60' value={datasetA} onChange={(e) => setDatasetA(e.target.value)}>
                        <option>training-v3</option>
                        <option>training-v2</option>
                        <option>training-v1</option>
                    </select>
                </div>
                <div className='flex items-center gap-4'>
                    <label className='w-56'>Training Dataset B (optional)</label>
                    <select className='border rounded p-2 w-60' value={datasetB} onChange={(e) => setDatasetB(e.target.value)}>
                        <option value=''>None</option>
                        <option>training-v3</option>
                        <option>training-v2</option>
                        <option>training-v1</option>
                    </select>
                    <p className='text-sm text-gray-500'>Select to merge A+B</p>
                </div>
                <div className='grid grid-cols-3 gap-4 items-center'>
                    <div className='flex items-center gap-2'>
                        <label>Epochs</label>
                        <input className='border rounded p-2 w-24' type='number' value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} />
                    </div>
                    <div className='flex items-center gap-2'>
                        <label>Batch</label>
                        <input className='border rounded p-2 w-24' type='number' value={batch} onChange={(e) => setBatch(Number(e.target.value))} />
                    </div>
                    <div className='flex items-center gap-2'>
                        <label>LR</label>
                        <input className='border rounded p-2 w-24' type='number' step='0.0001' value={lr} onChange={(e) => setLr(Number(e.target.value))} />
                    </div>
                </div>
            <div className='mt-2'>
                <p className='font-semibold mb-2'>Train/Validation/Test Split</p>
                <div className='flex items-center gap-4'>
                    <div className='flex items-center gap-2'>
                        <label>Train %</label>
                        <input className='border rounded p-1 w-20' type='number' value={trainSplit} min={0} max={100} onChange={(e) => setTrainSplit(Number(e.target.value))} />
                    </div>
                    <div className='flex items-center gap-2'>
                        <label>Val %</label>
                        <input className='border rounded p-1 w-20' type='number' value={valSplit} min={0} max={100} onChange={(e) => setValSplit(Number(e.target.value))} />
                    </div>
                    <div className='flex items-center gap-2'>
                        <label>Test %</label>
                        <input className='border rounded p-1 w-20' type='number' value={testSplit} min={0} max={100} onChange={(e) => setTestSplit(Number(e.target.value))} />
                    </div>
                    <span className={`text-sm ${trainSplit + valSplit + testSplit === 100 ? 'text-green-700' : 'text-red-700'}`}>Total: {trainSplit + valSplit + testSplit}%</span>
                </div>
                <div className='w-full bg-gray-200 h-3 rounded mt-2 flex'>
                    <div className='bg-blue-600 h-3 rounded-l' style={{ width: `${trainSplit}%` }}></div>
                    <div className='bg-yellow-500 h-3' style={{ width: `${valSplit}%` }}></div>
                    <div className='bg-green-600 h-3 rounded-r' style={{ width: `${testSplit}%` }}></div>
                </div>
            </div>
                <div className='flex items-start gap-4'>
                    <label className='w-56 mt-2'>Training Reason</label>
                    <textarea className='border rounded p-2 w-full' rows='3' placeholder='Test YOLOv5 with v3 dataset to improve night detection' value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className='flex items-center gap-4'>
                    <label className='w-56'>Config (optional)</label>
                    <input type='file' accept='.yaml,.yml,.json' onChange={(e) => setConfigFile(e.target.files?.[0] || null)} />
                </div>
                <div className='flex items-center gap-4'>
                    <label className='w-56'>Weights (optional)</label>
                    <input type='file' accept='.pt,.pth,.onnx,.bin' onChange={(e) => setWeightsFile(e.target.files?.[0] || null)} />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div>
                        <div className='w-full bg-gray-200 h-2 rounded'>
                            <div className='bg-blue-600 h-2 rounded' style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className='text-xs text-gray-600 mt-1'>{uploadProgress}%</p>
                    </div>
                )}
            </div>
            <div className='flex justify-between mt-6'>
                <button className='bg-gray-500 text-white px-4 py-2 rounded' onClick={onClose}>Cancel</button>
                <div className='space-x-2'>
                    <button className='bg-yellow-600 text-white px-4 py-2 rounded' onClick={() => abortRef.current && abortRef.current()}>Cancel Upload</button>
                    <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={async () => {
                        try {
                            setUploadProgress(0);
                            if (trainSplit + valSplit + testSplit !== 100) {
                                alert('Split percentages must sum to 100');
                                return;
                            }
                            const datasets = datasetB ? [datasetA, datasetB] : [datasetA];
                            await startTraining({ projectName, modelArch, version, datasets, epochs, batch, lr, reason, configFile, weightsFile, trainSplit, valSplit, testSplit, onProgress: ({ percent }) => setUploadProgress(percent), onAbortRef: abortRef });
                            onClose();
                        } catch (e) {
                            alert(e.message || 'Failed to start training');
                        }
                    }}>🚀 Start Training</button>
                </div>
            </div>
        </div>
    );
};

export const Models = () => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [models, setModels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTrainOpen, setIsTrainOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            fetchModels(selectedProject);
        }
    }, [selectedProject]);

    const fetchProjects = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/projects');
            const data = await response.json();
            setProjects(data.projects || []);
            if (data.projects && data.projects.length > 0) {
                setSelectedProject(data.projects[0].name);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const fetchModels = async (projectName) => {
        setIsLoading(true);
        try {
            // Fetch projects if not already loaded
            let currentProjects = projects;
            if (projects.length === 0) {
                const projectsResponse = await fetch('http://localhost:8000/api/projects');
                const projectsData = await projectsResponse.json();
                currentProjects = projectsData.projects || [];
            }
            
            const project = currentProjects.find(p => p.name === projectName);
            if (!project) {
                setModels([]);
                setIsLoading(false);
                return;
            }

            const response = await fetch(`http://localhost:8000/api/models?project_id=${project.id}`);
            const data = await response.json();
            setModels(data.models || []);
        } catch (error) {
            console.error('Error fetching models:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProjectClick = (projectName) => {
        navigate(`/projects/${projectName}`);
    };

    return (
        <div className='w-full h-full'>
            <SideHeading title='Models'/>
            <div className='w-full flex flex-row gap-4 ml-[32px] mt-[32px] items-center'>
                <p className='text-sm text-gray-600'>Project:</p>
                <select 
                    className='w-[260px] h-10 border border-gray-300 rounded-md p-2' 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                >
                    {projects.map((project) => (
                        <option key={project.id} value={project.name}>{project.name}</option>
                    ))}
                </select>
                <button className='ml-auto mr-[32px] bg-blue-600 text-white px-4 py-2 rounded' onClick={() => setIsTrainOpen(true)}>⚡ Train New Model</button>
            </div>

            {isLoading ? (
                <div className='ml-[32px] mt-6 flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                </div>
            ) : models.length === 0 ? (
                <div className='ml-[32px] mt-6 border rounded p-12 bg-gray-50 text-center max-w-[640px]'>
                    <p className='text-gray-500 mb-4'>No models found for {selectedProject}</p>
                    <button 
                        onClick={() => navigate(`/projects/${selectedProject}`)}
                        className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors'
                    >
                        Go to Project Details
                    </button>
                </div>
            ) : (
                <div className='ml-[32px] mt-6 space-y-3'>
                    {models.map((model) => {
                        // Parse metrics
                        let metricsData = {};
                        try {
                            if (typeof model.metrics === 'string') {
                                metricsData = JSON.parse(model.metrics);
                            } else if (model.metrics) {
                                metricsData = model.metrics;
                            }
                        } catch (e) {
                            console.error('Error parsing metrics:', e);
                        }

                        const accuracy = metricsData.accuracy || 0;
                        const loss = metricsData.loss || 0;
                        const epochs = metricsData.epochs_completed || metricsData.final_epochs || 0;

                        return (
                            <div 
                                key={model.id} 
                                className='border rounded p-4 bg-white hover:shadow-md transition-shadow cursor-pointer'
                                onClick={() => handleProjectClick(selectedProject)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <p className='font-semibold text-lg'>{model.name}</p>
                                            <span className='px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded'>
                                                {model.version || 'v1.0'}
                                            </span>
                                            <span className='px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded'>
                                                {model.framework || 'pytorch'}
                                            </span>
                                        </div>
                                        {model.description && (
                                            <p className='text-sm text-gray-600 mt-1'>{model.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                            <span className='text-gray-600'>
                                                Accuracy: <span className='font-semibold text-green-600'>{((accuracy) * 100).toFixed(2)}%</span>
                                            </span>
                                            <span className='text-gray-600'>
                                                Loss: <span className='font-semibold text-red-600'>{loss.toFixed(4)}</span>
                                            </span>
                                            <span className='text-gray-600'>
                                                Epochs: <span className='font-semibold text-blue-600'>{epochs}</span>
                                            </span>
                                        </div>
                                        <p className='text-xs text-gray-500 mt-2'>
                                            Created: {model.created_at ? new Date(model.created_at).toLocaleDateString() : 'Unknown'} • 
                                            Dataset ID: {model.dataset_id || 'N/A'}
                                        </p>
                                    </div>
                                    <button className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-sm'>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Popup isOpen={isTrainOpen} title={`Train New Model - ${selectedProject}`}>
                {isTrainOpen && (
                    <TrainModelModal projectName={selectedProject} onClose={() => setIsTrainOpen(false)} />
                )}
            </Popup>
        </div>
    );
}


