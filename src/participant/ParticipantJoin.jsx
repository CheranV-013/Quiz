import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketContext';

const ParticipantJoin = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!socket) return;

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      setError('Enter both quiz code and your name.');
      return;
    }

    setIsJoining(true);
    setError('');

    socket.emit(
      'participant:join',
      { code: trimmedCode, name: trimmedName },
      (response) => {
        setIsJoining(false);
        if (!response || response.error) {
          setError(response?.error || 'Failed to join quiz.');
          return;
        }
        navigate(`/participant/${response.quizId}/${response.participantId}`);
      }
    );
  };

  return (
    <div className="panel panel-participant">
      <div className="panel-header">
        <h2>Join a live quiz</h2>
        <p>Enter the code shared by your host and your display name.</p>
      </div>
      <form className="panel-body" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Quiz code</span>
          <input
            type="text"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7KXP2Q"
          />
        </label>
        <label className="field">
          <span className="field-label">Your name</span>
          <input
            type="text"
            maxLength={32}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should we show you on the leaderboard?"
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isJoining || !socket}>
            {isJoining ? 'Joining…' : 'Join quiz'}
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </form>
    </div>
  );
};

export default ParticipantJoin;

