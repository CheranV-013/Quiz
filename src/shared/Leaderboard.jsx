import React from 'react';

const Leaderboard = ({ participants, compact = false, highlightId }) => {
  if (!participants || participants.length === 0) {
    return <p className="muted">No scores yet.</p>;
  }

  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return (
    <ol className={'leaderboard ' + (compact ? 'leaderboard-compact' : '')}>
      {sorted.map((p, idx) => (
        <li
          key={p.id}
          className={
            'leaderboard-row ' + (highlightId && p.id === highlightId ? 'leaderboard-highlight' : '')
          }
        >
          <span className="leaderboard-rank">{idx + 1}</span>
          <span className="leaderboard-name">{p.name}</span>
          <span className="leaderboard-score">{p.score} pts</span>
        </li>
      ))}
    </ol>
  );
};

export default Leaderboard;

