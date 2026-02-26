const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const quizzes = new Map();
const quizParticipants = new Map();

const generateQuizCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const createQuizStatePayload = (quizId) => {
  const quiz = quizzes.get(quizId);
  const participants = Array.from(
    quizParticipants.get(quizId)?.values() || []
  );
  return { quiz, participants };
};

io.on('connection', (socket) => {
  socket.on('disconnecting', () => {});

  // ---------------- HOST CREATE ----------------
  socket.on('host:createQuiz', (payload, cb) => {
    const quizId = randomUUID();
    const code = generateQuizCode();

    const quiz = {
      id: quizId,
      code,
      title: payload.title,
      questions: payload.questions.map((q) => ({
        ...q,
        id: q.id || randomUUID()
      })),
      status: 'lobby',
      currentQuestionIndex: -1,
      currentQuestionEndsAt: null
    };

    quizzes.set(quizId, quiz);
    quizParticipants.set(quizId, new Map());

    socket.join(quizId);
    cb?.({ quizId, code });
  });

  // ---------------- HOST JOIN ----------------
  socket.on('host:joinQuiz', ({ quizId }, cb) => {
    const quiz = quizzes.get(quizId);
    if (!quiz) {
      cb?.({ error: 'Quiz not found.' });
      return;
    }
    socket.join(quizId);
    cb?.({ state: createQuizStatePayload(quizId) });
  });

  // ---------------- START QUIZ ----------------
  socket.on('host:startQuiz', ({ quizId }) => {
    const quiz = quizzes.get(quizId);
    if (!quiz) return;
    if (quiz.status !== 'lobby') return;
    if (quiz.questions.length === 0) return;

    const now = Date.now();
    quiz.status = 'in-progress';
    quiz.currentQuestionIndex = 0;
    quiz.currentQuestionEndsAt = now + 45_000;

    quizzes.set(quizId, quiz);
    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
  });

  // ---------------- NEXT QUESTION ----------------
  socket.on('host:nextQuestion', ({ quizId }) => {
    const quiz = quizzes.get(quizId);
    if (!quiz || quiz.status !== 'in-progress') return;
    if (quiz.currentQuestionIndex >= quiz.questions.length - 1) return;

    const now = Date.now();
    quiz.currentQuestionIndex += 1;
    quiz.currentQuestionEndsAt = now + 45_000;

    // ⭐ FIX: ensure participants ready for next question
    const pMap = quizParticipants.get(quizId);
    if (pMap) {
      pMap.forEach((p) => {
        p.answers = p.answers || {};
      });
    }

    quizzes.set(quizId, quiz);
    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
  });

  // ---------------- PREVIOUS QUESTION ----------------
  socket.on('host:prevQuestion', ({ quizId }) => {
    const quiz = quizzes.get(quizId);
    if (!quiz || quiz.status !== 'in-progress') return;
    if (quiz.currentQuestionIndex <= 0) return;

    const now = Date.now();
    quiz.currentQuestionIndex -= 1;
    quiz.currentQuestionEndsAt = now + 45_000;

    quizzes.set(quizId, quiz);
    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
  });

  // ---------------- END QUIZ ----------------
  socket.on('host:endQuiz', ({ quizId }) => {
    const quiz = quizzes.get(quizId);
    if (!quiz) return;

    quiz.status = 'finished';
    quiz.currentQuestionEndsAt = null;

    quizzes.set(quizId, quiz);
    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
  });

  // ---------------- PARTICIPANT JOIN ----------------
  socket.on('participant:join', ({ code, name }, cb) => {
    const entry = Array.from(quizzes.values()).find(
      (q) => q.code === code && q.status !== 'finished'
    );

    if (!entry) {
      cb?.({ error: 'Quiz not found or already finished.' });
      return;
    }

    const quizId = entry.id;
    const pid = randomUUID();

    const participant = {
      id: pid,
      socketId: socket.id,
      name: name.trim().slice(0, 32),
      score: 0,
      answers: {}
    };

    const pMap = quizParticipants.get(quizId);
    pMap.set(pid, participant);

    socket.join(quizId);

    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
    cb?.({ quizId, participantId: pid });
  });

  // ---------------- PARTICIPANT REJOIN ----------------
  socket.on('participant:rejoin', ({ quizId, participantId }, cb) => {
    const quiz = quizzes.get(quizId);
    if (!quiz) {
      cb?.({ error: 'Quiz not found.' });
      return;
    }

    const pMap = quizParticipants.get(quizId);
    const participant = pMap?.get(participantId);
    if (!participant) {
      cb?.({ error: 'Participant not found.' });
      return;
    }

    participant.socketId = socket.id;
    pMap.set(participantId, participant);

    socket.join(quizId);
    cb?.({ state: createQuizStatePayload(quizId) });
  });

  // ---------------- PARTICIPANT ANSWER ----------------
  socket.on(
    'participant:answer',
    ({ quizId, participantId, questionId, optionIndex }) => {
      const quiz = quizzes.get(quizId);
      if (!quiz || quiz.status !== 'in-progress') return;

      const now = Date.now();
      if (quiz.currentQuestionEndsAt && now > quiz.currentQuestionEndsAt) {
        return;
      }

      const pMap = quizParticipants.get(quizId);
      const participant = pMap?.get(participantId);
      if (!participant) return;

      const question = quiz.questions[quiz.currentQuestionIndex];
      if (!question || question.id !== questionId) return;

      // ⭐ FIX: prevent multiple submissions
      if (participant.answers?.[questionId] !== undefined) return;

      participant.answers[questionId] = optionIndex;

      if (optionIndex === question.correctIndex) {
        participant.score += 10;
      }

      pMap.set(participantId, participant);

      io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
    }
  );
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Quizzz realtime server listening on :${PORT}`);
});