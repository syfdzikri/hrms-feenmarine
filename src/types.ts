export interface Employee {
  id: string;
  nama: string;
  departemen: string;
  tglKontrak: string;
  jatahAwal: number;
  terpakai: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  pesan: string;
}