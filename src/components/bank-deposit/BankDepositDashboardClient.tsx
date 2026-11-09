"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import type {
  BankDepositDashboardData,
  DepositTransactionWithRelations,
  CreateDepositInput,
  UpdateDepositInput,
  UpsertMonthlyLimitInput,
  UpsertAnnualLimitInput,
  CloneLimitsInput,
  DepositViewMode,
  BankDepositFilter,
  BankDepositDashboardClientProps,
  BankDepositUrlFilterUpdates,
} from "@/types/bankDeposit";
import {
  createDepositAction,
  updateDepositAction,
  deleteDepositAction,
  upsertMonthlyLimitAction,
  upsertAnnualLimitAction,
  cloneMonthlyLimitsAction,
} from "@/actions/bankDeposit";
import {
  fetchBankDepositDashboardData,
  getExcelExportUrl,
} from "@/service/bankDepositService";
import {
  getFinancialYearMonths,
  getCurrentFinancialYearAndMonth,
  deriveFinancialYearAndMonth,
} from "@/helpers/bankDeposit";
import { useDebounce } from "@/hooks/useDebounce";
import BankDepositHeaderBanner from "./BankDepositHeaderBanner";
import BankDepositHeroKpiStrip from "./BankDepositHeroKpiStrip";
import BankDepositToolbar from "./BankDepositToolbar";
import PersonBankOverviewSection from "./overview/PersonBankOverviewSection";
import BankDepositLedgerTable from "./ledger/BankDepositLedgerTable";
import AddEditDepositModal from "./modals/AddEditDepositModal";
import ManageMonthlyLimitsModal from "./modals/ManageMonthlyLimitsModal";
import CloneLimitsModal from "./modals/CloneLimitsModal";
import DeleteConfirmationModal from "./modals/DeleteConfirmationModal";
import EditPersonAnnualTargetModal from "./modals/EditPersonAnnualTargetModal";
import BankDepositFilterModal from "./modals/BankDepositFilterModal";

