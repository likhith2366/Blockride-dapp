import { useEffect } from "react";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  // React to MetaMask account / chain switches. Without this, the dapp UI
  // keeps showing the previously-connected account even after the user
  // switches accounts inside MetaMask itself.
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const reload = () => window.location.reload();
    window.ethereum.on?.("accountsChanged", reload);
    window.ethereum.on?.("chainChanged", reload);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", reload);
      window.ethereum.removeListener?.("chainChanged", reload);
    };
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
