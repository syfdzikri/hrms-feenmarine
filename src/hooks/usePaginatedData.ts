import { useMemo, useState } from 'react';

export function usePaginatedData<T>(rows: T[], pageSize = 25) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const resetPage = () => setPage(1);

  return {
    page,
    totalPages,
    pageRows,
    setPage,
    goNext,
    goPrev,
    resetPage,
  };
}
