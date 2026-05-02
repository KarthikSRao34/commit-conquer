import { useState, useCallback, useRef, useEffect } from "react";

// ─── DataTable ────────────────────────────────────────────────────────────────
// Props:
//   columns: Array<{
//     key: string,           — unique key, used for sort persistence
//     header: string,        — column header label
//     width?: number,        — optional fixed width in px
//     sortable?: boolean,    — enables click-to-sort on this column
//     render?: (row) => ReactNode  — custom cell renderer, defaults to row[key]
//   }>
//   data: Array<object>      — rows to display
//   storageKey?: string      — sessionStorage key for sort persistence (default: "datatable_sort")
//   rowKey: string           — field used as React key (default: "id")
//   onRowClick?: (row) => void
//   isLoading?: boolean
//   emptyMessage?: string

export default function DataTable({
  columns = [],
  data = [],
  storageKey = "datatable_sort",
  rowKey = "id",
  onRowClick,
  isLoading = false,
  emptyMessage = "No data found",
}) {
  // ─── Persistent sort state ─────────────────────────────────────────────────
  // FIX: Sort state is read from sessionStorage on mount so navigating away
  // and back restores the previous sort — it no longer resets to default.
  const [sortState, setSortState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : { key: null, dir: "asc" };
    } catch {
      return { key: null, dir: "asc" };
    }
  });

  // Persist sort to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(sortState));
    } catch {
      // sessionStorage unavailable — silently skip persistence
    }
  }, [sortState, storageKey]);

  const handleSort = useCallback((key) => {
    setSortState((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  }, []);

  // ─── Stable column widths ──────────────────────────────────────────────────
  // FIX: Column widths are measured once on first render and stored in a ref.
  // They never change on re-render because we read from the ref, not from
  // live DOM measurements on every render.
  const colWidths = useRef({});
  const thRefs = useRef({});

  useEffect(() => {
    // Measure on first render only — skip if already measured
    columns.forEach((col) => {
      if (colWidths.current[col.key] === undefined && thRefs.current[col.key]) {
        colWidths.current[col.key] =
          col.width ?? thRefs.current[col.key].offsetWidth;
      }
    });
  }, []); // empty dep array — runs once

  // ─── Sort data ─────────────────────────────────────────────────────────────
  const sorted = [...data].sort((a, b) => {
    if (!sortState.key) return 0;
    const aVal = a[sortState.key];
    const bVal = b[sortState.key];
    if (aVal === undefined || bVal === undefined) return 0;
    const cmp =
      typeof aVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
    return sortState.dir === "asc" ? cmp : -cmp;
  });

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <colgroup>
          {columns.map((col) => (
            <col
              key={col.key}
              style={{
                width: colWidths.current[col.key]
                  ? colWidths.current[col.key]
                  : col.width
                    ? col.width
                    : undefined,
              }}
            />
          ))}
        </colgroup>

        <thead>
          <tr>
            {columns.map((col) => {
              const isActive = sortState.key === col.key;
              return (
                <th
                  key={col.key}
                  ref={(el) => (thRefs.current[col.key] = el)}
                  style={{
                    ...styles.th,
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: col.sortable ? "none" : "auto",
                    color: isActive
                      ? "var(--accent, #7c6aff)"
                      : "var(--text-muted, #6b6b80)",
                  }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span style={styles.thInner}>
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        active={isActive}
                        dir={isActive ? sortState.dir : null}
                      />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            // Skeleton rows
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i} style={styles.tr}>
                {columns.map((col) => (
                  <td key={col.key} style={styles.td}>
                    <div style={styles.skeleton} />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={styles.emptyCell}>
                <div style={styles.emptyWrap}>
                  <div style={styles.emptyIcon}>◈</div>
                  <p style={styles.emptyMsg}>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={row[rowKey]}
                style={{
                  ...styles.tr,
                  cursor: onRowClick ? "pointer" : "default",
                }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--surface, #141417)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {columns.map((col) => (
                  <td key={col.key} style={styles.td}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }) {
  return (
    <span
      style={{
        marginLeft: 4,
        display: "inline-flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        style={{
          opacity: active && dir === "asc" ? 1 : 0.25,
          color:
            active && dir === "asc" ? "var(--accent, #7c6aff)" : "currentColor",
        }}
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
      <svg
        width="8"
        height="8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        style={{
          opacity: active && dir === "desc" ? 1 : 0.25,
          color:
            active && dir === "desc"
              ? "var(--accent, #7c6aff)"
              : "currentColor",
        }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed", // FIX: fixed layout prevents column width shifts on re-render
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontFamily: "var(--mono, monospace)",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderBottom: "1px solid var(--border, #2a2a31)",
    position: "sticky",
    top: 0,
    background: "var(--bg, #0c0c0e)",
    zIndex: 10,
    transition: "color 160ms ease",
    whiteSpace: "nowrap",
  },
  thInner: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  tr: {
    borderBottom: "1px solid var(--border, #2a2a31)",
    transition: "background 160ms ease",
  },
  td: {
    padding: "12px 14px",
    fontSize: 14,
    color: "var(--text, #e8e8f0)",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  skeleton: {
    height: 14,
    borderRadius: 4,
    background: "var(--surface2, #1c1c21)",
    animation: "shimmer 1.4s infinite",
  },
  emptyCell: {
    padding: "48px 24px",
    textAlign: "center",
  },
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    fontSize: 28,
    opacity: 0.3,
    color: "var(--text-muted, #6b6b80)",
  },
  emptyMsg: {
    fontSize: 13,
    color: "var(--text-muted, #6b6b80)",
    fontFamily: "var(--mono, monospace)",
    margin: 0,
  },
};
