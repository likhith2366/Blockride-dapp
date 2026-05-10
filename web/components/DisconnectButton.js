import { useState } from "react";

/**
 * Clears the dapp's view of the connected wallet:
 *  - Tries EIP-2255 `wallet_revokePermissions` (MetaMask 11.6+) so the next
 *    connect attempt re-opens the account-picker.
 *  - Falls back to a plain page reload if revoke isn't supported (older wallets).
 * MetaMask itself never truly "logs out" - the user can always re-grant access.
 */
export default function DisconnectButton({ className, label = "Disconnect" }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (typeof window !== "undefined" && window.ethereum?.request) {
        try {
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch {
          // Older MetaMask versions don't support revokePermissions; reload is
          // the best we can do without explicit permission revocation.
        }
      }
    } finally {
      // Hard reload clears every page's in-memory wallet state.
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={className}
      title="Disconnect this wallet from BlockRide. You'll be prompted to reconnect (and can pick a different MetaMask account)."
    >
      {busy ? "..." : label}
    </button>
  );
}
