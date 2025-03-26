'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Use this for navigation in App Router
import axios from 'axios';
import { logout } from '@/actions/auth';

const HomePage = () => {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(`${process.env.NEXT_BACKEND_URL}user/current`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status == 200) {
          router.push('/home');
        }
      } catch (error) {
        console.error('Error verifying authentication:', error);
        await handleLogout();
      }
    })();
  }, []);

  const handleLogout = async() => {
    await logout();
    router.push('/'); // Redirect to home page after logout
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black"
      style={{
        backgroundImage: "url('https://source.unsplash.com/1920x1080/?dashboard,camera')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-md w-full bg-opacity-75 bg-gray-900 p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-white mb-6">
          Welcome to Dashcam
        </h1>
          <div>
            <p className="mb-6 text-gray-600 text-center">
              Please log in or sign up to continue.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="px-4 py-2 bg-green-600 text-white rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                Sign Up
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default HomePage;
