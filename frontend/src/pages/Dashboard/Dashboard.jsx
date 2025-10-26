import React from 'react';
import { SideHeading } from '../../components/SideHeading/SideHeading';
import { useNavigate } from 'react-router-dom';
import { listProjects } from '../../services/projectsService';

export const Dashboard = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = React.useState([]);
    const [recentActivity] = React.useState([
        '🔄 Training: YOLOv5-v2 (45%)',
        '✅ Data uploaded: training-v3',
        '✅ Training completed: YOLOv5-v1'
    ]);

    React.useEffect(() => {
        listProjects().then((data) => setProjects(Array.isArray(data) ? data : [])).catch(() => setProjects([]));
    }, []);

    return (
        <div className='flex flex-1 h-full flex-col'>
            <SideHeading title={'Dashboard'}/>

            <div className='ml-[32px] mt-[24px] mr-[32px]'>
                <p className='font-semibold mb-3'>Quick Actions</p>
                <div className='flex gap-4'>
                    <button className='border rounded w-[160px] h-[80px] flex items-center justify-center hover:shadow' onClick={() => navigate('/upload-dataset')}>
                        <div className='text-center'>
                            <div>📁 Upload Data</div>
                        </div>
                    </button>
                    <button className='border rounded w-[160px] h-[80px] flex items-center justify-center hover:shadow' onClick={() => navigate('/models')}>
                        <div className='text-center'>
                            <div>⚡ Train Model</div>
                        </div>
                    </button>
                </div>

                <div className='mt-8'>
                    <p className='font-semibold mb-3'>Active Projects</p>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {projects.slice(0, 6).map((p, idx) => (
                            <div key={idx} className='border rounded p-4 hover:shadow cursor-pointer' onClick={() => navigate('/projects')}>
                                <p className='font-semibold'>{p.projectName}</p>
                                <p className='text-sm text-gray-600'>3 datasets • 2 models • 1 training</p>
                            </div>
                        ))}
                        {projects.length === 0 && (
                            <div className='text-gray-600'>No projects yet. Create one from the Projects page.</div>
                        )}
                    </div>
                </div>

                <div className='mt-8'>
                    <p className='font-semibold mb-3'>Recent Activity</p>
                    <div className='space-y-2'>
                        {recentActivity.map((a, i) => (
                            <div key={i} className='border rounded p-3 w-full md:w-[480px]'>{a}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}