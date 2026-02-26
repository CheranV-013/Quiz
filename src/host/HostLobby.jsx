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

  /* ---------- SAVE ---------- */
  const handleSave = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ title, questions })
    );
    alert('Questions saved permanently ✔');
  };

  /* ---------- UPDATE ---------- */
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

  /* ---------- CREATE ---------- */
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

    setIsCreating(true);

    socket.emit(
      'host:createQuiz',
      { title, questions: validQuestions },
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
    <>
      {/* ---------- CSS INSIDE ---------- */}
      <style>{`
        .panel-host {
          padding: 20px;
          color: white;
        }

        .question-card {
          background: #0f1b35;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid #243a66;
        }

        input, select {
          width: 100%;
          padding: 10px;
          margin: 6px 0;
          border-radius: 8px;
          border: 1px solid #2f4b7a;
          background: #081327;
          color: white;
        }

        .option-correct {
          border: 2px solid #00ff99 !important;
          background: rgba(0,255,153,0.08);
        }

        .correct-answer-row {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        button {
          margin: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
        }

        .error-banner {
          color: red;
          margin-top: 10px;
        }
      `}</style>

      <div className="panel panel-host">
        <h2>Create a new quiz</h2>
        <p>Saved questions stay permanently.</p>

        <form onSubmit={handleCreate}>
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

              {q.options.map((opt, oi) => (
                <input
                  key={oi}
                  className={
                    oi === q.correctIndex ? 'option-correct' : ''
                  }
                  value={opt}
                  onChange={(e) =>
                    updateOption(qi, oi, e.target.value)
                  }
                  placeholder={`Option ${oi + 1}`}
                />
              ))}

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
    </>
  );
};

export default HostLobby;