/** Mobile-only view authority. Frozen Figma content/asset data never mutated. */
export const mobileTrainingR2 = {
  contract: 'SMD_HOME_R2_TRAINING_MOBILE_VIEW_R2',
  sourceSnapshotDigest: '5e877e46cc1bad3e7985a553163120c59c9b9d0f731a66d575e781fa5c60146f',
  icons: {
    duration: {sourceNode: 'node-1:414', src: '/figma-r2/derived/calendar-mobile-r2.svg', sha256: 'd13a72b9faec0248076d58572146297b0eed3b1794aaef76725660e9dc33679f' },
    field: {sourceNode: 'node-1:477', src: '/figma-r2/assets/asset-31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616.svg', sha256: '31e20f1fc3f43abb314fbe0ec3ee4a6c35997a8b10a51fefd68102a9775b4616' },
    experience: {sourceNode: 'node-1:482', src: '/figma-r2/assets/asset-2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595.svg', sha256: '2b6d2381b996643b28e6926979f69304ca5572c50b047406d0c2a994c6acb595' },
  },
  arrow: {sourceNodes: ['node-1:501', 'node-1:555'], src:'/figma-r2/derived/chevron-mobile-r2.svg', sha256:'14eed2bf83479784db04d4d118b93fe3005fa3bd1e6cc6678c35a8edc32bc9af', sourceSha256:'8a780adf1d97823fd3a50f0a1933bbf80f557213d78346445d7f4b5982dc255f'},
  timeline: {morningLabel: 'node-1:492',morningWork: 'node-1:493',secondWork: 'node-1:499',afternoonLabel: 'node-1:498',afternoonWork: 'node-1:494'},
  derivedSummary: {authority: 'HOME_TRAINING_TIMELINE_SUMMARY_VIEW_R2', canonicalFactCount: 3},
} as const;
export type HomeTrainingIconKindR2 = keyof typeof mobileTrainingR2.icons | 'timeline';
