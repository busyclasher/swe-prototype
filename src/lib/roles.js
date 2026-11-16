// Central role model (skills.md section 3).

export const ROLES = {
  TEACHER: 'TEACHER',
  MANAGER: 'MANAGER',
  IT_ADMIN: 'IT_ADMIN',
};

export const ROLE_LABELS = {
  TEACHER: 'Teacher',
  MANAGER: 'Manager',
  IT_ADMIN: 'IT Administrator',
};

/** Roles an IT Administrator may assign when creating an account (FR-31). */
export const CREATABLE_ROLES = [ROLES.TEACHER, ROLES.MANAGER];

export const HOME_ROUTE = {
  TEACHER: '/teacher',
  MANAGER: '/manager',
  IT_ADMIN: '/admin/accounts',
};

export const hasRole = (session, ...roles) => Boolean(session && roles.includes(session.role));
