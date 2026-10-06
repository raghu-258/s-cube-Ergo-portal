import { NavLink, useLocation, useParams } from 'react-router-dom';
import { usePortal } from '../portal.jsx';
import { Avatar, ModalHeader } from './ui.jsx';

const LEARNING = [['/library', 'Course library', '▷'], ['/profile', 'My profile', '◎']];
const ADMIN = [['/admin', 'Overview', '◈'], ['/admin/courses', 'Manage courses', '▤'], ['/admin/people', 'People & progress', '⌁']];

const PAGE_NAMES = {
  '/': 'Home', '/library': 'Course library', '/profile': 'My profile',
  '/admin': 'Overview', '/admin/courses': 'Manage courses', '/admin/people': 'People & progress',
};

export function Shell({ children }) {
  const { me, data, openModal } = usePortal();
  const { pathname } = useLocation();
  const watching = pathname.startsWith('/watch/');
  const groups = me.role === 'admin'
    ? [['Admin', ADMIN], ['My learning', LEARNING]]
    : [['My learning', [['/', 'Home', '⌂'], ...LEARNING]]];

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup"><div className="brand-mark">S</div><div><div className="brand-name">scube</div><div className="brand-caption">learning portal</div></div></div>
        <nav className="nav">
          {groups.map(([label, items]) => (
            <div className="nav-group" key={label}>
              <div className="nav-label">{label}</div>
              {items.map(([to, name, icon]) => (
                <NavLink
                  key={to} to={to} end={to === '/' || to === '/admin'}
                  className={({ isActive }) => `nav-item${isActive || (watching && to === '/library') ? ' active' : ''}`}
                >
                  <span className="nav-icon">{icon}</span>{name}
                  {to === '/library' && <span className="nav-badge">{data.courses.length}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sso-card"><strong>Google Workspace sign-in</strong>Signed in as {me.email}</div>
          <button className="user-menu" onClick={() => openModal(<AccountModal />)}>
            <Avatar user={me} />
            <span className="user-details"><strong>{me.name}</strong><small>{me.role === 'admin' ? 'Administrator' : me.dept || 'Scube'}</small></span>
            <span className="more">•••</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <Breadcrumb />
          <div className="top-actions">
            <button className="avatar-button" onClick={() => openModal(<AccountModal />)} aria-label="Account menu"><Avatar user={me} /></button>
          </div>
        </header>
        <section className="page-content" id="page">{children}</section>
      </main>
    </div>
  );
}

function Breadcrumb() {
  const { me, data } = usePortal();
  const { pathname } = useLocation();
  const course = pathname.startsWith('/watch/') ? data.courses.find((c) => c.id === pathname.split('/')[2]) : null;
  return (
    <div className="breadcrumb">
      <span>{pathname.startsWith('/admin') ? 'Admin' : 'Learning'}</span><span className="slash">/</span>
      <strong>{course || pathname.startsWith('/watch/') ? 'Course library' : PAGE_NAMES[pathname] || (me.role === 'admin' ? 'Overview' : 'Home')}</strong>
      {course && <><span className="slash">/</span><span>{course.title}</span></>}
    </div>
  );
}

function AccountModal() {
  const { me, closeModal, refresh, signOut, toast } = usePortal();
  return (
    <>
      <ModalHeader>
        <div className="acct-card"><Avatar user={me} size="lg" /><div><strong>{me.name}</strong><small>{me.email} · {me.role === 'admin' ? 'Administrator' : 'Employee'}</small></div></div>
      </ModalHeader>
      <div className="menu-list">
        <button className="menu-item" onClick={async () => { closeModal(); await refresh(); toast('Up to date'); }}>
          <strong>Refresh</strong><span>Load the latest courses and progress</span>
        </button>
        <button className="menu-item" onClick={() => signOut().then(() => toast('Signed out'))}>
          <strong>Sign out</strong><span>Return to the sign-in page</span>
        </button>
      </div>
    </>
  );
}

export function useCourseParam() {
  const { id } = useParams();
  const { data } = usePortal();
  return data.courses.find((c) => c.id === id) || null;
}
