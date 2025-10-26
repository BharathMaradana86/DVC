import React, { useState, useRef, useEffect } from "react";
import { SideHeading } from "../../components/SideHeading/SideHeading";

export const UploadStages = () => {
    const [currentStage, setCurrentStage] = useState(1);
    const [selectedProject, setSelectedProject] = useState(null);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    
    // Dataset selection states - Only Images, Labels, and YAML
    const [selectedDataTypes, setSelectedDataTypes] = useState({
        images: false,
        labels: false,
        yaml: false
    });
    const [datasetType, setDatasetType] = useState("new"); // "new" or "existing"
    const [datasetName, setDatasetName] = useState(""); // User-entered dataset name
    const [updateDescription, setUpdateDescription] = useState(""); // Description for updating dataset
    const [retrainingReason, setRetrainingReason] = useState(""); // Reason for retraining
    const [availableDatasets, setAvailableDatasets] = useState([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState("");
    const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
    
    // File upload states - Only Images, Labels, and YAML
    const [uploadedFiles, setUploadedFiles] = useState({
        images: [],
        labels: [],
        yaml: []
    });
    const [fileDetails, setFileDetails] = useState(null);
    
    // Upload process states
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSummary, setUploadSummary] = useState(null);
    
    const fileInputRefs = {
        images: useRef(null),
        labels: useRef(null),
        yaml: useRef(null)
    };

    // Fetch available projects on component mount
    useEffect(() => {
        fetchAvailableProjects();
    }, []);

    // Auto-select project if coming from UploadDataSet
    useEffect(() => {
        const projectFromStorage = sessionStorage.getItem('selectedProjectForUpload');
        if (projectFromStorage && availableProjects.length > 0) {
            const project = availableProjects.find(p => p.name === projectFromStorage);
            if (project) {
                setSelectedProject(project);
                // Clear from storage
                sessionStorage.removeItem('selectedProjectForUpload');
            }
        }
    }, [availableProjects]);

    // Fetch available datasets from backend when existing dataset is selected
    useEffect(() => {
        console.log('useEffect triggered, datasetType:', datasetType);
        if (datasetType === "existing") {
            console.log('Fetching datasets because datasetType is existing');
            fetchAvailableDatasets();
        }
    }, [datasetType]);

    const fetchAvailableProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const response = await fetch('http://localhost:8000/api/projects');
            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }
            const data = await response.json();
            setAvailableProjects(data.projects);
        } catch (error) {
            console.error('Error fetching projects:', error);
            // Mock data for fallback
            setAvailableProjects([
                {
                    id: 1,
                    name: "Sample Project",
                    description: "Machine Learning Project for Image Classification",
                    path: "/projects/sample-project",
                    created_at: "2024-01-15T10:00:00Z",
                    status: "active"
                },
                {
                    id: 2,
                    name: "Text Analysis Project",
                    description: "Natural Language Processing Project",
                    path: "/projects/text-analysis",
                    created_at: "2024-01-10T14:30:00Z",
                    status: "active"
                },
                {
                    id: 3,
                    name: "Data Science Project",
                    description: "Comprehensive Data Analysis Project",
                    path: "/projects/data-science",
                    created_at: "2024-01-05T09:15:00Z",
                    status: "active"
                }
            ]);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const fetchAvailableDatasets = async () => {
        if (!selectedProject) {
            console.log('No project selected, cannot fetch datasets');
            return;
        }
        
        setIsLoadingDatasets(true);
        try {
            console.log('Fetching datasets for project:', selectedProject.name);
            const response = await fetch(`http://localhost:8000/api/datasets/project/${selectedProject.name}`);
            if (!response.ok) {
                throw new Error('Failed to fetch datasets');
            }
            const data = await response.json();
            console.log('Received datasets data:', data);
            const datasets = Array.isArray(data.datasets) ? data.datasets : data.datasets || [];
            setAvailableDatasets(datasets);
            console.log('Set available datasets:', datasets);
        } catch (error) {
            console.error('Error fetching datasets:', error);
            setAvailableDatasets([]);
        } finally {
            setIsLoadingDatasets(false);
        }
    };

    const stages = [
        { number: 1, title: "Project Selection", description: "Choose project for dataset upload" },
        { number: 2, title: "Dataset Selection", description: "Choose dataset and version" },
        { number: 3, title: "Data Preview", description: "Preview uploaded files" },
        { number: 4, title: "Upload Process", description: "Uploading data to repository" },
        { number: 5, title: "Upload Summary", description: "Upload details and DVC commit" }
    ];

    const handleFileUpload = (event, dataType) => {
        const files = Array.from(event.target.files);
        const fileData = files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            file: file,
            dataType: dataType
        }));
        
        setUploadedFiles(prev => ({
            ...prev,
            [dataType]: fileData
        }));
        
        // Update file details
        const totalFiles = Object.values({...uploadedFiles, [dataType]: fileData}).flat().length;
        const totalSize = Object.values({...uploadedFiles, [dataType]: fileData}).flat().reduce((sum, file) => sum + file.size, 0);
        
        setFileDetails({
            totalFiles,
            totalSize,
            byType: {
                images: uploadedFiles.images.length + (dataType === 'images' ? fileData.length : 0),
                labels: uploadedFiles.labels.length + (dataType === 'labels' ? fileData.length : 0),
                yaml: uploadedFiles.yaml.length + (dataType === 'yaml' ? fileData.length : 0)
            }
        });
    };

    const uploadToBackend = async () => {
        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            const formData = new FormData();
            
            // Add all files to form data with correct field names
            Object.entries(uploadedFiles).forEach(([dataType, files]) => {
                if (dataType === 'yaml' && files.length > 0) {
                    // YAML file is a single file
                    formData.append('yaml_file', files[0].file);
                } else {
                    // Images and labels
                    files.forEach(file => {
                        formData.append(dataType, file.file);
                    });
                }
            });
            
            // Add metadata
            formData.append('projectId', selectedProject.name);
            formData.append('datasetType', datasetType); // "new" or "existing"
            if (datasetType === "new") {
                formData.append('datasetName', datasetName); // User-entered dataset name
                formData.append('updateDescription', ''); // Empty for new datasets
            } else {
                formData.append('selectedDatasetId', selectedDatasetId);
                formData.append('updateDescription', updateDescription); // Description for updating
            }
            formData.append('dataTypes', JSON.stringify(selectedDataTypes));
            
            // Simulate progress updates
            for (let i = 0; i <= 90; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 200));
                setUploadProgress(i);
            }
            
            const response = await fetch('http://localhost:8000/api/upload/dataset', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }
            
            const result = await response.json();
            
            // Complete progress
            setUploadProgress(100);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setIsUploading(false);
            setUploadSummary(result);
            setCurrentStage(5);
            
        } catch (error) {
            console.error('Upload error:', error);
            setIsUploading(false);
            setUploadProgress(0);
            alert(`Upload failed: ${error.message}`);
        }
    };

    const checkAllDataTypesSelected = () => {
        return Object.values(selectedDataTypes).every(type => type === true);
    };

    const canProceedToNextStage = () => {
        const allDataTypesSelected = checkAllDataTypesSelected();
        if (datasetType === "new") {
            return allDataTypesSelected && datasetName.trim() !== "";
        } else {
            return allDataTypesSelected && selectedDatasetId !== "" && updateDescription.trim() !== "";
        }
    };

    const canProceedFromStage1 = () => {
        return selectedProject !== null;
    };

    const checkAllFilesUploaded = () => {
        return Object.values(uploadedFiles).every(files => files.length > 0);
    };

    const renderStageContent = () => {
        switch (currentStage) {
            case 1:
                return (
                    <div className="mt-8 ml-8">
                        <h3 className="text-xl font-semibold mb-4">Project Selection</h3>
                        
                        {/* Project Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Select Project</label>
                            {isLoadingProjects ? (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                    <p>Loading available projects...</p>
                                </div>
                            ) : availableProjects.length > 0 ? (
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {availableProjects.map((project) => (
                                        <label key={project.id} className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="project"
                                                value={project.id}
                                                checked={selectedProject?.id === project.id}
                                                onChange={(e) => setSelectedProject(project)}
                                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{project.name}</div>
                                                <div className="text-sm text-gray-600 mt-1">{project.description}</div>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                    <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                                                    <span>Status: {project.status}</span>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No projects available</p>
                                </div>
                            )}
                        </div>

                        {/* Selected Project Details */}
                        {selectedProject && (
                            <div className="bg-blue-50 p-6 rounded-lg mb-6">
                                <h4 className="font-semibold text-lg mb-3">Selected Project Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Project Name</label>
                                        <p className="mt-1 text-lg font-semibold">{selectedProject.name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Created Date</label>
                                        <p className="mt-1">{new Date(selectedProject.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <p className="mt-1">{selectedProject.description}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <p className="mt-1 capitalize">{selectedProject.status}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Project Path</label>
                                        <p className="mt-1 text-sm font-mono text-gray-600">{selectedProject.path}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => setCurrentStage(2)}
                            disabled={!canProceedFromStage1()}
                            className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                        >
                            Next: Select Dataset
                        </button>
                    </div>
                );

            case 2:
                return (
                    <div className="mt-8 ml-8">
                        <h3 className="text-xl font-semibold mb-4">Dataset Selection</h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-gray-700">Select Required Data Types</label>
                                    <button
                                        onClick={() => {
                                            setSelectedDataTypes({
                                                images: true,
                                                labels: true,
                                                yaml: true
                                            });
                                        }}
                                        className="text-sm bg-green-100 hover:bg-green-200 px-3 py-1 rounded transition-colors"
                                    >
                                        Select All
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(selectedDataTypes).map(([dataType, isSelected]) => (
                                        <label key={dataType} className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={(e) => setSelectedDataTypes(prev => ({
                                                    ...prev,
                                                    [dataType]: e.target.checked
                                                }))}
                                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="capitalize font-medium">
                                                {dataType === 'yaml' ? 'YAML Config' : dataType}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-600 mt-2">
                                    All three data types (Images, Labels, YAML Config) are required for the dataset.
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Dataset Type</label>
                                <div className="space-y-3">
                                    <label className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            value="new" 
                                            checked={datasetType === "new"}
                                            onChange={(e) => {
                                                setDatasetType(e.target.value);
                                                setSelectedDatasetId(""); // Reset selection
                                            }}
                                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">Create New Dataset</div>
                                            <div className="text-sm text-gray-600">Start with a fresh dataset (Version 1.0)</div>
                                        </div>
                                    </label>
                                    
                                    {/* Dataset Name Input for New Dataset */}
                                    {datasetType === "new" && (
                                        <div className="pl-7">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Dataset Name</label>
                                            <input 
                                                type="text"
                                                placeholder="Enter dataset name (e.g., training-data-v1)"
                                                value={datasetName}
                                                onChange={(e) => setDatasetName(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">This name will be used to identify the dataset</p>
                                        </div>
                                    )}
                                    <label className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            value="existing" 
                                            checked={datasetType === "existing"}
                                            onChange={(e) => {
                                                setDatasetType(e.target.value);
                                                setSelectedDatasetId(""); // Reset selection
                                            }}
                                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div>
                                            <div className="font-medium">Add to Existing Dataset</div>
                                            <div className="text-sm text-gray-600">Select an existing dataset to add new data (creates new version)</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Dataset Selection for Existing Dataset */}
                            {datasetType === "existing" && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-medium text-gray-700">Select Existing Dataset</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={fetchAvailableDatasets}
                                                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
                                            >
                                                Refresh
                                            </button>
                                            <button
                                                onClick={() => {
                                                    console.log('Setting test datasets');
                                                    setAvailableDatasets([
                                                        { 
                                                            id: "dataset_test_1", 
                                                            name: "Test Dataset 1", 
                                                            version: "v1.0",
                                                            fileCount: 10,
                                                            lastUpdated: "2024-01-20",
                                                            description: "Test dataset for debugging"
                                                        }
                                                    ]);
                                                    // Auto-select all data types for testing
                                                    setSelectedDataTypes({
                                                        images: true,
                                                        labels: true,
                                                        yaml: true
                                                    });
                                                }}
                                                className="text-sm bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded transition-colors"
                                            >
                                                Test Data
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">
                                        Debug: Loading: {isLoadingDatasets ? 'Yes' : 'No'}, Count: {availableDatasets.length}
                                    </div>
                                    {isLoadingDatasets ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                            <p>Loading available datasets...</p>
                                        </div>
                                    ) : availableDatasets.length > 0 ? (
                                        <div className="space-y-3 max-h-60 overflow-y-auto">
                                            {availableDatasets.map((dataset) => (
                                                <label key={dataset.id || dataset.name} className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                                    selectedDatasetId === (dataset.id || dataset.name) 
                                                        ? 'border-blue-500 bg-blue-50' 
                                                        : 'border-gray-300 hover:bg-gray-50'
                                                }`}>
                                                    <input 
                                                        type="radio" 
                                                        name="dataset"
                                                        value={dataset.id || dataset.name}
                                                        checked={selectedDatasetId === (dataset.id || dataset.name)}
                                                        onChange={(e) => {
                                                            console.log('Dataset selected:', e.target.value);
                                                            setSelectedDatasetId(e.target.value);
                                                        }}
                                                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{dataset.name}</div>
                                                        <div className="text-sm text-gray-600 mt-1">{dataset.description || 'No description available'}</div>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                            <span>Version: {dataset.version || 'v1.0'}</span>
                                                            <span>Files: {dataset.fileCount || 0}</span>
                                                            <span>Updated: {dataset.lastUpdated || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>No datasets available</p>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 mt-2">
                                        Selecting a dataset will add your uploaded data to the existing dataset, creating a new version.
                                    </p>
                                </div>
                            )}
                            
                            {/* Description for updating existing dataset */}
                            {datasetType === "existing" && selectedDatasetId && (
                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Why are you updating this dataset? 
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <textarea
                                        value={updateDescription}
                                        onChange={(e) => setUpdateDescription(e.target.value)}
                                        placeholder="Describe the reason for updating this dataset (e.g., adding more training data, fixing labels, improving data quality)..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        rows="4"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This description will be saved with the dataset version.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-4 mt-6">
                            <button 
                                onClick={() => setCurrentStage(1)}
                                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setCurrentStage(3)}
                                disabled={!canProceedToNextStage()}
                                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                            >
                                Next: Upload Files
                            </button>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="mt-8 ml-8">
                        <h3 className="text-xl font-semibold mb-4">Data Preview</h3>
                        
                        {/* YAML Config File Upload */}
                        <div className="border border-purple-300 rounded-lg p-4 mb-6 bg-purple-50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-medium">YAML Configuration File</h4>
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Optional</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        ref={fileInputRefs.yaml}
                                        type="file"
                                        accept=".yaml,.yml"
                                        onChange={(e) => handleFileUpload(e, 'yaml')}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRefs.yaml.current?.click()}
                                        className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
                                    >
                                        Upload YAML Config
                                    </button>
                                    <span className="text-sm text-gray-600 self-center">
                                        {uploadedFiles.yaml.length} file{uploadedFiles.yaml.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                                Upload a YAML configuration file for dataset settings (e.g., class names, training parameters)
                            </p>
                            {uploadedFiles.yaml.length > 0 && (
                                <div className="bg-white p-3 rounded border border-purple-200">
                                    {uploadedFiles.yaml.map((file, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="text-purple-600">📄</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{file.name}</p>
                                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* File Upload Sections for Each Data Type */}
                        <div className="space-y-6 mb-6">
                            {Object.entries(selectedDataTypes).map(([dataType, isSelected]) => (
                                isSelected && (
                                    <div key={dataType} className="border border-gray-300 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-lg font-medium capitalize">{dataType} Files</h4>
                                            <div className="flex gap-2">
                                    <input
                                        ref={fileInputRefs[dataType]}
                                        type="file"
                                        multiple
                                                accept={
                                            dataType === 'images' ? 'image/*' :
                                            dataType === 'labels' ? '.txt' :
                                            dataType === 'yaml' ? '.yaml,.yml' :
                                            '*'
                                        }
                                        onChange={(e) => handleFileUpload(e, dataType)}
                                        className="hidden"
                                    />
                                                <button
                                                    onClick={() => fileInputRefs[dataType].current?.click()}
                                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                                                >
                                                    Upload {dataType}
                                                </button>
                                                <span className="text-sm text-gray-600 self-center">
                                                    {uploadedFiles[dataType].length} files
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* File Preview Grid */}
                                        {uploadedFiles[dataType].length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {uploadedFiles[dataType].map((file, index) => (
                                                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                                                        {file.preview ? (
                                                            <img 
                                                                src={file.preview} 
                                                                alt={file.name}
                                                                className="w-full h-24 object-cover rounded mb-2"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                                                                <span className="text-gray-500 text-xs">{file.type.split('/')[1] || 'file'}</span>
                                                            </div>
                                                        )}
                                                        <p className="text-xs font-medium truncate">{file.name}</p>
                                                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            ))}
                        </div>

                        {/* File Details Summary */}
                        {fileDetails && (
                            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                                <h4 className="font-semibold mb-3">Upload Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{fileDetails.totalFiles}</div>
                                        <div className="text-sm text-gray-600">Total Files</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{(fileDetails.totalSize / 1024 / 1024).toFixed(1)} MB</div>
                                        <div className="text-sm text-gray-600">Total Size</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{fileDetails.byType.images}</div>
                                        <div className="text-sm text-gray-600">Images</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{fileDetails.byType.texts + fileDetails.byType.json + fileDetails.byType.labels}</div>
                                        <div className="text-sm text-gray-600">Text Files</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 mt-6">
                            <button 
                                onClick={() => setCurrentStage(2)}
                                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setCurrentStage(4)}
                                disabled={!checkAllFilesUploaded()}
                                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                            >
                                Next: Upload Data
                            </button>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="mt-8 ml-8">
                        <h3 className="text-xl font-semibold mb-4">Upload Process</h3>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Upload Progress</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            {isUploading ? (
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                    <p className="text-gray-600">Uploading files to backend...</p>
                                    <p className="text-sm text-gray-500 mt-1">Processing dataset and generating version hash</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="mb-4">
                                        <p className="text-gray-600 mb-2">Ready to upload dataset</p>
                                        <div className="text-sm text-gray-500">
                                            <p>• Images: {uploadedFiles.images.length} files</p>
                                            <p>• Labels: {uploadedFiles.labels.length} files</p>
                                            {uploadedFiles.yaml.length > 0 && (
                                                <p>• YAML Config: {uploadedFiles.yaml.length} file</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={uploadToBackend}
                                        className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        Start Upload to Backend
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button 
                                onClick={() => setCurrentStage(3)}
                                disabled={isUploading}
                                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300"
                            >
                                Previous
                            </button>
                        </div>
                    </div>
                );

            case 5:
    return (
                    <div className="mt-8 ml-8">
                        <h3 className="text-xl font-semibold mb-4">Upload Summary</h3>
                        
                        {uploadSummary && (
                            <div className="space-y-6">
                                {/* Success Message */}
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="text-green-600 text-2xl mr-3">✓</div>
                                        <div>
                                            <h4 className="text-green-800 font-semibold text-lg">Upload Completed Successfully!</h4>
                                            <p className="text-green-700">Dataset has been uploaded and versioned successfully.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Details */}
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h4 className="font-semibold text-lg mb-4">Upload Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div>
                                                <span className="font-medium text-gray-700">Total Files:</span>
                                                <span className="ml-2 text-lg font-semibold">{uploadSummary.fileCount}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Total Size:</span>
                                                <span className="ml-2 text-lg font-semibold">{(uploadSummary.totalSize / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Commit Hash:</span>
                                                <div className="mt-1">
                                                    <code className="bg-gray-200 px-3 py-1 rounded text-sm font-mono">{uploadSummary.commitHash}</code>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Commit Message:</span>
                                                <p className="mt-1 text-gray-600">{uploadSummary.commitMessage}</p>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Upload Time:</span>
                                                <span className="ml-2">{new Date(uploadSummary.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <span className="font-medium text-gray-700">File Paths:</span>
                                            <div className="mt-2 max-h-40 overflow-y-auto bg-white p-3 rounded border">
                                                {uploadSummary.filePaths.map((path, index) => (
                                                    <div key={index} className="text-sm text-gray-600 mb-1 font-mono">
                                                        {path}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dataset Statistics */}
                                <div className="bg-blue-50 p-6 rounded-lg">
                                    <h4 className="font-semibold text-lg mb-4">Dataset Statistics</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{uploadSummary.stats?.images || 0}</div>
                                            <div className="text-sm text-gray-600">Images</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{uploadSummary.stats?.labels || 0}</div>
                                            <div className="text-sm text-gray-600">Label Files</div>
                                        </div>
                      </div>
                </div>

                                {/* Training Options */}
                                <div className="bg-purple-50 p-6 rounded-lg">
                                    <h4 className="font-semibold text-lg mb-4">Next Steps - Model Training</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-white rounded border">
                                                <div>
                                                    <h5 className="font-medium">Start Training</h5>
                                                    <p className="text-sm text-gray-600">Begin model training with this dataset</p>
                                                </div>
                                                <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors">
                                                    Train Model
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white rounded border">
                                                <div>
                                                    <h5 className="font-medium">Configure Training</h5>
                                                    <p className="text-sm text-gray-600">Set training parameters and hyperparameters</p>
                                                </div>
                                                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
                                                    Configure
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-white rounded border">
                                                <div>
                                                    <h5 className="font-medium">View Dataset</h5>
                                                    <p className="text-sm text-gray-600">Browse uploaded files and metadata</p>
                                                </div>
                                                <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">
                                                    View Dataset
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white rounded border">
                                                <div>
                                                    <h5 className="font-medium">Export Dataset</h5>
                                                    <p className="text-sm text-gray-600">Download dataset for external use</p>
                                                </div>
                                                <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">
                                                    Export
                                                </button>
                                            </div>
                </div>
            </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={() => {
                                            setCurrentStage(1);
                                            setUploadedFiles({images: [], labels: [], yaml: []});
                                            setUploadProgress(0);
                                            setUploadSummary(null);
                                                    setSelectedDataTypes({images: false, labels: false, yaml: false});
                                            setDatasetType("new");
                                            setDatasetName("");
                                            setSelectedDatasetId("");
                                            setIsLoadingDatasets(false);
                                            setSelectedProject(null);
                                            setFileDetails(null);
                                        }}
                                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        Upload Another Dataset
                                    </button>
                                    <button className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                        Go to Training
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="mr-[50px]">
            <SideHeading title='Upload Dataset Stages'/>
            
            {/* Progress Indicator */}
            <div className="h-[60px] w-full flex mt-[32px] ml-[32px] rounded-lg items-center justify-center">
                <div className="flex items-center justify-center w-full">
                    {stages.map((stage, index) => (
                        <React.Fragment key={stage.number}>
                            <div className="flex flex-col items-center">
                                <span 
                                    className={`h-[40px] w-[40px] rounded-full border-2 flex items-center justify-center font-bold ${
                                        currentStage >= stage.number 
                                            ? 'bg-blue-500 text-white border-blue-500' 
                                            : 'border-gray-300 text-gray-500'
                                    }`}
                                >
                                    {stage.number}
                                </span>
                                <span className="text-xs mt-1 text-center max-w-[80px]">
                                    {stage.title}
                                </span>
                            </div>
                            {index < stages.length - 1 && (
                                <span 
                                    className={`w-[100px] h-[2px] mx-2 ${
                                        currentStage > stage.number ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                                ></span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Stage Content */}
            {renderStageContent()}
        </div>
    );
}