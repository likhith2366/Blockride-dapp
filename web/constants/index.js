export const SEPOLIA_CHAIN_ID = 11155111;

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || SEPOLIA_CHAIN_ID);

export const BLOCK_EXPLORER =
  process.env.NEXT_PUBLIC_BLOCK_EXPLORER || "https://sepolia.etherscan.io";

export const RIDE_STATUS = ["Active", "Completed", "Cancelled"];

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "AlreadyRated",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DepartInPast",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DriverCannotBook",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "HandleRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSeatCount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoRefundDue",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoSuchRide",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotDriver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPassenger",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RideNotActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RideNotCompleted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ScoreOutOfRange",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SeatsRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooEarlyToComplete",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooEarlyToForceCancel",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooLateToCancel",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongFare",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "passenger",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "seats",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "refundQueued",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "forfeitToDriver",
        "type": "uint256"
      }
    ],
    "name": "BookingCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "driver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "passenger",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "score",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "comment",
        "type": "string"
      }
    ],
    "name": "DriverRated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "handle",
        "type": "string"
      }
    ],
    "name": "ProfileRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "passenger",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "RefundWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "canceller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalRefundQueued",
        "type": "uint256"
      }
    ],
    "name": "RideCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "driver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "payout",
        "type": "uint256"
      }
    ],
    "name": "RideCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "driver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "origin",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "destination",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "departsAt",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "farePerSeat",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "seats",
        "type": "uint8"
      }
    ],
    "name": "RidePosted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "passenger",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "seats",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountPaid",
        "type": "uint256"
      }
    ],
    "name": "SeatsBooked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "FORCE_CANCEL_GRACE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LATE_CANCEL_WINDOW",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "numSeats",
        "type": "uint8"
      }
    ],
    "name": "bookSeats",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      }
    ],
    "name": "cancelMyBooking",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      }
    ],
    "name": "cancelRide",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      }
    ],
    "name": "completeRide",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "driver",
        "type": "address"
      }
    ],
    "name": "driverAverage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "avgTimes100",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "driverRatingCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "driverTotalStars",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "escrowOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      }
    ],
    "name": "forceCancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllRides",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "driver",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "origin",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "destination",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "departsAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "farePerSeat",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "totalSeats",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "seatsAvailable",
            "type": "uint8"
          },
          {
            "internalType": "enum BlockRide.RideStatus",
            "name": "status",
            "type": "uint8"
          }
        ],
        "internalType": "struct BlockRide.Ride[]",
        "name": "list",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      }
    ],
    "name": "getPassengers",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "pendingRefunds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_origin",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_destination",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_departsAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_farePerSeat",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "_seats",
        "type": "uint8"
      }
    ],
    "name": "postRide",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "profiles",
    "outputs": [
      {
        "internalType": "string",
        "name": "handle",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "age",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "isMale",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "registered",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "rideId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "score",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "comment",
        "type": "string"
      }
    ],
    "name": "rateDriver",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "ratings",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "score",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "comment",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "submitted",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_handle",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "_age",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "_isMale",
        "type": "bool"
      }
    ],
    "name": "registerProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "rides",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "driver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "origin",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "destination",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "departsAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "farePerSeat",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "totalSeats",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "seatsAvailable",
        "type": "uint8"
      },
      {
        "internalType": "enum BlockRide.RideStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ridesPosted",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "seatsBooked",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
