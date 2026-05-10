import Link from "next/link";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  fetchAllRides,
  bookSeats,
  cancelMyBooking,
  rateDriver,
  getMyAddress,
  fetchRating,
  fetchMySeats,
} from "../../utils/contract";
import { useTx } from "../../hooks/useTx";
import TxModal from "../../components/TxModal";
import Identicon from "../../components/Identicon";
import StatusBadge from "../../components/StatusBadge";
import StarRating from "../../components/StarRating";
import DisconnectButton from "../../components/DisconnectButton";
import styles from "../../styles/Home.module.css";
import form from "../../styles/rides.module.css";

export default function Book() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [filters, setFilters] = useState({ origin: "", destination: "", maxFareEth: "" });
  const [seatChoice, setSeatChoice] = useState({});
  const [mySeats, setMySeats] = useState({}); // {rideId: seatCount}
  const tx = useTx();

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAllRides();
      setRides(list);
      let myAddr = "";
      try {
        myAddr = await getMyAddress();
        setAddress(myAddr);
      } catch {}
      if (myAddr) {
        const seatCounts = await Promise.all(
          list.map((r) => fetchMySeats(r.id, myAddr).catch(() => 0))
        );
        const map = {};
        list.forEach((r, i) => { if (seatCounts[i] > 0) map[r.id] = seatCounts[i]; });
        setMySeats(map);
      } else {
        setMySeats({});
      }
    } catch (e) {
      setError(e.message || "Failed to load rides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const max = filters.maxFareEth ? parseFloat(filters.maxFareEth) : Infinity;
    return rides.filter(
      (r) =>
        r.status === 0 &&
        // Show fully-booked rides too if the user has seats on them, so they
        // can still cancel.
        (r.seatsAvailable > 0 || (mySeats[r.id] || 0) > 0) &&
        (!filters.origin || r.origin.toLowerCase().includes(filters.origin.toLowerCase())) &&
        (!filters.destination || r.destination.toLowerCase().includes(filters.destination.toLowerCase())) &&
        parseFloat(r.farePerSeatEth) <= max
    );
  }, [rides, filters, mySeats]);

  const handleBook = async (ride) => {
    const numSeats = Number(seatChoice[ride.id] || 1);
    if (numSeats < 1 || numSeats > ride.seatsAvailable) {
      setError(`Pick 1-${ride.seatsAvailable} seats`);
      return;
    }
    try {
      await tx.run("Book ride", () =>
        bookSeats({ rideId: ride.id, numSeats, farePerSeatWei: ride.farePerSeatWei })
      );
      await reload();
    } catch {}
  };

  const handleCancelMyBooking = async (ride) => {
    const now = Math.floor(Date.now() / 1000);
    const isLate = ride.departsAt - now < 3600;
    const refundPct = isLate ? 50 : 100;
    const seats = mySeats[ride.id] || 0;
    const ok = window.confirm(
      `Cancel your ${seats} seat${seats > 1 ? "s" : ""} on ${ride.origin} → ${ride.destination}?\n\n` +
      `Refund: ${refundPct}% (${isLate ? "less than 1h before departure - 50% goes to driver as no-show fee" : "more than 1h before departure - full refund"}).\n\n` +
      `Refund will be queued to pendingRefunds[your address]. Withdraw later via the contract.`
    );
    if (!ok) return;
    try {
      await tx.run("Cancel my booking", () => cancelMyBooking(ride.id));
      await reload();
    } catch {}
  };

  return (
    <div className={form.shell}>
      <Head>
        <title>Find a ride - BlockRide</title>
      </Head>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>&#9651;</span>
          <span>BlockRide</span>
        </Link>
        {address && (
          <div className={styles.userArea}>
            <Link href="/profile" className={styles.addressPill}>
              <Identicon address={address} size={22} />
              <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
            </Link>
            <DisconnectButton className={styles.disconnectBtn} />
          </div>
        )}
      </header>

      <main className={form.card}>
        <h1 className={form.heading}>Find a ride</h1>
        <p className={form.subheading}>Filter the on-chain ride book and pay the fare into escrow.</p>

        <div className={form.filters}>
          <input placeholder="Origin contains" value={filters.origin} onChange={(e) => setFilters({ ...filters, origin: e.target.value })} />
          <input placeholder="Destination contains" value={filters.destination} onChange={(e) => setFilters({ ...filters, destination: e.target.value })} />
          <input placeholder="Max fare (ETH)" type="number" min="0" step="0.0001" value={filters.maxFareEth} onChange={(e) => setFilters({ ...filters, maxFareEth: e.target.value })} />
          <button type="button" onClick={reload} className={form.secondary}>Refresh</button>
        </div>

        {loading && <p className={form.infoMsg}>Loading rides...</p>}
        {error && <p className={form.errorMsg}>{error}</p>}

        <ul className={form.rideList}>
          {filtered.map((r) => {
            const totalEth = ethers.utils.formatEther(
              ethers.BigNumber.from(r.farePerSeatWei).mul(seatChoice[r.id] || 1)
            );
            const isOwn = r.driver.toLowerCase() === address.toLowerCase();
            const myCount = mySeats[r.id] || 0;
            const now = Math.floor(Date.now() / 1000);
            const departed = r.departsAt <= now;
            const isLate = !departed && r.departsAt - now < 3600;
            const canBook = !isOwn && r.seatsAvailable > 0;
            return (
              <li key={r.id} className={form.rideCard}>
                <div className={form.rideHeader}>
                  <div className={form.rideRoute}>
                    <strong>{r.origin}</strong>
                    <span className={form.arrow}>&rarr;</span>
                    <strong>{r.destination}</strong>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className={form.driverRow}>
                  <Identicon address={r.driver} size={28} />
                  <span className={form.driverAddr}>{r.driver.slice(0, 8)}...{r.driver.slice(-6)}</span>
                </div>
                <div className={form.rideMeta}>
                  <span>&#128197; {new Date(r.departsAt * 1000).toLocaleString()}</span>
                  <span>&#128100; {r.seatsAvailable}/{r.totalSeats} seats</span>
                  <span>&#128181; {r.farePerSeatEth} ETH/seat</span>
                </div>
                {myCount > 0 && (
                  <div className={form.myBookingBanner}>
                    <span>
                      You have <strong>{myCount}</strong> seat{myCount > 1 ? "s" : ""} on this ride.
                    </span>
                    {!departed && (
                      <button
                        type="button"
                        className={form.cancelMine}
                        disabled={tx.state.phase === "signing" || tx.state.phase === "pending"}
                        onClick={() => handleCancelMyBooking(r)}
                        title={
                          isLate
                            ? "Less than 1h before departure - 50% refund, 50% goes to driver"
                            : "More than 1h before departure - full refund"
                        }
                      >
                        Cancel my seats ({isLate ? "50% refund" : "full refund"})
                      </button>
                    )}
                  </div>
                )}
                {canBook && (
                  <div className={form.rideActions}>
                    <input
                      type="number"
                      min="1"
                      max={r.seatsAvailable}
                      value={seatChoice[r.id] || 1}
                      onChange={(e) => setSeatChoice({ ...seatChoice, [r.id]: e.target.value })}
                    />
                    <span className={form.totalPrice}>= {totalEth} ETH</span>
                    <button
                      type="button"
                      className={form.submit}
                      disabled={tx.state.phase === "signing" || tx.state.phase === "pending"}
                      onClick={() => handleBook(r)}
                    >
                      Book
                    </button>
                  </div>
                )}
                {isOwn && !myCount && (
                  <div className={form.rideActions}>
                    <span className={form.totalPrice}>Your ride - manage from the dashboard</span>
                  </div>
                )}
              </li>
            );
          })}
          {!loading && filtered.length === 0 && (
            <li className={form.emptyState}>No rides match your filters.</li>
          )}
        </ul>
      </main>

      <TxModal state={tx.state} onClose={tx.reset} />
    </div>
  );
}
