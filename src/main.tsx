import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { registerAllTextFonts } from './core/text/all-metrics';
import { appFontFaceCss } from './export/fonts';
import './styles/fonts.css';
import './styles/app.css';

// every chart font: its letter widths for measuring, and its files for the browser
registerAllTextFonts();
const chartFonts = document.createElement('style');
chartFonts.textContent = appFontFaceCss();
document.head.appendChild(chartFonts);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
