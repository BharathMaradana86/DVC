import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SideHeading } from '../../components/SideHeading/SideHeading';

export const ProjectDetails = () => {
    const { projectName } = useParams();
    const navigate = useNavigate();
    const [projectInfo, setProjectInfo] = useState(null);
    const [datasets, setDatasets] = useState([]);
    const [models, setModels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('datasets'); // 'datasets' or 'models'
    const [showTrainingModal, setShowTrainingModal] = useState(false);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [hyperparameters, setHyperparameters] = useState({
        model_architecture: 'YOLOv5',
        epochs: 10,
        batch_size: 32,
        learning_rate: 0.001,
        num_classes: 10,
        train_split: 70,
        validation_split: 20,
        test_split: 10,
        optimizer: 'Adam',
        loss_function: 'CrossEntropy'
    });
    const [trainingStatus, setTrainingStatus] = useState(null);
    const [isComparing, setIsComparing] = useState(false);
    const [selectedModels, setSelectedModels] = useState([]);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [showModelDetailsModal, setShowModelDetailsModal] = useState(false);
    const [selectedModelForDetails, setSelectedModelForDetails] = useState(null);
    const [modelDatasetDetails, setModelDatasetDetails] = useState(null);
    const [loadingDatasetDetails, setLoadingDatasetDetails] = useState(false);
    const [activeTrainings, setActiveTrainings] = useState([]);

    useEffect(() => {
        fetchProjectDetails();
    }, [projectName]);

    const fetchProjectDetails = async () => {
        setIsLoading(true);
        try {
            // Fetch project info
            const projectResponse = await fetch(`http://localhost:8000/api/projects`);
            const projectData = await projectResponse.json();
            const project = projectData.projects.find(p => p.name === projectName);
            
            if (project) {
                setProjectInfo(project);
            }

            // Fetch datasets
            const datasetsResponse = await fetch(`http://localhost:8000/api/datasets/project/${encodeURIComponent(projectName)}`);
            const datasetsData = await datasetsResponse.json();
            const formattedDatasets = (datasetsData.datasets || []).map((ds, idx) => ({
                ...ds,
                id: idx + 1, // Use index as ID for now
                databaseId: ds.id
            }));
            setDatasets(formattedDatasets);

            // Fetch models
            if (project) {
                console.log('Fetching models for project:', project.id);
                const modelsResponse = await fetch(`http://localhost:8000/api/models?project_id=${project.id}`);
                const modelsData = await modelsResponse.json();
                console.log('Raw models response:', modelsData);
                console.log('Models array:', modelsData.models);
                console.log('Models count:', modelsData.models?.length || 0);
                setModels(modelsData.models || []);
            }

        } catch (error) {
            console.error('Error fetching project details:', error);
            alert('Failed to load project details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDataset = (dataset) => {
        navigate(`/datasets/${encodeURIComponent(dataset.name)}/project/${encodeURIComponent(projectName)}`);
    };

    const handleUploadDataset = () => {
        // Store selected project and navigate to upload page
        sessionStorage.setItem('selectedProjectForUpload', projectName);
        navigate('/upload-dataset-stages');
    };

    const handleStartTraining = () => {
        setShowTrainingModal(true);
    };

    const handleSelectDataset = (dataset) => {
        setSelectedDataset(dataset);
    };

    const handleStartTrainingJob = async () => {
        if (!selectedDataset || !projectInfo) return;
        
        try {
            const response = await fetch('http://localhost:8000/api/training/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectInfo.id,
                    dataset_id: selectedDataset.databaseId,
                    hyperparameters: hyperparameters,
                    model_name: `model_${selectedDataset.name}_${Date.now()}`
                })
            });
            
            const result = await response.json();
            setTrainingStatus(result);
            
            // Add to active trainings
            const newTraining = {
                id: result.training_id,
                datasetName: selectedDataset.name,
                startTime: new Date().toISOString(),
                status: 'running',
                progress: 0,
                modelName: result.model_name || `model_${selectedDataset.name}`
            };
            setActiveTrainings([...activeTrainings, newTraining]);
            
            // Close modal
            setShowTrainingModal(false);
            
            // Start polling for training status
            const pollTrainingStatus = async () => {
                try {
                    const statusResponse = await fetch(`http://localhost:8000/api/training/${result.training_id}/status`);
                    const status = await statusResponse.json();
                    
                    // Update the training in activeTrainings
                    setActiveTrainings(prev => 
                        prev.map(t => 
                            t.id === result.training_id 
                                ? { ...t, status: status.status, progress: status.progress || 0 }
                                : t
                        )
                    );
                    
                    if (status.status === 'completed' || status.status === 'failed') {
                        // Remove from active trainings after a delay
                        setTimeout(() => {
                            setActiveTrainings(prev => prev.filter(t => t.id !== result.training_id));
                            fetchProjectDetails();
                        }, 3000);
                        
                        alert(status.status === 'completed' ? 'Training completed!' : 'Training failed!');
                    } else {
                        // Continue polling
                        setTimeout(pollTrainingStatus, 2000);
                    }
                } catch (error) {
                    console.error('Error polling status:', error);
                }
            };
            
            setTimeout(pollTrainingStatus, 2000);
        } catch (error) {
            console.error('Training error:', error);
            alert('Failed to start training');
        }
    };

    const handleToggleCompare = () => {
        setIsComparing(!isComparing);
        if (isComparing) {
            setSelectedModels([]);
        }
    };

    const handleSelectModel = (model) => {
        if (!isComparing) return;
        
        if (selectedModels.find(m => m.id === model.id)) {
            setSelectedModels(selectedModels.filter(m => m.id !== model.id));
        } else {
            if (selectedModels.length < 2) {
                setSelectedModels([...selectedModels, model]);
            } else {
                alert('You can only compare 2 models at a time');
            }
        }
    };

    const handleCompareSelected = () => {
        if (selectedModels.length === 2) {
            setShowComparisonModal(true);
        } else {
            alert('Please select exactly 2 models to compare');
        }
    };

    const handleViewModelDetails = async (model) => {
        setSelectedModelForDetails(model);
        setShowModelDetailsModal(true);
        setLoadingDatasetDetails(true);
        
        // Fetch dataset details
        try {
            if (model.dataset_id) {
                // Find the dataset name from datasets list
                const dataset = datasets.find(d => d.databaseId === model.dataset_id);
                if (dataset) {
                    const response = await fetch(`http://localhost:8000/api/datasets/${dataset.name}/details?project=${projectName}`);
                    const data = await response.json();
                    setModelDatasetDetails(data);
                }
            }
        } catch (error) {
            console.error('Error fetching dataset details:', error);
        } finally {
            setLoadingDatasetDetails(false);
        }
    };

    if (isLoading) {
        return (
            <div className="mr-[50px]">
                <SideHeading title="Loading Project..." />
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (!projectInfo) {
        return (
            <div className="mr-[50px]">
                <SideHeading title="Project Not Found" />
                <div className="text-center py-12">
                    <p className="text-gray-500">Project not found</p>
                    <button 
                        onClick={() => navigate('/projects')}
                        className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mr-[50px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <SideHeading title={projectName} />
                    <p className="text-gray-600 ml-8 mt-2">{projectInfo.description}</p>
                </div>
                <button
                    onClick={() => navigate('/projects')}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    ← Back to Projects
                </button>
            </div>

            {/* Project Info Card */}
            <div className="ml-[32px] mb-8 bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Project Information</h3>
                <div className="grid grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Name</p>
                        <p className="font-semibold">{projectInfo.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <p className="font-semibold capitalize">{projectInfo.status}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Created</p>
                        <p className="font-semibold">{new Date(projectInfo.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Path</p>
                        <p className="font-mono text-xs text-gray-700 truncate" title={projectInfo.path}>{projectInfo.path}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="ml-[32px] mb-6">
                <div className="flex gap-2 border-b">
                    <button
                        onClick={() => setActiveTab('datasets')}
                        className={`px-6 py-3 font-semibold ${
                            activeTab === 'datasets' 
                                ? 'border-b-2 border-blue-500 text-blue-500' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Datasets ({datasets.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('models')}
                        className={`px-6 py-3 font-semibold ${
                            activeTab === 'models' 
                                ? 'border-b-2 border-blue-500 text-blue-500' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Models ({models.length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="ml-[32px]">
                {activeTab === 'datasets' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Project Datasets</h3>
                            <button
                                onClick={handleUploadDataset}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                📁 Upload New Dataset
                            </button>
                        </div>

                        {datasets.length > 0 ? (
                            <div className="space-y-3">
                                {datasets.map((dataset, index) => (
                                    <div 
                                        key={index} 
                                        className="border rounded p-4 bg-white hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-lg">{dataset.name}</p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Version {dataset.version} • {dataset.fileCount || 0} files • Created {dataset.lastUpdated}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">{dataset.description}</p>
                                            </div>
                                            <button
                                                onClick={() => handleViewDataset(dataset)}
                                                className="ml-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
                                            >
                                                View Dataset
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border rounded p-12 text-center bg-gray-50">
                                <p className="text-gray-500 mb-4">No datasets found for this project</p>
                                <button
                                    onClick={handleUploadDataset}
                                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Upload Your First Dataset
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'models' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Project Models</h3>
                                <p className="text-xs text-gray-500">Found {models.length} model(s)</p>
                                {isComparing && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        {selectedModels.length}/2 models selected for comparison
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={fetchProjectDetails}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                                >
                                    🔄 Refresh
                                </button>
                                {models.length >= 2 && (
                                    <button
                                        onClick={handleToggleCompare}
                                        className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                                            isComparing 
                                                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                    >
                                        {isComparing ? '❌ Cancel Compare' : '🔍 Compare Models'}
                                    </button>
                                )}
                                <button
                                    onClick={handleStartTraining}
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    🚀 Train New Model
                                </button>
                            </div>
                        </div>

                        {isComparing && selectedModels.length === 2 && (
                            <div className="mb-4 flex justify-center">
                                <button
                                    onClick={handleCompareSelected}
                                    className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                    📊 Compare Selected Models ({selectedModels.length}/2)
                                </button>
                            </div>
                        )}

                        {/* Active Trainings Display */}
                        {activeTrainings.length > 0 && (
                            <div className="mb-6 space-y-3">
                                <h4 className="text-md font-semibold text-gray-700">🚀 Active Training Jobs</h4>
                                {activeTrainings.map((training) => (
                                    <div key={training.id} className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                                                <div>
                                                    <h5 className="font-semibold text-green-800">{training.modelName}</h5>
                                                    <p className="text-xs text-gray-600">Training in progress...</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded text-xs font-semibold ${
                                                training.status === 'running' ? 'bg-green-600 text-white' :
                                                training.status === 'completed' ? 'bg-blue-600 text-white' :
                                                'bg-red-600 text-white'
                                            }`}>
                                                {training.status === 'running' ? 'Running' :
                                                training.status === 'completed' ? 'Completed' : 'Failed'}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>Dataset: {training.datasetName}</span>
                                                <span>Progress: {training.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                                                    style={{ width: `${training.progress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-500">Started: {new Date(training.startTime).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {models.length > 0 ? (
                            <div className="space-y-3">
                                {models.map((model, index) => {
                                    // Parse metrics if it's a string, otherwise use as-is
                                    let metricsData = {};
                                    try {
                                        if (typeof model.metrics === 'string') {
                                            metricsData = JSON.parse(model.metrics);
                                        } else if (model.metrics) {
                                            metricsData = model.metrics;
                                        }
                                    } catch (e) {
                                        console.error('Error parsing metrics:', e);
                                        metricsData = {};
                                    }
                                    
                                    const accuracy = metricsData.accuracy || 0;
                                    const loss = metricsData.loss || 0;
                                    const epochs = metricsData.epochs_completed || metricsData.final_epochs || 0;
                                    
                                    console.log(`Model ${index} - Name: ${model.name}, Metrics:`, metricsData);
                                    
                                    const isSelected = selectedModels.find(m => m.id === model.id);
                                    
                                    return (
                                        <div 
                                            key={index} 
                                            className={`border rounded p-4 hover:shadow-md transition-shadow ${
                                                isComparing ? 'cursor-pointer' : 'bg-white'
                                            } ${
                                                isSelected ? 'bg-blue-50 border-blue-500 border-2' : 'bg-white border-gray-300'
                                            }`}
                                            onClick={() => isComparing && handleSelectModel(model)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        {isComparing && (
                                                            <span className={`text-xl ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                                                {isSelected ? '✓' : '○'}
                                                            </span>
                                                        )}
                                                        <p className="font-semibold text-lg">{model.name}</p>
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                            {model.version || 'v1.0'}
                                                        </span>
                                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                                            {model.framework || 'pytorch'}
                                                        </span>
                                                    </div>
                                                    {model.description && (
                                                        <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                                        <span className="text-gray-600">
                                                            Accuracy: <span className="font-semibold text-green-600">{((accuracy) * 100).toFixed(2)}%</span>
                                                        </span>
                                                        <span className="text-gray-600">
                                                            Loss: <span className="font-semibold text-red-600">{loss.toFixed(4)}</span>
                                                        </span>
                                                        <span className="text-gray-600">
                                                            Epochs: <span className="font-semibold text-blue-600">{epochs}</span>
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Created: {model.created_at ? new Date(model.created_at).toLocaleDateString() : 'Unknown'} • 
                                                        Dataset ID: {model.dataset_id || 'N/A'}
                                                    </p>
                                                </div>
                                                {!isComparing && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewModelDetails(model);
                                                        }}
                                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                                    >
                                                        📊 View Details
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="border rounded p-12 text-center bg-gray-50">
                                <p className="text-gray-500 mb-2">No models found for this project</p>
                                <p className="text-sm text-gray-400 mb-4">Train a model using your datasets</p>
                                {datasets.length === 0 && (
                                    <p className="text-xs text-red-500">⚠️ No datasets available. Upload a dataset first!</p>
                                )}
                                <button
                                    onClick={handleStartTraining}
                                    className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    Start Training
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Training Modal */}
            {showTrainingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-semibold mb-4">Configure Training</h3>
                        
                        {/* Model Architecture Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Model Architecture</label>
                            <select
                                value={hyperparameters.model_architecture}
                                onChange={(e) => setHyperparameters({...hyperparameters, model_architecture: e.target.value})}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="YOLOv5">YOLOv5</option>
                                <option value="SSD">SSD (Single Shot Detector)</option>
                                <option value="FasterRCNN">Faster R-CNN</option>
                                <option value="ResNet">ResNet</option>
                                <option value="Custom">Custom Model</option>
                            </select>
                        </div>

                        {/* Dataset Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Dataset</label>
                            <div className="border rounded-lg max-h-40 overflow-y-auto">
                                {datasets.map((dataset, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => handleSelectDataset(dataset)}
                                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                                            selectedDataset?.id === dataset.id ? 'bg-blue-50 border-blue-500' : ''
                                        }`}
                                    >
                                        <p className="font-semibold">{dataset.name}</p>
                                        <p className="text-sm text-gray-600">Version {dataset.version} • {dataset.fileCount || 0} files</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hyperparameters */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Epochs</label>
                                <input
                                    type="number"
                                    value={hyperparameters.epochs}
                                    onChange={(e) => setHyperparameters({...hyperparameters, epochs: parseInt(e.target.value)})}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size</label>
                                <input
                                    type="number"
                                    value={hyperparameters.batch_size}
                                    onChange={(e) => setHyperparameters({...hyperparameters, batch_size: parseInt(e.target.value)})}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Learning Rate</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={hyperparameters.learning_rate}
                                    onChange={(e) => setHyperparameters({...hyperparameters, learning_rate: parseFloat(e.target.value)})}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Classes</label>
                                <input
                                    type="number"
                                    value={hyperparameters.num_classes}
                                    onChange={(e) => setHyperparameters({...hyperparameters, num_classes: parseInt(e.target.value)})}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Optimizer</label>
                                <select
                                    value={hyperparameters.optimizer}
                                    onChange={(e) => setHyperparameters({...hyperparameters, optimizer: e.target.value})}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option>Adam</option>
                                    <option>SGD</option>
                                    <option>RMSprop</option>
                                    <option>AdamW</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Function</label>
                                <select
                                    value={hyperparameters.loss_function}
                                    onChange={(e) => setHyperparameters({...hyperparameters, loss_function: e.target.value})}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option>CrossEntropy</option>
                                    <option>MSELoss</option>
                                    <option>BCELoss</option>
                                    <option>NLLLoss</option>
                                </select>
                            </div>
                        </div>

                        {/* Data Split Configuration */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold text-lg mb-3">📊 Data Split Configuration</h4>
                            <p className="text-xs text-gray-600 mb-4">Configure how your dataset will be split for training, validation, and testing.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Training Data
                                        </label>
                                        <span className="text-sm font-semibold text-blue-600">
                                            {hyperparameters.train_split}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="90"
                                        value={hyperparameters.train_split}
                                        onChange={(e) => {
                                            const trainVal = parseInt(e.target.value);
                                            const remaining = 100 - trainVal;
                                            const valSplit = Math.min(hyperparameters.validation_split, remaining);
                                            const testSplit = remaining - valSplit;
                                            setHyperparameters({
                                                ...hyperparameters, 
                                                train_split: trainVal,
                                                validation_split: valSplit,
                                                test_split: testSplit
                                            });
                                        }}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Validation Data
                                        </label>
                                        <span className="text-sm font-semibold text-yellow-600">
                                            {hyperparameters.validation_split}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max={100 - hyperparameters.train_split - hyperparameters.test_split}
                                        value={hyperparameters.validation_split}
                                        onChange={(e) => {
                                            const valVal = parseInt(e.target.value);
                                            const remaining = 100 - hyperparameters.train_split - valVal;
                                            setHyperparameters({
                                                ...hyperparameters, 
                                                validation_split: valVal,
                                                test_split: remaining
                                            });
                                        }}
                                        className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Test Data
                                        </label>
                                        <span className="text-sm font-semibold text-red-600">
                                            {hyperparameters.test_split}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max={100 - hyperparameters.train_split - hyperparameters.validation_split}
                                        value={hyperparameters.test_split}
                                        onChange={(e) => {
                                            const testVal = parseInt(e.target.value);
                                            const remaining = 100 - hyperparameters.train_split - testVal;
                                            setHyperparameters({
                                                ...hyperparameters, 
                                                test_split: testVal,
                                                validation_split: remaining
                                            });
                                        }}
                                        className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Visual Split Representation */}
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs font-semibold text-gray-600 mb-2">Data Distribution:</div>
                                <div className="flex h-8 rounded-lg overflow-hidden">
                                    <div 
                                        className="bg-blue-500 flex items-center justify-center text-white text-xs font-semibold"
                                        style={{ width: `${hyperparameters.train_split}%` }}
                                    >
                                        Train
                                    </div>
                                    <div 
                                        className="bg-yellow-500 flex items-center justify-center text-white text-xs font-semibold"
                                        style={{ width: `${hyperparameters.validation_split}%` }}
                                    >
                                        Val
                                    </div>
                                    <div 
                                        className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold"
                                        style={{ width: `${hyperparameters.test_split}%` }}
                                    >
                                        Test
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-600 text-center">
                                    Total: {hyperparameters.train_split + hyperparameters.validation_split + hyperparameters.test_split}%
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowTrainingModal(false)}
                                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStartTrainingJob}
                                disabled={!selectedDataset}
                                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                Start Training
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Model Comparison Modal */}
            {showComparisonModal && selectedModels.length === 2 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-[900px] max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-semibold">Model Comparison</h3>
                            <button
                                onClick={() => setShowComparisonModal(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>

                        {/* Side-by-Side Comparison */}
                        <div className="grid grid-cols-2 gap-6">
                            {selectedModels.map((model, idx) => {
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
                                const params = typeof model.parameters === 'string' ? JSON.parse(model.parameters) : (model.parameters || {});

                                return (
                                    <div key={model.id} className="border-2 border-gray-300 rounded-lg p-4">
                                        <div className={`text-lg font-bold mb-3 ${idx === 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                            {idx === 0 ? 'Model A' : 'Model B'}
                                        </div>
                                        
                                        {/* Basic Info */}
                                        <div className="space-y-2 mb-4">
                                            <div>
                                                <p className="text-xs text-gray-600">Name</p>
                                                <p className="font-semibold">{model.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Version</p>
                                                <p className="font-semibold">{model.version}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Framework</p>
                                                <p className="font-semibold">{model.framework}</p>
                                            </div>
                                            {model.description && (
                                                <div>
                                                    <p className="text-xs text-gray-600">Description</p>
                                                    <p className="text-sm">{model.description}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Metrics Comparison */}
                                        <div className="border-t pt-4">
                                            <h4 className="font-semibold mb-3">Metrics</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Accuracy</span>
                                                        <span className="font-bold text-lg text-green-600">
                                                            {(accuracy * 100).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                        <div 
                                                            className="bg-green-600 h-2 rounded-full" 
                                                            style={{ width: `${accuracy * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Loss</span>
                                                        <span className="font-bold text-red-600">
                                                            {loss.toFixed(4)}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                        <div 
                                                            className="bg-red-600 h-2 rounded-full" 
                                                            style={{ width: `${Math.min(loss * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Epochs</span>
                                                        <span className="font-bold text-blue-600">{epochs}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Parameters */}
                                        <div className="border-t pt-4 mt-4">
                                            <h4 className="font-semibold mb-3">Parameters</h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                {Object.entries(params).map(([key, value]) => (
                                                    <div key={key}>
                                                        <p className="text-xs text-gray-600">{key}</p>
                                                        <p className="font-semibold">{String(value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Data Split Information */}
                                        {(params.train_split || params.validation_split || params.test_split) && (
                                            <div className="border-t pt-4 mt-4">
                                                <h4 className="font-semibold mb-3">Data Split</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Training:</span>
                                                        <span className="font-semibold text-blue-600">{params.train_split || 70}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Validation:</span>
                                                        <span className="font-semibold text-yellow-600">{params.validation_split || 20}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Test:</span>
                                                        <span className="font-semibold text-red-600">{params.test_split || 10}%</span>
                                                    </div>
                                                    <div className="mt-2 flex h-3 rounded-lg overflow-hidden">
                                                        <div 
                                                            className="bg-blue-500"
                                                            style={{ width: `${params.train_split || 70}%` }}
                                                        ></div>
                                                        <div 
                                                            className="bg-yellow-500"
                                                            style={{ width: `${params.validation_split || 20}%` }}
                                                        ></div>
                                                        <div 
                                                            className="bg-red-500"
                                                            style={{ width: `${params.test_split || 10}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Created At */}
                                        <div className="border-t pt-4 mt-4">
                                            <p className="text-xs text-gray-600">Created</p>
                                            <p className="text-sm">
                                                {model.created_at ? new Date(model.created_at).toLocaleString() : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Winner Comparison */}
                        {selectedModels.length === 2 && (() => {
                            let metricsData1 = {};
                            let metricsData2 = {};
                            try {
                                if (typeof selectedModels[0].metrics === 'string') {
                                    metricsData1 = JSON.parse(selectedModels[0].metrics);
                                } else {
                                    metricsData1 = selectedModels[0].metrics || {};
                                }
                                if (typeof selectedModels[1].metrics === 'string') {
                                    metricsData2 = JSON.parse(selectedModels[1].metrics);
                                } else {
                                    metricsData2 = selectedModels[1].metrics || {};
                                }
                            } catch (e) {}

                            const acc1 = metricsData1.accuracy || 0;
                            const acc2 = metricsData2.accuracy || 0;
                            const winner = acc1 > acc2 ? 'Model A' : acc2 > acc1 ? 'Model B' : 'Tie';
                            const winnerModel = acc1 > acc2 ? metricsData1 : acc2 > acc1 ? metricsData2 : null;

                            return (
                                <div className="mt-6 border-t pt-4">
                                    <h4 className="text-xl font-bold mb-4 text-center">🏆 Comparison Result</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-gray-600">Model A</p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {(acc1 * 100).toFixed(2)}%
                                            </p>
                                            <p className={`text-sm font-semibold mt-2 ${
                                                acc1 > acc2 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {acc1 > acc2 ? '🏆 Winner' : 'Not Winner'}
                                            </p>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <p className="text-sm text-gray-600">Model B</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {(acc2 * 100).toFixed(2)}%
                                            </p>
                                            <p className={`text-sm font-semibold mt-2 ${
                                                acc2 > acc1 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {acc2 > acc1 ? '🏆 Winner' : 'Not Winner'}
                                            </p>
                                        </div>
                                    </div>
                                    {winner !== 'Tie' && (
                                        <div className="text-center mt-4">
                                            <p className="text-lg font-semibold text-purple-600">
                                                {winner} has better accuracy! 🎯
                                            </p>
                                        </div>
                                    )}
                                    {winner === 'Tie' && (
                                        <div className="text-center mt-4">
                                            <p className="text-lg font-semibold text-gray-600">
                                                It's a tie! Both models have the same accuracy.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Model Details Modal */}
            {showModelDetailsModal && selectedModelForDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-[800px] max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-semibold">Model Details</h3>
                            <button
                                onClick={() => setShowModelDetailsModal(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>

                        {/* Parse model data */}
                        {(() => {
                            let metricsData = {};
                            try {
                                if (typeof selectedModelForDetails.metrics === 'string') {
                                    metricsData = JSON.parse(selectedModelForDetails.metrics);
                                } else if (selectedModelForDetails.metrics) {
                                    metricsData = selectedModelForDetails.metrics;
                                }
                            } catch (e) {
                                console.error('Error parsing metrics:', e);
                            }

                            const params = typeof selectedModelForDetails.parameters === 'string' 
                                ? JSON.parse(selectedModelForDetails.parameters) 
                                : (selectedModelForDetails.parameters || {});

                            const accuracy = metricsData.accuracy || 0;
                            const loss = metricsData.loss || 0;
                            const epochs = metricsData.epochs_completed || metricsData.final_epochs || 0;

                            return (
                                <div className="space-y-6">
                                    {/* Basic Information */}
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-lg mb-3">Basic Information</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-600">Model Name</p>
                                                <p className="font-semibold">{selectedModelForDetails.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Version</p>
                                                <p className="font-semibold">{selectedModelForDetails.version}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Framework</p>
                                                <p className="font-semibold">{selectedModelForDetails.framework || 'pytorch'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Dataset ID</p>
                                                <p className="font-semibold">{selectedModelForDetails.dataset_id || 'N/A'}</p>
                                            </div>
                                            {selectedModelForDetails.description && (
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-600">Description</p>
                                                    <p className="font-semibold">{selectedModelForDetails.description}</p>
                                                </div>
                                            )}
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-600">Created At</p>
                                                <p className="font-semibold">
                                                    {selectedModelForDetails.created_at 
                                                        ? new Date(selectedModelForDetails.created_at).toLocaleString() 
                                                        : 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Training Metrics */}
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-lg mb-3">Training Metrics</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-600 mb-2">Accuracy</p>
                                                <p className="text-3xl font-bold text-green-600">
                                                    {(accuracy * 100).toFixed(2)}%
                                                </p>
                                                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                                                    <div 
                                                        className="bg-green-600 h-3 rounded-full" 
                                                        style={{ width: `${accuracy * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-600 mb-2">Loss</p>
                                                <p className="text-3xl font-bold text-red-600">
                                                    {loss.toFixed(4)}
                                                </p>
                                                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                                                    <div 
                                                        className="bg-red-600 h-3 rounded-full" 
                                                        style={{ width: `${Math.min(loss * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-600 mb-2">Epochs</p>
                                                <p className="text-3xl font-bold text-blue-600">{epochs}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hyperparameters */}
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-lg mb-3">Hyperparameters</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            {Object.entries(params).filter(([key]) => 
                                                !['train_split', 'validation_split', 'test_split'].includes(key)
                                            ).map(([key, value]) => (
                                                <div key={key} className="bg-white p-2 rounded">
                                                    <p className="text-xs text-gray-600">{key}</p>
                                                    <p className="font-semibold">{String(value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Data Split Information */}
                                    {(params.train_split || params.validation_split || params.test_split) && (
                                        <div className="bg-yellow-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-lg mb-3">Data Split Configuration</h4>
                                            <div className="space-y-3">
                                                <div className="bg-white p-3 rounded flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Training Data</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-blue-600 h-2 rounded-full" 
                                                                style={{ width: `${params.train_split || 70}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-lg font-bold text-blue-600">{params.train_split || 70}%</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Validation Data</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-yellow-600 h-2 rounded-full" 
                                                                style={{ width: `${params.validation_split || 20}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-lg font-bold text-yellow-600">{params.validation_split || 20}%</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Test Data</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-red-600 h-2 rounded-full" 
                                                                style={{ width: `${params.test_split || 10}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-lg font-bold text-red-600">{params.test_split || 10}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Additional Metrics */}
                                    {metricsData && Object.keys(metricsData).length > 0 && (
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-lg mb-3">Additional Metrics</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(metricsData).map(([key, value]) => (
                                                    <div key={key} className="bg-white p-2 rounded">
                                                        <p className="text-xs text-gray-600">{key}</p>
                                                        <p className="font-semibold">{String(value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dataset Information */}
                                    <div className="bg-indigo-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-lg mb-3">Dataset Information</h4>
                                        {loadingDatasetDetails ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            </div>
                                        ) : modelDatasetDetails ? (
                                            <div className="space-y-4">
                                                <div className="bg-white p-3 rounded">
                                                    <p className="text-sm font-semibold mb-2">Dataset Details</p>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Name:</span>
                                                            <span className="font-semibold ml-2">{modelDatasetDetails.name}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Version:</span>
                                                            <span className="font-semibold ml-2">{modelDatasetDetails.version}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">File Count:</span>
                                                            <span className="font-semibold ml-2">{modelDatasetDetails.file_count || 0}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Base Path:</span>
                                                            <span className="font-semibold ml-2 text-xs">{modelDatasetDetails.base_path}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {modelDatasetDetails.files && modelDatasetDetails.files.length > 0 && (() => {
                                                    const totalFiles = modelDatasetDetails.files.length;
                                                    const trainSplit = params.train_split || 70;
                                                    const valSplit = params.validation_split || 20;
                                                    const testSplit = params.test_split || 10;
                                                    
                                                    const trainCount = Math.floor(totalFiles * trainSplit / 100);
                                                    const valCount = Math.floor(totalFiles * valSplit / 100);
                                                    const testCount = totalFiles - trainCount - valCount;
                                                    
                                                    const trainingFiles = modelDatasetDetails.files.slice(0, trainCount);
                                                    const validationFiles = modelDatasetDetails.files.slice(trainCount, trainCount + valCount);
                                                    const testFiles = modelDatasetDetails.files.slice(trainCount + valCount);
                                                    
                                                    return (
                                                        <div className="space-y-4">
                                                            <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-lg border-2 border-blue-300">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h5 className="font-semibold text-blue-700">Training Data ({trainingFiles.length} files - {trainSplit}%)</h5>
                                                                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Training Set</span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                                                    {trainingFiles.map((file, idx) => {
                                                                        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file);
                                                                        const isText = /\.(txt|csv)$/i.test(file);
                                                                        const isJson = /\.json$/i.test(file);
                                                                        
                                                                        return (
                                                                            <div key={idx} className="bg-white p-2 rounded border border-blue-200">
                                                                                <div className="flex items-center gap-1">
                                                                                    {isImage && <span className="text-xs">🖼️</span>}
                                                                                    {isText && <span className="text-xs">📄</span>}
                                                                                    {isJson && <span className="text-xs">📋</span>}
                                                                                    <span className="text-xs truncate flex-1">{file}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h5 className="font-semibold text-yellow-700">Validation Data ({validationFiles.length} files - {valSplit}%)</h5>
                                                                    <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Validation Set</span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                                                    {validationFiles.map((file, idx) => {
                                                                        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file);
                                                                        const isText = /\.(txt|csv)$/i.test(file);
                                                                        const isJson = /\.json$/i.test(file);
                                                                        
                                                                        return (
                                                                            <div key={idx} className="bg-white p-2 rounded border border-yellow-200">
                                                                                <div className="flex items-center gap-1">
                                                                                    {isImage && <span className="text-xs">🖼️</span>}
                                                                                    {isText && <span className="text-xs">📄</span>}
                                                                                    {isJson && <span className="text-xs">📋</span>}
                                                                                    <span className="text-xs truncate flex-1">{file}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="bg-gradient-to-r from-red-100 to-red-50 p-4 rounded-lg border-2 border-red-300">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h5 className="font-semibold text-red-700">Test Data ({testFiles.length} files - {testSplit}%)</h5>
                                                                    <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">Test Set</span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                                                    {testFiles.map((file, idx) => {
                                                                        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file);
                                                                        const isText = /\.(txt|csv)$/i.test(file);
                                                                        const isJson = /\.json$/i.test(file);
                                                                        
                                                                        return (
                                                                            <div key={idx} className="bg-white p-2 rounded border border-red-200">
                                                                                <div className="flex items-center gap-1">
                                                                                    {isImage && <span className="text-xs">🖼️</span>}
                                                                                    {isText && <span className="text-xs">📄</span>}
                                                                                    {isJson && <span className="text-xs">📋</span>}
                                                                                    <span className="text-xs truncate flex-1">{file}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">No dataset details available</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

