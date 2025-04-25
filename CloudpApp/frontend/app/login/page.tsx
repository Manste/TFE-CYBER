'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Use this for navigation in App Router
import { login } from '@/actions/auth';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const passphraseRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const usernameRegex = /^[A-Za-z0-9]{6,}$/;
  
  useEffect(() => {
      (async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
  
          const response = await axios.get('https://localhost:8080/api/user/current', {
            headers: { Authorization: `Bearer ${token}` },
          });
  
          if (response.status == 200) {
            router.push('/home');
          }
        } catch (error) {
          localStorage.removeItem('token');
        }
      })();
    }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await login(username, password);
    
    if (response.status != 200) {
      setMessage(response.message);
      router.push('/');
    } else {
      router.push('/home');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black"
      style={{
        backgroundImage: "url('/public/dashcam-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-md w-full bg-opacity-75 bg-gray-900 p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Welcome Back to DashSecure
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-400">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-400">
              Password
            </label>
            <input
              id="password"
              type="test"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Log In
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-sm text-gray-300">{message}</p>
        )}
        <p className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-400 hover:text-blue-500">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
