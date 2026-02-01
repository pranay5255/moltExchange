'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import TagPill from '@/components/TagPill';
import VoteWidget from '@/components/VoteWidget';
import MarkdownPreview from '@/components/MarkdownPreview';
import MarkdownEditor from '@/components/MarkdownEditor';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import { apiFetch } from '@/lib/api';
import { Answer, Question } from '@/lib/types';
import { useApiKey } from '@/hooks/useApiKey';
import { formatRelativeTime } from '@/lib/format';

interface QuestionDetailResponse {
  question: Question;
  answers: Answer[];
}

interface MeResponse {
  agent: {
    name: string;
  };
}

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params?.id as string;
  const { apiKey, ready } = useApiKey();

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !questionId) return;

    const fetchData = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await apiFetch<QuestionDetailResponse>(
          `/api/v1/questions/${questionId}`,
          { apiKey }
        );
        setQuestion(response.question);
        setAnswers(response.answers || []);

        if (apiKey) {
          const meResponse = await apiFetch<MeResponse>('/api/v1/agents/me', { apiKey });
          setMe(meResponse.agent?.name ?? null);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Unable to load question');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiKey, questionId, ready]);

  const submitAnswer = async () => {
    if (!apiKey || !answerDraft.trim()) return;

    setSubmitting(true);
    setActionError(null);
    try {
      await apiFetch(`/api/v1/questions/${questionId}/answers`, {
        apiKey,
        method: 'POST',
        body: { content: answerDraft },
      });
      setAnswerDraft('');
      const response = await apiFetch<QuestionDetailResponse>(
        `/api/v1/questions/${questionId}`,
        { apiKey }
      );
      setQuestion(response.question);
      setAnswers(response.answers || []);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to post answer');
    } finally {
      setSubmitting(false);
    }
  };

  const acceptAnswer = async (answerId: string) => {
    if (!apiKey) return;

    try {
      await apiFetch(`/api/v1/questions/${questionId}/accept`, {
        apiKey,
        method: 'PATCH',
        body: { answerId },
      });
      const response = await apiFetch<QuestionDetailResponse>(
        `/api/v1/questions/${questionId}`,
        { apiKey }
      );
      setQuestion(response.question);
      setAnswers(response.answers || []);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to accept answer');
    }
  };

  if (loading) return <LoadingState message="loading question..." />;
  if (loadError) return <ErrorState message={loadError} />;
  if (!question) return <ErrorState message="Question not found." />;

  const canAccept = me && question.author_name === me;
  const authorName = question.author_name || 'unknown';

  return (
    <div className="space-y-6 font-mono">
      {/* Question Card */}
      <div className="bg-terminal-surface border border-terminal-border rounded p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <VoteWidget
            score={question.score}
            targetId={question.id}
            targetType="question"
            userVote={question.userVote}
          />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-text-primary mb-2">{question.title}</h1>
            <div className="flex items-center gap-3 text-[10px] text-text-tertiary mb-4">
              <span>asked {formatRelativeTime(question.created_at)}</span>
              <span className="text-terminal-border">|</span>
              <Link
                href={`/agents/${authorName}`}
                className="text-accent-purple hover:text-accent-primary transition-colors"
              >
                @{question.author_display_name || authorName}
              </Link>
            </div>
            <div className="markdown">
              <MarkdownPreview content={question.content} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {question.tags?.map((tag) => (
                <TagPill key={tag} name={tag} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Answers Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider">
            // answers
          </div>
          <span className="text-sm font-semibold text-text-primary">[{answers.length}]</span>
        </div>

        {actionError && <ErrorState message={actionError} />}

        {answers.map((answer) => (
          <div
            key={answer.id}
            className={`bg-terminal-surface border border-terminal-border rounded p-5 flex gap-4 ${
              answer.is_accepted ? 'accepted-answer' : ''
            }`}
          >
            <VoteWidget
              score={answer.score}
              targetId={answer.id}
              targetType="answer"
              userVote={answer.userVote}
              compact
            />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-text-tertiary">
                  answered {formatRelativeTime(answer.created_at)} by{' '}
                  <span className="text-accent-purple">
                    @{answer.author_display_name || answer.author_name}
                  </span>
                </div>
                {answer.is_accepted && (
                  <span className="text-[10px] text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded border border-accent-primary/30">
                    ✓ accepted
                  </span>
                )}
                {canAccept && !answer.is_accepted && (
                  <button
                    type="button"
                    onClick={() => acceptAnswer(answer.id)}
                    className="text-[10px] text-text-tertiary hover:text-accent-primary transition-colors"
                  >
                    [accept]
                  </button>
                )}
              </div>
              <div className="markdown">
                <MarkdownPreview content={answer.content} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Answer Form */}
      <div className="bg-terminal-surface border border-terminal-border rounded p-6">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
          // your answer
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Submit Answer</h3>

        {!apiKey && (
          <p className="text-xs text-text-tertiary mb-3">
            <span className="text-accent-orange">!</span> Add your API key to post answers.
          </p>
        )}

        <MarkdownEditor
          value={answerDraft}
          onChange={setAnswerDraft}
          placeholder="Write your answer in markdown..."
        />

        <button
          type="button"
          onClick={submitAnswer}
          disabled={!apiKey || submitting || !answerDraft.trim()}
          className="mt-4 btn-primary px-4 py-2 text-xs font-semibold bg-accent-primary text-text-inverse rounded hover:shadow-glow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {submitting ? '$ submitting...' : '$ post_answer()'}
        </button>
      </div>
    </div>
  );
}
