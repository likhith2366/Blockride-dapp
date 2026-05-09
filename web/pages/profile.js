import Link from "next/link";
import Head from "next/head";
import { useEffect, useState } from "react";
import {
  fetchProfile,
  fetchDriverAverage,
  registerProfile as registerProfileTx,
  getMyAddress,
  fetchAllRides,
} from "../utils/contract";
import { useTx } from "../hooks/useTx";
import TxModal from "../components/TxModal";
import Identicon from "../components/Identicon";
import StarRating from "../components/StarRating";
import StatusBadge from "../components/StatusBadge";
import styles from "../styles/Home.module.css";
import form from "../styles/rides.module.css";

export default function Profile() {
  const [address, setAddress] = useState("");
  const [profile, setProfile] = useState(null);
  const [driverStats, setDriverStats] = useState({ avg: 0, count: 0 });
  const [rideCount, setRideCount] = useState({ posted: 0, booked: 0 });
  const [handle, setHandle] = useState("");
  const [age, setAge] = useState("");
  const [isMale, setIsMale] = useState(true);
  const [error, setError] = useState("");
  const tx = useTx();

  const reload = async () => {
    setError("");
    try {
      const a = await getMyAddress();
      setAddress(a);
      const [p, stats, rides] = await Promise.all([
        fetchProfile(a),
        fetchDriverAverage(a),
        fetchAllRides(),
      ]);
      setProfile(p);
      setDriverStats(stats);
      const lower = a.toLowerCase();
      const posted = rides.filter((r) => r.driver.toLowerCase() === lower).length;
      setRideCount({ posted, total: rides.length });
      if (p.registered) {
        setHandle(p.handle);
        setAge(String(p.age));
        setIsMale(p.isMale);
      }
    } catch (e) {
      setError(e.message || "Failed to load profile");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await tx.run("Register profile", () =>
        registerProfileTx({ handle, age: Number(age), isMale })
      );
      await reload();
    } catch {}
  };

  return (
    <div className={form.shell}>
      <Head>
        <title>Profile - BlockRide</title>
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
        <div className={form.profileHeader}>
          {address && <Identicon address={address} size={72} />}
          <div>
            <h1 className={form.heading}>{profile?.handle || "Your profile"}</h1>
            <p className={form.subheading}>
              {profile?.registered
                ? "Update your handle, age, or gender below."
                : "Register an on-chain handle so passengers know who they're riding with."}
            </p>
          </div>
        </div>

        <div className={form.profileStats}>
          <div className={form.profileStat}>
            <span className={form.profileStatLabel}>Driver rating</span>
            <div className={form.ratingRow}>
              <StarRating value={driverStats.avg} readOnly />
              <span className={form.profileStatValue}>
                {driverStats.count > 0 ? `${driverStats.avg.toFixed(2)} (${driverStats.count})` : "No ratings yet"}
              </span>
            </div>
          </div>
          <div className={form.profileStat}>
            <span className={form.profileStatLabel}>Rides posted</span>
            <span className={form.profileStatValue}>{rideCount.posted}</span>
          </div>
        </div>

        <h2 className={form.sectionTitle}>{profile?.registered ? "Update profile" : "Register"}</h2>
        <form onSubmit={submit} className={form.grid}>
          <label className={form.field}>
            <span>Handle</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} required maxLength={32} placeholder="alice.eth" />
          </label>
          <label className={form.field}>
            <span>Age</span>
            <input type="number" min="13" max="120" value={age} onChange={(e) => setAge(e.target.value)} required />
          </label>
          <fieldset className={form.field} style={{ border: "none", padding: 0, margin: 0 }}>
            <span>Gender</span>
            <div className={form.radioRow}>
              <label className={form.radio}>
                <input type="radio" checked={isMale} onChange={() => setIsMale(true)} /> Male
              </label>
              <label className={form.radio}>
                <input type="radio" checked={!isMale} onChange={() => setIsMale(false)} /> Female
              </label>
            </div>
          </fieldset>

          <button type="submit" className={form.submit} disabled={tx.state.phase === "signing" || tx.state.phase === "pending"}>
            {profile?.registered ? "Update" : "Register"}
          </button>
        </form>

        {error && <p className={form.errorMsg}>{error}</p>}
      </main>

      <TxModal state={tx.state} onClose={tx.reset} />
    </div>
  );
}
