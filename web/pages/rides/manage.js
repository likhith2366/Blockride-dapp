import Link from "next/link";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  fetchAllRides,
  completeRide,
  cancelRide,
  getMyAddress,
  fetchPassengers,
} from "../../utils/contract";
import { useTx } from "../../hooks/useTx";
import TxModal from "../../components/TxModal";
import Identicon from "../../components/Identicon";
import StatusBadge from "../../components/StatusBadge";
import StarRating from "../../components/StarRating";
import styles from "../../styles/Home.module.css";
import form from "../../styles/rides.module.css";

export default function Manage() {
  const [rides, setRides] = useState([]);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [passengers, setPassengers] = useState({});
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
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const myRides = useMemo(
    () => rides.filter((r) => r.driver.toLowerCase() === address.toLowerCase()),
    [rides, address]
  );

  const togglePassengers = async (rideId) => {
    const next = !expanded[rideId];
    setExpanded((e) => ({ ...e, [rideId]: next }));
    if (next && !passengers[rideId]) {
      try {
        const list = await fetchPassengers(rideId);
        setPassengers((p) => ({ ...p, [rideId]: list }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const run = async (ride, action) => {
    try {
      if (action === "complete") {
        await tx.run(`Complete ride #${ride.id}`, () => completeRide(ride.id));
      } else {
        await tx.run(`Cancel ride #${ride.id}`, () => cancelRide(ride.id));
      }
      await reload();
      setPassengers((p) => ({ ...p, [ride.id]: undefined }));
    } catch {}
  };

  return (
    <div className={form.shell}>
      <Head>
        <title>My rides - BlockRide</title>
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
        <h1 className={form.heading}>My posted rides</h1>
        <p className={form.subheading}>
          Complete a ride to release the escrow, or cancel to refund every passenger atomically.
        </p>

        {loading && <p className={form.infoMsg}>Loading...</p>}
        {error && <p className={form.errorMsg}>{error}</p>}

        <ul className={form.rideList}>
          {myRides.map((r) => {
            const canComplete = r.status === 0 && Date.now() / 1000 >= r.departsAt;
            const escrowEth = ethers.utils.formatEther(
              ethers.BigNumber.from(r.farePerSeatWei).mul(r.totalSeats - r.seatsAvailable)
            );
            const isExpanded = expanded[r.id];
            const pax = passengers[r.id] || [];
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
                <div className={form.rideMeta}>
                  <span>&#128197; {new Date(r.departsAt * 1000).toLocaleString()}</span>
                  <span>&#128100; {r.totalSeats - r.seatsAvailable}/{r.totalSeats} booked</span>
                  <span>&#128181; {r.farePerSeatEth} ETH/seat</span>
                  <span>&#128274; {escrowEth} ETH escrow</span>
                </div>

                <button
                  type="button"
                  className={form.disclosure}
                  onClick={() => togglePassengers(r.id)}
                >
                  {isExpanded ? "Hide" : "Show"} passengers ({r.totalSeats - r.seatsAvailable})
                </button>

                {isExpanded && (
                  <ul className={form.passengerList}>
                    {pax.length === 0 && <li className={form.emptyState}>No passengers booked yet.</li>}
                    {pax.map((p) => (
                      <li key={p.address} className={form.passengerCard}>
                        <Identicon address={p.address} size={28} />
                        <div className={form.passengerInfo}>
                          <span>{p.address.slice(0, 8)}...{p.address.slice(-6)}</span>
                          <span className={form.passengerSub}>{p.seats} seat{p.seats > 1 ? "s" : ""}</span>
                        </div>
                        {p.rated && (
                          <div className={form.ratingTag}>
                            <StarRating value={p.score} readOnly size={14} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {r.status === 0 && (
                  <div className={form.rideActions}>
                    <button
                      type="button"
                      className={form.submit}
                      disabled={!canComplete || tx.state.phase === "signing" || tx.state.phase === "pending"}
                      onClick={() => run(r, "complete")}
                      title={canComplete ? "Release escrow to driver" : "Available after departure time"}
                    >
                      Complete &amp; collect
                    </button>
                    <button
                      type="button"
                      className={form.danger}
                      disabled={tx.state.phase === "signing" || tx.state.phase === "pending"}
                      onClick={() => run(r, "cancel")}
                    >
                      Cancel &amp; refund
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {!loading && myRides.length === 0 && (
            <li className={form.emptyState}>You haven&apos;t posted any rides yet.</li>
          )}
        </ul>
      </main>

      <TxModal state={tx.state} onClose={tx.reset} />
    </div>
  );
}
