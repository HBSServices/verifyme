'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface MediaGalleryProps {
    userId: string;
}

interface MediaItem {
    id: string;
    file_name: string;
    file_path: string;
    sha256_hash: string;
    created_at: string;
}

export default function MediaGallery({ userId }: MediaGalleryProps) {
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('media')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMediaList(data || []);
        } catch (err) {
            console.error('Error fetching media:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchMedia();
        }
    }, [userId]);

    const handleDownload = async (item: MediaItem) => {
        try {
            setDownloadingId(item.id);

            const { data, error } = await supabase.storage
                .from('media')
                .download(item.file_path);

            if (error) throw error;

            // Create a blob URL and trigger an automatic file download
            const blobUrl = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = item.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Failed to download image:', err);
            alert('Could not download image. Ensure your Supabase storage permissions allow file downloads.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return <div className="text-sm text-gray-500">Loading your registered media...</div>;
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Secured Media Library</h2>

            {mediaList.length === 0 ? (
                <p className="text-sm text-gray-500">No media registered yet. Upload an image to get started.</p>
            ) : (
                <div className="space-y-4">
                    {mediaList.map((item) => (
                        <div
                            key={item.id}
                            className="p-4 border border-gray-100 bg-gray-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-800">{item.file_name}</p>
                                <p className="text-xs font-mono text-gray-500 break-all">
                                    Hash: {item.sha256_hash.slice(0, 16)}...{item.sha256_hash.slice(-8)}
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    Registered on {new Date(item.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(item)}
                                    disabled={downloadingId === item.id}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition shadow-sm"
                                >
                                    {downloadingId === item.id ? 'Downloading...' : 'Download Image'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}