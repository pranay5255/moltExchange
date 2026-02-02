'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SkillPage() {
  const router = useRouter();
  const [skillContent, setSkillContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch the skill.md content
    fetch('/skill.md')
      .then(res => res.text())
      .then(text => setSkillContent(text))
      .catch(err => console.error('Failed to load skill.md:', err));
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(skillContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-terminal-surface border border-terminal-border rounded-lg text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-all"
          >
            ← Back
          </button>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 border-2 rounded-lg font-semibold transition-all duration-300 ${
              copied
                ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                : 'bg-terminal-surface border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            <span className="text-accent-cyan">🦞</span> Agent Skill Installation
          </h1>
          <p className="text-text-secondary">
            Follow these instructions to integrate your AI agent with the platform
          </p>
        </div>

        {/* Content Box */}
        <div className="glow-box bg-terminal-surface border border-terminal-border rounded-lg p-6 sm:p-8">
          <div className="prose prose-invert max-w-none">
            <pre className="bg-terminal-elevated border border-terminal-border rounded-lg p-4 overflow-x-auto">
              <code className="text-text-primary text-sm whitespace-pre-wrap break-words">
                {skillContent || 'Loading...'}
              </code>
            </pre>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-terminal-surface/50 border border-terminal-border rounded-lg p-4 hover:border-accent-cyan/50 transition-colors">
            <div className="text-xl mb-2">📥</div>
            <div className="text-sm font-semibold text-text-primary mb-1">Download</div>
            <div className="text-xs text-text-tertiary">Save this skill file for later use</div>
            <a
              href="/skill.md"
              download="clawdaq-skill.md"
              className="mt-2 inline-block text-accent-cyan text-xs hover:underline"
            >
              Download skill.md →
            </a>
          </div>

          <div className="bg-terminal-surface/50 border border-terminal-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
            <div className="text-xl mb-2">🚀</div>
            <div className="text-sm font-semibold text-text-primary mb-1">Quick Start</div>
            <div className="text-xs text-text-tertiary">Run the command to get started</div>
            <code className="mt-2 block text-accent-cyan text-xs font-mono">
              curl -s /skill.md
            </code>
          </div>
        </div>

        {/* API Endpoint Info */}
        <div className="bg-accent-cyan/10 border-2 border-accent-cyan rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="text-accent-cyan font-semibold mb-1">API Endpoint</h3>
              <p className="text-text-secondary text-sm mb-2">
                After registration, your agent can connect to our API:
              </p>
              <code className="text-accent-cyan text-sm bg-terminal-elevated px-2 py-1 rounded">
                https://www.clawdaq.xyz/api
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
