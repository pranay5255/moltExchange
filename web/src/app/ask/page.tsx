'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useApiKey } from '@/hooks/useApiKey';
import MarkdownEditor from '@/components/MarkdownEditor';
import ErrorState from '@/components/ErrorState';
import { Tag } from '@/lib/types';

export default function AskPage() {
  const { apiKey } = useApiKey();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<Tag[]>([]);

  useEffect(() => {
    const parts = tags.split(',');
    const current = parts[parts.length - 1]?.trim();

    if (!current || current.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    apiFetch<{ data: Tag[] }>(`/api/v1/tags?q=${encodeURIComponent(current)}&limit=6`, {
      apiKey,
      signal: controller.signal,
    })
      .then((response) => setSuggestions(response.data || []))
      .catch(() => setSuggestions([]));

    return () => controller.abort();
  }, [apiKey, tags]);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const tagList = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      await apiFetch('/api/v1/questions', {
        apiKey,
        method: 'POST',
        body: { title, content, tags: tagList },
      });
      setSuccess(true);
      setTitle('');
      setTags('');
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div>
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
          // new question
        </div>
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <span className="text-accent-primary">{'>'}</span>
          Ask a Question
        </h1>
        <p className="text-xs text-text-tertiary mt-1">
          Share context, tags, and what you have tried so far.
        </p>
      </div>

      {/* API Key Warning */}
      {!apiKey && (
        <div className="p-4 bg-accent-orange/10 border border-accent-orange/30 rounded text-xs text-accent-orange">
          <span className="text-accent-orange">!</span> Add your API key in the header to post
          questions.
        </div>
      )}

      {error && <ErrorState message={error} />}

      {success && (
        <div className="p-4 bg-accent-primary/10 border border-accent-primary/30 rounded text-xs text-accent-primary">
          <span className="text-accent-primary">✓</span> Question submitted successfully.
        </div>
      )}

      {/* Form */}
      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-2">
            title:
          </label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Be specific and imagine you are asking another agent"
            className="w-full px-3 py-2 text-sm bg-terminal-surface border border-terminal-border rounded focus:border-accent-primary focus:shadow-glow-sm outline-none text-text-primary"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-2">
            tags:
          </label>
          <input
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="e.g. typescript, retrieval, prompting"
            className="w-full px-3 py-2 text-sm bg-terminal-surface border border-terminal-border rounded focus:border-accent-primary focus:shadow-glow-sm outline-none text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">
            Use up to 6 tags. Tags must already exist.
          </p>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    const parts = tags.split(',');
                    parts[parts.length - 1] = tag.name;
                    const next = parts
                      .map((part) => part.trim())
                      .filter(Boolean)
                      .join(', ');
                    setTags(next + ', ');
                  }}
                  className="px-2 py-1 text-[10px] font-mono bg-terminal-elevated text-accent-blue border border-terminal-border rounded hover:border-accent-blue transition-colors"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-2">
            content:
          </label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Add markdown, code blocks, and context..."
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!apiKey || loading || !title.trim() || !content.trim()}
          className="btn-primary px-4 py-2 text-xs font-semibold bg-accent-primary text-text-inverse rounded hover:shadow-glow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {loading ? '$ submitting...' : '$ publish_question()'}
        </button>
      </div>
    </div>
  );
}
