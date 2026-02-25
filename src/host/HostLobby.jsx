import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketContext';

const emptyQuestion = () => ({
  id: crypto.randomUUID(),
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0
});

const HostLobby = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const [title, setTitle] = useState('New Live Quiz');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const updateQuestion = (index, patch) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const updateOption = (qIndex, optIndex, value) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      const opts = [...q.options];
      opts[optIndex] = value;
      q.options = opts;
      next[qIndex] = q;
      return next;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!socket) return;

    const validQuestions = questions.filter(
      (q) => q.text.trim() && q.options.some((o) => o.trim())
    );
    if (!validQuestions.length) {
      setError('Add at least one question with options.');
      return;
    }

    setIsCreating(true);
    setError('');

    socket.emit(
      'host:createQuiz',
      {
        title: title.trim() || 'Untitled Quiz',
        questions: validQuestions
      },
      (response) => {
        setIsCreating(false);
        if (!response || response.error) {
          setError(response?.error || 'Failed to create quiz.');
          return;
        }
        navigate(`/host/${response.quizId}`, { state: { quizCode: response.code } });
      }
    );
  };

  return (
    <div className="panel panel-host">
      <div className="panel-header">
        <h2>Create a new quiz</h2>
        <p>Set up your questions and share the quiz code with participants.</p>
      </div>
      <form className="panel-body" onSubmit={handleCreate}>
        <label className="field">
          <span className="field-label">Quiz title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Standup Quiz"
          />
        </label>

        <div className="question-list">
          {questions.map((q, qi) => (
            <div key={q.id} className="question-card">
              <div className="question-card-header">
                <span>Question {qi + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => removeQuestion(qi)}
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="muted" style={{ fontSize: '0.75rem', margin: '0 0 0.25rem' }}>
                Type your options below, then pick the correct answer from the dropdown.
              </p>
              <input
                type="text"
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                placeholder="Type your question..."
              />
              <div className="options-grid">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={
                      'option-pill ' +
                      (oi === q.correctIndex ? 'option-pill-correct' : '')
                    }
                  >
                    <span className="option-index">{String.fromCharCode(65 + oi)}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>
              <div className="correct-answer-row">
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  Correct answer
                </span>
                <select
                  className="correct-select"
                  value={q.correctIndex}
                  onChange={(e) =>
                    updateQuestion(qi, { correctIndex: Number(e.target.value) })
                  }
                >
                  {q.options.map((_, oi) => (
                    <option key={oi} value={oi}>
                      {String.fromCharCode(65 + oi)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={addQuestion}>
            + Add question
          </button>
          <div className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={isCreating || !socket}>
            {isCreating ? 'Creating…' : 'Create & go live'}
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </form>
    </div>
  );
};

export default HostLobby;

