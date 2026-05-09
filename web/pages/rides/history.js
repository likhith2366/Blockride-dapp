import Link from "next/link";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAllRides,
  fetchRating,
  rateDriver,
  getMyAddress,
} from "../../utils/contract";
import { useTx } from "../../hooks/useTx";
import TxModal from "../../components/TxModal";
import Identicon from "../../components/Identicon";
import StatusBadge from "../../components/StatusBadge";
import StarRating from "../../components/StarRating";
import { BLOCK_EXPLORER, RIDE_STATUS } from "../../constants";
import styles from "../../styles/Home.module.css";
import form from "../../styles/rides.module.css";

export default function History() {
  const [rides, setRides] = useState([]);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState("mine");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratings, setRatings] = useState({});
  const [draftRating, setDraftRating] = useState({});
  const tx = useTx();

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const a = await getMyAddress();
      setAddress(a);
      const list = await fetchAllRides();
      setRides(list);
    } catch (e) {
      setError(e.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const lower = address.toLowerCase();

  const filtered = useMemo(() => {
    let out = rides.slice().sort((a, b) => b.id - a.id);
    if (scope === "mine") {
      out = out.filter((r) => r.driver.toLowerCase() === lower);
    } else if (scope === "booked") {
      // We can't query seatsBooked for every ride cheaply; fall back to global view.
      // True passenger filter requires events; left as a follow-up.
      out = out;
    }
    if (statusFilter !== "all") {
      const code = ["active", "completed", "cancelled"].indexOf(statusFilter);
      out = out.filter((r) => r.status === code);
    }
    return out;
  }, [rides, scope, statusFilter, lower]);

  const loadRatingFor = async (rideId) => {
    if (ratings[rideId]) return;
    try {
      const r = await fetchRating(rideId, address);
      setRatings((rs) => ({ ...rs, [rideId]: r }));
    } catch {}
  };

  const submitRating = async (ride) => {
    const score = draftRating[ride.id]?.score;
    const comment = draftRating[ride.id]?.comment || "";
    if (!score) {
      setError("Pick a star rating first");
      return;
    }
    try {
      await tx.run(`Rate ride #${ride.id}`, () =>
        rateDriver({ rideId: ride.id, score, comment })
      );
      setRatings((rs) => ({ ...rs, [ride.id]: { score, comment, submitted: true } }));
      setDraftRating((d) => ({ ...d, [ride.id]: undefined }));
    } catch {}
  };

  return (
    <div className={form.shell}>
      <Head>
        <title>History - BlockRide</title>
      </Head>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>&#9651;</span>
          <span>BlockRide</span>
        </Link>
        {address && (
          <Link href="/profile" className={styles.addressPill}>
            <Identicon address={address} size={22} />
            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
          </Link>
        )}
      </header>

      <main className={form.card}>
        <h1 className={form.heading}>Ride history</h1>
        <p className={form.subheading}>Browse rides on this contract. Rate completed rides you booked.</p>

        <div className={form.tabs}>
          <button type="button" className={`${form.tab} ${scope === "mine" ? form.tabActive : ""}`} onClick={() => setScope("mine")}>
            My posted
          </button>
          <button type="button" className={`${form.tab} ${scope === "all" ? form.tabActive : ""}`} onClick={() => setScope("all")}>
            All rides
          </button>
        </div>

        <div className={form.filters}>
          <select className={form.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="button" onClick={reload} className={form.secondary}>Refresh</button>
        </div>

        {loading && <p className={form.infoMsg}>Loading...</p>}
        {error && <p className={form.errorMsg}>{error}</p>}

        <ul className={form.rideList}>
          {filtered.map((r) => {
            const isCompleted = r.status === 1;
            const isOwnRide = r.driver.toLowerCase() === lower;
            const canRate = isCompleted && !isOwnRide;
            const rating = ratings[r.id];
            const draft = draftRating[r.id] || {};
            return (
              <li key={r.id} className={form.rideCard}>
                <div className={form.rideHeader}>
                  <div className={form.rideRoute}>
                    <span className={form.rideId}>#{r.id}</span>
                    <strong>{r.origin}</strong>
                    <span className={form.arrow}>&rarr;</span>
                    <strong>{r.destination}</strong>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className={form.driverRow}>
                  <Identicon address={r.driver} size={26} />
                  <span className={form.driverAddr}>
                    Driver {r.driver.slice(0, 8)}...{r.driver.slice(-6)}
                    {isOwnRide && " (you)"}
                  </span>
                </div>
                <div className={form.rideMeta}>
                  <span>&#128197; {new Date(r.departsAt * 1000).toLocaleString()}</span>
                  <span>&#128100; {r.totalSeats - r.seatsAvailable}/{r.totalSeats} booked</span>
                  <span>&#128181; {r.farePerSeatEth} ETH/seat</span>
                  <a className={form.explorerLink} href={`${BLOCK_EXPLORER}/address/${r.driver}`} target="_blank" rel="noreferrer">
                    Driver on Etherscan &#8599;
                  </a>
                </div>

                {canRate && (
                  <div className={form.rateBlock}>
                    {!rating && (
                      <button type="button" className={form.secondary} onClick={() => loadRatingFor(r.id)}>
                        Check / leave rating
                      </button>
                    )}
                    {rating && rating.submitted && (
                      <div className={form.ratingShown}>
                        <span>You rated:</span>
                        <StarRating value={rating.score} readOnly />
                        {rating.comment && <em className={form.ratingComment}>&ldquo;{rating.comment}&rdquo;</em>}
                      </div>
                    )}
                    {rating && !rating.submitted && (
                      <div className={form.rateForm}>
                        <StarRating
                          value={draft.score || 0}
                          onChange={(s) => setDraftRating((d) => ({ ...d, [r.id]: { ...draft, score: s } }))}
                        />
                        <input
                          type="text"
                          placeholder="Optional comment"
                          value={draft.comment || ""}
                          maxLength={140}
                          onChange={(e) => setDraftRating((d) => ({ ...d, [r.id]: { ...draft, comment: e.target.value } }))}
                        />
                        <button
                          type="button"
                          className={form.submit}
                          disabled={tx.state.phase === "signing" || tx.state.phase === "pending"}
                          onClick={() => submitRating(r)}
                        >
                          Submit rating
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {!loading && filtered.length === 0 && (
            <li className={form.emptyState}>No rides match.</li>
          )}
        </ul>
      </main>

      <TxModal state={tx.state} onClose={tx.reset} />
    </div>
  );
}
