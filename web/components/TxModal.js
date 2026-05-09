import { BLOCK_EXPLORER } from "../constants";
import styles from "./TxModal.module.css";

const STEPS = [
  { key: "signing", label: "Awaiting signature" },
  { key: "pending", label: "Submitted, mining" },
  { key: "confirmed", label: "Confirmed on-chain" },
];

export default function TxModal({ state, onClose }) {
  if (state.phase === "idle") return null;

  const stepIndex =
    state.phase === "signing" ? 0 :
    state.phase === "pending" ? 1 :
    state.phase === "confirmed" ? 2 : -1;

  const isError = state.phase === "error";

  return (
    <div className={styles.backdrop} onClick={state.phase === "confirmed" || isError ? onClose : undefined}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{state.label || "Transaction"}</h3>

        {!isError && (
          <ol className={styles.steps}>
            {STEPS.map((s, i) => {
              const status = i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
              return (
                <li key={s.key} className={`${styles.step} ${styles[status] || ""}`}>
                  <span className={styles.dot}>
                    {status === "done" ? "✓" : status === "active" ? <span className={styles.spinner} /> : i + 1}
                  </span>
                  <span>{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {state.hash && (
          <a
            className={styles.link}
            href={`${BLOCK_EXPLORER}/tx/${state.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Etherscan &#8599;
          </a>
        )}

        {isError && (
          <div className={styles.errorBlock}>
            <strong>Transaction failed</strong>
            <p>{state.error}</p>
          </div>
        )}

        {(state.phase === "confirmed" || isError) && (
          <button className={styles.closeBtn} onClick={onClose}>
            {isError ? "Dismiss" : "Done"}
          </button>
        )}
      </div>
    </div>
  );
}
