import Link from "next/link";
import Head from "next/head";
import { useEffect, useState } from "react";
import { postRide, getMyAddress } from "../../utils/contract";
import { useTx } from "../../hooks/useTx";
import TxModal from "../../components/TxModal";
import Identicon from "../../components/Identicon";
import styles from "../../styles/Home.module.css";
import form from "../../styles/rides.module.css";

export default function Publish() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureLocal, setDepartureLocal] = useState("");
  const [farePerSeat, setFarePerSeat] = useState("0.001");
  const [seats, setSeats] = useState(3);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const tx = useTx();

  useEffect(() => {
    getMyAddress().then(setAddress).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const departsAt = Math.floor(new Date(departureLocal).getTime() / 1000);
      if (!Number.isFinite(departsAt) || departsAt <= Math.floor(Date.now() / 1000)) {
        throw new Error("Departure time must be in the future");
      }
      await tx.run("Post ride", () =>
        postRide({
          origin,
          destination,
          departsAt,
          farePerSeatEth: farePerSeat,
          seats: Number(seats),
        })
      );
      setOrigin("");
      setDestination("");
      setDepartureLocal("");
    } catch (e) {
      if (!tx.state.error) setError(e.message || "Transaction failed");
    }
  };

  return (
    <div className={form.shell}>
      <Head>
        <title>Post a ride - BlockRide</title>
      </Head>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>&#9651;</span>
          <span>BlockRide</span>
        </Link>
        {address && (
          <span className={styles.addressPill}>
            <Identicon address={address} size={22} />
            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
          </span>
        )}
      </header>

      <main className={form.card}>
        <h1 className={form.heading}>Post a ride</h1>
        <p className={form.subheading}>
          The fare you set will be collected from each passenger into the contract escrow on booking.
        </p>

        <form onSubmit={handleSubmit} className={form.grid}>
          <label className={form.field}>
            <span>Origin</span>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} required placeholder="Boston, MA" />
          </label>
          <label className={form.field}>
            <span>Destination</span>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="New York, NY" />
          </label>
          <label className={form.field}>
            <span>Departure (local time)</span>
            <input type="datetime-local" value={departureLocal} onChange={(e) => setDepartureLocal(e.target.value)} required />
          </label>
          <label className={form.field}>
            <span>Fare per seat (ETH)</span>
            <input type="number" min="0" step="0.0001" value={farePerSeat} onChange={(e) => setFarePerSeat(e.target.value)} required />
          </label>
          <label className={form.field}>
            <span>Seats</span>
            <input type="number" min="1" max="255" value={seats} onChange={(e) => setSeats(e.target.value)} required />
          </label>

          <button type="submit" className={form.submit} disabled={tx.state.phase === "signing" || tx.state.phase === "pending"}>
            Post ride
          </button>
        </form>

        {error && <p className={form.errorMsg}>{error}</p>}
      </main>

      <TxModal state={tx.state} onClose={tx.reset} />
    </div>
  );
}
