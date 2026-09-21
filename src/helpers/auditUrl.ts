import type {
  AuditSortField,
  AuditSortOrder,
  AuditStatusType,
  AuditUrlState,
} from "@/types/audit";

const SORT_FIELDS: readonly AuditSortField[] = [
  "memberName",
  "schemeName",
  "folioNo",
  "casBalanceUnits",
  "txNetUnits",
  "unitDifference",
  "casPurchaseValue",
  "txNetAmount",
  "amountDifference",
  "casCurrentValue",
  "auditStatus",
];

const AUDIT_STATUSES: readonly AuditStatusType[] = [
  "PERFECT_MATCH",
  "PARTIAL_REDEMPTION",
  "NAV_ROUNDING",
  "UNIT_COST_MISMATCH",
  "MISSING_HISTORY",
];

const DEFAULT_AUDIT_URL_STATE: AuditUrlState = {
  searchTerm: "",
  statusFilters: [],
  activityFilter: "ALL",
  memberFilter: "ALL",
  categoryFilter: "ALL",
  sortField: "auditStatus",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

function isAuditSortField(value: string): value is AuditSortField {
  return SORT_FIELDS.includes(value as AuditSortField);
}

function isAuditStatus(value: string): value is AuditStatusType {
  return AUDIT_STATUSES.includes(value as AuditStatusType);
}

function isAuditSortOrder(value: string): value is AuditSortOrder {
  return value === "asc" || value === "desc";
}

export function parseAuditUrlState(query: string): AuditUrlState {
  const params = new URLSearchParams(query);
  const sortField = params.get("sort");
  const sortOrder = params.get("order");
  const activityParam = params.get("activity");
  const activityFilter: "ALL" | "ACTIVE" | "INACTIVE" =
    activityParam === "ACTIVE" || activityParam === "INACTIVE"
      ? activityParam
      : "ALL";
  const statusFilters = (params.get("status") ?? "")
    .split(",")
    .filter(isAuditStatus);
  const rawPage = parseInt(params.get("page") || "1", 10);
  const page = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawPageSize = parseInt(
    params.get("pageSize") || params.get("perPage") || "25",
    10
  );
  const pageSize = !isNaN(rawPageSize) && rawPageSize > 0 ? rawPageSize : 25;

  return {
    searchTerm: params.get("q") ?? DEFAULT_AUDIT_URL_STATE.searchTerm,
    statusFilters,
    activityFilter,
    memberFilter: params.get("member") ?? DEFAULT_AUDIT_URL_STATE.memberFilter,
    categoryFilter:
      params.get("category") ?? DEFAULT_AUDIT_URL_STATE.categoryFilter,
    sortField:
      sortField && isAuditSortField(sortField)
        ? sortField
        : DEFAULT_AUDIT_URL_STATE.sortField,
    sortOrder:
      sortOrder && isAuditSortOrder(sortOrder)
        ? sortOrder
        : DEFAULT_AUDIT_URL_STATE.sortOrder,
    page,
    pageSize,
  };
}

export function updateAuditUrlParams(
  params: URLSearchParams,
  state: AuditUrlState
): URLSearchParams {
  const nextParams = new URLSearchParams(params);
  const optionalParams: Array<[string, string, string]> = [
    ["q", state.searchTerm, ""],
    ["status", state.statusFilters.join(","), ""],
    ["activity", state.activityFilter, "ALL"],
    ["member", state.memberFilter, "ALL"],
    ["category", state.categoryFilter, "ALL"],
    ["sort", state.sortField, DEFAULT_AUDIT_URL_STATE.sortField],
    ["order", state.sortOrder, DEFAULT_AUDIT_URL_STATE.sortOrder],
  ];

  for (const [key, value, defaultValue] of optionalParams) {
    if (value && value !== defaultValue) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  }

  if (state.page && state.page > 1) {
    nextParams.set("page", String(state.page));
  } else {
    nextParams.delete("page");
  }

  if (state.pageSize && state.pageSize !== 25) {
    nextParams.set("pageSize", String(state.pageSize));
  } else {
    nextParams.delete("pageSize");
    nextParams.delete("perPage");
  }

  return nextParams;
}