export default function BankDepositDashboardClient({
  initialData,
}: BankDepositDashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const currentMeta = getCurrentFinancialYearAndMonth();

  const [data, setData] = useState<BankDepositDashboardData>(initialData);

  // Read initial states from URL searchParams (or fallback to initialData / defaults)
  const [financialYear, setFinancialYear] = useState<string>(() => {
    return (
      searchParams.get("fy") ||
      initialData.financialYear ||
      currentMeta.financialYear
    );
  });

  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    const rawMonth = searchParams.get("month");
    if (rawMonth && !isNaN(parseInt(rawMonth, 10))) {
      const parsed = parseInt(rawMonth, 10);
      return parsed >= 1 && parsed <= 12 ? parsed : null;
    }
    return initialData.month ?? null;
  });

  // View Mode: Ledger (Table) default, or Cards (Bento)
  const [viewMode, setViewMode] = useState<DepositViewMode>(() => {
    const rawView = searchParams.get("view");
    return rawView === "cards" || rawView === "ledger" ? rawView : "ledger";
  });

  // Filters State
  const [filter, setFilter] = useState<BankDepositFilter>(() => {
    const rawPerson =
      searchParams.get("person") || searchParams.get("personId");
    const rawBank = searchParams.get("bank") || searchParams.get("bankId");
    const rawStatus = searchParams.get("status") || "ALL";
    const rawSearch = searchParams.get("search") || searchParams.get("q") || "";

    return {
      search: rawSearch,
      personId:
        rawPerson && !isNaN(parseInt(rawPerson, 10))
          ? parseInt(rawPerson, 10)
          : 0,
      bankId:
        rawBank && !isNaN(parseInt(rawBank, 10)) ? parseInt(rawBank, 10) : 0,
      status: rawStatus,
    };
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] =
    useState<DepositTransactionWithRelations | null>(null);

  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState<boolean>(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
  const [editingPersonTarget, setEditingPersonTarget] = useState<{
    personId: number;
    personName: string;
    annualTargetLimit: number;
  } | null>(null);

  const [deletingTransaction, setDeletingTransaction] =
    useState<DepositTransactionWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Debounce search input for URL sync without jank
  const debouncedSearch = useDebounce(filter.search, 300);

  // Bidirectional URL search param synchronization
  const updateUrl = (updates: BankDepositUrlFilterUpdates) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);

    if (updates.fy !== undefined) {
      if (updates.fy && updates.fy !== currentMeta.financialYear) {
        current.set("fy", updates.fy);
      } else {
        current.delete("fy");
      }
    }
    if (updates.month !== undefined) {
      if (updates.month !== null && updates.month > 0) {
        current.set("month", String(updates.month));
      } else {
        current.delete("month");
      }
    }
    if (updates.search !== undefined) {
      if (updates.search && updates.search.trim()) {
        current.set("search", updates.search.trim());
      } else {
        current.delete("search");
        current.delete("q");
      }
    }
    if (updates.personId !== undefined) {
      if (updates.personId > 0) {
        current.set("person", String(updates.personId));
      } else {
        current.delete("person");
        current.delete("personId");
      }
    }
    if (updates.bankId !== undefined) {
      if (updates.bankId > 0) {
        current.set("bank", String(updates.bankId));
      } else {
        current.delete("bank");
        current.delete("bankId");
      }
    }
    if (updates.status !== undefined) {
      if (updates.status && updates.status !== "ALL") {
        current.set("status", updates.status);
      } else {
        current.delete("status");
      }
    }
    if (updates.view !== undefined) {
      if (updates.view && updates.view !== "ledger") {
        current.set("view", updates.view);
      } else {
        current.delete("view");
      }
    }

    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  // Sync debounced search input to URL query parameters
  useEffect(() => {
    const searchInUrl =
      searchParams.get("search") || searchParams.get("q") || "";
    if ((debouncedSearch || "").trim() !== searchInUrl.trim()) {
      updateUrl({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  const monthsMeta = useMemo(
    () => getFinancialYearMonths(financialYear),
    [financialYear]
  );
  const currentMonthMeta = useMemo(() => {
    if (!selectedMonth) {
      return {
        month: 0,
        label: "All Months",
        shortLabel: "All",
      };
    }
    return monthsMeta.find((m) => m.month === selectedMonth) || monthsMeta[0];
  }, [monthsMeta, selectedMonth]);

  // Sync local data state whenever server-revalidated initialData updates
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Refresh data from server for current FY and Month
  const refreshData = async (
    fyToLoad = financialYear,
    monthToLoad = selectedMonth
  ) => {
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("portfolio-data-updated"));
      }
      const refreshed = await fetchBankDepositDashboardData(
        fyToLoad,
        monthToLoad,
        { skipCache: true }
      );
      setData(refreshed);
      router.refresh();
    } catch (err) {
      console.error("[refreshData error]", err);
      toast.error("Failed to refresh deposit data.");
    }
  };

  // Month change
  const handleMonthChange = (newMonth: number | null) => {
    setSelectedMonth(newMonth);
    updateUrl({ month: newMonth });
    startTransition(() => {
      refreshData(financialYear, newMonth);
    });
  };

  // Financial Year change
  const handleFinancialYearChange = (newFY: string) => {
    setFinancialYear(newFY);
    updateUrl({ fy: newFY, month: selectedMonth });
    startTransition(() => {
      refreshData(newFY, selectedMonth);
    });
  };

  // View mode change
  const handleViewModeChange = (mode: DepositViewMode) => {
    setViewMode(mode);
    updateUrl({ view: mode });
  };

  // Handle Save (Add or Update)
  const handleSaveDeposit = async (
    input: CreateDepositInput | UpdateDepositInput
  ): Promise<{ success: boolean; message: string }> => {
    let res: { success: boolean; message: string };
    if ("id" in input) {
      res = await updateDepositAction(input);
    } else {
      res = await createDepositAction(input);
    }

    if (res.success) {
      toast.success(res.message);
      const derived = deriveFinancialYearAndMonth(input.depositDate);
      if (derived.financialYear !== financialYear) {
        setFinancialYear(derived.financialYear);
        updateUrl({ fy: derived.financialYear, month: selectedMonth });
        await refreshData(derived.financialYear, selectedMonth);
      } else {
        await refreshData(financialYear, selectedMonth);
      }
    } else {
      toast.error(res.message);
    }
    return res;
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;
    setIsDeleting(true);
    try {
      const res = await deleteDepositAction(deletingTransaction.id);
      if (res.success) {
        toast.success(res.message);
        setDeletingTransaction(null);
        await refreshData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete deposit."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Limits Upsert
  const handleSaveMonthlyLimit = async (input: UpsertMonthlyLimitInput) => {
    const res = await upsertMonthlyLimitAction(input);
    if (res.success) {
      toast.success(res.message);
      await refreshData();
    } else {
      toast.error(res.message);
    }
    return res;
  };

  const handleSaveAnnualLimit = async (input: UpsertAnnualLimitInput) => {
    const res = await upsertAnnualLimitAction(input);
    if (res.success) {
      toast.success(res.message);
      await refreshData();
    } else {
      toast.error(res.message);
    }
    return res;
  };

  // Handle Limit Rollover
  const handleCloneLimits = async (input: CloneLimitsInput) => {
    const res = await cloneMonthlyLimitsAction(input);
    if (res.success) {
      toast.success(res.message);
      if (!data.availableFinancialYears.includes(input.targetFY)) {
        setData((prev) => ({
          ...prev,
          availableFinancialYears: [
            ...prev.availableFinancialYears,
            input.targetFY,
          ],
        }));
      }
      setFinancialYear(input.targetFY);
      updateUrl({ fy: input.targetFY });
      await refreshData(input.targetFY, selectedMonth);
    } else {
      toast.error(res.message);
    }
    return res;
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const url = getExcelExportUrl(financialYear, selectedMonth);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bank_Deposits_FY${financialYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exporting FY ${financialYear} deposits workbook...`);
    } catch (err) {
      toast.error("Failed to download Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  // Filter handlers
  const handleFilterChange = (patch: Partial<BankDepositFilter>) => {
    const nextPersonId =
      patch.personId !== undefined ? patch.personId : filter.personId;
    const nextBankId =
      patch.bankId !== undefined ? patch.bankId : filter.bankId;
    const nextStatus =
      patch.status !== undefined ? patch.status : filter.status;

    setFilter((prev) => ({ ...prev, ...patch }));

    if (
      patch.personId !== undefined ||
      patch.bankId !== undefined ||
      patch.status !== undefined
    ) {
      updateUrl({
        personId: nextPersonId,
        bankId: nextBankId,
        status: nextStatus,
      });
    }
  };

  const handleClearFilters = () => {
    setFilter({
      search: "",
      personId: 0,
      bankId: 0,
      status: "ALL",
    });
    setSelectedMonth(null);
    updateUrl({
      search: "",
      personId: 0,
      bankId: 0,
      status: "ALL",
      month: null,
    });
    startTransition(() => {
      refreshData(financialYear, null);
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedMonth && selectedMonth > 0) count++;
    if (filter.personId && filter.personId > 0) count++;
    if (filter.bankId && filter.bankId > 0) count++;
    if (filter.status && filter.status !== "ALL") count++;
    return count;
  }, [selectedMonth, filter.personId, filter.bankId, filter.status]);

  // Filter persons list based on active filters
  const filteredPersons = useMemo(() => {
    return data.persons.filter((person) => {
      if (
        filter.personId &&
        filter.personId > 0 &&
        person.personId !== filter.personId
      ) {
        return false;
      }
      if (filter.bankId && filter.bankId > 0) {
        const hasBank = person.accounts.some((a) => a.bankId === filter.bankId);
        if (!hasBank) return false;
      }
      if (filter.status && filter.status !== "ALL") {
        if (person.overallStatus !== filter.status) {
          return false;
        }
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.toLowerCase().trim();
        const matchName = person.personName.toLowerCase().includes(q);
        const matchBank = person.accounts.some(
          (a) =>
            a.bankName.toLowerCase().includes(q) ||
            a.accountIdentifier.toLowerCase().includes(q)
        );
        if (!matchName && !matchBank) return false;
      }
      return true;
    });
  }, [data.persons, filter]);

  // Filter transactions list based on active filters
  const filteredTransactions = useMemo(() => {
    return data.transactions.filter((tx) => {
      if (selectedMonth && selectedMonth > 0 && tx.month !== selectedMonth) {
        return false;
      }
      if (
        filter.personId &&
        filter.personId > 0 &&
        tx.personId !== filter.personId
      ) {
        return false;
      }
      if (filter.bankId && filter.bankId > 0 && tx.bankId !== filter.bankId) {
        return false;
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.toLowerCase().trim();
        const matchPerson = tx.personName.toLowerCase().includes(q);
        const matchBank = tx.bankName.toLowerCase().includes(q);
        const matchComment = tx.comment?.toLowerCase().includes(q) || false;
        if (!matchPerson && !matchBank && !matchComment) return false;
      }
      return true;
    });
  }, [data.transactions, filter, selectedMonth]);

  const effectiveMonthForDate =
    selectedMonth ||
    (financialYear === currentMeta.financialYear ? currentMeta.month : 4);

  return (
    <div className="space-y-6">
      {/* 1. Top-Level Header Banner matching Allotted IPOs Portfolio */}
      <BankDepositHeaderBanner
        onOpenAddDeposit={() => {
          setEditingTransaction(null);
          setIsAddEditModalOpen(true);
        }}
        onDownloadExcel={handleDownloadExcel}
        isExporting={isExporting}
      />

      {/* 2. Hero KPI Strip */}
      <BankDepositHeroKpiStrip
        kpis={data.kpis}
        financialYear={financialYear}
        monthLabel={currentMonthMeta.label}
      />

      {/* 3. Interactive Filter & Action Toolbar */}
      <BankDepositToolbar
        filter={filter}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
        allPersonsList={data.allPersonsList}
        allBanksList={data.allBanksList}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenFilterModal={() => setIsFilterModalOpen(true)}
      />

      {/* 4. Person & Bank Account Overview Section (Switchable Cards & Ledger with Inspect) */}
      <PersonBankOverviewSection
        persons={filteredPersons}
        financialYear={financialYear}
        onFinancialYearChange={handleFinancialYearChange}
        availableFinancialYears={data.availableFinancialYears}
        monthLabel={currentMonthMeta.label}
        viewMode={viewMode}
        onDepositToAccount={(_accountId, _personId) => {
          setEditingTransaction(null);
          setIsAddEditModalOpen(true);
        }}
        onEditAnnualTarget={setEditingPersonTarget}
        onOpenManageLimits={() => setIsLimitsModalOpen(true)}
        onOpenCloneLimits={() => setIsCloneModalOpen(true)}
      />

      {/* 5. Deposit Transaction Ledger Table */}
      <BankDepositLedgerTable
        transactions={filteredTransactions}
        onOpenAddDeposit={() => {
          setEditingTransaction(null);
          setIsAddEditModalOpen(true);
        }}
        onEdit={(tx) => {
          setEditingTransaction(tx);
          setIsAddEditModalOpen(true);
        }}
        onDelete={(tx) => {
          setDeletingTransaction(tx);
        }}
      />

      {/* MODALS */}
      <BankDepositFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filter={filter}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearFilters}
        allPersonsList={data.allPersonsList}
        allBanksList={data.allBanksList}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        monthsMeta={monthsMeta}
        totalFilteredCount={filteredPersons.length}
      />

      <EditPersonAnnualTargetModal
        isOpen={Boolean(editingPersonTarget)}
        onClose={() => setEditingPersonTarget(null)}
        person={editingPersonTarget}
        financialYear={financialYear}
        onSuccess={() => refreshData()}
      />

      <AddEditDepositModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveDeposit}
        transaction={editingTransaction}
        allPersonsList={data.allPersonsList}
        allAccountsList={data.allAccountsList}
        defaultDate={`${financialYear.split("-")[0]}-${String(effectiveMonthForDate).padStart(2, "0")}-01`}
      />

      <ManageMonthlyLimitsModal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        onSaveMonthlyLimit={handleSaveMonthlyLimit}
        onSaveAnnualLimit={handleSaveAnnualLimit}
        financialYear={financialYear}
        allPersonsList={data.allPersonsList}
        allAccountsList={data.allAccountsList}
      />

      <CloneLimitsModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onClone={handleCloneLimits}
        currentFY={financialYear}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deletingTransaction)}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleConfirmDelete}
        transaction={deletingTransaction}
        isDeleting={isDeleting}
      />
    </div>
  );
}
