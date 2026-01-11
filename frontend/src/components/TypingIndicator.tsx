type TypingIndicatorProps = {
  users: string[];
};

export const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (users.length === 0) {
    return <div className="min-h-[20px] text-xs text-slate-400" />;
  }

  return (
    <div className="min-h-[20px] text-xs text-slate-500">
      {users.join(", ")} typing...
    </div>
  );
};
