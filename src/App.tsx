import { useEffect } from 'react';
import { Link, Route, Routes } from 'react-router';
import Editor from './pages/Editor';
import Embed from './pages/Embed';
import Gallery from './pages/Gallery';
import { useStore } from './state/store';

function NotFound() {
  return (
    <div className="gallery">
      <h1>Page not found</h1>
      <p className="muted">That address doesn’t match any page.</p>
      <Link className="btn" to="/">Go to the gallery</Link>
    </div>
  );
}

export default function App() {
  const ui = useStore((s) => s.uiTheme);
  useEffect(() => {
    const root = document.documentElement;
    if (ui === 'system') delete root.dataset.ui;
    else root.dataset.ui = ui;
  }, [ui]);
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/chart/:id" element={<Editor />} />
      <Route path="/embed/:id" element={<Embed />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
