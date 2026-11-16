import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell.jsx';
import { Brand, ModalHost, Toast, Tooltip } from './components/ui.jsx';
import { usePortal } from './portal.jsx';
import { Manage, Overview, People } from './views/Admin.jsx';
import { Home } from './views/Home.jsx';
import { Library } from './views/Library.jsx';
import { Login } from './views/Login.jsx';
import { Profile } from './views/Profile.jsx';
import { Watch } from './views/Watch.jsx';

export function App() {
  const { status, error, me, load } = usePortal();

  let page;
  if (status === 'loading') {
    page = <div className="splash"><Brand caption={null} /><p className="muted">Loading the portal…</p></div>;
  } else if (status === 'error') {
    page = (
      <div className="splash">
        <Brand caption={null} />
        <h2>The portal couldn’t load</h2><p className="muted">{error}</p>
        <button className="primary-button" onClick={load}>Try again</button>
      </div>
    );
  } else if (status === 'signedOut' || !me) {
    page = <Login />;
  } else {
    const admin = me.role === 'admin';
    page = (
      <Shell>
        <Routes>
          <Route path="/" element={admin ? <Navigate to="/admin" replace /> : <Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/profile" element={<Profile />} />
          {admin && <Route path="/admin" element={<Overview />} />}
          {admin && <Route path="/admin/courses" element={<Manage />} />}
          {admin && <Route path="/admin/people" element={<People />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    );
  }

  return (
    <>
      {page}
      <div id="modal-root"><ModalHost /></div>
      <Tooltip />
      <Toast />
    </>
  );
}
