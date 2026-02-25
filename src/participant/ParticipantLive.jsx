import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../socket/SocketContext';
import Leaderboard from '../shared/Leaderboard';

const ParticipantLive = () => {
  const { quizId, participantId } = useParams();
  const socket = useSocket();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('lobby');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submittedOption, setSubmittedOption] = useState(null);

  useEffect(() => {
    if (!socket || !quizId || !participantId) return;

    socket.emit(
      'participant:rejoin',
      { quizId, participantId },
      (response) => {
        if (!response || response.error) {
          navigate('/join');
          return;
        }
        applyState(response.state);
      }
    );

    const handleState = (state) => {
      applyState(state);
    };

    socket.on('quiz:state', handleState);

    return () => {
      socket.off('quiz:state', handleState);
    };
  }, [socket, quizId, participantId, navigate]);

  const applyState = (state) => {
    setQuiz(state.quiz);
    setParticipants(state.participants || []);
    setStatus(state.quiz.status);
    const newIndex = state.quiz.currentQuestionIndex;
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      setSelectedOption(null);
      setSubmittedOption(null);
    }
  };

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

  const currentQuestion =
    quiz && currentIndex >= 0 && currentIndex < quiz.questions.length
      ? quiz.questions[currentIndex]
      : null;

  const handleSelect = (idx) => {
    if (
      !currentQuestion ||
      status !== 'in-progress' ||
      remainingSeconds === 0 ||
      submittedOption !== null
    ) {
      return;
    }
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (
      !currentQuestion ||
      status !== 'in-progress' ||
      remainingSeconds === 0 ||
      selectedOption === null ||
      submittedOption !== null
    ) {
      return;
    }

    socket.emit('participant:answer', {
      quizId,
      participantId,
      questionId: currentQuestion.id,
      optionIndex: selectedOption
    });
    setSubmittedOption(selectedOption);
  };

  return (
    <div className="participant-live">
      <section className="participant-main">
        <div className="panel">
          <div className="panel-header">
            <h2>{quiz?.title || 'Live Quiz'}</h2>
            <p>
              {status === 'lobby' && 'Waiting for the host to start.'}
              {status === 'in-progress' && currentQuestion && 'Make your choice!'}
              {status === 'finished' && 'Quiz finished. See the final leaderboard.'}
            </p>
          </div>
          <div className="panel-body">
            {status === 'lobby' && (
              <div className="empty-state">
                <p>Hang tight, the host will start the quiz soon.</p>
              </div>
            )}
            {status === 'in-progress' && currentQuestion && (
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
                <div className="options-grid">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isSubmitted = submittedOption === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={
                          'option-tile option-tile-clickable ' +
                          (isSelected ? 'option-tile-selected' : '') +
                          (isSubmitted ? ' option-tile-locked' : '') +
                          (status === 'finished' &&
                          idx === currentQuestion.correctIndex
                            ? ' option-tile-correct'
                            : '')
                        }
                        onClick={() => handleSelect(idx)}
                        disabled={
                          status !== 'in-progress' ||
                          remainingSeconds === 0 ||
                          submittedOption !== null
                        }
                      >
                        <span className="option-index">{String.fromCharCode(65 + idx)}</span>
                        <span>{opt || <em>Empty option</em>}</span>
                        {isSubmitted && <span className="badge">Sent</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {selectedOption === null
                      ? 'Select an option, then submit.'
                      : `Selected: ${String.fromCharCode(65 + selectedOption)}`}
                  </span>
                  <div className="spacer" />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={
                      status !== 'in-progress' ||
                      remainingSeconds === 0 ||
                      selectedOption === null ||
                      submittedOption !== null
                    }
                  >
                    {submittedOption === null ? 'Submit answer' : 'Submitted'}
                  </button>
                </div>
              </div>
            )}
            {status === 'finished' && (
              <div className="empty-state">
                <p>The quiz is over. Check how you did on the leaderboard.</p>
              </div>
            )}
          </div>
        </div>
      </section>
      <aside className="participant-sidebar">
        <div className="panel">
          <div className="panel-header">
            <h3>Live leaderboard</h3>
          </div>
          <div className="panel-body">
            <Leaderboard participants={participants} highlightId={participantId} />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ParticipantLive;

