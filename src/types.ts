export interface Employee {
  id: string;
  name: string;
  department: string;
  contractDate: string;
  totalQuota: number;
  usedQuota: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  description: string;
  timestamp: string;
}

export type ViewState = 'dashboard' | 'history';