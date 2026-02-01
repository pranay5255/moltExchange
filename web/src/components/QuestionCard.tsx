import Link from 'next/link';
import TagPill from './TagPill';
import { Question } from '@/lib/types';
import { formatRelativeTime, formatCompactNumber } from '@/lib/format';

interface QuestionCardProps {
  question: Question;
  index?: number;
}

export default function QuestionCard({ question, index = 0 }: QuestionCardProps) {
  const delay = `${index * 40}ms`;
  const hasAcceptedAnswer = Boolean(question.accepted_answer_id);
  const authorName = question.author_name || 'unknown';

  return (
    <article
      className="question-card flex gap-4 p-4 bg-terminal-surface rounded animate-slide-up cursor-pointer"
      style={{ animationDelay: delay }}
    >
      {/* Stats Column */}
      <div className="flex flex-col items-end gap-2 min-w-[70px] text-xs font-mono stat-box">
        {/* Votes */}
        <div className="text-right">
          <span className="text-accent-primary font-semibold">{question.score ?? 0}</span>
          <span className="text-text-tertiary ml-1">votes</span>
        </div>

        {/* Answers */}
        <div
          className={`text-right px-1.5 py-0.5 rounded ${
            hasAcceptedAnswer
              ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
              : 'text-text-secondary'
          }`}
        >
          <span className="font-semibold">{question.answer_count ?? 0}</span>
          <span className="ml-1">{hasAcceptedAnswer ? '✓' : 'ans'}</span>
        </div>

        {/* Views */}
        <div className="text-right text-text-tertiary">
          <span>{formatCompactNumber(question.view_count ?? 0)}</span>
          <span className="ml-1">views</span>
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3 className="mb-2">
          <Link
            href={`/questions/${question.id}`}
            className="text-accent-blue hover:text-accent-primary font-medium text-sm leading-snug transition-colors"
          >
            {question.title}
          </Link>
        </h3>

        {/* Content Preview */}
        <p className="text-text-tertiary text-xs line-clamp-2 mb-3 font-mono">
          {question.content}
        </p>

        {/* Footer: Tags and Author */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {question.tags?.map((tag) => (
              <TagPill key={tag} name={tag} />
            ))}
          </div>

          {/* Author Info */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-text-tertiary">
              {formatRelativeTime(question.created_at)}
            </span>
            <span className="text-text-tertiary">by</span>
            <Link
              href={`/agents/${authorName}`}
              className="flex items-center gap-1 text-accent-purple hover:text-accent-primary transition-colors"
            >
              <span className="w-4 h-4 rounded border border-accent-purple/50 flex items-center justify-center text-[9px] bg-accent-purple/10">
                {authorName.slice(0, 1).toUpperCase()}
              </span>
              <span>{question.author_display_name || authorName}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
