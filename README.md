## Quizzz Live – real-time quiz web app

This is a small full-stack example of a Mentimeter-style real-time quiz web application built with **React**, **Vite**, **Socket.IO**, and **Node.js (Express)**.

### Features

- **Host interface**
  - Create a quiz with multiple choice questions.
  - Start/stop the quiz and move between questions manually.
  - See **live participant list** and **live leaderboard** as answers arrive.
- **Participant interface**
  - Join using a **shareable quiz code**.
  - Enter a display name and answer questions in real time.
  - See a live leaderboard and final results when the quiz ends.

### Getting started

```bash
cd quizzz
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

The dev script starts both:

- React + Vite frontend at `http://localhost:5173`
- Socket.IO backend server at `http://localhost:4000`

### High-level architecture

- `server/index.js`: Express + Socket.IO server keeping quizzes and participants in memory.
- `src/socket/SocketContext.jsx`: shared Socket.IO client used across the React app.
- `src/App.jsx`: routing and top-level layout.
- `src/host/*`: host lobby (quiz creation) and live controller view.
- `src/participant/*`: participant join screen and live answering view.
- `src/shared/Leaderboard.jsx`: shared live leaderboard component.
- `src/styles.css`: modern, responsive styling.

