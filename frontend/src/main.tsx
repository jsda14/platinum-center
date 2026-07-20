import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { store } from './infrastructure/store/store';
import { Login } from './ui/pages/Login/Login';
import './ui/styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<div style={{ padding: 20 }}>Panel Super Admin</div>} />
          <Route path="/reception" element={<div style={{ padding: 20 }}>Panel Recepción</div>} />
          <Route path="/portal" element={<div style={{ padding: 20 }}>Portal Miembro</div>} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
