# BlockRide

**Trustless ride-sharing without the platform tax.**

> Built for **NYU CS-GY 9223 — Blockchain & Distributed Ledger Technologies — Spring 2026**.

**Live demo:** https://blockride-dapp.vercel.app *(needs MetaMask + Sepolia test ETH — get some at [sepoliafaucet.com](https://sepoliafaucet.com))*

Peer-to-peer carpooling DApp on Ethereum (Sepolia). Drivers post rides, passengers pay the fare into an on-chain escrow at booking, and the driver receives the payout only after the ride is marked complete. If the driver cancels, every passenger is refunded automatically. Passengers can rate drivers after completed rides — the reputation lives on the blockchain, not on a platform.

> No middlemen, no platform commission — just drivers, riders, and a smart contract.

## Features

- **On-chain escrow.** Fares are locked in the contract at booking and released to the driver only after `completeRide`.
- **Pull-pattern refunds.** When a ride is cancelled, each passenger's refund is queued in `pendingRefunds[passenger]`; passengers withdraw via `withdrawRefund()` whenever they choose. This isolates the cancel path from any single passenger contract reverting.
- **Force-cancel for stuck escrow.** If the driver disappears after `departsAt + FORCE_CANCEL_GRACE` (1 hour), any passenger of the ride can call `forceCancel(rideId)` to flip the ride to `Cancelled` and queue refunds for everyone. No admin override required.
- **Passenger self-cancel with time-tiered refunds.** A passenger can drop their own seats from an active ride before departure via `cancelMyBooking(rideId)`. If they cancel **more than 1 hour before** `departsAt` they get a 100% refund queued; if they cancel **inside the last hour** they get a 50% refund and the other 50% is queued to the driver as a no-show fee. Freed seats are returned to the pool so other riders can re-book them.
- **Per-seat booking.** A passenger can book multiple seats in one transaction.
- **Driver ratings.** Passengers can submit a 1-5 star rating + optional comment for completed rides. Driver average is queryable on-chain.
- **Profile registration.** On-chain handle / age / gender record per address.
- **Reentrancy-hardened.** All ETH-moving entry points (`completeRide`, `withdrawRefund`) use OpenZeppelin's `ReentrancyGuard` on top of the Checks-Effects-Interactions pattern. An adversarial test deploys a malicious passenger contract that attempts to reenter `withdrawRefund` from its `receive()` hook — the guard rejects it.
- **Custom errors throughout.** All revert paths use named errors (`NotDriver`, `WrongFare`, `TooEarlyToForceCancel`, …) — gas-cheaper than revert strings and decodable in the frontend.
- **Rich UI.** Animated landing page, transaction-progress modal with Etherscan link, identicon avatars derived from each address, status badges, star-rating widget.
- **History view.** Browse all rides on the contract or filter to your own; rate completed rides you booked.
- **Driver dashboard.** Expand a posted ride to see every booked passenger, seats taken, and the rating they left (if any).
- **Sepolia testnet ready.** Hardhat deploy script + Etherscan verification wired up.
- **Hardhat test suite** (29 passing) covering posting, booking, payout, refund queueing, withdrawal, driver-cancel, passenger self-cancel (both refund tiers + seat-restoration), force-cancel, access control, ratings, bounds checks, and an adversarial reentrancy attack.

## Tech Stack

| Layer            | Tech                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Smart contract   | Solidity `^0.8.24`, OpenZeppelin `ReentrancyGuard`                |
| Toolchain        | Hardhat, ethers v5, hardhat-toolbox, solidity-coverage            |
| Frontend         | Next.js 13, React 18, MetaMask (window.ethereum), CSS Modules     |
| Networks         | Sepolia (chainId `11155111`), Polygon Amoy, localhost             |
| Provider         | Alchemy (Sepolia RPC)                                             |

## Live Contract

