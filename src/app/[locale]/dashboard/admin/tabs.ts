/** As abas da Administração; `?tab=` abre uma delas. */
export const ADMIN_TABS = ["features", "plans", "prices", "jevCost", "featureUsage"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];
