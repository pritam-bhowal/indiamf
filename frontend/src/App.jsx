import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import FundDetail from './pages/FundDetail';

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>Indian Mutual Funds</h1>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fund/:schemeCode" element={<FundDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
