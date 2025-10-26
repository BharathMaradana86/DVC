import React from 'react';
import { Appbar } from '../Appbar/Appbar';
import { Sidebar } from '../Sidebar/Sidebar';
import { Outlet } from 'react-router-dom';


export const Layout = () => {
    return (
        <div className='flex flex-col h-screen'>
            <div className='flex'>
                 <Sidebar />
                 <div className='w-full h-full flex flex-col flex-1'>
                     <Appbar />
                     <Outlet />
                 </div>
            </div>
        </div>
    )
}