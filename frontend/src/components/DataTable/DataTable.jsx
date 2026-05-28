import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const DataTable = ({ data = [], columns = [], darkMode, title, icon, pageSize = 15 }) => {
  const [page, setPage] = useState(1);

  if (!Array.isArray(data)) data = [];

  // Reset to page 1 when data changes (e.g. after a refresh)
  useEffect(() => { setPage(1); }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safeePage = Math.min(page, totalPages);
  const slice = data.slice((safeePage - 1) * pageSize, safeePage * pageSize);

  const nav = (delta) => setPage(p => Math.min(totalPages, Math.max(1, p + delta)));

  const border = darkMode ? '#35365a' : '#e5e7eb';

  return (
    <div className={`p-7 rounded-xl shadow-xl border
      ${darkMode
        ? 'bg-gradient-to-br from-[#23243aee] via-[#18192bfa] to-[#23243aee] backdrop-blur-md border-[#35365a] text-slate-200'
        : 'bg-white border-gray-200 text-gray-900'}
      hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex items-center gap-2 mb-6 pb-2 border-b border-dashed" style={{ borderColor: border }}>
        {icon && (
          <span className={`p-2 rounded-xs shadow ${darkMode ? 'bg-indigo-700 text-yellow-300' : 'bg-indigo-100 text-indigo-600'}`}>
            <FontAwesomeIcon icon={icon} className="text-xl" />
          </span>
        )}
        <h2 className="text-xl font-bold font-sans tracking-tight">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}
                  className={`px-4 py-2 font-semibold uppercase tracking-wider ${darkMode ? 'text-indigo-200' : 'text-indigo-700'} text-left`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center opacity-60">
                  No data available.
                </td>
              </tr>
            ) : (
              slice.map((row, idx) => (
                <tr key={idx} className={darkMode ? 'hover:bg-[#23243a]' : 'hover:bg-gray-100'}>
                  {columns.map(col => (
                    <td key={col} className="px-4 py-2 border-b border-dashed" style={{ borderColor: border }}>
                      {row[col] !== undefined ? row[col] : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={`flex items-center justify-between mt-4 pt-3 border-t text-sm`} style={{ borderColor: border }}>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            {(safeePage - 1) * pageSize + 1}–{Math.min(safeePage * pageSize, data.length)} sur {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => nav(-1)} disabled={safeePage === 1}
              className={`p-1.5 rounded-lg transition ${safeePage === 1 ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - safeePage) <= 1)
              .reduce((acc, n, i, arr) => {
                if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) => n === '…'
                ? <span key={`e${i}`} className={`px-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>…</span>
                : <button key={n} onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition
                      ${n === safeePage
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {n}
                  </button>
              )}
            <button onClick={() => nav(1)} disabled={safeePage === totalPages}
              className={`p-1.5 rounded-lg transition ${safeePage === totalPages ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
