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

  /* ---------- LOAD PERMANENT SAVED QUIZ ---------- */
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
    const data = {
      title,
      questions
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    alert('Questions saved permanently ✔');
  };

  /* ---------- QUESTION UPDATE ---------- */
  const updateQuestion = (index, patch) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

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

  /* ---------- CREATE & GO LIVE ---------- */
  const handleCreate = (e) => {
    e.preventDefault();
    if (!socket) return;

    const validQuestions = questions.filter(
      q => q.text.trim() && q.options.some(o => o.trim())
    );

    if (!validQuestions.length) {
      setError('Add at least one valid question.');
      return;
    }

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
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quiz title"
        />

        {questions.map((q, qi) => (
          <div key={q.id} className="question-card">
            <input
              value={q.text}
              onChange={(e) =>
                updateQuestion(qi, { text: e.target.value })
              }
              placeholder="Question..."
            />

            {q.options.map((opt, oi) => (
              <input
                key={oi}
                value={opt}
                onChange={(e) =>
                  updateOption(qi, oi, e.target.value)
                }
                placeholder={`Option ${oi + 1}`}
              />
            ))}

            <button type="button" onClick={() => removeQuestion(qi)}>
              Remove
            </button>
          </div>
        ))}

        <button type="button" onClick={addQuestion}>
          + Add question
        </button>

        {/* ⭐ SAVE BUTTON */}
        <button type="button" onClick={handleSave}>
          💾 Save Questions
        </button>

        {/* CREATE BUTTON */}
        <button type="submit" disabled={isCreating}>
          {isCreating ? 'Creating…' : 'Create & Go Live'}
        </button>

        {error && <div>{error}</div>}
      </form>
    </div>
  );
};

export default HostLobby;