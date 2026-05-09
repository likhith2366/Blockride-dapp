// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title BlockRide
/// @notice Decentralized carpooling with on-chain fare escrow, cancellations, refunds, and driver ratings.
contract BlockRide {
    enum RideStatus { Active, Completed, Cancelled }

    struct Profile {
        string handle;
        uint8 age;
        bool isMale;
        bool registered;
    }

    struct Ride {
        uint256 id;
        address driver;
        string origin;
        string destination;
        uint256 departsAt;
        uint256 farePerSeat;
        uint8 totalSeats;
        uint8 seatsAvailable;
        RideStatus status;
    }

    struct Rating {
        uint8 score;
        string comment;
        bool submitted;
    }

    uint256 public ridesPosted;
    mapping(uint256 => Ride) public rides;
    mapping(address => Profile) public profiles;
    mapping(uint256 => address[]) private passengersOf;
    mapping(uint256 => mapping(address => uint8)) public seatsBooked;
    mapping(uint256 => uint256) public escrowOf;

    mapping(uint256 => mapping(address => Rating)) public ratings;
    mapping(address => uint256) public driverTotalStars;
    mapping(address => uint256) public driverRatingCount;

    event ProfileRegistered(address indexed user, string handle);
    event RidePosted(
        uint256 indexed rideId,
        address indexed driver,
        string origin,
        string destination,
        uint256 departsAt,
        uint256 farePerSeat,
        uint8 seats
    );
    event SeatsBooked(
        uint256 indexed rideId,
        address indexed passenger,
        uint8 seats,
        uint256 amountPaid
    );
    event RideCompleted(uint256 indexed rideId, address indexed driver, uint256 payout);
    event RideCancelled(uint256 indexed rideId, uint256 totalRefunded);
    event DriverRated(
        uint256 indexed rideId,
        address indexed driver,
        address indexed passenger,
        uint8 score,
        string comment
    );

    modifier onlyDriver(uint256 rideId) {
        require(rides[rideId].driver == msg.sender, "BlockRide: not driver");
        _;
    }

    function registerProfile(string calldata _handle, uint8 _age, bool _isMale) external {
        require(bytes(_handle).length > 0, "BlockRide: handle required");
        profiles[msg.sender] = Profile(_handle, _age, _isMale, true);
        emit ProfileRegistered(msg.sender, _handle);
    }

    function postRide(
        string calldata _origin,
        string calldata _destination,
        uint256 _departsAt,
        uint256 _farePerSeat,
        uint8 _seats
    ) external returns (uint256 rideId) {
        require(_seats > 0, "BlockRide: seats > 0");
        require(_departsAt > block.timestamp, "BlockRide: depart in past");
        rideId = ridesPosted;
        rides[rideId] = Ride({
            id: rideId,
            driver: msg.sender,
            origin: _origin,
            destination: _destination,
            departsAt: _departsAt,
            farePerSeat: _farePerSeat,
            totalSeats: _seats,
            seatsAvailable: _seats,
            status: RideStatus.Active
        });
        ridesPosted++;
        emit RidePosted(rideId, msg.sender, _origin, _destination, _departsAt, _farePerSeat, _seats);
    }

    function bookSeats(uint256 rideId, uint8 numSeats) external payable {
        Ride storage r = rides[rideId];
        require(r.driver != address(0), "BlockRide: no such ride");
        require(r.status == RideStatus.Active, "BlockRide: ride inactive");
        require(numSeats > 0 && numSeats <= r.seatsAvailable, "BlockRide: invalid seats");
        require(msg.sender != r.driver, "BlockRide: driver cannot book");
        uint256 owed = uint256(numSeats) * r.farePerSeat;
        require(msg.value == owed, "BlockRide: wrong fare");

        if (seatsBooked[rideId][msg.sender] == 0) {
            passengersOf[rideId].push(msg.sender);
        }
        seatsBooked[rideId][msg.sender] += numSeats;
        r.seatsAvailable -= numSeats;
        escrowOf[rideId] += msg.value;

        emit SeatsBooked(rideId, msg.sender, numSeats, msg.value);
    }

    function completeRide(uint256 rideId) external onlyDriver(rideId) {
        Ride storage r = rides[rideId];
        require(r.status == RideStatus.Active, "BlockRide: not active");
        require(block.timestamp >= r.departsAt, "BlockRide: too early");
        r.status = RideStatus.Completed;

        uint256 payout = escrowOf[rideId];
        escrowOf[rideId] = 0;
        if (payout > 0) {
            (bool ok, ) = payable(r.driver).call{value: payout}("");
            require(ok, "BlockRide: payout failed");
        }
        emit RideCompleted(rideId, r.driver, payout);
    }

    function cancelRide(uint256 rideId) external onlyDriver(rideId) {
        Ride storage r = rides[rideId];
        require(r.status == RideStatus.Active, "BlockRide: not active");
        r.status = RideStatus.Cancelled;

        uint256 totalRefund;
        address[] memory pax = passengersOf[rideId];
        for (uint256 i = 0; i < pax.length; i++) {
            address p = pax[i];
            uint8 seats = seatsBooked[rideId][p];
            if (seats == 0) continue;
            uint256 owed = uint256(seats) * r.farePerSeat;
            seatsBooked[rideId][p] = 0;
            (bool ok, ) = payable(p).call{value: owed}("");
            require(ok, "BlockRide: refund failed");
            totalRefund += owed;
        }
        escrowOf[rideId] = 0;
        emit RideCancelled(rideId, totalRefund);
    }

    function rateDriver(uint256 rideId, uint8 score, string calldata comment) external {
        Ride storage r = rides[rideId];
        require(r.status == RideStatus.Completed, "BlockRide: ride not completed");
        require(seatsBooked[rideId][msg.sender] > 0, "BlockRide: not a passenger");
        require(!ratings[rideId][msg.sender].submitted, "BlockRide: already rated");
        require(score >= 1 && score <= 5, "BlockRide: score must be 1-5");

        ratings[rideId][msg.sender] = Rating(score, comment, true);
        driverTotalStars[r.driver] += score;
        driverRatingCount[r.driver] += 1;
        emit DriverRated(rideId, r.driver, msg.sender, score, comment);
    }

    function driverAverage(address driver) external view returns (uint256 avgTimes100, uint256 count) {
        count = driverRatingCount[driver];
        if (count == 0) return (0, 0);
        avgTimes100 = (driverTotalStars[driver] * 100) / count;
    }

    function getPassengers(uint256 rideId) external view returns (address[] memory) {
        return passengersOf[rideId];
    }

    function getAllRides() external view returns (Ride[] memory list) {
        list = new Ride[](ridesPosted);
        for (uint256 i = 0; i < ridesPosted; i++) {
            list[i] = rides[i];
        }
    }
}
