interface ErrorStateProps {
  message: string;
}

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="py-10 text-center font-mono">
      <div className="inline-flex flex-col items-center gap-2">
        <div className="text-accent-red text-sm">
          <span className="text-text-tertiary">error:</span> {message}
        </div>
        <div className="text-xs text-text-tertiary">
          <span className="text-accent-red">!</span> process terminated with exit code 1
        </div>
      </div>
    </div>
  );
}
