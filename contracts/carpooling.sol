// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BlockRide
/// @notice Decentralized carpooling with on-chain fare escrow, cancellations,
///         pull-pattern refunds, force-cancel for stuck escrow, and driver ratings.
contract BlockRide is ReentrancyGuard {
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

    /// @notice Window after departsAt during which the driver alone can finalize.
    ///         After it elapses, any passenger may force-cancel a still-Active ride.
    uint256 public constant FORCE_CANCEL_GRACE = 1 hours;

    /// @notice Time-before-departure threshold for a full-refund passenger cancel.
    ///         Cancelling later than this still works, but only 50% is refunded;
    ///         the other 50% is queued to the driver as a no-show penalty.
    uint256 public constant LATE_CANCEL_WINDOW = 1 hours;

    uint256 public ridesPosted;
    mapping(uint256 => Ride) public rides;
    mapping(address => Profile) public profiles;
    mapping(uint256 => address[]) private passengersOf;
    mapping(uint256 => mapping(address => uint8)) public seatsBooked;
    mapping(uint256 => uint256) public escrowOf;

    /// @notice ETH owed to a passenger from a cancelled / force-cancelled ride.
    ///         Withdrawable via {withdrawRefund}. Pull-pattern: avoids letting a
    ///         hostile passenger contract DoS the cancel path for everyone.
    mapping(address => uint256) public pendingRefunds;

    mapping(uint256 => mapping(address => Rating)) public ratings;
    mapping(address => uint256) public driverTotalStars;
    mapping(address => uint256) public driverRatingCount;

    // -------------------- Custom errors --------------------
    error NotDriver();
    error NoSuchRide();
    error RideNotActive();
    error RideNotCompleted();
    error InvalidSeatCount();
    error DriverCannotBook();
    error WrongFare();
    error DepartInPast();
    error SeatsRequired();
    error HandleRequired();
    error NotPassenger();
    error AlreadyRated();
    error ScoreOutOfRange();
    error TooEarlyToComplete();
    error TooEarlyToForceCancel();
    error TooLateToCancel();
    error NoRefundDue();
    error TransferFailed();

    // -------------------- Events --------------------
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
    event RideCancelled(uint256 indexed rideId, address indexed canceller, uint256 totalRefundQueued);
    event BookingCancelled(
        uint256 indexed rideId,
        address indexed passenger,
        uint8 seats,
        uint256 refundQueued,
        uint256 forfeitToDriver
    );
    event RefundWithdrawn(address indexed passenger, uint256 amount);
    event DriverRated(
        uint256 indexed rideId,
        address indexed driver,
        address indexed passenger,
        uint8 score,
        string comment
    );

    modifier onlyDriver(uint256 rideId) {
        if (rides[rideId].driver != msg.sender) revert NotDriver();
        _;
    }

    // -------------------- Profile --------------------
    function registerProfile(string calldata _handle, uint8 _age, bool _isMale) external {
        if (bytes(_handle).length == 0) revert HandleRequired();
        profiles[msg.sender] = Profile(_handle, _age, _isMale, true);
        emit ProfileRegistered(msg.sender, _handle);
    }

    // -------------------- Ride lifecycle --------------------
    function postRide(
        string calldata _origin,
        string calldata _destination,
        uint256 _departsAt,
        uint256 _farePerSeat,
        uint8 _seats
    ) external returns (uint256 rideId) {
        if (_seats == 0) revert SeatsRequired();
        if (_departsAt <= block.timestamp) revert DepartInPast();
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
        if (r.driver == address(0)) revert NoSuchRide();
        if (r.status != RideStatus.Active) revert RideNotActive();
        if (numSeats == 0 || numSeats > r.seatsAvailable) revert InvalidSeatCount();
        if (msg.sender == r.driver) revert DriverCannotBook();
        uint256 owed = uint256(numSeats) * r.farePerSeat;
        if (msg.value != owed) revert WrongFare();

        if (seatsBooked[rideId][msg.sender] == 0) {
            passengersOf[rideId].push(msg.sender);
        }
        seatsBooked[rideId][msg.sender] += numSeats;
        r.seatsAvailable -= numSeats;
        escrowOf[rideId] += msg.value;

        emit SeatsBooked(rideId, msg.sender, numSeats, msg.value);
    }

    function completeRide(uint256 rideId) external onlyDriver(rideId) nonReentrant {
        Ride storage r = rides[rideId];
        if (r.status != RideStatus.Active) revert RideNotActive();
        if (block.timestamp < r.departsAt) revert TooEarlyToComplete();
        r.status = RideStatus.Completed;

        uint256 payout = escrowOf[rideId];
        escrowOf[rideId] = 0;
        if (payout > 0) {
            (bool ok, ) = payable(r.driver).call{value: payout}("");
            if (!ok) revert TransferFailed();
        }
        emit RideCompleted(rideId, r.driver, payout);
    }

    /// @notice Driver cancels their own active ride. Refunds are queued for
    ///         passengers to pull via {withdrawRefund}.
    function cancelRide(uint256 rideId) external onlyDriver(rideId) {
        _queueRefundsAndCancel(rideId);
    }

    /// @notice Anyone (typically a passenger) may force-cancel a stuck ride
    ///         after `departsAt + FORCE_CANCEL_GRACE` if the driver has neither
    ///         completed nor cancelled it. Refunds are queued for pull-withdrawal.
    /// @dev    Must be a passenger of the ride to invoke.
    function forceCancel(uint256 rideId) external {
        Ride storage r = rides[rideId];
        if (r.driver == address(0)) revert NoSuchRide();
        if (seatsBooked[rideId][msg.sender] == 0) revert NotPassenger();
        if (block.timestamp < r.departsAt + FORCE_CANCEL_GRACE) revert TooEarlyToForceCancel();
        _queueRefundsAndCancel(rideId);
    }

    /// @notice A passenger drops their own seats from an active ride before
    ///         departure. Refund is time-tiered:
    ///           - cancelling at least `LATE_CANCEL_WINDOW` before `departsAt`
    ///             returns 100% of what the passenger paid;
    ///           - cancelling inside that window returns 50% and queues the
    ///             other 50% as a no-show penalty for the driver.
    ///         Freed seats are returned to `seatsAvailable` so other riders
    ///         can re-book them.
    function cancelMyBooking(uint256 rideId) external {
        Ride storage r = rides[rideId];
        if (r.driver == address(0)) revert NoSuchRide();
        if (r.status != RideStatus.Active) revert RideNotActive();
        if (block.timestamp >= r.departsAt) revert TooLateToCancel();

        uint8 seats = seatsBooked[rideId][msg.sender];
        if (seats == 0) revert NotPassenger();

        uint256 totalPaid = uint256(seats) * r.farePerSeat;
        seatsBooked[rideId][msg.sender] = 0;
        r.seatsAvailable += seats;
        escrowOf[rideId] -= totalPaid;

        uint256 refund;
        uint256 forfeit;
        if (r.departsAt - block.timestamp >= LATE_CANCEL_WINDOW) {
            refund = totalPaid;
        } else {
            refund = totalPaid / 2;
            forfeit = totalPaid - refund;
        }

        pendingRefunds[msg.sender] += refund;
        if (forfeit > 0) {
            pendingRefunds[r.driver] += forfeit;
        }

        emit BookingCancelled(rideId, msg.sender, seats, refund, forfeit);
    }

    function _queueRefundsAndCancel(uint256 rideId) internal {
        Ride storage r = rides[rideId];
        if (r.status != RideStatus.Active) revert RideNotActive();
        r.status = RideStatus.Cancelled;

        uint256 totalQueued;
        address[] memory pax = passengersOf[rideId];
        for (uint256 i = 0; i < pax.length; i++) {
            address p = pax[i];
            uint8 seats = seatsBooked[rideId][p];
            if (seats == 0) continue;
            uint256 owed = uint256(seats) * r.farePerSeat;
            seatsBooked[rideId][p] = 0;
            pendingRefunds[p] += owed;
            totalQueued += owed;
        }
        escrowOf[rideId] = 0;
        emit RideCancelled(rideId, msg.sender, totalQueued);
    }

    /// @notice Pull a previously queued refund to the caller's address.
    function withdrawRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        if (amount == 0) revert NoRefundDue();
        pendingRefunds[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit RefundWithdrawn(msg.sender, amount);
    }

    // -------------------- Ratings --------------------
    function rateDriver(uint256 rideId, uint8 score, string calldata comment) external {
        Ride storage r = rides[rideId];
        if (r.status != RideStatus.Completed) revert RideNotCompleted();
        if (seatsBooked[rideId][msg.sender] == 0) revert NotPassenger();
        if (ratings[rideId][msg.sender].submitted) revert AlreadyRated();
        if (score < 1 || score > 5) revert ScoreOutOfRange();

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

    // -------------------- Views --------------------
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
