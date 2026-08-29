import type { User, Soldier, PTPlan, IPFTResult, IPFTSchedule, Notification, Report } from './types';

export const SEED_USERS: User[] = [
  {
    id: 'co-001', email: 'co@gmail.com', password: 'co123', role: 'co',
    name: 'Lt Col Shahid Hasan', rank: 'Lt Col', ba: 'BA-6556',
    phone: '01711-334455', bloodGroup: 'B+', medicalCategory: 'Category A',
    height: 178, weight: 82, age: 45,
  },
  {
    id: '2ic-001', email: '2ic@gmail.com', password: '2ic123', role: '2ic',
    name: 'Maj Aminul Haque', rank: 'Maj', ba: 'BA-8823',
    phone: '01712-556677', bloodGroup: 'O+', medicalCategory: 'Category A',
    height: 175, weight: 78, age: 38,
  },
  {
    id: 'adjt-001', email: 'adjt@gmail.com', password: 'adjt123', role: 'adjutant',
    name: 'Capt Tasnim Akhter', rank: 'Capt', ba: 'BA-20211',
    phone: '01713-778899', bloodGroup: 'A+', medicalCategory: 'Category A',
    height: 165, weight: 60, age: 30,
  },
  {
    id: 'coy-a-001', email: 'acoycomd@gmail.com', password: 'coya123', role: 'coy_comd',
    name: 'Maj Jannat Ara', rank: 'Maj', ba: 'BA-202116', company: 'A',
    phone: '01714-223344', bloodGroup: 'AB+', medicalCategory: 'Category A',
    height: 162, weight: 58, age: 36,
  },
  {
    id: 'coy-b-001', email: 'bcoycomd@gmail.com', password: 'coyb123', role: 'coy_comd',
    name: 'Maj Faizul Hasan', rank: 'Maj', ba: 'BA-193045', company: 'B',
    phone: '01715-445566', bloodGroup: 'B+', medicalCategory: 'Category A',
    height: 174, weight: 80, age: 37,
  },
  {
    id: 'coy-c-001', email: 'ccoycomd@gmail.com', password: 'coyc123', role: 'coy_comd',
    name: 'Maj Rezaul Karim', rank: 'Maj', ba: 'BA-185674', company: 'C',
    phone: '01716-667788', bloodGroup: 'O-', medicalCategory: 'Category A',
    height: 172, weight: 75, age: 39,
  },
  {
    id: 'coy-d-001', email: 'dcoycomd@gmail.com', password: 'coyd123', role: 'coy_comd',
    name: 'Maj Kabirul Islam', rank: 'Maj', ba: 'BA-201234', company: 'D',
    phone: '01717-889900', bloodGroup: 'A-', medicalCategory: 'Category A',
    height: 176, weight: 82, age: 40,
  },
  {
    id: 'clerk-001', email: 'clerk@gmail.com', password: 'clerk123', role: 'clerk',
    name: 'Cpl Mizanur Rahman', rank: 'Cpl', ba: 'BA-301122',
    phone: '01718-112233', bloodGroup: 'B+', medicalCategory: 'Category A',
    height: 170, weight: 72, age: 28,
  },
  {
    id: 'sol-a-001', email: 'jahangir@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Jahangir Alam', rank: 'Snk', ba: 'BD-11001', company: 'A',
    phone: '01911-001001', bloodGroup: 'A+', medicalCategory: 'Category A',
    height: 170, weight: 68, age: 22, serviceNumber: 'BD-11001',
  },
  {
    id: 'sol-a-002', email: 'rafiq@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Rafiq Uddin', rank: 'LCpl', ba: 'BD-11002', company: 'A',
    phone: '01911-001002', bloodGroup: 'B+', medicalCategory: 'Category B',
    height: 168, weight: 85, age: 24, serviceNumber: 'BD-11002',
  },
  {
    id: 'sol-a-003', email: 'kamal@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Kamal Hossain', rank: 'Cpl', ba: 'BD-11003', company: 'A',
    phone: '01911-001003', bloodGroup: 'O+', medicalCategory: 'Category A',
    height: 172, weight: 70, age: 26, serviceNumber: 'BD-11003',
  },
  {
    id: 'sol-a-004', email: 'arif@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Ariful Islam', rank: 'Snk', ba: 'BD-11004', company: 'A',
    phone: '01911-001004', bloodGroup: 'AB+', medicalCategory: 'Category A',
    height: 165, weight: 62, age: 21, serviceNumber: 'BD-11004',
  },
  {
    id: 'sol-b-001', email: 'rahim@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Rahim Mia', rank: 'Snk', ba: 'BD-12001', company: 'B',
    phone: '01911-002001', bloodGroup: 'A+', medicalCategory: 'Category A',
    height: 169, weight: 66, age: 22, serviceNumber: 'BD-12001',
  },
  {
    id: 'sol-b-002', email: 'selim@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Selim Khan', rank: 'LCpl', ba: 'BD-12002', company: 'B',
    phone: '01911-002002', bloodGroup: 'AB+', medicalCategory: 'Category A',
    height: 173, weight: 71, age: 25, serviceNumber: 'BD-12002',
  },
  {
    id: 'sol-b-003', email: 'monir@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Monir Hossain', rank: 'Cpl', ba: 'BD-12003', company: 'B',
    phone: '01911-002003', bloodGroup: 'B-', medicalCategory: 'Category B',
    height: 166, weight: 88, age: 27, serviceNumber: 'BD-12003',
  },
  {
    id: 'sol-c-001', email: 'babu@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Babu Mia', rank: 'Snk', ba: 'BD-13001', company: 'C',
    phone: '01911-003001', bloodGroup: 'B-', medicalCategory: 'Category A',
    height: 167, weight: 64, age: 21, serviceNumber: 'BD-13001',
  },
  {
    id: 'sol-c-002', email: 'jamal@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Jamal Uddin', rank: 'LCpl', ba: 'BD-13002', company: 'C',
    phone: '01911-003002', bloodGroup: 'O+', medicalCategory: 'Category A',
    height: 171, weight: 69, age: 24, serviceNumber: 'BD-13002',
  },
  {
    id: 'sol-c-003', email: 'habib@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Habibur Rahman', rank: 'Sgt', ba: 'BD-13003', company: 'C',
    phone: '01911-003003', bloodGroup: 'A-', medicalCategory: 'Category A',
    height: 174, weight: 76, age: 30, serviceNumber: 'BD-13003',
  },
  {
    id: 'sol-d-001', email: 'faruk@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Faruk Ahmed', rank: 'Snk', ba: 'BD-14001', company: 'D',
    phone: '01911-004001', bloodGroup: 'A+', medicalCategory: 'Category A',
    height: 168, weight: 65, age: 22, serviceNumber: 'BD-14001',
  },
  {
    id: 'sol-d-002', email: 'nurul@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Nurul Islam', rank: 'LCpl', ba: 'BD-14002', company: 'D',
    phone: '01911-004002', bloodGroup: 'B+', medicalCategory: 'Category B',
    height: 166, weight: 90, age: 25, serviceNumber: 'BD-14002',
  },
  {
    id: 'sol-d-003', email: 'sultan@gmail.com', password: 'soldier123', role: 'soldier',
    name: 'Sultan Mahmud', rank: 'WO', ba: 'BD-14003', company: 'D',
    phone: '01911-004003', bloodGroup: 'O-', medicalCategory: 'Category A',
    height: 176, weight: 80, age: 35, serviceNumber: 'BD-14003',
  },
];

