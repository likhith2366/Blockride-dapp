import { Contract, ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS, CHAIN_ID } from "../constants";

export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available");
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const { chainId } = await provider.getNetwork();
  if (chainId !== CHAIN_ID) {
    throw new Error(`Wrong network. Switch MetaMask to chainId ${CHAIN_ID}.`);
  }
  return provider;
}

export async function getSigner() {
  const provider = await getProvider();
  return provider.getSigner();
}

export async function getReadContract() {
  const provider = await getProvider();
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function getWriteContract() {
  const signer = await getSigner();
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

export async function postRide({ origin, destination, departsAt, farePerSeatEth, seats }) {
  const contract = await getWriteContract();
  const fareWei = ethers.utils.parseEther(String(farePerSeatEth));
  return contract.postRide(origin, destination, departsAt, fareWei, seats);
}

export async function bookSeats({ rideId, numSeats, farePerSeatWei }) {
  const contract = await getWriteContract();
  const totalWei = ethers.BigNumber.from(farePerSeatWei).mul(numSeats);
  return contract.bookSeats(rideId, numSeats, { value: totalWei });
}

export async function completeRide(rideId) {
  const contract = await getWriteContract();
  return contract.completeRide(rideId);
}

export async function cancelRide(rideId) {
  const contract = await getWriteContract();
  return contract.cancelRide(rideId);
}

export async function rateDriver({ rideId, score, comment }) {
  const contract = await getWriteContract();
  return contract.rateDriver(rideId, score, comment || "");
}

export async function registerProfile({ handle, age, isMale }) {
  const contract = await getWriteContract();
  return contract.registerProfile(handle, age, isMale);
}

export async function fetchAllRides() {
  const contract = await getReadContract();
  const raw = await contract.getAllRides();
  return raw.map((r) => ({
    id: Number(r.id),
    driver: r.driver,
    origin: r.origin,
    destination: r.destination,
    departsAt: Number(r.departsAt),
    farePerSeatWei: r.farePerSeat.toString(),
    farePerSeatEth: ethers.utils.formatEther(r.farePerSeat),
    totalSeats: Number(r.totalSeats),
    seatsAvailable: Number(r.seatsAvailable),
    status: Number(r.status),
  }));
}

export async function fetchPassengers(rideId) {
  const contract = await getReadContract();
  const addrs = await contract.getPassengers(rideId);
  const seatsAndRatings = await Promise.all(
    addrs.map(async (addr) => {
      const [seats, rating] = await Promise.all([
        contract.seatsBooked(rideId, addr),
        contract.ratings(rideId, addr),
      ]);
      return {
        address: addr,
        seats: Number(seats),
        rated: rating.submitted,
        score: Number(rating.score),
        comment: rating.comment,
      };
    })
  );
  return seatsAndRatings;
}

export async function fetchDriverAverage(driver) {
  const contract = await getReadContract();
  const [avgX100, count] = await contract.driverAverage(driver);
  return {
    avg: Number(count) === 0 ? 0 : Number(avgX100) / 100,
    count: Number(count),
  };
}

export async function fetchProfile(address) {
  const contract = await getReadContract();
  const p = await contract.profiles(address);
  return {
    handle: p.handle,
    age: Number(p.age),
    isMale: p.isMale,
    registered: p.registered,
  };
}

export async function fetchRating(rideId, address) {
  const contract = await getReadContract();
  const r = await contract.ratings(rideId, address);
  return {
    score: Number(r.score),
    comment: r.comment,
    submitted: r.submitted,
  };
}

export async function fetchRidesPosted() {
  const contract = await getReadContract();
  const n = await contract.ridesPosted();
  return Number(n);
}

export async function getMyAddress() {
  const signer = await getSigner();
  return signer.getAddress();
}
