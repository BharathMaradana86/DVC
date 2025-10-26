import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SideHeading } from '../../components/SideHeading/SideHeading';
import { Popup } from '../../components/Popup/Popup';
import { uploadDataset } from '../../services/datasetsService';
import { listProjects } from '../../services/projectsService';

const UploadWizard = ({ projectName, onClose, datasets }) => {
    const [step, setStep] = React.useState(1);
    const [taskType, setTaskType] = React.useState('Object Detection');
    const [datasetType, setDatasetType] = React.useState('Training Data');
    const [version, setVersion] = React.useState('v3 (auto)');
    const [datasetKey, setDatasetKey] = React.useState('');
    const [baseVersion, setBaseVersion] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [images, setImages] = React.useState([]);
    const [annotations, setAnnotations] = React.useState([]);
    const [datasetFormat, setDatasetFormat] = React.useState('COCO');
    const [yoloLabels, setYoloLabels] = React.useState(null);
    const [cocoJson, setCocoJson] = React.useState(null);
    const [vocZips, setVocZips] = React.useState([]);
    const [maskFiles, setMaskFiles] = React.useState([]);
    const [panopticJson, setPanopticJson] = React.useState(null);
    const [overallProgress, setOverallProgress] = React.useState(0);
    const [uploading, setUploading] = React.useState(false);
    const [processing, setProcessing] = React.useState(false);
    const [completed, setCompleted] = React.useState(false);
    const abortRef = React.useRef(null);
    const [activeProjects, setActiveProjects] = React.useState([]);
    const loadActiveProjects = async () => {
        const response = await listProjects();
        console.log(response);
        const refactoredProjects = response?.projects?.map((project) => ({
            value: project.name,
            label: project.name,
        }));
        setActiveProjects(refactoredProjects);
    }

    React.useEffect(() => {
        loadActiveProjects();
    }, []);

    const startUpload = async () => {
        setUploading(true);
        setOverallProgress(0);
        try {
            await uploadDataset({
                projectName,
                taskType,
                datasetType,
                version,
                description,
                datasetKey,
                baseVersion,
                imageFiles: images,
                annotationFiles: annotations,
                datasetFormat,
                cocoJson,
                yoloLabels,
                vocZips,
                maskFiles,
                panopticJson,
                onProgress: ({ percent }) => setOverallProgress(percent),
                onAbortRef: abortRef,
            });
            setStep(4);
            setProcessing(true);
            setTimeout(() => {
                setCompleted(true);
                setProcessing(false);
            }, 1200);
        } catch (e) {
            console.error(e);
            alert(e.message || 'Upload failed');
            setUploading(false);
        }
    };

    const goNext = () => setStep((s) => Math.min(s + 1, 5));
    const goBack = () => setStep((s) => Math.max(s - 1, 1));

    return (
        <div className="w-[720px]">
            {step === 1 && (
                <div>
                    <p className='font-bold mb-4'>Step 1: Configure Dataset</p>
                    <div className='space-y-4'>
                        <div className='text-sm text-gray-700'>
                            <p>🔒 Uploading to: <span className='font-semibold'>{projectName}</span></p>
                            <p>📁 Project Path: /projects/{projectName.toLowerCase().replace(/\s+/g, '-')}</p>
                        </div>
                        <div className='flex items-center gap-4'>
                            <label className='w-40'>DataSet Type</label>
                            <select className='border border-gray-300 rounded p-2 w-60' value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                                <option value="New" key="New">New</option>
                               {
                                    datasets?.map((dataset) => (
                                        <option key={dataset.name} value={dataset.name}>{dataset.name}</option>
                                    ))
                               }
                            </select>
                        </div>
                        {/* <div className='flex items-center gap-4'>
                            <label className='w-40'>Task Type</label>
                            <select className='border border-gray-300 rounded p-2 w-60' value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                              {activeProjects.map((project) => (
                                <option key={project.value} value={project.value}>{project.label}</option>
                              ))}
                            </select>
                        </div>
                        <div className='flex items-center gap-4'>
                            <label className='w-40'>Dataset Type</label>
                            <select className='border border-gray-300 rounded p-2 w-60' value={datasetType} onChange={(e) => setDatasetType(e.target.value)}>
                             {activeProjects.map((project) => (
                                <option key={project.value} value={project.value}>{project.label}</option>
                              ))}
                            </select>
                        </div> */}

                        <div className='flex items-center gap-4'>
                            <label className='w-40'>Version</label>
                            <select className='border border-gray-300 rounded p-2 w-60' value={version} onChange={(e) => setVersion(e.target.value)}>
                                <option>v3 (auto)</option>
                                <option>v2</option>
                                <option>v1</option>
                            </select>
                            <p className='text-sm text-gray-500'>Previous: v1, v2 → New: v3</p>
                        </div>
                        <div className='flex items-center gap-4'>
                            <label className='w-40'>Dataset Key</label>
                            <input className='border rounded p-2 w-60' placeholder='e.g., training' value={datasetKey} onChange={(e) => setDatasetKey(e.target.value)} />
                            <p className='text-sm text-gray-500'>Stable identifier used to version</p>
                        </div>
                        <div className='flex items-center gap-4'>
                            <label className='w-40'>Base Version</label>
                            <input className='border rounded p-2 w-60' placeholder='e.g., v2' value={baseVersion} onChange={(e) => setBaseVersion(e.target.value)} />
                            <p className='text-sm text-gray-500'>If updating existing dataset</p>
                        </div>
                        <div className='flex items-center gap-4'>
                            <label className='w-40'>Dataset Format</label>
                            <select className='border border-gray-300 rounded p-2 w-60' value={datasetFormat} onChange={(e) => setDatasetFormat(e.target.value)}>
                                <option>COCO</option>
                                <option>YOLO</option>
                                <option>VOC</option>
                            </select>
                        </div>
                        <div className='flex items-start gap-4'>
                            <label className='w-40 mt-2'>Description</label>
                            <textarea className='border border-gray-300 rounded p-2 w-full' rows="3" placeholder={`Adding night scene images to ${projectName} project`} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>
                    <div className='flex justify-between mt-6'>
                        <button className='bg-gray-500 text-white px-4 py-2 rounded' onClick={onClose}>Cancel</button>
                        <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={goNext}>Next: Select Files</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <p className='font-bold mb-4'>Step 2: Select Files</p>
                    <div className='border rounded p-4 space-y-4'>
                        <div>
                            <p className='font-semibold mb-2'>Images</p>
                            <input type='file' multiple accept='image/*' onChange={(e) => setImages(e.target.files)} />
                        </div>
                        {taskType === 'Object Detection' && datasetType === 'Training Data' && datasetFormat === 'COCO' && (
                            <div>
                                <p className='font-semibold mb-2'>COCO Annotations</p>
                                <input type='file' accept='.json' onChange={(e) => setCocoJson(e.target.files?.[0] || null)} />
                                <p className='text-xs text-gray-600 mt-1'>Single COCO JSON file</p>
                            </div>
                        )}
                        {taskType === 'Object Detection' && datasetType === 'Training Data' && datasetFormat === 'YOLO' && (
                            <div>
                                <p className='font-semibold mb-2'>YOLO Labels (.txt per image)</p>
                                <input type='file' multiple accept='.txt' onChange={(e) => setAnnotations(e.target.files)} />
                                <div className='mt-2'>
                                    <p className='font-semibold mb-1'>labels.txt (optional)</p>
                                    <input type='file' accept='.txt' onChange={(e) => setYoloLabels(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                        )}
                        {taskType === 'Object Detection' && datasetType === 'Training Data' && datasetFormat === 'VOC' && (
                            <div>
                                <p className='font-semibold mb-2'>VOC Annotations (.xml or zipped folder)</p>
                                <input type='file' multiple accept='.xml' onChange={(e) => setAnnotations(e.target.files)} />
                                <div className='mt-2'>
                                    <p className='font-semibold mb-1'>Optional zipped VOC folders</p>
                                    <input type='file' multiple accept='.zip' onChange={(e) => setVocZips(e.target.files)} />
                                </div>
                            </div>
                        )}
                        {taskType === 'Segmentation' && datasetType === 'Training Data' && (
                            <div>
                                <p className='font-semibold mb-2'>Segmentation Masks</p>
                                <input type='file' multiple accept='image/*' onChange={(e) => setMaskFiles(e.target.files)} />
                                <p className='text-xs text-gray-600 mt-1'>One mask per image (matching stem)</p>
                                <div className='mt-3'>
                                    <p className='font-semibold mb-2'>COCO Panoptic (optional)</p>
                                    <input type='file' accept='.json' onChange={(e) => setPanopticJson(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                        )}
                        <div className='text-sm text-gray-600'>
                            {images?.length || 0} images{datasetType === 'Training Data' ? (taskType === 'Object Detection' ? ` • ${datasetFormat} annotations selected` : taskType === 'Segmentation' ? ` • ${maskFiles?.length || 0} masks` : '') : ''}
                        </div>
                    </div>
                    <div className='flex justify-between mt-6'>
                        <button className='bg-gray-500 text-white px-4 py-2 rounded' onClick={goBack}>Back</button>
                        <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={() => setStep(3)} disabled={!images?.length || (datasetType === 'Training Data' && taskType === 'Object Detection' && datasetFormat === 'YOLO' && !annotations?.length) || (datasetType === 'Training Data' && taskType === 'Object Detection' && datasetFormat === 'VOC' && !annotations?.length && (!vocZips || vocZips.length === 0)) || (datasetType === 'Training Data' && taskType === 'Object Detection' && datasetFormat === 'COCO' && !cocoJson) || (datasetType === 'Training Data' && taskType === 'Segmentation' && !maskFiles?.length)}>Next: Upload Files</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <p className='font-bold mb-4'>Step 3: Uploading Files...</p>
                    <div className='mb-4'>
                        <p className='text-sm'>Overall Progress:</p>
                        <div className='w-full bg-gray-200 h-3 rounded'>
                            <div className='bg-blue-600 h-3 rounded' style={{ width: `${overallProgress}%` }}></div>
                        </div>
                        <p className='text-sm mt-1'>{overallProgress}%</p>
                    </div>
                    <div className='flex justify-between mt-6'>
                        <button className='bg-yellow-600 text-white px-4 py-2 rounded' onClick={() => abortRef.current && abortRef.current()}>⏸️ Cancel</button>
                        <div className='space-x-2'>
                            <button className='bg-gray-500 text-white px-4 py-2 rounded' onClick={goBack} disabled={uploading}>Back</button>
                            <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={startUpload} disabled={uploading}>Start Upload</button>
                        </div>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div>
                    <p className='font-bold mb-4'>Step 4: Versioning with DVC...</p>
                    <div className='space-y-2 text-sm text-gray-800'>
                        <p>✅ All files uploaded successfully!</p>
                        <p>2.5GB • 2,500 files • Time: 8 minutes 45 seconds</p>
                        <p className='mt-3'>🔄 Processing with DVC...</p>
                        <ul className='list-disc ml-6 space-y-1'>
                            <li>Moving files to project directory...</li>
                            <li>Running DVC add...</li>
                            <li>Calculating file hashes...</li>
                            <li>Creating .dvc files...</li>
                            <li>Committing to Git...</li>
                        </ul>
                        {!completed && <p className='text-blue-600 mt-2'>Please wait...</p>}
                    </div>
                    {completed && (
                        <div className='mt-6 border rounded p-4 bg-green-50'>
                            <p className='font-semibold'>🎉 Dataset uploaded and versioned successfully!</p>
                            <div className='text-sm text-gray-700 mt-2'>
                                <p>Dataset: training-v3</p>
                                <p>Location: data/training/v3/</p>
                                <p>Size: 2.5GB • Files: 2,500 • Version: v3</p>
                                <p className='mt-2'>DVC Tracking:</p>
                                <ul className='list-disc ml-6'>
                                    <li>Files tracked with DVC</li>
                                    <li>.dvc files created</li>
                                    <li>Git commit created: a1b2c3d4e5f6...</li>
                                    <li>Remote storage updated</li>
                                </ul>
                            </div>
                            <div className='flex justify-end gap-2 mt-4'>
                                <button className='bg-white border px-4 py-2 rounded'>View Dataset</button>
                                <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={onClose}>Train Model</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const UploadDataSet = () => {
    const navigate = useNavigate();
    const [selectedProject, setSelectedProject] = React.useState('');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [activeProjects, setActiveProjects] = React.useState([]);
    const [datasets, setDatasets] = React.useState([]);
    const [isLoadingDatasets, setIsLoadingDatasets] = React.useState(false);

    const loadActiveProjects = async () => {
        try {
            const response = await listProjects();
            console.log(response);
            const refactoredProjects = response?.projects?.map((project) => ({
                value: project.name,
                label: project.name,
            }));
            console.log(refactoredProjects);
            setActiveProjects(refactoredProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    React.useEffect(() => {
        loadActiveProjects();
    }, []);

    const fetchDatasets = async () => {
        if (!selectedProject) {
            setDatasets([]);
            return;
        }

        setIsLoadingDatasets(true);
        try {
            console.log(`Fetching datasets for project: ${selectedProject}`);
            const response = await fetch(`http://localhost:8000/api/datasets/project/${selectedProject}`);
            if (!response.ok) {
                throw new Error('Failed to fetch datasets');
            }
            const data = await response.json();
            console.log("Received datasets data:", data);
            
            const refactoredDatasets = (data.datasets || []).map((dataset) => ({
                name: dataset.name,
                size: (dataset.fileCount || 0) + ' files',
                file_count: dataset.fileCount || 0,
                description: dataset.description || '',
                version: dataset.version,
                created_at: dataset.lastUpdated,
                status: 'active',
            }));
            console.log("Processed datasets:", refactoredDatasets);
            setDatasets(refactoredDatasets);
        } catch (error) {
            console.error('Error fetching datasets:', error);
            setDatasets([]);
        } finally {
            setIsLoadingDatasets(false);
        }
    }

    React.useEffect(() => {
        fetchDatasets();
    }, [selectedProject]);

    const handleUploadClick = () => {
        if (selectedProject) {
            // Store selected project in sessionStorage so UploadStages can access it
            sessionStorage.setItem('selectedProjectForUpload', selectedProject);
            navigate('/upload-dataset-stages');
        }
    };

    const handleViewDataset = (dataset) => {
        // Navigate to the dataset view page
        navigate(`/datasets/${encodeURIComponent(dataset.name)}/project/${encodeURIComponent(selectedProject)}`);
    };

    return (
            <div className='w-full h-full'>
                <SideHeading title='Datasets'/>
                <div className='w-full h-[40px] flex flex-row gap-4 ml-[32px] mt-[32px] align-items-center'>
                    <p className='w-1/4'>Project:</p>
                    <select className='w-[260px] h-10 border border-gray-300 rounded-md p-2' value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                        <option value="">Select Project</option>
                        {activeProjects.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                    <button className={`px-4 py-2 rounded ${selectedProject ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`} disabled={!selectedProject} onClick={handleUploadClick}>
                        📁 Upload New Dataset
                    </button>
                </div>

                {!selectedProject && (
                    <div className='ml-[32px] mt-6 border rounded p-6 w-[640px] text-gray-700'>
                        <p className='font-semibold mb-2'>⚠️ Please select a project to view datasets</p>
                        <div className='border rounded p-4'>
                            <p>▼ Select a project from the dropdown above to view or upload datasets</p>
                        </div>
                    </div>
                )}

                {!!selectedProject && (
                    <div className='ml-[32px] mt-6'>
                        <p className='font-semibold mb-3'>Training Data</p>
                        {isLoadingDatasets ? (
                            <div className='text-center py-8 text-gray-500'>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                <p>Loading datasets...</p>
                            </div>
                        ) : datasets.length > 0 ? (
                            <div className='space-y-3'>
                                {datasets.map((dataset, index) => (
                                    <div key={index} className='border rounded p-4 w-[640px] flex items-center justify-between'>
                                        <div className='flex-1'>
                                            <p className='font-semibold'>{dataset.name} • {dataset.size} • File Count: {dataset.file_count} • Version: {dataset.version}</p>
                                            <p className='text-sm text-gray-600'>{dataset.description} • {dataset.created_at}</p>
                                        </div>
                                        <button
                                            onClick={() => handleViewDataset(dataset)}
                                            className='ml-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors'
                                        >
                                            View Dataset
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='border rounded p-6 w-[640px] text-gray-700'>
                                <p className='font-semibold mb-2'>No datasets found</p>
                                <p className='text-sm text-gray-600'>Upload a new dataset to get started</p>
                            </div>
                        )}
                    </div>
                )}

                <Popup isOpen={isModalOpen} title={`Upload to ${selectedProject}`}>
                    {isModalOpen && (
                        <UploadWizard projectName={selectedProject} onClose={() => setIsModalOpen(false)} dataset={datasets}/>
                    )}
                </Popup>

            </div>
        )
}