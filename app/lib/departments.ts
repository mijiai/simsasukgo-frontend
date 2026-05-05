// Single source of truth for department options.
// Used by HomeForm (input), StoragePage (filter), and Step 5 monitor_register.

export const DEPARTMENTS = ['기업금융부', '시너지금융부', '투자금융부'] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Storage filter — empty dept ('') still matches 'ALL' (legacy data compat).
export type DepartmentFilter = 'ALL' | Department;