export const SEED_SOLDIERS: Soldier[] = [
  { id: 'sol-a-001', userId: 'sol-a-001', serviceNumber: 'BD-11001', name: 'Jahangir Alam', rank: 'Snk', company: 'A', email: 'jahangir@gmail.com', bloodGroup: 'A+', height: 170, weight: 68, age: 22, medicalCategory: 'Category A', phone: '01911-001001', isApproved: true, isOverweight: false, ptStatus: 'fit' },
  { id: 'sol-a-002', userId: 'sol-a-002', serviceNumber: 'BD-11002', name: 'Rafiq Uddin', rank: 'LCpl', company: 'A', email: 'rafiq@gmail.com', bloodGroup: 'B+', height: 168, weight: 85, age: 24, medicalCategory: 'Category B', phone: '01911-001002', isApproved: true, isOverweight: true, ptStatus: 'unfit' },
  { id: 'sol-a-003', userId: 'sol-a-003', serviceNumber: 'BD-11003', name: 'Kamal Hossain', rank: 'Cpl', company: 'A', email: 'kamal@gmail.com', bloodGroup: 'O+', height: 172, weight: 70, age: 26, medicalCategory: 'Category A', phone: '01911-001003', isApproved: true, isOverweight: false, ptStatus: 'fit' },
  { id: 'sol-a-004', userId: 'sol-a-004', serviceNumber: 'BD-11004', name: 'Ariful Islam', rank: 'Snk', company: 'A', email: 'arif@gmail.com', bloodGroup: 'AB+', height: 165, weight: 62, age: 21, medicalCategory: 'Category A', phone: '01911-001004', isApproved: true, isOverweight: false, ptStatus: 'pending' },
  { id: 'sol-b-001', userId: 'sol-b-001', serviceNumber: 'BD-12001', name: 'Rahim Mia', rank: 'Snk', company: 'B', email: 'rahim@gmail.com', bloodGroup: 'A+', height: 169, weight: 66, age: 22, medicalCategory: 'Category A', phone: '01911-002001', isApproved: true, isOverweight: false, ptStatus: 'fit' },
  { id: 'sol-b-002', userId: 'sol-b-002', serviceNumber: 'BD-12002', name: 'Selim Khan', rank: 'LCpl', company: 'B', email: 'selim@gmail.com', bloodGroup: 'AB+', height: 173, weight: 71, age: 25, medicalCategory: 'Category A', phone: '01911-002002', isApproved: true, isOverweight: false, ptStatus: 'fit' },
  { id: 'sol-b-003', userId: 'sol-b-003', serviceNumber: 'BD-12003', name: 'Monir Hossain', rank: 'Cpl', company: 'B', email: 'monir@gmail.com', bloodGroup: 'B-', height: 166, weight: 88, age: 27, medicalCategory: 'Category B', phone: '01911-002003', isApproved: true, isOverweight: true, ptStatus: 'unfit' },
  { id: 'sol-c-001', userId: 'sol-c-001', serviceNumber: 'BD-13001', name: 'Babu Mia', rank: 'Snk', company: 'C', email: 'babu@gmail.com', bloodGroup: 'B-', height: 167, weight: 64, age: 21, medicalCategory: 'Category A', phone: '01911-003001', isApproved: true, isOverweight: false, ptStatus: 'fit' },
  { id: 'sol-c-002', userId: 'sol-c-002', serviceNumber: 'BD-13002', name: 'Jamal Uddin', rank: 'LCpl', company: 'C', email: 'jamal@gmail.com', bloodGroup: 'O+', height: 171, weight: 69, age: 24, medicalCategory: 'Category A', phone: '01911-003002', isApproved: true, isOverweight: false, ptStatus: 'fit' },
  { id: 'sol-c-003', userId: 'sol-c-003', serviceNumber: 'BD-13003', name: 'Habibur Rahman', rank: 'Sgt', company: 'C', email: 'habib@gmail.com', bloodGroup: 'A-', height: 174, weight: 76, age: 30, medicalCategory: 'Category A', phone: '01911-003003', isApproved: true, isOverweight: false, ptStatus: 'unfit' },
  { id: 'sol-d-001', userId: 'sol-d-001', serviceNumber: 'BD-14001', name: 'Faruk Ahmed', rank: 'Snk', company: 'D', email: 'faruk@gmail.com', bloodGroup: 'A+', height: 168, weight: 65, age: 22, medicalCategory: 'Category A', phone: '01911-004001', isApproved: true, isOverweight: false, ptStatus: 'fit' },
  { id: 'sol-d-002', userId: 'sol-d-002', serviceNumber: 'BD-14002', name: 'Nurul Islam', rank: 'LCpl', company: 'D', email: 'nurul@gmail.com', bloodGroup: 'B+', height: 166, weight: 90, age: 25, medicalCategory: 'Category B', phone: '01911-004002', isApproved: true, isOverweight: true, ptStatus: 'unfit' },
  { id: 'sol-d-003', userId: 'sol-d-003', serviceNumber: 'BD-14003', name: 'Sultan Mahmud', rank: 'WO', company: 'D', email: 'sultan@gmail.com', bloodGroup: 'O-', height: 176, weight: 80, age: 35, medicalCategory: 'Category A', phone: '01911-004003', isApproved: true, isOverweight: false, ptStatus: 'fit' },
];

