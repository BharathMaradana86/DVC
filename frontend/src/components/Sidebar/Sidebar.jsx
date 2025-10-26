import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Sidebar = () => {
    const navigator = useNavigate();
    return (
        <aside className='w-[245px] h-screen bg-gray-200 p-4'>
            <div className='h-[80px]'>
                <p className='font-bold text-2xl'>DVC Studio</p>
            </div>
            <nav className='mt-8'>
                <ul className='space-y-5'>    
                    {/* <li className='p-2 hover:bg-gray-300' onClick={() => navigator('/overview')}>
                        <a href='#dashboard' className='block'>Dashboard</a>
                    </li> */}
                    <li className='p-2 hover:bg-gray-300' onClick={() => navigator('/projects')}>
                        <a href='#item2' className='block'>Projects</a>
                    </li>
                    <li className='p-2 hover:bg-gray-300' onClick={() => navigator('/upload-dataset')}>
                        <a href='#item3' className='block'>Datasets</a>
                    </li>
                    <li className='p-2 hover:bg-gray-300' onClick={() => navigator('/models')}>
                        <a href='#item3' className='block'>Models</a>
                    </li>
                    <li className='p-2 hover:bg-gray-300' onClick={() => navigator('/training')}>
                        <a href='#item3' className='block'>Training</a>
                    </li>
                </ul>
            </nav>
        </aside>
    )
}