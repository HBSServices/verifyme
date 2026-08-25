'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [manualHash, setManualHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const calculateSHA256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const executeLookup = async (targetHash: string) => {
    if (!targetHash) return;
    try {
      setVerifying(true);
      setErrorMsg('');
      setResult(null);

      const { data, error } = await supabase
        .from('media')
        .select(`
          id,
          file_name,
          media_type,
          sha256_hash,
          created_at,
          user_id,
          media_policies (
            allow_ai_training,
            allow_ai_editing,
            allow_face_swap,
            allow_commercial
          )
        `)
        .eq('sha256_hash', targetHash)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setResult({
          verified: false,
          hash: targetHash,
        });
      } else {
        setResult({
          verified: true,
          data,
          hash: targetHash,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const urlHash = searchParams.get('hash');
    if (urlHash) {
      setManualHash(urlHash);
      executeLookup(urlHash);
    }
  }, [searchParams]);

  const handleManualVerify = async () => {
    let targetHash = manualHash.trim();
    if (file) {
      targetHash = await calculateSHA256(file);
      setManualHash(targetHash);
    }

    if (!targetHash) {
      setErrorMsg('Please upload a file or enter a SHA-256 hash to verify.');
      return;
    }

    executeLookup(targetHash);
  };

  const downloadCertificate = () => {
    if (!result || !result.verified) return;

    const certificate = {
      standard: 'ProtectMedia Provenance Specification v1.0',
      anchored_at: result.data.created_at,
      asset: {
        file_name: result.data.file_name,
        media_type: result.data.media_type,
        sha256_fingerprint: result.data.sha256_hash,
      },
      creator: {
        id: result.data.user_id,
      },
      enforced_policies: result.data.media_policies?.[0] || {},
      verification_status: 'AUTHENTIC_MATCH',
    };

    const blob = new Blob([JSON.stringify(certificate, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provenance-${result.data.sha256_hash.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-xl w-full p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-lg font-bold mb-4">Check Provenance</h2>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Option 1: Upload File to Check</label>
        <input
          type="file"
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            if (selected) setManualHash('');
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
        />
      </div>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-gray-400 font-semibold">OR</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Option 2: Paste SHA-256 Hash</label>
        <input
          type="text"
          placeholder="Paste 64-character hex hash..."
          value={manualHash}
          onChange={(e) => {
            setManualHash(e.target.value);
            if (e.target.value) setFile(null);
          }}
          className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono focus:outline-blue-500"
        />
      </div>

      <button
        onClick={handleManualVerify}
        disabled={verifying || (!file && !manualHash)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition"
      >
        {verifying ? 'Verifying on-chain/ledger...' : 'Verify Authenticity'}
      </button>

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {result && (
        <div className={`mt-6 p-4 rounded-xl border ${result.verified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-3 h-3 rounded-full ${result.verified ? 'bg-green-600' : 'bg-amber-500'}`}></span>
              <h3 className="font-bold text-sm">
                {result.verified ? 'Cryptographically Verified' : 'No Anchor Found'}
              </h3>
            </div>
            {result.verified && (
              <button
                onClick={downloadCertificate}
                className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-2.5 rounded shadow-sm transition"
              >
                Export Certificate (JSON)
              </button>
            )}
          </div>

          <p className="font-mono text-xs text-gray-600 break-all mb-3">
            Hash: {result.hash}
          </p>

          {result.verified ? (
            <div className="space-y-2 text-xs text-gray-800">
              <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-green-100">
                <div><span className="font-semibold">Registered File:</span> {result.data.file_name}</div>
                <div><span className="font-semibold">Anchored At:</span> {new Date(result.data.created_at).toLocaleDateString()}</div>
                <div className="col-span-2"><span className="font-semibold">Creator ID:</span> <span className="font-mono">{result.data.user_id}</span></div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-green-100">
                <h4 className="font-semibold mb-2 text-gray-900">Enforced AI Rights:</h4>
                <ul className="space-y-1">
                  <li>AI Training: <strong>{result.data.media_policies?.[0]?.allow_ai_training ? 'Allowed' : 'Prohibited'}</strong></li>
                  <li>AI Editing: <strong>{result.data.media_policies?.[0]?.allow_ai_editing}</strong></li>
                  <li>Face Swapping: <strong>{result.data.media_policies?.[0]?.allow_face_swap ? 'Allowed' : 'Prohibited'}</strong></li>
                  <li>Commercial Use: <strong>{result.data.media_policies?.[0]?.allow_commercial ? 'Allowed' : 'Prohibited'}</strong></li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-800">
              This media fingerprint has not been registered in the provenance database. It may be unauthenticated or modified from the original.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-gray-900">
      <div className="w-full max-w-2xl mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          ProtectMedia Verification Portal
        </h1>
        <p className="text-gray-600 mt-2">
          Verify cryptographic authenticity, origin timestamp, and enforced AI training rights.
        </p>
        <Link href="/" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
          &larr; Back to Creator Dashboard
        </Link>
      </div>

      <Suspense fallback={<div className="text-sm text-gray-500">Loading lookup portal...</div>}>
        <VerifyContent />
      </Suspense>
    </main>
  );
}