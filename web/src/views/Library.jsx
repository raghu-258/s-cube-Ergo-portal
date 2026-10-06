import { useState } from 'react';
import { CourseCard } from '../components/ui.jsx';
import { byNewest } from '../lib/format.js';
import { usePortal } from '../portal.jsx';

export function Library() {
  const { data } = usePortal();
  const [filter, setFilter] = useState('All');
  const cats = ['All', ...new Set(data.courses.map((c) => c.category))];
  const active = cats.includes(filter) ? filter : 'All';
  const list = data.courses.filter((c) => active === 'All' || c.category === active).sort(byNewest);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Newest first</div><h1>Course library</h1>
          <p className="heading-copy">{data.courses.length} AI video courses. New courses show up here for everyone as soon as they are published.</p>
        </div>
      </div>
      <div className="chip-row" role="group" aria-label="Filter by category">
        {cats.map((c) => <button key={c} className="filter-chip" aria-pressed={c === active} onClick={() => setFilter(c)}>{c}</button>)}
      </div>
      {list.length
        ? <div className="course-grid">{list.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        : <p className="muted">No courses yet. They appear here as soon as an admin publishes one.</p>}
    </>
  );
}
