export type UserRole = 'co' | '2ic' | 'coy_comd' | 'adjutant' | 'clerk' | 'soldier';
export type Company = 'A' | 'B' | 'C' | 'D';
export type SoldierRank = 'Snk' | 'LCpl' | 'Cpl' | 'Sgt' | 'WO' | 'SWO';
export type PTStatus = 'fit' | 'unfit' | 'pending';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  rank: string;
  ba: string;
  company?: Company;
  phone?: string;
  bloodGroup?: BloodGroup;
  medicalCategory?: string;
  height?: number;
  weight?: number;
  age?: number;
  address?: string;
  serviceNumber?: string;
  /** false only for newly self-registered soldiers awaiting Adjutant approval */
  isApproved?: boolean;
  /** Expo push token for this device, used to deliver background notifications */
  pushToken?: string;
}

export interface Soldier {
  id: string;
  serviceNumber: string;
  name: string;
  rank: SoldierRank;
  company: Company;
  email: string;
  bloodGroup: BloodGroup;
  height: number;
  weight: number;
  age: number;
  medicalCategory: string;
  phone: string;
  address?: string;
  isApproved: boolean;
  isOverweight: boolean;
  ptStatus: PTStatus;
  userId: string;
}

export interface PTExercise {
  name: string;
  target: string;
  notes?: string;
}

export interface PTPlanDay {
  day: string;
  focus: string;
  exercises: PTExercise[];
}

export interface PTPlan {
  id: string;
  title: string;
  type: 'fit' | 'unfit';
  description: string;
  createdBy: string;
  createdByName: string;
  weekNumber: number;
  days: PTPlanDay[];
  createdAt: string;
}

export interface IPFTResultItem {
  name: string;
  target: string;
  achieved: string;
  status: 'pass' | 'fail';
}

export interface IPFTResult {
  id: string;
  soldierId: string;
  soldierName: string;
  soldierRank: string;
  serviceNumber: string;
  company: Company;
  date: string;
  items: IPFTResultItem[];
  overallStatus: 'pass' | 'fail';
  recordedBy: string;
  recordedByName: string;
  bmi?: number;
  /** Which half-year IPFT cycle this result belongs to. */
  biannual?: '1st' | '2nd';
  /** True for a result the soldier reported from a previous unit at registration, not one recorded by a Clerk here. */
  selfReported?: boolean;
}

export interface IPFTSchedule {
  id: string;
  proposedDate: string;
  proposedBy: string;
  proposedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  rejectionNote?: string;
  alternateDate?: string;
  createdAt: string;
}

/** Free-form chat between staff roles (co, 2ic, coy_comd, adjutant, clerk). Soldiers do not use messaging. */
export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: UserRole;
  toId: string;
  toRole: UserRole;
  subject: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  targetRole?: UserRole;
  targetCompany?: Company;
  targetUserId?: string;
  title: string;
  body: string;
  type: 'ipft_approved' | 'ipft_proposed' | 'ipft_rejected' | 'new_result' | 'overweight' | 'new_plan' | 'general';
  read: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: UserRole;
  toId: string;
  toRole: UserRole;
  title: string;
  content: string;
  /** Display filename, e.g. "IPFT_Report_July2026.pdf" */
  attachmentLabel?: string;
  /** Relative URL to download the file from the shared data server, e.g. "/files/abc-name.pdf" */
  attachmentUrl?: string;
  attachmentMimeType?: string;
  company?: Company;
  read: boolean;
  createdAt: string;
}