export const SEED_PT_PLANS: PTPlan[] = [
  {
    id: 'plan-001', title: 'Standard Fitness Week Plan', type: 'fit',
    description: 'Weekly PT plan for soldiers who passed IPFT. Maintain peak physical condition.',
    createdBy: '2ic-001', createdByName: 'Maj Aminul Haque', weekNumber: 29,
    createdAt: '2026-07-10T08:00:00Z',
    days: [
      { day: 'Saturday', focus: 'Cardio & Speed', exercises: [{ name: '3km Run', target: 'Complete in 12 min', notes: 'Maintain steady pace' }, { name: 'Sprints 100m', target: '10 sets', notes: '30s rest between sets' }, { name: 'Jump Rope', target: '15 min continuous' }] },
      { day: 'Sunday', focus: 'Upper Body Strength', exercises: [{ name: 'Push-ups', target: '3 sets x 40 reps' }, { name: 'Pull-ups', target: '3 sets x 10 reps' }, { name: 'Dips', target: '3 sets x 15 reps' }, { name: 'Plank', target: '3 sets x 60 sec' }] },
      { day: 'Monday', focus: 'Lower Body & Core', exercises: [{ name: 'Squats', target: '4 sets x 30 reps' }, { name: 'Lunges', target: '3 sets x 20 reps each leg' }, { name: 'Sit-ups', target: '4 sets x 35 reps' }, { name: 'Calf Raises', target: '3 sets x 25 reps' }] },
      { day: 'Tuesday', focus: 'REST / Recovery', exercises: [{ name: 'Light Stretching', target: '20 min' }, { name: 'Walking', target: '2km easy pace' }] },
      { day: 'Wednesday', focus: 'Endurance Run', exercises: [{ name: '5km Run', target: 'Complete in 25 min' }, { name: 'Stair Climbing', target: '10 flights x 5 sets' }] },
      { day: 'Thursday', focus: 'Full Body Circuit', exercises: [{ name: 'Burpees', target: '4 sets x 15 reps' }, { name: 'Mountain Climbers', target: '3 sets x 30 reps' }, { name: 'Box Jumps', target: '3 sets x 12 reps' }, { name: 'Push-ups', target: '3 sets x 30 reps' }] },
      { day: 'Friday', focus: 'Parade & Drill', exercises: [{ name: 'Parade Drill', target: '1 hour' }, { name: 'Formation Run', target: '2km' }] },
    ],
  },
  {
    id: 'plan-002', title: 'Rehabilitation PT Plan (Unfit)', type: 'unfit',
    description: 'Progressive recovery plan for soldiers who failed IPFT. Focus on gradual improvement.',
    createdBy: '2ic-001', createdByName: 'Maj Aminul Haque', weekNumber: 29,
    createdAt: '2026-07-10T08:30:00Z',
    days: [
      { day: 'Saturday', focus: 'Light Cardio', exercises: [{ name: '2km Walk/Jog', target: 'Complete in 20 min', notes: 'No pressure, keep moving' }, { name: 'Deep Breathing', target: '10 min' }] },
      { day: 'Sunday', focus: 'Basic Strength', exercises: [{ name: 'Modified Push-ups', target: '3 sets x 15 reps', notes: 'Knee push-ups allowed' }, { name: 'Sit-ups', target: '3 sets x 15 reps' }, { name: 'Plank', target: '3 sets x 20 sec' }] },
      { day: 'Monday', focus: 'Mobility & Flexibility', exercises: [{ name: 'Full Body Stretching', target: '30 min' }, { name: 'Yoga Basics', target: '20 min' }, { name: 'Light Squats', target: '3 sets x 10 reps' }] },
      { day: 'Tuesday', focus: 'REST', exercises: [{ name: 'Rest & Recovery', target: 'Full rest day' }] },
      { day: 'Wednesday', focus: 'Progressive Run', exercises: [{ name: 'Walk 3min / Jog 2min', target: 'Repeat 5 times = 25 min', notes: 'Interval training' }] },
      { day: 'Thursday', focus: 'Light Circuit', exercises: [{ name: 'Jumping Jacks', target: '3 sets x 20 reps' }, { name: 'Modified Burpees', target: '3 sets x 8 reps' }, { name: 'Wall Sit', target: '3 sets x 20 sec' }] },
      { day: 'Friday', focus: 'BMI Awareness & Diet', exercises: [{ name: 'Diet Counseling', target: 'Review meal plan' }, { name: 'Light Walk', target: '30 min' }] },
    ],
  },
];

