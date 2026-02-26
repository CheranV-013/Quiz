import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketContext';

const STORAGE_KEY = 'permanent_quiz';

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

  /* ---------- LOAD SAVED QUIZ ---------- */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const data = JSON.parse(saved);
      setTitle(data.title || 'New Live Quiz');
      setQuestions(
        data.questions?.length ? data.questions : [emptyQuestion()]
      );
    }
  }, []);

  /* ---------- SAVE PERMANENTLY ---------- */
  const handleSave = () => {
    const data = { title, questions };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    alert('Questions saved permanently ✔');
  };

  /* ---------- UPDATE QUESTION ---------- */
  const updateQuestion = (index, patch) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  /* ---------- UPDATE OPTION ---------- */
  const updateOption = (qIndex, optIndex, value) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = [...q.options];
        opts[optIndex] = value;
        return { ...q, options: opts };
      })
    );
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    setQuestions(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyQuestion()];
    });
  };

  /* ---------- CREATE QUIZ ---------- */
  const handleCreate = (e) => {
    e.preventDefault();
    if (!socket) return;

    const validQuestions = questions.filter(
      q =>
        q.text.trim() &&
        q.options.filter(o => o.trim()).length >= 2
    );

    if (!validQuestions.length) {
      setError('Add at least one valid question.');
      return;
    }

    setError('');
    setIsCreating(true);

    socket.emit(
      'host:createQuiz',
      {
        title,
        questions: validQuestions
      },
      (response) => {
        setIsCreating(false);

        if (!response || response.error) {
          setError(response?.error || 'Failed to create quiz');
          return;
        }

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
        <p>Saved questions will stay permanently.</p>
      </div>

      <form className="panel-body" onSubmit={handleCreate}>
        {/* TITLE */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quiz title"
        />

        {/* QUESTIONS */}
        {questions.map((q, qi) => (
          <div key={q.id} className="question-card">

            <input
              value={q.text}
              onChange={(e) =>
                updateQuestion(qi, { text: e.target.value })
              }
              placeholder="Question..."
            />

            {/* OPTIONS */}
            {q.options.map((opt, oi) => (
              <input
                key={oi}
                className={
                  oi === q.correctIndex
                    ? 'option-input option-correct'
                    : 'option-input'
                }
                value={opt}
                onChange={(e) =>
                  updateOption(qi, oi, e.target.value)
                }
                placeholder={`Option ${oi + 1}`}
              />
            ))}

            {/* CORRECT ANSWER SELECT */}
            <div className="correct-answer-row">
              <label>Correct Answer:</label>

              <select
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

            <button type="button" onClick={() => removeQuestion(qi)}>
              Remove
            </button>
          </div>
        ))}

        {/* ACTIONS */}
        <button type="button" onClick={addQuestion}>
          + Add question
        </button>

        <button type="button" onClick={handleSave}>
          💾 Save Questions
        </button>

        <button type="submit" disabled={isCreating}>
          {isCreating ? 'Creating…' : 'Create & Go Live'}
        </button>

        {error && <div className="error-banner">{error}</div>}
      </form>
    </div>
  );
};

export default HostLobby;