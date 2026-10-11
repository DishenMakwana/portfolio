import type { AllocationTotalRowProps } from "@/types/allocation";

export default function AllocationTotalRow({ cells }: AllocationTotalRowProps) {
  return (
    <tr className="bg-teal-500 text-slate-950">
      {cells.map((c, i) => (
        <td
          key={i}
          className={`px-4 py-3 font-extrabold text-sm tabular-nums ${
            i > 0 ? "text-right" : "text-left"
          } ${
            i === cells.length - 1
              ? "bg-teal-600 border-l border-teal-400/30"
              : ""
          }`}
        >
          {c}
        </td>
      ))}
    </tr>
  );
}
