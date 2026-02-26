import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketContext';

/* ---------- EMPTY QUESTION TEMPLATE ---------- */
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

  /* ---------- UPDATE QUESTION ---------- */
  const updateQuestion = (index, patch) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  /* ---------- UPDATE OPTION ---------- */
  const updateOption = (qIndex, optIndex, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;

        const updatedOptions = [...q.options];
        updatedOptions[optIndex] = value;

        return { ...q, options: updatedOptions };
      })
    );
  };

  /* ---------- ADD QUESTION ---------- */
  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  /* ---------- REMOVE QUESTION ---------- */
  const removeQuestion = (index) => {
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyQuestion()];
    });
  };

  /* ---------- CREATE QUIZ ---------- */
  const handleCreate = (e) => {
    e.preventDefault();
    if (!socket) return;

    // Clean + validate questions
    const validQuestions = questions
      .map((q) => ({
        ...q,
        text: q.text.trim(),
        options: q.options.map((o) => o.trim())
      }))
      .filter(
        (q) =>
          q.text &&
          q.options.filter((o) => o !== '').length >= 2
      );

    if (!validQuestions.length) {
      setError('Add at least one question with minimum 2 options.');
      return;
    }

    setError('');
    setIsCreating(true);

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

        /* RESET STATE (IMPORTANT FIX) */
        setTitle('New Live Quiz');
        setQuestions([emptyQuestion()]);

        navigate(`/host/${response.quizId}`, {
          state: { quizCode: response.code }
        });
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
        {/* QUIZ TITLE */}
        <label className="field">
          <span className="field-label">Quiz title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Standup Quiz"
          />
        </label>

        {/* QUESTIONS */}
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

              <p
                className="muted"
                style={{ fontSize: '0.75rem', margin: '0 0 0.25rem' }}
              >
                Enter options and choose the correct answer.
              </p>

              <input
                type="text"
                value={q.text}
                onChange={(e) =>
                  updateQuestion(qi, { text: e.target.value })
                }
                placeholder="Type your question..."
              />

              <div className="options-grid">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={
                      'option-pill ' +
                      (oi === q.correctIndex
                        ? 'option-pill-correct'
                        : '')
                    }
                  >
                    <span className="option-index">
                      {String.fromCharCode(65 + oi)}
                    </span>

                    <input
                      type="text"
                      value={opt}
                      onChange={(e) =>
                        updateOption(qi, oi, e.target.value)
                      }
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>

              {/* CORRECT ANSWER */}
              <div className="correct-answer-row">
                <span
                  className="muted"
                  style={{ fontSize: '0.8rem' }}
                >
                  Correct answer
                </span>

                <select
                  className="correct-select"
                  value={q.correctIndex}
                  onChange={(e) =>
                    updateQuestion(qi, {
                      correctIndex: Number(e.target.value)
                    })
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

        {/* ACTION BUTTONS */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={addQuestion}
          >
            + Add question
          </button>

          <div className="spacer" />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isCreating || !socket}
          >
            {isCreating ? 'Creating…' : 'Create & go live'}
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </form>
    </div>
  );
};

export default HostLobby;