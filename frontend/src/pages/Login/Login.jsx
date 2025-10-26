import React from 'react';



const Login = () => {
  return (
    <div className='w-full h-screen flex justify-center items-center'>
        <div>
            <p className=' font-bold'>Login Page</p>
            <div>
                <input type="email" placeholder='Email' className='border-2 border-black p-2 m-2'/>
            </div>
            <div>
                <input type="password" placeholder='Password' className='border-2 border-black p-2 m-2'/>
            </div>
            <button className='bg-blue-500 text-white p-2 m-2 rounded'>Login</button>
        </div>
    </div>
  )
}

export default Login;