export const SEED_IPFT_RESULTS: IPFTResult[] = [
  {
    id: 'result-001', soldierId: 'sol-a-001', soldierName: 'Jahangir Alam', soldierRank: 'Snk',
    serviceNumber: 'BD-11001', company: 'A', date: '2026-06-15', overallStatus: 'pass',
    recordedBy: 'clerk-001', recordedByName: 'Cpl Mizanur Rahman', bmi: 23.5,
    items: [
      { name: '1.6km Run', target: '< 9 min', achieved: '8:20', status: 'pass' },
      { name: '3.2km Run', target: '< 24 min', achieved: '22:40', status: 'pass' },
      { name: 'Push-ups', target: '≥ 35 reps/2min', achieved: '42', status: 'pass' },
      { name: 'Sit-ups', target: '≥ 30 reps/2min', achieved: '38', status: 'pass' },
      { name: 'Pull-ups', target: '≥ 6 reps', achieved: '8', status: 'pass' },
    ],
  },
  {
    id: 'result-002', soldierId: 'sol-a-002', soldierName: 'Rafiq Uddin', soldierRank: 'LCpl',
    serviceNumber: 'BD-11002', company: 'A', date: '2026-06-15', overallStatus: 'fail',
    recordedBy: 'clerk-001', recordedByName: 'Cpl Mizanur Rahman', bmi: 30.1,
    items: [
      { name: '1.6km Run', target: '< 9 min', achieved: '10:15', status: 'fail' },
      { name: '3.2km Run', target: '< 24 min', achieved: '27:30', status: 'fail' },
      { name: 'Push-ups', target: '≥ 35 reps/2min', achieved: '22', status: 'fail' },
      { name: 'Sit-ups', target: '≥ 30 reps/2min', achieved: '18', status: 'fail' },
      { name: 'Pull-ups', target: '≥ 6 reps', achieved: '3', status: 'fail' },
    ],
  },
  {
    id: 'result-003', soldierId: 'sol-b-001', soldierName: 'Rahim Mia', soldierRank: 'Snk',
    serviceNumber: 'BD-12001', company: 'B', date: '2026-06-15', overallStatus: 'pass',
    recordedBy: 'clerk-001', recordedByName: 'Cpl Mizanur Rahman', bmi: 23.1,
    items: [
      { name: '1.6km Run', target: '< 9 min', achieved: '8:35', status: 'pass' },
      { name: '3.2km Run', target: '< 24 min', achieved: '23:10', status: 'pass' },
      { name: 'Push-ups', target: '≥ 35 reps/2min', achieved: '38', status: 'pass' },
      { name: 'Sit-ups', target: '≥ 30 reps/2min', achieved: '33', status: 'pass' },
      { name: 'Pull-ups', target: '≥ 6 reps', achieved: '7', status: 'pass' },
    ],
  },
];

