# BlockRide

**Trustless ride-sharing without the platform tax.**

> Built for **NYU CS-GY 9223 — Blockchain & Distributed Ledger Technologies — Spring 2026**.

**Live demo:** https://blockride-dapp.vercel.app *(needs MetaMask + Sepolia test ETH — get some at [sepoliafaucet.com](https://sepoliafaucet.com))*

Peer-to-peer carpooling DApp on Ethereum (Sepolia). Drivers post rides, passengers pay the fare into an on-chain escrow at booking, and the driver receives the payout only after the ride is marked complete. If the driver cancels, every passenger is refunded automatically. Passengers can rate drivers after completed rides — the reputation lives on the blockchain, not on a platform.

> No middlemen, no platform commission — just drivers, riders, and a smart contract.

## Features

- **On-chain escrow.** Fares are locked in the contract at booking and released to the driver only after `completeRide`.
- **Driver cancellation with full refunds.** A single `cancelRide` call atomically reimburses every passenger.
- **Per-seat booking.** A passenger can book multiple seats in one transaction.
- **Driver ratings.** Passengers can submit a 1-5 star rating + optional comment for completed rides. Driver average is queryable on-chain.
- **Profile registration.** On-chain handle / age / gender record per address.
- **Rich UI.** Animated landing page, transaction-progress modal with Etherscan link, identicon avatars derived from each address, status badges, star-rating widget.
- **History view.** Browse all rides on the contract or filter to your own; rate completed rides you booked.
- **Driver dashboard.** Expand a posted ride to see every booked passenger, seats taken, and the rating they left (if any).
- **Sepolia testnet ready.** Hardhat deploy script + Etherscan verification wired up.
- **Hardhat test suite** (15 passing) covering posting, booking, payout, refund, access control, ratings, and bounds checks.

## Tech Stack

| Layer            | Tech                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Smart contract   | Solidity `^0.8.17`                                                |
| Toolchain        | Hardhat, ethers v5, hardhat-toolbox, solidity-coverage            |
| Frontend         | Next.js 13, React 18, MetaMask (window.ethereum), CSS Modules     |
| Networks         | Sepolia (chainId `11155111`), Polygon Amoy, localhost             |
| Provider         | Alchemy (Sepolia RPC)                                             |

## Live Contract

