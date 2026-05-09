# BlockRide

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
| Frontend         | Next.js 13, React 18, Web3Modal, CSS Modules                      |
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

## End-to-end Test Flow

1. **Connect** MetaMask on the home page.
2. **/profile** — register a handle.
3. **Post a ride** with a departure time ~1 min in the future, fare 0.001 ETH.
4. Switch MetaMask to a second account, fund it from the faucet, **Book** the ride. The fare goes into escrow.
5. Switch back to the driver. **My rides** → wait for departure time → **Complete & collect**. Escrow flows to driver.
6. As the passenger account, go to **History** → `All rides` → completed ride → leave a 5-star rating.
7. Driver's **Profile** now shows the on-chain rating.

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

## Author

TODO_NAME (TODO_EMAIL)

Author wallet: `0xee1369829b0a9D12d2Dcb2D0735ecA493E47A2E9`

## License

MIT
