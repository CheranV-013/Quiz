import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import HostLobby from './host/HostLobby';
import HostLive from './host/HostLive';
import ParticipantJoin from './participant/ParticipantJoin';
import ParticipantLive from './participant/ParticipantLive';
import bannerImg from './udhayam.jpg';
import smallLogo from './Logo.jpg';
const AppShell = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-brand" onClick={() => navigate('/')}>
          <img src={smallLogo} alt="UDHAYAM logo" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-title">TECH FUSION QUIZ</span>
            <span className="brand-subtitle">Dept.of AI&ML</span>
          </div>
        </div>

        <nav className="app-nav">
          <Link to="/host" className="nav-link">
            Host
          </Link>
          <Link to="/join" className="nav-link nav-link-primary">
            Join Quiz
          </Link>
        </nav>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <span>Built with React &amp; Socket.IO</span>
      </footer>
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing">
  
      {/* LEFT SIDE */}
      <div className="landing-left">
        <h1>ROUND 1 OF TECH FUSION QUIZ</h1>
        <p>
          Department of<br/>
          Artificial Intelligence and Machine Learning
        </p>
        <div className="landing-actions">
          <button className="btn btn-primary" onClick={() => navigate('/host')}>
            Start as Host
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/join')}>
            Join a Quiz
          </button>
        </div>
      </div>
  
      {/* RIGHT SIDE IMAGE */}
      <div className="landing-right">
        <img src={bannerImg} alt="Quiz Banner" className="landing-image" />
      </div>
  
    </div>
  );
};

const App = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/host" element={<HostLobby />} />
        <Route path="/host/:quizId" element={<HostLive />} />
        <Route path="/join" element={<ParticipantJoin />} />
        <Route
          path="/participant/:quizId/:participantId"
          element={<ParticipantLive />}
        />
      </Routes>
    </AppShell>
  );
};

export default App;