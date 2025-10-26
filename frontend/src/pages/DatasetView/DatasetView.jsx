import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SideHeading } from '../../components/SideHeading/SideHeading';

export const DatasetView = () => {
    const { datasetName, projectName } = useParams();
    const navigate = useNavigate();
    const [datasetInfo, setDatasetInfo] = useState(null);
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchDatasetDetails();
    }, [datasetName, projectName]);

    const fetchDatasetDetails = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/datasets/${encodeURIComponent(datasetName)}/details?project=${encodeURIComponent(projectName)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch dataset details');
            }
            const data = await response.json();
            setDatasetInfo(data.dataset);
            setFiles(data.files || []);
        } catch (error) {
            console.error('Error fetching dataset details:', error);
            alert('Failed to load dataset details');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredFiles = filterType === 'all' 
        ? files 
        : files.filter(file => {
            const fileType = file.name.split('.').pop().toLowerCase();
            if (filterType === 'images') return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
            if (filterType === 'text') return ['txt', 'csv', 'md', 'json'].includes(fileType);
            if (filterType === 'json') return fileType === 'json';
            return true;
        });

    const handleDownload = async (file) => {
        try {
            const response = await fetch(`http://localhost:8000/api/files/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: file.path })
            });
            
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download file');
        }
    };

    const handleEdit = (file) => {
        // For now, open in new tab
        window.open(`file://${file.path}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="mr-[50px]">
                <SideHeading title="Dataset Viewer" />
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (!datasetInfo) {
        return (
            <div className="mr-[50px]">
                <SideHeading title="Dataset Viewer" />
                <div className="text-center py-12">
                    <p className="text-gray-500">Dataset not found</p>
                    <button 
                        onClick={() => navigate('/upload-dataset')}
                        className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const imageFiles = files.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    return (
        <div className="mr-[50px]">
            <div className="flex items-center justify-between mb-6">
                <SideHeading title={`Dataset: ${datasetInfo.name}`} />
                <button
                    onClick={() => navigate('/upload-dataset')}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    ← Back to Datasets
                </button>
            </div>

            {/* Dataset Info Card */}
            <div className="ml-[32px] mb-8 bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Dataset Information</h3>
                <div className="grid grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Name</p>
                        <p className="font-semibold">{datasetInfo.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Version</p>
                        <p className="font-semibold">{datasetInfo.version}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Files</p>
                        <p className="font-semibold">{datasetInfo.file_count} files</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Created</p>
                        <p className="font-semibold">{new Date(datasetInfo.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-1">Path</p>
                    <p className="font-mono text-xs text-gray-700">{datasetInfo.base_path}</p>
                </div>
            </div>

            {/* Filters and Stats */}
            <div className="ml-[32px] mb-6 flex items-center gap-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-lg ${filterType === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        All ({files.length})
                    </button>
                    <button
                        onClick={() => setFilterType('images')}
                        className={`px-4 py-2 rounded-lg ${filterType === 'images' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        Images ({imageFiles.length})
                    </button>
                    <button
                        onClick={() => setFilterType('text')}
                        className={`px-4 py-2 rounded-lg ${filterType === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        Text Files
                    </button>
                    <button
                        onClick={() => setFilterType('json')}
                        className={`px-4 py-2 rounded-lg ${filterType === 'json' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        JSON
                    </button>
                </div>
            </div>

            {/* Files Grid */}
            <div className="ml-[32px]">
                {filteredFiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredFiles.map((file, index) => {
                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name.split('.').pop().toLowerCase());
                            
                            return (
                                <div 
                                    key={index} 
                                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                                >
                                    {isImage && (
                                        <div 
                                            className="w-full h-48 bg-gray-100 rounded mb-2 cursor-pointer overflow-hidden"
                                            onClick={() => setSelectedImage(file)}
                                        >
                                            <img 
                                                src={`http://localhost:8000/api/files/view?path=${encodeURIComponent(file.path)}`}
                                                alt={file.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate" title={file.name}>{file.name}</p>
                                            <p className="text-xs text-gray-500">{file.type.toUpperCase()}</p>
                                        </div>
                                        {!isImage && (
                                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                                                <span className="text-xs text-blue-600">
                                                    {file.name.split('.').pop().toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-600">{file.size}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(file)}
                                                className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                                                title="Edit file"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDownload(file)}
                                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                                                title="Download file"
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 border rounded-lg bg-gray-50">
                        <p className="text-gray-500">No files found in this dataset</p>
                    </div>
                )}
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-7xl max-h-full">
                        <img 
                            src={`http://localhost:8000/api/files/view?path=${encodeURIComponent(selectedImage.path)}`}
                            alt={selectedImage.name}
                            className="max-w-full max-h-[90vh] object-contain"
                        />
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="bg-white text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 font-semibold"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handleDownload(selectedImage)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-semibold"
                            >
                                Download
                            </button>
                        </div>
                        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
                            <p className="font-semibold">{selectedImage.name}</p>
                            <p className="text-sm">{selectedImage.size}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