| Network | Address                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Sepolia | [`0xFd0d476E37D930f6d598457B12Cf97641e93A0A9`](https://sepolia.etherscan.io/address/0xFd0d476E37D930f6d598457B12Cf97641e93A0A9)     |

## Project Layout

```
.
├── contracts/                # Solidity contracts (BlockRide)
│   └── carpooling.sol        # contract BlockRide { ... }
├── scripts/deploy.js         # Hardhat deploy + Etherscan verify
├── test/tests.js             # 29-test suite (escrow, refunds, force-cancel, ratings, reentrancy...)
├── hardhat.config.js         # Hardhat config (Sepolia / Amoy / local)
├── web/                      # Next.js frontend
│   ├── pages/
│   │   ├── index.js          # Animated landing
│   │   ├── profile.js        # Register + driver rating + stats
│   │   └── rides/
│   │       ├── publish.js    # Post a ride
│   │       ├── book.js       # Find / book rides with filters
│   │       ├── manage.js     # Driver dashboard + passenger list
│   │       └── history.js    # All rides + rate completed
│   ├── components/
│   │   ├── TxModal.js        # Tx-progress modal w/ Etherscan link
│   │   ├── Identicon.js      # SVG identicon from address
│   │   ├── StatusBadge.js    # Active / Completed / Cancelled pill
│   │   └── StarRating.js     # 1-5 star input / display
│   ├── hooks/useTx.js        # Tx state-machine hook
│   ├── utils/contract.js     # Ethers wrappers
│   ├── constants/index.js    # ABI + env-driven address & chain
│   └── styles/               # CSS modules
└── .env.example              # Template for RPC + keys
```

## Setup

```bash
# 1. Install root deps (Hardhat, ethers, etc.)
npm install

# 2. Install frontend deps
cd web && npm install && cd ..

# 3. Set up environment
cp .env.example .env
#   Fill in:
#     SEPOLIA_RPC_URL   - Alchemy or Infura Sepolia HTTPS URL
#     PRIVATE_KEY       - 64-char hex of your deployer wallet (no 0x prefix)
#     ETHERSCAN_API_KEY - optional, for auto-verify
```

## Compile & Test

```bash
npx hardhat compile
npx hardhat test
```

### Test Results

```
  BlockRide
    ✔ registers a profile
    ✔ posts a ride and exposes it via getAllRides
    ✔ books seats with correct fare and decrements seats
    ✔ rejects booking with wrong fare
    ✔ rejects driver booking own ride
    ✔ pays out escrow to driver on completion (after departure time)
    ✔ queues refunds (pull pattern) on driver cancellation
    ✔ only driver can cancelRide (and only driver can completeRide)
    ✔ blocks booking after cancel
    withdrawRefund (pull-pattern refunds)
      ✔ transfers a queued refund to the caller
      ✔ reverts when nothing is owed
      ✔ accumulates refunds across multiple cancelled rides
    forceCancel (stuck-escrow rescue)
      ✔ lets a passenger force-cancel after departsAt + FORCE_CANCEL_GRACE
      ✔ reverts before the grace window elapses
      ✔ reverts when the caller is not a passenger of the ride
      ✔ reverts on a ride that's already completed
    cancelMyBooking (passenger self-cancel)
      ✔ full refund when cancelling >= 1h before departure
      ✔ 50/50 split when cancelling inside the late-cancel window
      ✔ reverts after departsAt has passed
      ✔ reverts when caller is not a passenger
      ✔ reverts when ride is already cancelled (driver cancel first)
      ✔ frees the seat so another passenger can re-book it
    ReentrancyGuard
      ✔ blocks a malicious passenger from reentering withdrawRefund
    ratings
      ✔ lets a passenger rate the driver after completion
      ✔ computes a running average across multiple ratings
      ✔ rejects ratings from non-passengers
      ✔ rejects double rating from the same passenger
      ✔ rejects rating before completion
      ✔ rejects out-of-range scores

  29 passing (7s)
```

The reentrancy test (`ReentrancyGuard › blocks a malicious passenger from reentering withdrawRefund`) deploys a `MaliciousPassenger` helper contract whose `receive()` hook attempts to call `withdrawRefund` again during its own refund. The guard correctly reverts the inner call; the outer transfer still completes exactly once.

The suite covers booking math, escrow accounting, access control, status-machine transitions, queued-refund + withdrawal flow, the force-cancel rescue path with all four revert conditions, an adversarial reentrancy attack, and the full rating bounds + uniqueness rules.

## Deploy

```bash
# Local Hardhat node
npx hardhat node                                     # in one terminal
npx hardhat run scripts/deploy.js --network localhost  # in another

# Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

The deploy script prints the new contract address. Paste it into [web/.env.local](web/.env.local):

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_BLOCK_EXPLORER=https://sepolia.etherscan.io
```

## Run the Frontend

```bash
cd web
npm run dev          # http://localhost:3000
```

You'll need MetaMask connected to Sepolia and some test ETH (https://sepoliafaucet.com).

## End-to-end Demo Flow

> The full flow can be demoed in **under 5 minutes** using two MetaMask accounts and a `departsAt` set ~1 minute in the future.

1. **Connect** MetaMask on the home page; switch to Sepolia if prompted.
2. **/profile** — register a handle (driver account).
3. **Post a ride** with `departsAt = now + 60 s`, fare `0.001 ETH`, 2 seats.
4. Switch MetaMask to a second account. Fund it from [sepoliafaucet.com](https://sepoliafaucet.com). **Book** 1 seat — `0.001 ETH` enters escrow on-chain.
5. Wait the 60 s. Switch back to the driver. **My rides** → **Complete & collect**. Escrow releases to the driver wallet.
6. As the passenger, go to **History** → `All rides` → the completed ride → leave a 5-star rating with a comment.
7. Open the driver's **Profile**. The on-chain rating average is now visible.
8. Every step above is verifiable on Sepolia Etherscan via the [contract address](https://sepolia.etherscan.io/address/0xFd0d476E37D930f6d598457B12Cf97641e93A0A9).

## Smart Contract Surface

```solidity
// Profile
function registerProfile(string handle, uint8 age, bool isMale) external;

// Ride lifecycle
function postRide(string origin, string destination, uint256 departsAt, uint256 farePerSeat, uint8 seats) external returns (uint256 rideId);
function bookSeats(uint256 rideId, uint8 numSeats) external payable;
function cancelMyBooking(uint256 rideId) external;    // passenger drops own seats, time-tiered refund
function completeRide(uint256 rideId) external;       // driver only, after departsAt
function cancelRide(uint256 rideId) external;         // driver only, queues refunds
function forceCancel(uint256 rideId) external;        // any passenger, after departsAt + FORCE_CANCEL_GRACE
function withdrawRefund() external;                   // pull queued refund

// Ratings
function rateDriver(uint256 rideId, uint8 score, string comment) external;  // 1-5

// Views
function driverAverage(address driver) external view returns (uint256 avgTimes100, uint256 count);
function getAllRides() external view returns (Ride[] memory);
function getPassengers(uint256 rideId) external view returns (address[] memory);
function pendingRefunds(address passenger) external view returns (uint256);

// Constants
uint256 public constant FORCE_CANCEL_GRACE = 1 hours;
uint256 public constant LATE_CANCEL_WINDOW = 1 hours;
```

## Security Considerations

Each defense below corresponds to a concrete construct in [`contracts/carpooling.sol`](contracts/carpooling.sol).

- **Defense-in-depth against reentrancy.** All ETH-moving entry points use OpenZeppelin's `ReentrancyGuard` *and* the Checks-Effects-Interactions pattern (state mutated before every external `call`). The adversarial test `ReentrancyGuard › blocks a malicious passenger from reentering withdrawRefund` deploys a `MaliciousPassenger` contract whose `receive()` hook tries to call `withdrawRefund` recursively — the guard reverts the inner call while the outer transfer completes exactly once.
- **Pull-pattern refunds + bounded loops.** Cancellations queue refunds in `pendingRefunds[passenger]` instead of transferring inline; each passenger pulls their own funds. A hostile passenger contract can no longer DoS cancellation for everyone else, and the queueing loop is bounded by `totalSeats` (`uint8`, ≤ 255).
- **Time-tiered passenger self-cancel.** `cancelMyBooking` queues a 100% refund if the call lands at least `LATE_CANCEL_WINDOW` (1 hour) before `departsAt`, or a 50/50 split (passenger / driver) inside that window. Freed seats return to `seatsAvailable` so they can be re-sold. Six tests cover both tiers, the post-departure revert, and the seat-restoration path.
- **`forceCancel` rescues stuck escrow.** Any passenger of an `Active` ride may call `forceCancel(rideId)` after `departsAt + FORCE_CANCEL_GRACE` (1 hour) if the driver vanishes — eliminating the previous risk of fares locked indefinitely. Permission is gated by `seatsBooked[rideId][msg.sender] > 0`.
- **Access control + state machine.** `onlyDriver` gates `completeRide` and `cancelRide`; the `Active → Completed | Cancelled` state machine makes double-completion, completion-after-cancel, and cancel-after-complete impossible. `bookSeats` rejects self-booking (`msg.sender == driver`) and requires `msg.value == numSeats * farePerSeat` exactly.
- **Explicit escrow accounting.** The contract tracks `escrowOf[rideId]` and `pendingRefunds[passenger]` directly rather than reading `address(this).balance`, so force-fed ETH (e.g. via a `selfdestruct` from another contract) cannot corrupt bookkeeping. Solidity `^0.8.24` arithmetic checks revert on overflow/underflow throughout. Every revert path uses a named custom error (gas-cheaper, frontend-decodable).

## Known Limitations

Honest disclosures of what this contract does *not* protect against. The previous limitations around hostile-passenger DoS and stuck escrow have been closed in this revision (see Security Considerations above for how).

- **No off-chain ride verification.** `completeRide` is driver-controlled. The contract cannot tell whether a ride physically happened, so passengers must trust that a driver who marks a ride complete actually delivered them. A real production system would need an oracle, GPS attestation, or a passenger-confirmation step before payout.
- **No dispute mechanism for completed rides.** A passenger who shows up but is left behind has no on-chain recourse beyond a 1-star rating after the fact. Reputation is the only deterrent. (Stuck-escrow rides are now recoverable via `forceCancel` — that path was previously listed here and has been resolved.)
- **`getAllRides` returns the full array unpaginated.** Fine on testnet; on a busy production deployment this view will eventually exceed RPC response limits and need pagination.
- **Frontend doesn't yet surface `forceCancel` or `withdrawRefund`.** The deployed UI exposes post / book / cancel-my-booking / complete / driver-cancel / rate. `forceCancel` and `withdrawRefund` are tested at the contract level but not yet wired into UI buttons — passengers currently call them via Etherscan's Write Contract page.
- **Single chain.** Deployed only to Sepolia. No bridges, no L2 deployments.
- **Trust the driver's wallet.** A stolen driver key is indistinguishable from a live driver — the contract has no concept of identity loss or recovery.

## Author

**Likhith Vardhan Goruputi**
NYU NetID: `lvg8030`
Email: [lvg8030@nyu.edu](mailto:lvg8030@nyu.edu)
GitHub: [@likhith2366](https://github.com/likhith2366)

Deployer wallet: [`0xee1369829b0a9D12d2Dcb2D0735ecA493E47A2E9`](https://sepolia.etherscan.io/address/0xee1369829b0a9D12d2Dcb2D0735ecA493E47A2E9)

## License

MIT
