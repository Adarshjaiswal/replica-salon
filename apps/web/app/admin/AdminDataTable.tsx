"use client";

import type { ReactNode } from "react";

export interface AdminDataTableColumn<TRow> {
  key: string;
  header: string;
  render: (row: TRow) => ReactNode;
  className?: string;
}

interface AdminDataTableProps<TRow> {
  rows: TRow[];
  columns: Array<AdminDataTableColumn<TRow>>;
  emptyMessage: string;
  getRowId: (row: TRow) => string;
  loading: boolean;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function AdminDataTable<TRow>({
  rows,
  columns,
  emptyMessage,
  getRowId,
  loading,
  page,
  pageSize,
  pageSizeOptions,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: AdminDataTableProps<TRow>): React.ReactElement {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(totalCount, page * pageSize);

  return (
    <div className="data-table-shell" aria-busy={loading}>
      <div className="responsive-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.className} key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={getRowId(row)}>
                  {columns.map((column) => (
                    <td
                      className={column.className}
                      data-label={column.header}
                      key={column.key}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="table-empty-cell"
                  colSpan={columns.length}
                  data-label="Status"
                >
                  {loading ? "Loading records" : emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <div className="pagination-summary">
          Showing {firstRow}-{lastRow} of {totalCount}
        </div>
        <div className="pagination-controls">
          <label className="page-size-control">
            <span>Rows</span>
            <select
              className="compact-select"
              onChange={(event) =>
                onPageSizeChange(Number(event.currentTarget.value))
              }
              value={pageSize}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button table-page-button"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Previous
          </button>
          <span className="page-index">
            Page {page} of {totalPages}
          </span>
          <button
            className="secondary-button table-page-button"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
