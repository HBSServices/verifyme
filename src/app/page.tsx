'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Auth from '@/components/Auth';
import MediaUpload from '@/components/MediaUpload';
import MediaGallery from '@/components/MediaGallery';
import Link from 'next/link';

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500 font-medium">Loading platform...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">
                VerifyMe
              </h1>
              <p className="text-xs text-gray-500">Media Provenance & Rights Registry</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
            >
              Public Verifier &rarr;
            </Link>
            {session && (
              <button
                onClick={handleSignOut}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {!session ? (
          <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Creator Authentication</h2>
              <p className="text-xs text-gray-500 mt-1">
                Log in to register media and manage your provenance signatures.
              </p>
            </div>
            <Auth />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1">
              <MediaUpload onUploadSuccess={() => { }} />
            </div>
            <div className="lg:col-span-2">
              <MediaGallery userId={session.user.id} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}