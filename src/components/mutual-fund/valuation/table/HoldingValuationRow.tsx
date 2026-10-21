import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PlusCircle, MinusCircle } from "lucide-react";
import { formatIndianAmount, getFundDetailsUrl } from "@/helpers/formatters";
import ValuationSoaDrawer from "@/components/mutual-fund/valuation/table/ValuationSoaDrawer";
import type { HoldingValuationRowProps } from "@/types/valuation";

export default function HoldingValuationRow({
  holding,
  isExpanded,
  onToggle,
}: HoldingValuationRowProps): React.JSX.Element {
  const router = useRouter();
  const fundUrl = getFundDetailsUrl(
    holding.holdingId,
    (holding.currentValue ?? 0) <= 0.0001
  );

  return (
    <>
      <tr
        className={`border-b border-slate-800/40 hover:bg-slate-800/30 transition ${
          isExpanded ? "bg-slate-800/20" : ""
        }`}
      >
        {/* Folio Column with + button and SOA badge */}
        <td className="py-2 px-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {holding.transactions.length > 0 ? (
              <button
                type="button"
                onClick={onToggle}
                className="text-slate-400 hover:text-teal-400 transition cursor-pointer p-0.5"
                title={
                  isExpanded
                    ? "Collapse transaction lots"
                    : "Expand transaction lots"
                }
              >
                <motion.span
                  initial={false}
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  className="inline-flex items-center justify-center"
                >
                  {isExpanded ? (
                    <MinusCircle size={14} className="text-teal-400" />
                  ) : (
                    <PlusCircle
                      size={14}
                      className="text-slate-400 hover:text-teal-400"
                    />
                  )}
                </motion.span>
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            <span className="text-slate-300 text-[11px]">
              {holding.folioNo}
            </span>
            <button
              type="button"
              onClick={() => router.push(fundUrl)}
              className="px-1 py-0.5 rounded text-[9.5px] font-bold text-[#00cba0] border border-[#00cba0]/30 bg-[#00cba0]/10 hover:bg-[#00cba0]/20 transition cursor-pointer ml-0.5"
              title="View Fund Details & Statement of Account"
            >
              SOA
            </button>
          </div>
        </td>

        {/* Scheme Name */}
        <td className="py-2 px-2.5 font-medium text-slate-200">
          <button
            type="button"
            onClick={() => router.push(fundUrl)}
            className="text-left hover:text-teal-400 transition cursor-pointer font-medium hover:underline underline-offset-4 text-[11.5px] leading-snug break-words"
          >
            {holding.schemeName}
          </button>
        </td>

        {/* Balance Units */}
        <td className="py-2 px-2 text-right  text-slate-300 whitespace-nowrap text-[11px]">
          {holding.balanceUnits.toLocaleString("en-IN", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          })}
        </td>

        {/* Purchase NAV */}
        <td className="py-2 px-2 text-right  text-slate-400 whitespace-nowrap text-[11px]">
          {holding.purchaseNav.toLocaleString("en-IN", {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          })}
        </td>

        {/* Current NAV */}
        <td className="py-2 px-2 text-right  text-slate-300 whitespace-nowrap text-[11px]">
          {holding.currentNav.toLocaleString("en-IN", {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          })}
        </td>

        {/* Purchase Value */}
        <td className="py-2 px-2 text-right font-medium text-slate-200 whitespace-nowrap text-[11.5px]">
          {formatIndianAmount(holding.purchaseValue, 0)}
        </td>

        {/* Current Value */}
        <td className="py-2 px-2 text-right font-bold text-slate-100 whitespace-nowrap text-[11.5px]">
          {formatIndianAmount(holding.currentValue, 0)}
        </td>

        {/* Gain */}
        <td
          className={`py-2 px-2 text-right font-bold whitespace-nowrap text-[11.5px] ${
            holding.gain >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatIndianAmount(holding.gain, 0)}
        </td>

        {/* Holding Days */}
        <td className="py-2 px-1.5 text-right text-slate-300 whitespace-nowrap  text-[11px]">
          {holding.holdingDays.toLocaleString("en-IN")}
        </td>

        {/* Abs Return (%) */}
        <td
          className={`py-2 px-1.5 text-right font-semibold whitespace-nowrap text-[11px] ${
            holding.absReturn >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {holding.absReturn.toFixed(2)}
        </td>

        {/* CAGR (%) */}
        <td
          className={`py-2 px-2 text-right font-semibold whitespace-nowrap text-[11px] ${
            holding.cagr >= 0 ? "text-teal-400" : "text-rose-400"
          }`}
        >
          {holding.cagr.toFixed(2)}
        </td>

        {/* XIRR (%) */}
        <td
          className={`py-2 px-3 text-right font-semibold whitespace-nowrap text-[11px] ${
            holding.xirr >= 0 ? "text-teal-400" : "text-rose-400"
          }`}
        >
          {holding.xirr.toFixed(2)}
        </td>
      </tr>

      {/* ── EXPANDED SOA TRANSACTION LOTS TABLE ── */}
      <ValuationSoaDrawer holding={holding} isExpanded={isExpanded} />
    </>
  );
}
