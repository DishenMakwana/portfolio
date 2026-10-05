import type {
  BullionChartLabelBadgeProps,
  CustomChartTooltipProps,
} from "@/types/bullion";
import { formatInr } from "@/helpers/formatters";

export function CustomChartTooltip({
  active,
  payload,
  label,
}: CustomChartTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-slate-400 mb-1 font-semibold">{label}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span className="text-slate-300">{payload[0].name}:</span>
          <span className="font-bold text-slate-100">
            {formatInr(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function HighLabelBadge(
  props: BullionChartLabelBadgeProps
): React.JSX.Element | null {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 500;
  const rectX = isNearRightEdge ? -120 : -60;
  const textX = isNearRightEdge ? -60 : 0;

  return (
    <g transform={`translate(${x}, ${y - 14})`}>
      <rect
        x={rectX}
        y={-18}
        width={120}
        height={22}
        rx={6}
        fill="#047857"
        stroke="#34d399"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))" }}
      />
      <text
        x={textX}
        y={-6}
        fill="#ecfdf5"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </g>
  );
}

export function LowLabelBadge(
  props: BullionChartLabelBadgeProps
): React.JSX.Element | null {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 500;
  const rectX = isNearRightEdge ? -110 : -55;
  const textX = isNearRightEdge ? -55 : 0;

  return (
    <g transform={`translate(${x}, ${y + 14})`}>
      <rect
        x={rectX}
        y={-4}
        width={110}
        height={22}
        rx={6}
        fill="#be123c"
        stroke="#f43f5e"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))" }}
      />
      <text
        x={textX}
        y={8}
        fill="#fff1f2"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </g>
  );
}
