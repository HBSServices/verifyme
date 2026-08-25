'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface MediaItem {
    id: string;
    file_name: string;
    media_type: string;
    sha256_hash: string;
    created_at: string;
    storage_path: string;
    media_policies?: {
        allow_ai_training: boolean;
        allow_ai_editing: string;
        allow_face_swap: boolean;
        allow_commercial: boolean;
    }[];
}

export default function MediaGallery({ userId }: { userId: string }) {
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchUserMedia = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('media')
                .select(`
          id,
          file_name,
          media_type,
          sha256_hash,
          created_at,
          storage_path,
          media_policies (
            allow_ai_training,
            allow_ai_editing,
            allow_face_swap,
            allow_commercial
          )
        `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMediaList(data || []);
        } catch (err: any) {
            console.error('Error fetching media:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchUserMedia();
        }
    }, [userId]);

    const copyHash = (hash: string, id: string) => {
        navigator.clipboard.writeText(hash);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="w-full max-w-xl p-6 bg-white rounded-xl shadow-md border border-gray-200 text-center text-sm text-gray-500">
                Loading anchored media assets...
            </div>
        );
    }

    return (
        <div className="max-w-xl w-full p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Your Protected Assets</h2>
                <button
                    onClick={fetchUserMedia}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                    Refresh List
                </button>
            </div>

            {mediaList.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                    No media registered yet. Use the uploader above to protect your first asset.
                </p>
            ) : (
                <div className="space-y-4">
                    {mediaList.map((item) => {
                        const policy = item.media_policies?.[0];
                        return (
                            <div
                                key={item.id}
                                className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition flex flex-col gap-2"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-sm text-gray-900">{item.file_name}</h3>
                                        <p className="text-xs text-gray-500">
                                            Anchored: {new Date(item.created_at).toLocaleDateString()} &bull; {item.media_type}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/verify?hash=${item.sha256_hash}`}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                                    >
                                        Verify Link &rarr;
                                    </Link>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-hidden">
                                    <span className="text-gray-500 shrink-0">SHA-256:</span>
                                    <span className="truncate text-gray-700">{item.sha256_hash}</span>
                                    <button
                                        onClick={() => copyHash(item.sha256_hash, item.id)}
                                        className="ml-auto shrink-0 text-blue-600 hover:text-blue-800 font-sans text-xs font-semibold"
                                    >
                                        {copiedId === item.id ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>

                                {policy && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${!policy.allow_ai_training ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                            AI Training: {!policy.allow_ai_training ? 'No' : 'Allowed'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${!policy.allow_commercial ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                            Commercial: {!policy.allow_commercial ? 'No' : 'Allowed'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            Edit: {policy.allow_ai_editing}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}