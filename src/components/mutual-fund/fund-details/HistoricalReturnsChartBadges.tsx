import type {
  ChartActiveDotProps,
  HistoricalChartLabelBadgeProps,
} from "@/types/fund-details";

export const HighLabelBadge = (props: HistoricalChartLabelBadgeProps) => {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 620;
  const rectX = isNearRightEdge ? -108 : -54;
  const textX = isNearRightEdge ? -54 : 0;

  return (
    <g transform={`translate(${x}, ${y - 14})`}>
      <rect
        x={rectX}
        y={-18}
        width={108}
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
};

export const LowLabelBadge = (props: HistoricalChartLabelBadgeProps) => {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 620;
  const rectX = isNearRightEdge ? -100 : -50;
  const textX = isNearRightEdge ? -50 : 0;

  return (
    <g transform={`translate(${x}, ${y + 14})`}>
      <rect
        x={rectX}
        y={-4}
        width={100}
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
};

export const FundActiveDot = (props: ChartActiveDotProps) => {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) {
    return null;
  }

  return (
    <g>
      {/* Outer translucent circular halo */}
      <circle cx={cx} cy={cy} r={14} fill="#10b981" fillOpacity={0.25} />
      {/* Inner solid round dot with crisp white border */}
      <circle
        cx={cx}
        cy={cy}
        r={5.5}
        fill="#10b981"
        stroke="#ffffff"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0px 1.5px 3px rgba(0, 0, 0, 0.45))" }}
      />
    </g>
  );
};

export const BenchmarkActiveDot = (props: ChartActiveDotProps) => {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) {
    return null;
  }

  return (
    <g>
      {/* Outer translucent circular halo */}
      <circle cx={cx} cy={cy} r={14} fill="#6366f1" fillOpacity={0.25} />
      {/* Inner solid square / diamond (rotated 45 deg) with crisp white border */}
      <rect
        x={cx - 4.5}
        y={cy - 4.5}
        width={9}
        height={9}
        rx={1}
        fill="#6366f1"
        stroke="#ffffff"
        strokeWidth={2}
        transform={`rotate(45 ${cx} ${cy})`}
        style={{ filter: "drop-shadow(0px 1.5px 3px rgba(0, 0, 0, 0.45))" }}
      />
    </g>
  );
};
