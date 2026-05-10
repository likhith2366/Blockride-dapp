import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CHAIN_ID, CONTRACT_ADDRESS, CONTRACT_ABI, BLOCK_EXPLORER } from "../constants";
import Identicon from "../components/Identicon";
import DisconnectButton from "../components/DisconnectButton";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ rides: null, contractAge: null });

  const connectWallet = async () => {
    try {
      setError("");
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) {
        setError(`Switch MetaMask to chainId ${CHAIN_ID} (Sepolia).`);
        return;
      }
      const signer = provider.getSigner();
      setAddress(await signer.getAddress());
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to connect wallet");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined" || !window.ethereum) return;
        const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const n = await contract.ridesPosted();
        if (!cancelled) setStats((s) => ({ ...s, rides: Number(n) }));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <Head>
        <title>BlockRide - Decentralized Carpooling</title>
        <meta name="description" content="Decentralized peer-to-peer carpooling on Ethereum with on-chain escrow." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>&#9651;</span>
            <span>BlockRide</span>
          </Link>
          {address ? (
            <div className={styles.userArea}>
              <Link href="/profile" className={styles.addressPill}>
                <Identicon address={address} size={22} />
                <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
              </Link>
              <DisconnectButton className={styles.disconnectBtn} />
            </div>
          ) : (
            <span className={styles.networkPill}>Sepolia</span>
          )}
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>P2P carpooling on Ethereum</span>
          <h1 className={styles.title}>
            Carpool on the <span className={styles.titleAccent}>chain</span>.
          </h1>
          <p className={styles.tagline}>
            Drivers post rides. Passengers escrow the fare on booking. The smart contract pays the driver only after
            the ride completes &mdash; or refunds everyone if it cancels. <strong>0% platform commission.</strong>
          </p>

          {!walletConnected ? (
            <button className={styles.primaryBtn} onClick={connectWallet}>
              Connect MetaMask
            </button>
          ) : (
            <div className={styles.actions}>
              <Link className={styles.primaryBtn} href="/rides/book">Find a ride</Link>
              <Link className={styles.secondaryBtn} href="/rides/publish">Post a ride</Link>
              <Link className={styles.secondaryBtn} href="/rides/manage">My rides</Link>
              <Link className={styles.secondaryBtn} href="/rides/history">History</Link>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.rides ?? "—"}</span>
              <span className={styles.statLabel}>rides on-chain</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>0%</span>
              <span className={styles.statLabel}>platform fee</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>11155111</span>
              <span className={styles.statLabel}>Sepolia chainId</span>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>&#128274;</div>
            <h3>Escrowed fares</h3>
            <p>Funds locked in the contract on booking, released to the driver only on ride completion.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>&#9851;</div>
            <h3>Atomic refunds</h3>
            <p>Driver cancels &rarr; every passenger gets refunded in a single transaction. No support tickets.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>&#11088;</div>
            <h3>On-chain ratings</h3>
            <p>Passengers rate drivers after rides. The reputation lives on the blockchain, not a platform.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>&#128279;</div>
            <h3>Transparent</h3>
            <p>
              Every ride, booking and rating is publicly verifiable on{" "}
              <a className={styles.inlineLink} href={`${BLOCK_EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
                Etherscan &#8599;
              </a>
              .
            </p>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>BlockRide &middot; {new Date().getFullYear()}</span>
          <span className={styles.footerSep}>&bull;</span>
          <a href={`${BLOCK_EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
            Contract &#8599;
          </a>
        </footer>
      </main>
    </div>
  );
}
