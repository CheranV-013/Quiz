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

const quizzes = new Map(); // quizId -> { id, code, title, questions, status, currentQuestionIndex, currentQuestionEndsAt }
const quizParticipants = new Map(); // quizId -> Map<socketIdOrId, participant>

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
  const participants = Array.from(quizParticipants.get(quizId)?.values() || []);
  return { quiz, participants };
};

io.on('connection', (socket) => {
  socket.on('disconnecting', () => {
    // We keep scores even if they disconnect mid-quiz; nothing to do here for now.
  });

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

  socket.on('host:joinQuiz', ({ quizId }, cb) => {
    const quiz = quizzes.get(quizId);
    if (!quiz) {
      cb?.({ error: 'Quiz not found.' });
      return;
    }
    socket.join(quizId);
    cb?.({ state: createQuizStatePayload(quizId) });
  });

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

  socket.on('host:nextQuestion', ({ quizId }) => {
    const quiz = quizzes.get(quizId);
    if (!quiz || quiz.status !== 'in-progress') return;
    if (quiz.currentQuestionIndex >= quiz.questions.length - 1) return;

    const now = Date.now();
    quiz.currentQuestionIndex += 1;
    quiz.currentQuestionEndsAt = now + 45_000;
    quizzes.set(quizId, quiz);
    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
  });

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

  socket.on('host:endQuiz', ({ quizId }) => {
    const quiz = quizzes.get(quizId);
    if (!quiz) return;
    quiz.status = 'finished';
    quiz.currentQuestionEndsAt = null;
    quizzes.set(quizId, quiz);
    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
  });

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

  socket.on('participant:answer', ({ quizId, participantId, questionId, optionIndex }) => {
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

    // ⭐ PREVENT MULTIPLE SUBMISSIONS (ADDED)
    if (participant.answers && questionId in participant.answers) return;

    participant.answers[questionId] = optionIndex;

    if (optionIndex === question.correctIndex) {
      participant.score += 10;
    }

    pMap.set(participantId, participant);

    io.to(quizId).emit('quiz:state', createQuizStatePayload(quizId));
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Quizzz realtime server listening on :${PORT}`);
});