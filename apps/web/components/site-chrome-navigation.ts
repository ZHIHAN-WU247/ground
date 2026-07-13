export const getAdminNavHref = (hasAdminSession: boolean) => (hasAdminSession ? "/admin" : "/admin/login?next=%2Fadmin");
