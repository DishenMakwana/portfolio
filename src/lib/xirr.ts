export interface CashFlow {
  amount: number; // Negative for Buy (Inflow), Positive for Valuation/Sell (Outflow)
  date: Date;
}

/**
 * Calculates XIRR (Internal Rate of Return) for a list of cash flows.
 * Returns the rate as a percentage (e.g. 15.42 for 15.42%).
 */
export function calculateXIRR(cashFlows: CashFlow[]): number {
  if (cashFlows.length < 2) return 0;

  // Verify we have both positive and negative cash flows
  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPositive = true;
    if (cf.amount < 0) hasNegative = true;
  }
  if (!hasPositive || !hasNegative) {
    // If we only have purchase flows and no current valuation, we can't calculate XIRR yet.
    // Try to approximate absolute return.
    return 0;
  }

  // Sort cash flows chronologically
  const sorted = [...cashFlows].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const d0 = sorted[0].date.getTime();

  // NPV function
  const npv = (r: number) => {
    let sum = 0;
    for (const cf of sorted) {
      const exp = (cf.date.getTime() - d0) / (365 * 24 * 60 * 60 * 1000);
      sum += cf.amount / Math.pow(1 + r, exp);
    }
    return sum;
  };

  // Derivative of NPV function
  const dNpv = (r: number) => {
    let sum = 0;
    for (const cf of sorted) {
      const exp = (cf.date.getTime() - d0) / (365 * 24 * 60 * 60 * 1000);
      sum -= (exp * cf.amount) / Math.pow(1 + r, exp + 1);
    }
    return sum;
  };

  // Newton-Raphson method
  let r = 0.1; // Initial guess (10%)
  const maxIterations = 150;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    const val = npv(r);
    const deriv = dNpv(r);

    if (Math.abs(deriv) < 1e-12) break; // Avoid division by zero

    const nextR = r - val / deriv;

    // Check convergence
    if (Math.abs(nextR - r) < tolerance) {
      // Sanity check: XIRR cannot be less than -99%
      if (nextR < -0.99) return -99;
      return nextR * 100; // Return as percentage
    }

    r = nextR;
  }

  // Fallback to Bisection Method if Newton-Raphson did not converge
  return bisectionXIRR(sorted, d0);
}

function bisectionXIRR(sorted: CashFlow[], d0: number): number {
  const npv = (r: number) => {
    let sum = 0;
    for (const cf of sorted) {
      const exp = (cf.date.getTime() - d0) / (365 * 24 * 60 * 60 * 1000);
      sum += cf.amount / Math.pow(1 + r, exp);
    }
    return sum;
  };

  let low = -0.99;
  let high = 10.0; // Support up to 1000% return
  let mid = 0.1;

  // Ensure brackets have opposite signs
  const valLow = npv(low);
  const valHigh = npv(high);
  if (valLow * valHigh > 0) {
    // If signs are same, bisection won't guarantee root. Propose a default CAGR return.
    // Calculate simple CAGR: (EndValue / StartValue) ^ (365 / days) - 1
    const totalInvested = Math.abs(
      sorted.filter((c) => c.amount < 0).reduce((acc, c) => acc + c.amount, 0)
    );
    const finalValuation = sorted
      .filter((c) => c.amount > 0)
      .reduce((acc, c) => acc + c.amount, 0);
    const firstDate = sorted[0].date;
    const lastDate = sorted[sorted.length - 1].date;
    const diffDays =
      (lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000);

    if (totalInvested > 0 && finalValuation > 0 && diffDays > 0) {
      const cagr = Math.pow(finalValuation / totalInvested, 365 / diffDays) - 1;
      return cagr * 100;
    }
    return 0;
  }

  for (let i = 0; i < 100; i++) {
    mid = (low + high) / 2;
    const val = npv(mid);

    if (Math.abs(val) < 1e-5) {
      return mid * 100;
    }

    if (npv(low) * val < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return mid * 100;
}
