import React, { useEffect, useState, useRef } from 'react';
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
  const [submittedQuestionId, setSubmittedQuestionId] = useState(null);

  // ⭐ REAL HARD LOCK (sync, instant)
  const submitLockRef = useRef(false);
  const lastQuestionIdRef = useRef(null);

  /* ---------------- APPLY STATE ---------------- */
  const applyState = (state) => {
    if (!state?.quiz) return;

    setQuiz(state.quiz);
    setParticipants(state.participants || []);
    setStatus(state.quiz.status);

    const newIndex = state.quiz.currentQuestionIndex;
    setCurrentIndex(newIndex);

    const q =
      newIndex >= 0 &&
      newIndex < state.quiz.questions.length
        ? state.quiz.questions[newIndex]
        : null;

    // ⭐ RESET ONLY WHEN QUESTION REALLY CHANGES
    if (q && q.id !== lastQuestionIdRef.current) {
      lastQuestionIdRef.current = q.id;

      setSelectedOption(null);
      setSubmittedOption(null);
      setSubmittedQuestionId(null);

      // unlock submit for new question
      submitLockRef.current = false;
    }
  };

  /* ---------------- SOCKET ---------------- */
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

    const handleState = (state) => applyState(state);

    socket.on('quiz:state', handleState);

    return () => {
      socket.off('quiz:state', handleState);
    };
  }, [socket, quizId, participantId, navigate]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!quiz || quiz.currentQuestionIndex < 0 || !quiz.currentQuestionEndsAt) {
      setRemainingSeconds(null);
      return;
    }

    const update = () => {
      const diffMs = quiz.currentQuestionEndsAt - Date.now();
      setRemainingSeconds(Math.max(0, Math.ceil(diffMs / 1000)));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [quiz]);

  const currentQuestion =
    quiz &&
    currentIndex >= 0 &&
    currentIndex < quiz.questions.length
      ? quiz.questions[currentIndex]
      : null;

  /* ---------------- SELECT ---------------- */
  const handleSelect = (idx) => {
    if (
      !currentQuestion ||
      submitLockRef.current ||
      status !== 'in-progress' ||
      remainingSeconds === 0
    )
      return;

    setSelectedOption(idx);
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = () => {
    // ⭐ INSTANT HARD BLOCK
    if (submitLockRef.current) return;

    if (
      !currentQuestion ||
      status !== 'in-progress' ||
      remainingSeconds === 0 ||
      selectedOption === null
    ) {
      return;
    }

    // LOCK IMMEDIATELY
    submitLockRef.current = true;

    socket.emit('participant:answer', {
      quizId,
      participantId,
      questionId: currentQuestion.id,
      optionIndex: selectedOption
    });

    setSubmittedOption(selectedOption);
    setSubmittedQuestionId(currentQuestion.id);
  };

  return (
    <div className="participant-live">
      <section className="participant-main">
        <div className="panel">
          <div className="panel-header">
            <h2>{quiz?.title || 'Live Quiz'}</h2>
          </div>

          <div className="panel-body">
            {status === 'in-progress' && currentQuestion && (
              <>
                <h3>{currentQuestion.text}</h3>

                <div className="options-grid">
                  {currentQuestion.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={submitLockRef.current}
                      className={
                        selectedOption === idx
                          ? "option-tile option-green"
                          : "option-tile"
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={
                    submitLockRef.current ||
                    selectedOption === null
                  }
                >
                  {submitLockRef.current ? "Submitted ✔" : "Submit answer"}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <aside className="participant-sidebar">
        <Leaderboard participants={participants} highlightId={participantId} />
      </aside>
    </div>
  );
};

export default ParticipantLive;