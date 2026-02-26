import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../socket/SocketContext';
import Leaderboard from '../shared/Leaderboard';

const HostLive = () => {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('lobby');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  // ⭐ HOST ACTION LOCK (VERY IMPORTANT)
  const actionLockRef = useRef(false);

  const quizCode = location.state?.quizCode || quiz?.code;

  /* ---------------- APPLY STATE ---------------- */
  const applyState = useCallback((state) => {
    if (!state?.quiz) return;

    setQuiz({ ...state.quiz });
    setParticipants([...(state.participants || [])]);
    setStatus(state.quiz.status);
    setCurrentIndex(state.quiz.currentQuestionIndex);

    // ⭐ unlock controls when fresh state arrives
    actionLockRef.current = false;
  }, []);

  /* ---------------- JOIN QUIZ ---------------- */
  useEffect(() => {
    if (!socket || !quizId) return;

    socket.emit('host:joinQuiz', { quizId }, (response) => {
      if (!response || response.error) {
        navigate('/host');
        return;
      }
      applyState(response.state);
    });

    const handleState = (state) => {
      applyState(state);
    };

    socket.on('quiz:state', handleState);

    return () => {
      socket.off('quiz:state', handleState);
    };
  }, [socket, quizId, navigate, applyState]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!quiz || quiz.currentQuestionIndex < 0 || !quiz.currentQuestionEndsAt) {
      setRemainingSeconds(null);
      return;
    }

    const update = () => {
      const diffMs = quiz.currentQuestionEndsAt - Date.now();
      const seconds = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(seconds);
    };

    update();
    const id = setInterval(update, 1000);

    return () => clearInterval(id);
  }, [quiz]);

  /* ---------------- SAFE SOCKET ACTIONS ---------------- */

  const startQuiz = () => {
    if (!socket || actionLockRef.current) return;
    actionLockRef.current = true;
    socket.emit('host:startQuiz', { quizId });
  };

  const nextQuestion = () => {
    if (!socket || actionLockRef.current) return;
    actionLockRef.current = true;
    socket.emit('host:nextQuestion', { quizId });
  };

  const prevQuestion = () => {
    if (!socket || actionLockRef.current) return;
    actionLockRef.current = true;
    socket.emit('host:prevQuestion', { quizId });
  };

  const endQuiz = () => {
    if (!socket || actionLockRef.current) return;
    actionLockRef.current = true;
    socket.emit('host:endQuiz', { quizId });
  };

  /* ---------------- CURRENT QUESTION ---------------- */
  const currentQuestion =
    quiz &&
    currentIndex >= 0 &&
    currentIndex < quiz.questions?.length
      ? quiz.questions[currentIndex]
      : null;

  return (
    <div className="host-layout">
      <section className="host-main">
        <div className="panel">
          <div className="panel-header">
            <h2>{quiz?.title || 'Live Quiz'}</h2>
            <p>
              Status:{' '}
              <span className={`status-pill status-${status}`}>
                {status === 'lobby' && 'Waiting for participants'}
                {status === 'in-progress' && 'Live'}
                {status === 'finished' && 'Finished'}
              </span>
            </p>
          </div>

          <div className="panel-body host-question-area">
            {status === 'lobby' && (
              <div className="empty-state">
                <p>Waiting to start. Participants can join using the code.</p>
                <button
                  className="btn btn-primary"
                  onClick={startQuiz}
                  disabled={!quiz || participants.length === 0}
                >
                  Start quiz
                </button>
              </div>
            )}

            {status !== 'lobby' && currentQuestion && (
              <div className="question-live">
                <div className="question-meta">
                  <span>
                    Question {currentIndex + 1} of {quiz.questions.length}
                  </span>

                  {typeof remainingSeconds === 'number' && (
                    <span
                      className={
                        'timer-pill ' +
                        (remainingSeconds === 0 ? 'timer-pill-expired' : '')
                      }
                    >
                      {remainingSeconds === 0
                        ? 'Time up'
                        : `Time left: ${remainingSeconds}s`}
                    </span>
                  )}
                </div>

                <h3 className="question-text">{currentQuestion.text}</h3>

                <div className="options-grid options-grid-static">
                  {currentQuestion.options.map((opt, idx) => (
                    <div key={idx} className="option-tile">
                      <span className="option-index">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt || <em>Empty option</em>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="host-controls">
            <button
              className="btn btn-ghost"
              onClick={prevQuestion}
              disabled={
                status !== 'in-progress' ||
                currentIndex <= 0 ||
                actionLockRef.current
              }
            >
              Previous
            </button>

            <button
              className="btn btn-ghost"
              onClick={nextQuestion}
              disabled={
                status !== 'in-progress' ||
                !quiz ||
                currentIndex >= quiz.questions.length - 1 ||
                actionLockRef.current
              }
            >
              Next
            </button>

            <div className="spacer" />

            <button
              className="btn btn-outline"
              onClick={endQuiz}
              disabled={status === 'finished' || actionLockRef.current}
            >
              End quiz
            </button>
          </div>
        </div>
      </section>

      <aside className="host-sidebar">
        <div className="panel">
          <div className="panel-header">
            <h3>Quiz code</h3>
          </div>
          <div className="panel-body">
            {quizCode ? (
              <>
                <div className="join-code">{quizCode}</div>
                <p className="muted">Participants can join using this code.</p>
              </>
            ) : (
              <p className="muted">Loading code…</p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Participants ({participants.length})</h3>
          </div>
          <div className="panel-body participants-list">
            {participants.map((p) => (
              <div key={p.id} className="participant-row">
                <span>{p.name}</span>
                <span className="participant-score">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Leaderboard</h3>
          </div>
          <div className="panel-body">
            <Leaderboard participants={participants} compact />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default HostLive;