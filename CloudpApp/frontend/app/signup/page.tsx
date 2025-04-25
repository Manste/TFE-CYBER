'use client';

import React, { useEffect, useState } from 'react';
import { register } from '@/actions/auth';
import { useRouter } from 'next/navigation'; // Use this for navigation in App Router
import axios from 'axios';

const SignUp = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // Email state
  const [passphrase, setPassphrase] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passphraseError, setPassphraseError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return ;

        const response = await axios.get(`${process.env.NEXT_BACKEND_URL}user/current`, {
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

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const passphraseRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const usernameRegex = /^[A-Za-z0-9]{6,}$/;

  const handleRegister = async (e: any) => {
    e.preventDefault();

    // Validate required fields
    if (
      !username ||
      !email ||
      passphrase 
    ) {
      setMessage('Please fill in all required fields.');
      return;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email address.');
      return;
    }

    // Prepare user data
    const userData = {
      username,
      email,
      passphrase, 
    };

    try {

      const response:  any = await register(userData);
      
      if (response.status != 200) {
        setMessage('Registration failed');
      }
      const data = await response.data;
      
      if (data && data.success) {
        setMessage(data.message || 'Registration successful!');
      }
    } catch (error : any) {
      setMessage(error.message || 'An error occurred. Please try again.');
    }
  };

  const handleEmailChange = (e: any) => {
  const value = e.target.value;
  setEmail(value);

  // Validate email format
  if (!emailRegex.test(value)) {
    setEmailError('Invalid email address.');
  } else {
    setEmailError('');
  }
};

const handlePasswordChange = (e: any) => {
  const value = e.target.value;
  setPassphrase(value);

  if (!passphraseRegex.test(value)) {
    setPassphraseError('Invalid password:  Ensures at least one letter, one digit (0-9), one special character from @$!%*?&, with the total length is at least 8 characters');
  } else {
    setPassphraseError('');
  }  
}

const handleUsernameChange = (e: any) => {
  const value = e.target.value;
  setUsername(value);

  if (!usernameRegex.test(value)) {
    setUsernameError("");
  } else {
    setUsernameError("");
  }
}


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
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Create Your DashSecure Account
        </h2>
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-400">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              required
              className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
              className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>
          <div>
            <label htmlFor="passphrase" className="block text-sm font-medium text-gray-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={email}
              onChange={handlePasswordChange}
              required
              className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {passphraseError && <p className="text-red-500 text-sm mt-1">{passphraseError}</p>}
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={!!emailError}
          >
            Sign Up
          </button> 
        </form>
        {message && (
          <p className="mt-4 text-center text-sm text-gray-300">{message}</p>
        )}
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-500">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
