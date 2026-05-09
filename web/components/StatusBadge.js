import { RIDE_STATUS } from "../constants";
import styles from "./StatusBadge.module.css";

const KIND = ["active", "completed", "cancelled"];

export default function StatusBadge({ status }) {
  const k = KIND[status] || "active";
  return <span className={`${styles.badge} ${styles[k]}`}>{RIDE_STATUS[status] || "?"}</span>;
}
