import { useState, useCallback } from "react";

const initial = { phase: "idle", hash: null, error: null, label: "" };

export function useTx() {
  const [state, setState] = useState(initial);

  const reset = useCallback(() => setState(initial), []);

  const run = useCallback(async (label, fn) => {
    setState({ phase: "signing", hash: null, error: null, label });
    try {
      const tx = await fn();
      setState({ phase: "pending", hash: tx.hash, error: null, label });
      const receipt = await tx.wait();
      setState({ phase: "confirmed", hash: tx.hash, error: null, label });
      return receipt;
    } catch (err) {
      const msg = parseRevert(err) || err.message || "Transaction failed";
      setState({ phase: "error", hash: null, error: msg, label });
      throw err;
    }
  }, []);

  return { state, run, reset };
}

function parseRevert(err) {
  const candidates = [
    err?.error?.data?.message,
    err?.error?.message,
    err?.data?.message,
    err?.reason,
    err?.shortMessage,
  ].filter(Boolean);
  for (const c of candidates) {
    if (typeof c === "string") {
      const match = c.match(/BlockRide: [^"]+/);
      if (match) return match[0];
      return c;
    }
  }
  return null;
}
