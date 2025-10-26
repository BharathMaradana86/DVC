import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SideHeading } from '../../components/SideHeading/SideHeading';

export const Training = () => {
    const [trainingRuns, setTrainingRuns] = useState([]);
    const [selectedRun, setSelectedRun] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTrainingRuns();
    }, []);

    const fetchTrainingRuns = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/training/runs');
            const data = await response.json();
            setTrainingRuns(data.training_runs || []);
            if (data.training_runs && data.training_runs.length > 0) {
                setSelectedRun(data.training_runs[0]);
            }
        } catch (error) {
            console.error('Error fetching training runs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'completed':
                return 'bg-green-600';
            case 'failed':
                return 'bg-red-600';
            case 'running':
                return 'bg-blue-600';
            default:
                return 'bg-gray-600';
        }
    };

    const getStatusIcon = (status) => {
        switch(status?.toLowerCase()) {
            case 'completed':
                return '✓';
            case 'failed':
                return '✗';
            case 'running':
                return '🔄';
            default:
                return '○';
        }
    };

    if (isLoading) {
        return (
            <div className='w-full h-full'>
                <SideHeading title='Training'/>
                <div className='ml-[32px] mt-[24px] flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                </div>
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            <SideHeading title='Training Runs'/>
            <div className='ml-[32px] mt-[24px] mb-4 flex items-center gap-2'>
                <button 
                    onClick={fetchTrainingRuns}
                    className='bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors text-sm'
                >
                    🔄 Refresh
                </button>
            </div>
            
            {trainingRuns.length === 0 ? (
                <div className='ml-[32px] border rounded p-12 bg-gray-50 text-center max-w-[800px]'>
                    <p className='text-gray-500 mb-4'>No training runs found</p>
                    <button 
                        onClick={() => navigate('/projects')}
                        className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors'
                    >
                        Go to Projects
                    </button>
                </div>
            ) : (
                <div className='ml-[32px] space-y-4 max-w-[1000px]'>
                    {trainingRuns.map((run) => {
                        const runParams = typeof run.parameters === 'string' ? JSON.parse(run.parameters) : (run.parameters || {});
                        const runMetrics = typeof run.metrics === 'string' ? JSON.parse(run.metrics) : (run.metrics || {});
                        
                        const startTime = new Date(run.started_at);
                        const endTime = run.completed_at ? new Date(run.completed_at) : new Date();
                        const duration = Math.floor((endTime - startTime) / 1000 / 60); // in minutes
                        
                        return (
                            <div key={run.id} className='border rounded p-4 bg-white hover:shadow-md transition-shadow'>
                                <div className='flex items-center justify-between mb-4'>
                                    <div className='flex items-center gap-3'>
                                        <span className={`text-xl ${getStatusIcon(run.status)}`}>
                                            {getStatusIcon(run.status)}
                                        </span>
                                        <div>
                                            <p className='font-semibold text-lg'>Training Run #{run.id}</p>
                                            <p className='text-sm text-gray-600'>
                                                Started: {startTime.toLocaleString()}
                                                {run.completed_at && ` • Completed: ${new Date(run.completed_at).toLocaleString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded text-xs font-semibold text-white ${getStatusColor(run.status)}`}>
                                        {run.status?.toUpperCase() || 'UNKNOWN'}
                                    </span>
                                </div>

                                <div className='grid grid-cols-2 gap-4 mb-4'>
                                    <div>
                                        <p className='text-xs text-gray-600'>Project ID</p>
                                        <p className='font-semibold'>{run.project_id}</p>
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-600'>Dataset ID</p>
                                        <p className='font-semibold'>{run.dataset_id}</p>
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-600'>Model ID</p>
                                        <p className='font-semibold'>{run.model_id || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-600'>Duration</p>
                                        <p className='font-semibold'>{duration} minutes</p>
                                    </div>
                                </div>

                                {/* Parameters */}
                                {Object.keys(runParams).length > 0 && (
                                    <div className='mb-4 border-t pt-3'>
                                        <p className='text-xs font-semibold text-gray-600 mb-2'>Hyperparameters</p>
                                        <div className='grid grid-cols-4 gap-3'>
                                            {Object.entries(runParams).map(([key, value]) => (
                                                <div key={key} className='bg-gray-50 p-2 rounded'>
                                                    <p className='text-xs text-gray-600'>{key}</p>
                                                    <p className='text-sm font-semibold'>{String(value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Metrics */}
                                {Object.keys(runMetrics).length > 0 && (
                                    <div className='mb-4 border-t pt-3'>
                                        <p className='text-xs font-semibold text-gray-600 mb-2'>Training Metrics</p>
                                        <div className='grid grid-cols-3 gap-3'>
                                            {Object.entries(runMetrics).map(([key, value]) => (
                                                <div key={key} className='bg-blue-50 p-2 rounded'>
                                                    <p className='text-xs text-gray-600'>{key}</p>
                                                    <p className='text-sm font-semibold text-blue-700'>{String(value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Progress Bar (if in progress) */}
                                {run.status === 'running' && runMetrics.progress && (
                                    <div className='border-t pt-3'>
                                        <div className='flex justify-between text-xs text-gray-600 mb-1'>
                                            <span>Progress</span>
                                            <span>{runMetrics.progress}%</span>
                                        </div>
                                        <div className='w-full bg-gray-200 h-3 rounded'>
                                            <div 
                                                className='bg-green-600 h-3 rounded transition-all' 
                                                style={{ width: `${runMetrics.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


