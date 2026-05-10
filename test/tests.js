const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockRide", function () {
  let blockRide;
  let driver, alice, bob;
  const ONE_HOUR = 3600;
  const FORCE_CANCEL_GRACE = 3600; // matches contract constant

  async function futureTime(offsetSeconds = ONE_HOUR) {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp + offsetSeconds;
  }

  async function advance(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  beforeEach(async function () {
    [driver, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BlockRide");
    blockRide = await Factory.deploy();
    await blockRide.deployed();
  });

  it("registers a profile", async function () {
    await blockRide.connect(alice).registerProfile("alice", 25, false);
    const profile = await blockRide.profiles(alice.address);
    expect(profile.handle).to.equal("alice");
    expect(profile.registered).to.equal(true);
  });

  it("posts a ride and exposes it via getAllRides", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);

    expect(await blockRide.ridesPosted()).to.equal(1);
    const all = await blockRide.getAllRides();
    expect(all.length).to.equal(1);
    expect(all[0].origin).to.equal("Boston");
    expect(all[0].seatsAvailable).to.equal(3);
  });

  it("books seats with correct fare and decrements seats", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);

    await blockRide.connect(alice).bookSeats(0, 2, { value: fare.mul(2) });
    const ride = await blockRide.rides(0);
    expect(ride.seatsAvailable).to.equal(1);
    expect(await blockRide.escrowOf(0)).to.equal(fare.mul(2));
    expect(await blockRide.seatsBooked(0, alice.address)).to.equal(2);
  });

  it("rejects booking with wrong fare", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);

    await expect(
      blockRide.connect(alice).bookSeats(0, 2, { value: fare })
    ).to.be.revertedWithCustomError(blockRide, "WrongFare");
  });

  it("rejects driver booking own ride", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);

    await expect(
      blockRide.connect(driver).bookSeats(0, 1, { value: fare })
    ).to.be.revertedWithCustomError(blockRide, "DriverCannotBook");
  });

  it("pays out escrow to driver on completion (after departure time)", async function () {
    const departsAt = await futureTime(60);
    const fare = ethers.utils.parseEther("0.05");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 2);
    await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
    await blockRide.connect(bob).bookSeats(0, 1, { value: fare });

    await advance(120);

    const balanceBefore = await ethers.provider.getBalance(driver.address);
    const tx = await blockRide.connect(driver).completeRide(0);
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const balanceAfter = await ethers.provider.getBalance(driver.address);

    expect(balanceAfter.add(gasCost).sub(balanceBefore)).to.equal(fare.mul(2));
    expect(await blockRide.escrowOf(0)).to.equal(0);
  });

  it("queues refunds (pull pattern) on driver cancellation", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.02");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);
    await blockRide.connect(alice).bookSeats(0, 2, { value: fare.mul(2) });
    await blockRide.connect(bob).bookSeats(0, 1, { value: fare });

    await blockRide.connect(driver).cancelRide(0);

    expect(await blockRide.pendingRefunds(alice.address)).to.equal(fare.mul(2));
    expect(await blockRide.pendingRefunds(bob.address)).to.equal(fare);
    expect(await blockRide.escrowOf(0)).to.equal(0);
    expect((await blockRide.rides(0)).status).to.equal(2); // Cancelled
  });

  it("only driver can cancelRide (and only driver can completeRide)", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);

    await expect(blockRide.connect(alice).cancelRide(0)).to.be.revertedWithCustomError(blockRide, "NotDriver");
    await expect(blockRide.connect(alice).completeRide(0)).to.be.revertedWithCustomError(blockRide, "NotDriver");
  });

  it("blocks booking after cancel", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
    await blockRide.connect(driver).cancelRide(0);
    await expect(
      blockRide.connect(alice).bookSeats(0, 1, { value: fare })
    ).to.be.revertedWithCustomError(blockRide, "RideNotActive");
  });

  // -------------------- withdrawRefund --------------------
  describe("withdrawRefund (pull-pattern refunds)", function () {
    it("transfers a queued refund to the caller", async function () {
      const departsAt = await futureTime();
      const fare = ethers.utils.parseEther("0.03");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);
      await blockRide.connect(alice).bookSeats(0, 2, { value: fare.mul(2) });
      await blockRide.connect(driver).cancelRide(0);

      expect(await blockRide.pendingRefunds(alice.address)).to.equal(fare.mul(2));

      const balanceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await blockRide.connect(alice).withdrawRefund();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const balanceAfter = await ethers.provider.getBalance(alice.address);

      expect(balanceAfter.add(gasCost).sub(balanceBefore)).to.equal(fare.mul(2));
      expect(await blockRide.pendingRefunds(alice.address)).to.equal(0);
    });

    it("reverts when nothing is owed", async function () {
      await expect(
        blockRide.connect(alice).withdrawRefund()
      ).to.be.revertedWithCustomError(blockRide, "NoRefundDue");
    });

    it("accumulates refunds across multiple cancelled rides", async function () {
      const fare = ethers.utils.parseEther("0.01");
      const t1 = await futureTime();
      await blockRide.connect(driver).postRide("A", "B", t1, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await blockRide.connect(driver).cancelRide(0);

      const t2 = await futureTime();
      await blockRide.connect(driver).postRide("C", "D", t2, fare, 1);
      await blockRide.connect(alice).bookSeats(1, 1, { value: fare });
      await blockRide.connect(driver).cancelRide(1);

      expect(await blockRide.pendingRefunds(alice.address)).to.equal(fare.mul(2));
    });
  });

  // -------------------- forceCancel --------------------
  describe("forceCancel (stuck-escrow rescue)", function () {
    it("lets a passenger force-cancel after departsAt + FORCE_CANCEL_GRACE", async function () {
      const departsAt = await futureTime(60);
      const fare = ethers.utils.parseEther("0.02");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 2);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });

      await advance(60 + FORCE_CANCEL_GRACE + 1);

      await blockRide.connect(alice).forceCancel(0);

      expect((await blockRide.rides(0)).status).to.equal(2); // Cancelled
      expect(await blockRide.pendingRefunds(alice.address)).to.equal(fare);
    });

    it("reverts before the grace window elapses", async function () {
      const departsAt = await futureTime(60);
      const fare = ethers.utils.parseEther("0.02");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });

      await advance(60); // exactly at departsAt

      await expect(
        blockRide.connect(alice).forceCancel(0)
      ).to.be.revertedWithCustomError(blockRide, "TooEarlyToForceCancel");
    });

    it("reverts when the caller is not a passenger of the ride", async function () {
      const departsAt = await futureTime(60);
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await advance(60 + FORCE_CANCEL_GRACE + 1);

      await expect(
        blockRide.connect(bob).forceCancel(0)
      ).to.be.revertedWithCustomError(blockRide, "NotPassenger");
    });

    it("reverts on a ride that's already completed", async function () {
      const departsAt = await futureTime(60);
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await advance(120);
      await blockRide.connect(driver).completeRide(0);
      await advance(FORCE_CANCEL_GRACE + 1);

      await expect(
        blockRide.connect(alice).forceCancel(0)
      ).to.be.revertedWithCustomError(blockRide, "RideNotActive");
    });
  });

  // -------------------- cancelMyBooking (passenger self-cancel) --------------------
  describe("cancelMyBooking (passenger self-cancel)", function () {
    const LATE_CANCEL_WINDOW = 3600;

    it("full refund when cancelling >= 1h before departure", async function () {
      const departsAt = await futureTime(LATE_CANCEL_WINDOW + 1800); // 1.5h ahead
      const fare = ethers.utils.parseEther("0.02");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);
      await blockRide.connect(alice).bookSeats(0, 2, { value: fare.mul(2) });

      await blockRide.connect(alice).cancelMyBooking(0);

      expect(await blockRide.pendingRefunds(alice.address)).to.equal(fare.mul(2));
      expect(await blockRide.pendingRefunds(driver.address)).to.equal(0);
      // Seats restored, escrow drained
      expect((await blockRide.rides(0)).seatsAvailable).to.equal(3);
      expect(await blockRide.escrowOf(0)).to.equal(0);
      expect(await blockRide.seatsBooked(0, alice.address)).to.equal(0);
    });

    it("50/50 split when cancelling inside the late-cancel window", async function () {
      const departsAt = await futureTime(LATE_CANCEL_WINDOW / 2); // 30 min ahead
      const fare = ethers.utils.parseEther("0.05");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 2);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });

      await blockRide.connect(alice).cancelMyBooking(0);

      const half = fare.div(2);
      expect(await blockRide.pendingRefunds(alice.address)).to.equal(half);
      expect(await blockRide.pendingRefunds(driver.address)).to.equal(fare.sub(half));
      expect(await blockRide.escrowOf(0)).to.equal(0);
    });

    it("reverts after departsAt has passed", async function () {
      const departsAt = await futureTime(60);
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await advance(120);

      await expect(
        blockRide.connect(alice).cancelMyBooking(0)
      ).to.be.revertedWithCustomError(blockRide, "TooLateToCancel");
    });

    it("reverts when caller is not a passenger", async function () {
      const departsAt = await futureTime();
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);

      await expect(
        blockRide.connect(bob).cancelMyBooking(0)
      ).to.be.revertedWithCustomError(blockRide, "NotPassenger");
    });

    it("reverts when ride is already cancelled (driver cancel first)", async function () {
      // Construct a case where the ride is non-Active but departsAt is still
      // in the future, so the RideNotActive check (which runs before the time
      // check in the contract) is the one being exercised.
      const departsAt = await futureTime(LATE_CANCEL_WINDOW + 1800);
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await blockRide.connect(driver).cancelRide(0);

      await expect(
        blockRide.connect(alice).cancelMyBooking(0)
      ).to.be.revertedWithCustomError(blockRide, "RideNotActive");
    });

    it("frees the seat so another passenger can re-book it", async function () {
      const departsAt = await futureTime(LATE_CANCEL_WINDOW + 1800);
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });

      // Ride is fully booked - bob would fail.
      await expect(
        blockRide.connect(bob).bookSeats(0, 1, { value: fare })
      ).to.be.revertedWithCustomError(blockRide, "InvalidSeatCount");

      // Alice cancels, seat returns to the pool.
      await blockRide.connect(alice).cancelMyBooking(0);

      // Bob can now book the freed seat.
      await blockRide.connect(bob).bookSeats(0, 1, { value: fare });
      expect(await blockRide.seatsBooked(0, bob.address)).to.equal(1);
      expect((await blockRide.rides(0)).seatsAvailable).to.equal(0);
    });
  });

  // -------------------- Adversarial reentrancy --------------------
  describe("ReentrancyGuard", function () {
    it("blocks a malicious passenger from reentering withdrawRefund", async function () {
      const Mal = await ethers.getContractFactory("MaliciousPassenger");
      const mal = await Mal.deploy(blockRide.address);
      await mal.deployed();

      const departsAt = await futureTime();
      const fare = ethers.utils.parseEther("0.05");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);

      // Malicious contract books a seat (funded by alice, sent through mal).
      await mal.connect(alice).book(0, 1, { value: fare });

      // Driver cancels: refund queued for the malicious contract.
      await blockRide.connect(driver).cancelRide(0);
      expect(await blockRide.pendingRefunds(mal.address)).to.equal(fare);

      // Trigger the attack: mal.attack() calls withdrawRefund(), which sends
      // ETH to mal.receive(), which tries to reenter withdrawRefund().
      // The guard should reject the reentry; the legitimate transfer still
      // succeeds for exactly `fare` and the contract's pending balance is 0.
      const balBefore = await ethers.provider.getBalance(mal.address);
      await mal.connect(alice).attack();
      const balAfter = await ethers.provider.getBalance(mal.address);

      expect(balAfter.sub(balBefore)).to.equal(fare); // funds delivered exactly once
      expect(await blockRide.pendingRefunds(mal.address)).to.equal(0);
      expect(await mal.reentryAttempts()).to.be.gte(1); // attempt happened
    });
  });

  // -------------------- Ratings --------------------
  describe("ratings", function () {
    async function setupCompletedRide(fare = ethers.utils.parseEther("0.01")) {
      const departsAt = await futureTime(60);
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 2);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await blockRide.connect(bob).bookSeats(0, 1, { value: fare });
      await advance(120);
      await blockRide.connect(driver).completeRide(0);
    }

    it("lets a passenger rate the driver after completion", async function () {
      await setupCompletedRide();
      await blockRide.connect(alice).rateDriver(0, 5, "Smooth ride");

      const r = await blockRide.ratings(0, alice.address);
      expect(r.score).to.equal(5);
      expect(r.submitted).to.equal(true);

      const [avgX100, count] = await blockRide.driverAverage(driver.address);
      expect(count).to.equal(1);
      expect(avgX100).to.equal(500);
    });

    it("computes a running average across multiple ratings", async function () {
      await setupCompletedRide();
      await blockRide.connect(alice).rateDriver(0, 5, "");
      await blockRide.connect(bob).rateDriver(0, 3, "");

      const [avgX100, count] = await blockRide.driverAverage(driver.address);
      expect(count).to.equal(2);
      expect(avgX100).to.equal(400); // (5 + 3) / 2 = 4.00
    });

    it("rejects ratings from non-passengers", async function () {
      await setupCompletedRide();
      const [, , , stranger] = await ethers.getSigners();
      await expect(
        blockRide.connect(stranger).rateDriver(0, 5, "")
      ).to.be.revertedWithCustomError(blockRide, "NotPassenger");
    });

    it("rejects double rating from the same passenger", async function () {
      await setupCompletedRide();
      await blockRide.connect(alice).rateDriver(0, 5, "");
      await expect(
        blockRide.connect(alice).rateDriver(0, 4, "")
      ).to.be.revertedWithCustomError(blockRide, "AlreadyRated");
    });

    it("rejects rating before completion", async function () {
      const departsAt = await futureTime();
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await expect(
        blockRide.connect(alice).rateDriver(0, 5, "")
      ).to.be.revertedWithCustomError(blockRide, "RideNotCompleted");
    });

    it("rejects out-of-range scores", async function () {
      await setupCompletedRide();
      await expect(blockRide.connect(alice).rateDriver(0, 0, "")).to.be.revertedWithCustomError(blockRide, "ScoreOutOfRange");
      await expect(blockRide.connect(alice).rateDriver(0, 6, "")).to.be.revertedWithCustomError(blockRide, "ScoreOutOfRange");
    });
  });
});