| Network | Address                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Sepolia | [`0xD9311a8e8fb3f3470ad50732457bbDA9dCC3A761`](https://sepolia.etherscan.io/address/0xD9311a8e8fb3f3470ad50732457bbDA9dCC3A761)     |

## Project Layout

```
.
├── contracts/                # Solidity contracts (BlockRide)
│   └── carpooling.sol        # contract BlockRide { ... }
├── scripts/deploy.js         # Hardhat deploy + Etherscan verify
├── test/tests.js             # 15-test suite (escrow, refund, ratings...)
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
    ✔ refunds passengers on cancellation
    ✔ only driver can complete or cancel a ride
    ✔ blocks booking after cancel
    ratings
      ✔ lets a passenger rate the driver after completion
      ✔ computes a running average across multiple ratings
      ✔ rejects ratings from non-passengers
      ✔ rejects double rating from the same passenger
      ✔ rejects rating before completion
      ✔ rejects out-of-range scores

  15 passing (3s)
```

The suite covers booking math, escrow accounting, access control, status-machine transitions, refund flow, and the rating bounds + uniqueness rules.

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
8. Every step above is verifiable on Sepolia Etherscan via the [contract address](https://sepolia.etherscan.io/address/0xD9311a8e8fb3f3470ad50732457bbDA9dCC3A761).

## Smart Contract Surface

```solidity
function registerProfile(string handle, uint8 age, bool isMale) external;
function postRide(string origin, string destination, uint256 departsAt, uint256 farePerSeat, uint8 seats) external returns (uint256 rideId);
function bookSeats(uint256 rideId, uint8 numSeats) external payable;
function completeRide(uint256 rideId) external;       // driver only, after departsAt
function cancelRide(uint256 rideId) external;          // driver only, refunds all
function rateDriver(uint256 rideId, uint8 score, string comment) external;  // 1-5
function driverAverage(address driver) external view returns (uint256 avgTimes100, uint256 count);
function getAllRides() external view returns (Ride[] memory);
function getPassengers(uint256 rideId) external view returns (address[] memory);
```

## Security Considerations

The contract was designed with the following defenses in mind. Each item below corresponds to a concrete construct in [`contracts/carpooling.sol`](contracts/carpooling.sol).

- **Checks-Effects-Interactions pattern.** State changes happen *before* every external ETH transfer, which protects against reentrancy without needing a `ReentrancyGuard`. In `completeRide` (lines 130–136), `r.status` is set to `Completed` and `escrowOf[rideId]` is zeroed *before* the `payable(driver).call`. In `cancelRide` (lines 153–155), each passenger's `seatsBooked` is zeroed *before* their refund call — so a malicious passenger contract that reenters during `receive()` would find its booked-seats balance already at zero.
- **Solidity ^0.8.17 built-in arithmetic checks.** All `+`, `-`, `*` operations revert on overflow/underflow without the need for SafeMath.
- **Access control via `onlyDriver` modifier.** `completeRide` and `cancelRide` are gated to `rides[rideId].driver`. Non-drivers cannot trigger payout or cancellation. Test: `only driver can complete or cancel a ride`.
- **Status state machine.** Each ride is `Active → Completed | Cancelled` and every state-changing function checks `status == Active` first. Double-completion, completion-after-cancel, and cancel-after-complete are all impossible. Test: `blocks booking after cancel`.
- **Self-booking blocked.** `bookSeats` rejects `msg.sender == driver`, so a driver cannot inflate their own rating or escrow. Test: `rejects driver booking own ride`.
- **Exact fare enforcement.** `bookSeats` requires `msg.value == numSeats * farePerSeat` — over-payment and under-payment both revert. No surplus dust accumulates in escrow. Test: `rejects booking with wrong fare`.
- **Time gate on completion.** `completeRide` requires `block.timestamp >= departsAt`, so a driver cannot pocket fares before the agreed departure time.
- **Rating integrity.** `rateDriver` enforces `score ∈ [1, 5]`, requires the rater to be a passenger of that specific ride, requires the ride to be `Completed`, and rejects double-rating. Driver-average is computed deterministically as `totalStars * 100 / count`. Tests: `rejects out-of-range scores`, `rejects double rating from the same passenger`, `rejects ratings from non-passengers`, `rejects rating before completion`.
- **Per-seat escrow accounting.** The contract tracks `escrowOf[rideId]` explicitly rather than relying on `address(this).balance`, so force-fed ETH (e.g. via a `selfdestruct` from another contract) cannot disturb per-ride bookkeeping.
- **Bounded loop in `cancelRide`.** The refund loop iterates over `passengersOf[rideId]`, which is bounded by `totalSeats` (a `uint8`, capped at 255 per ride) — gas-safe against griefing.

## Known Limitations

Honest disclosures of what this contract does *not* protect against. Several of these would be addressed in a v2 redesign.

- **No off-chain ride verification.** `completeRide` is driver-controlled. The contract cannot tell whether a ride physically happened, so passengers must trust that a driver who marks a ride complete actually delivered them. A real production system would need an oracle, GPS attestation, or a passenger-confirmation step before payout.
- **Hostile-passenger DoS on `cancelRide`.** Refunds use `(bool ok, ) = call{value: …}; require(ok, …)`. If a passenger's address is a contract that always reverts in `receive()`, the entire `cancelRide` transaction reverts — bricking cancellation for everyone on that ride. A pull-pattern (each passenger calls `withdrawRefund` themselves) would eliminate this. Same shape applies to `completeRide`'s payout to the driver, but there the driver is the one griefing themselves.
- **Stuck-escrow risk.** There is no upper time bound on `completeRide`, no admin override, and no automatic refund. If a driver disappears after passengers book (never calls `completeRide` or `cancelRide`), the fares are locked in escrow indefinitely. A v2 should add a `forceCancel` callable by any passenger after `departsAt + Δ`.
- **No dispute mechanism.** A passenger who shows up but is left behind has no on-chain recourse beyond a 1-star rating after the fact. Reputation is the only deterrent.
- **`getAllRides` returns the full array unpaginated.** Fine on testnet; on a busy production deployment this view will eventually exceed RPC response limits and need pagination.
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
