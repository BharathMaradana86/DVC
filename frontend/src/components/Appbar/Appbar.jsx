import React from 'react';


export const Appbar = () => {
    return (
                <div className='w-full h-[60px] bg-blue-100 box-shadow-lg'>
                    {/* <h1 className='text-white font-bold'>My App</h1> */}
                    <div className='flex justify-end items-center h-full px-4'>
                                <div className='mr-4'>
                                    <p className='font-bold'>User Name</p>
                                    <p className='text-sm text-gray-600'>Role</p>
                                </div>
                               
                    </div>
                
                </div>
    )
}