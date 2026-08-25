'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function MediaUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [mediaHash, setMediaHash] = useState<string>('');
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);

    // Policy options state
    const [allowAiTraining, setAllowAiTraining] = useState(false);
    const [allowAiEditing, setAllowAiEditing] = useState('require_approval');
    const [allowFaceSwap, setAllowFaceSwap] = useState(false);
    const [allowCommercial, setAllowCommercial] = useState(false);

    const calculateSHA256 = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setUploading(true);
            setAlreadyRegistered(false);
            setStatus('Calculating cryptographic hash...');

            const hash = await calculateSHA256(file);
            setMediaHash(hash);

            setStatus('Checking provenance registry...');
            const { data: existingMedia, error: checkError } = await supabase
                .from('media')
                .select('id, file_name, created_at, user_id')
                .eq('sha256_hash', hash)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingMedia) {
                setAlreadyRegistered(true);
                setStatus(`Notice: This file was already registered on ${new Date(existingMedia.created_at).toLocaleDateString()}. Duplicate entry prevented.`);
                setUploading(false);
                return;
            }

            setStatus('Checking authentication session...');
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setStatus('Error: You must be logged in to upload and register media.');
                setUploading(false);
                return;
            }

            setStatus('Uploading file to secure storage...');
            const filePath = `${user.id}/${Date.now()}_${file.name}`;

            const { error: storageError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file);

            if (storageError) throw storageError;

            setStatus('Writing provenance and policy records...');
            const { data: mediaData, error: dbError } = await supabase
                .from('media')
                .insert({
                    user_id: user.id,
                    file_name: file.name,
                    storage_path: filePath,
                    media_type: file.type,
                    sha256_hash: hash,
                })
                .select()
                .single();

            if (dbError) throw dbError;

            const { error: policyError } = await supabase.from('media_policies').insert({
                media_id: mediaData.id,
                allow_ai_training: allowAiTraining,
                allow_ai_editing: allowAiEditing,
                allow_face_swap: allowFaceSwap,
                allow_commercial: allowCommercial,
            });

            if (policyError) throw policyError;

            setStatus('Registration complete! Media fingerprint and customized policies secured.');
            if (onUploadSuccess) onUploadSuccess();
        } catch (err: any) {
            setStatus(`Error: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-xl w-full p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Register & Protect Media</h2>
                <Link href="/verify" className="text-xs text-blue-600 hover:underline">
                    Go to Verification &rarr;
                </Link>
            </div>

            <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setStatus('');
                    setMediaHash('');
                    setAlreadyRegistered(false);
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4 cursor-pointer"
            />

            {/* Policy Configuration Controls */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Configure AI Rights</h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allowAiTraining}
                            onChange={(e) => setAllowAiTraining(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Allow AI Model Training</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allowFaceSwap}
                            onChange={(e) => setAllowFaceSwap(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Allow Face Swapping</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allowCommercial}
                            onChange={(e) => setAllowCommercial(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Allow Commercial Use</span>
                    </label>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-600">AI Editing:</span>
                        <select
                            value={allowAiEditing}
                            onChange={(e) => setAllowAiEditing(e.target.value)}
                            className="border border-gray-300 rounded p-1 bg-white text-xs font-medium focus:outline-blue-500"
                        >
                            <option value="prohibited">Prohibited</option>
                            <option value="require_approval">Require Approval</option>
                            <option value="allowed">Allowed</option>
                        </select>
                    </div>
                </div>
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition"
            >
                {uploading ? 'Processing...' : 'Upload & Anchor Identity'}
            </button>

            {status && (
                <div className={`mt-4 p-3 rounded-lg text-sm border ${alreadyRegistered ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                    <p className="font-medium">{status}</p>
                    {mediaHash && (
                        <p className="mt-1 font-mono text-xs text-gray-500 break-all">
                            SHA-256: {mediaHash}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}