export const SEED_IPFT_SCHEDULE: IPFTSchedule = {
  id: 'ipft-sched-001',
  proposedDate: '2026-07-28',
  proposedBy: 'adjt-001',
  proposedByName: 'Capt Tasnim Akhter',
  status: 'approved',
  approvedBy: 'co-001',
  createdAt: '2026-07-10T09:00:00Z',
};

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'notif-001', title: 'IPFT Date Confirmed', body: 'Next IPFT will be held on 28 July 2026. All companies must ensure 100% readiness.', type: 'ipft_approved', read: false, createdAt: '2026-07-11T10:00:00Z' },
  { id: 'notif-002', targetCompany: 'A', title: 'Overweight Soldier Alert', body: 'LCpl Rafiq Uddin (BD-11002) is overweight. BMI: 30.1. Rehabilitation plan assigned.', type: 'overweight', read: false, createdAt: '2026-07-10T08:00:00Z' },
  { id: 'notif-003', title: 'New PT Plans Published', body: 'Week 29 PT plans have been published by 2IC. Check your assigned plan.', type: 'new_plan', read: true, createdAt: '2026-07-09T07:30:00Z' },
  { id: 'notif-004', targetUserId: 'sol-a-002', title: 'IPFT Failed - Action Required', body: 'You have failed the last IPFT. Unfit PT plan assigned. 8 days remaining for next IPFT.', type: 'new_result', read: false, createdAt: '2026-06-16T09:00:00Z' },
  { id: 'notif-005', targetCompany: 'B', title: 'Overweight Soldier - Coy B', body: 'Cpl Monir Hossain (BD-12003) is overweight. BMI: 31.9. Immediate action required.', type: 'overweight', read: false, createdAt: '2026-07-10T08:00:00Z' },
];

