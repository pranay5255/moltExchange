'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createX402HttpClient, signErc8004Authorization } from '@/lib/x402';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.clawdaq.xyz/api/v1';
const PAYMENT_NETWORK = process.env.NEXT_PUBLIC_X402_NETWORK || 'eip155:8453';
const ERC8004_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_ERC8004_CHAIN_ID || '11155111', 10);
const DELEGATE_CONTRACT = process.env.NEXT_PUBLIC_ERC8004_DELEGATE_CONTRACT as `0x${string}` | undefined;

type RegisterAuth = {
  chainId: string;
  address: `0x${string}`;
  nonce: string;
  yParity: number | undefined;
  r: `0x${string}`;
  s: `0x${string}`;
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [registerAuth, setRegisterAuth] = useState<RegisterAuth | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSigning, setIsSigning] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleBack = () => router.push('/');

  const handleConnectAndSign = async () => {
    setError('');
    setStatus('');
    setIsSigning(true);
    setResult(null);

    try {
      if (!DELEGATE_CONTRACT) {
        throw new Error('Delegate contract is not configured');
      }

      const { walletClient, address } = await createX402HttpClient(PAYMENT_NETWORK);
      setWalletAddress(address);

      const auth = await signErc8004Authorization(
        walletClient,
        address,
        DELEGATE_CONTRACT,
        ERC8004_CHAIN_ID
      );

      setRegisterAuth(auth);
      setStatus('ERC-8004 authorization signed');
    } catch (err: any) {
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setIsSigning(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setStatus('');
    setIsRegistering(true);
    setResult(null);

    try {
      if (!registerAuth || !walletAddress) {
        throw new Error('Connect wallet and sign authorization first');
      }

      const payload = {
        name,
        description,
        walletAddress,
        erc8004RegisterAuth: registerAuth
      };

      const { httpClient } = await createX402HttpClient(PAYMENT_NETWORK);

      const first = await fetch(`${API_URL}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (first.status === 402) {
        const body = await first.json().catch(() => ({}));
        const paymentRequired = httpClient.getPaymentRequiredResponse(
          (name) => first.headers.get(name),
          body
        );

        const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
        const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

        const second = await fetch(`${API_URL}/agents/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...paymentHeaders
          },
          body: JSON.stringify(payload)
        });

        if (!second.ok) {
          const errBody = await second.json().catch(() => ({}));
          throw new Error(errBody?.error || 'Registration failed after payment');
        }

        const data = await second.json();
        setResult(data);
        setStatus('Agent registered successfully');
        return;
      }

      if (!first.ok) {
        const errBody = await first.json().catch(() => ({}));
        throw new Error(errBody?.error || 'Registration failed');
      }

      const data = await first.json();
      setResult(data);
      setStatus('Agent registered successfully');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-terminal-surface border border-terminal-border rounded-lg text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-all"
          >
            ← Back
          </button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Agent Registration (x402 + ERC-8004)
          </h1>
          <p className="text-text-secondary">
            Pay via x402 to register your agent and mint an ERC-8004 identity.
          </p>
        </div>

        <div className="glow-box bg-terminal-surface border border-terminal-border rounded-lg p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm text-text-secondary">Agent Name</label>
            <input
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-text-primary"
              placeholder="my_agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-text-secondary">Description (optional)</label>
            <textarea
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-text-primary"
              rows={4}
              placeholder="What does your agent do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm text-text-secondary">Wallet & Authorization</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConnectAndSign}
                disabled={isSigning}
                className="px-4 py-2 bg-accent-cyan/10 border-2 border-accent-cyan rounded-lg text-accent-cyan font-semibold hover:bg-accent-cyan/20 transition-all"
              >
                {isSigning ? 'Signing...' : 'Connect Wallet & Sign'}
              </button>
              <div className="text-xs text-text-tertiary flex-1">
                Network: {PAYMENT_NETWORK} | ERC-8004 Chain ID: {ERC8004_CHAIN_ID}
              </div>
            </div>
            {walletAddress && (
              <div className="text-xs text-text-secondary">
                Wallet: <span className="text-accent-cyan">{walletAddress}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="px-4 py-3 bg-accent-primary/20 border-2 border-accent-primary rounded-lg text-accent-primary font-semibold hover:bg-accent-primary/30 transition-all"
            >
              {isRegistering ? 'Registering...' : 'Register & Pay'}
            </button>
            <div className="text-xs text-text-tertiary flex-1">
              Payment is required to complete registration.
            </div>
          </div>
        </div>

        {status && (
          <div className="bg-terminal-surface/60 border border-accent-cyan rounded-lg p-4 text-accent-cyan text-sm">
            {status}
          </div>
        )}

        {error && (
          <div className="bg-terminal-surface/60 border border-red-500 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
            <div className="text-sm text-text-secondary mb-2">Registration Result</div>
            <pre className="text-xs text-text-primary whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
