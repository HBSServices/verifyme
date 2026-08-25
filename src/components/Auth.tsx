'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMessage(`Sign Up Error: ${error.message}`);
        else setMessage('Registration successful! You can now log in.');
        setLoading(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage(`Login Error: ${error.message}`);
        else setMessage('Logged in successfully!');
        setLoading(false);
    };

    return (
        <div className="max-w-md w-full p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Creator Authentication</h3>
            <form className="flex flex-col gap-3">
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm w-full text-black focus:outline-blue-500"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border border-gray-300 p-2.5 rounded-lg text-sm w-full text-black focus:outline-blue-500"
                    required
                />
                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={handleLogin}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Log In'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSignUp}
                        disabled={loading}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg text-sm border border-gray-300 transition disabled:opacity-50"
                    >
                        Sign Up
                    </button>
                </div>
            </form>
            {message && <p className="mt-3 text-xs font-medium text-gray-700">{message}</p>}
        </div>
    );
}