export const SEED_REPORTS: Report[] = [
  {
    id: 'report-001', fromId: 'clerk-001', fromName: 'Cpl Mizanur Rahman', fromRole: 'clerk',
    toId: 'adjt-001', toRole: 'adjutant', title: 'IPFT Result Report - June 2026',
    content: 'Total soldiers tested: 13\nPassed: 9 (69.2%)\nFailed: 4 (30.8%)\nOverweight soldiers: 3\n\nCompany-wise breakdown:\nA Coy: 3 Pass, 1 Fail\nB Coy: 2 Pass, 1 Fail\nC Coy: 3 Pass, 0 Fail\nD Coy: 1 Pass, 2 Fail',
    attachmentLabel: 'IPFT_Result_June2026.pdf', read: false, createdAt: '2026-06-16T14:00:00Z',
  },
  {
    id: 'report-002', fromId: 'clerk-001', fromName: 'Cpl Mizanur Rahman', fromRole: 'clerk',
    toId: 'adjt-001', toRole: 'adjutant', title: 'Total Strength Report - July 2026',
    content: 'Overall Unit Strength:\nA Coy: 4 soldiers (3 Fit, 1 Unfit)\nB Coy: 3 soldiers (2 Fit, 1 Unfit)\nC Coy: 3 soldiers (2 Fit, 1 Unfit)\nD Coy: 3 soldiers (1 Fit, 2 Unfit)\n\nTotal Strength: 13\nTotal Fit: 8\nTotal Unfit: 5',
    attachmentLabel: 'Total_Strength_July2026.pdf', read: true, createdAt: '2026-07-01T09:00:00Z',
  },
];
