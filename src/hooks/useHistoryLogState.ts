import { useState } from 'react';
import type { HistSortCol } from '../types';

export type HistoryLogTab = 'leave' | 'izin' | 'activity';
export type LeaveLogFilter = 'all' | 'planned' | 'completed' | 'canceled';

export function useHistoryLogState() {
  const [histSort, setHistSort] = useState<HistSortCol>('');
  const [histAsc, setHistAsc] = useState(true);
  const [logTab, setLogTab] = useState<HistoryLogTab>('leave');
  const [leaveLogFilter, setLeaveLogFilter] = useState<LeaveLogFilter>('all');

  const handleHistSort = (c: HistSortCol) => {
    if (histSort === c) setHistAsc((a) => !a);
    else { setHistSort(c); setHistAsc(true); }
  };

  const hArr = (c: HistSortCol) => (histSort === c ? (histAsc ? ' ↑' : ' ↓') : '');

  return {
    histSort,
    histAsc,
    logTab,
    setLogTab,
    leaveLogFilter,
    setLeaveLogFilter,
    handleHistSort,
    hArr,
  };
}
