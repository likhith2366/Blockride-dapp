import styles from "./StarRating.module.css";

export default function StarRating({ value = 0, max = 5, onChange, size = 22, readOnly = false }) {
  return (
    <div className={styles.row} style={{ fontSize: size }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        const cls = `${styles.star} ${filled ? styles.filled : ""} ${readOnly ? styles.readOnly : ""}`;
        return (
          <button
            key={i}
            type="button"
            className={cls}
            disabled={readOnly}
            onClick={() => onChange && onChange(i + 1)}
            aria-label={`${i + 1} stars`}
          >
            &#9733;
          </button>
        );
      })}
    </div>
  );
}
