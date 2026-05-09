const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockRide", function () {
  let blockRide;
  let driver, alice, bob;
  const ONE_HOUR = 3600;

  async function futureTime(offsetSeconds = ONE_HOUR) {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp + offsetSeconds;
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
    ).to.be.revertedWith("BlockRide: wrong fare");
  });

  it("rejects driver booking own ride", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);

    await expect(
      blockRide.connect(driver).bookSeats(0, 1, { value: fare })
    ).to.be.revertedWith("BlockRide: driver cannot book");
  });

  it("pays out escrow to driver on completion (after departure time)", async function () {
    const departsAt = await futureTime(60);
    const fare = ethers.utils.parseEther("0.05");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 2);
    await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
    await blockRide.connect(bob).bookSeats(0, 1, { value: fare });

    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);

    const balanceBefore = await ethers.provider.getBalance(driver.address);
    const tx = await blockRide.connect(driver).completeRide(0);
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const balanceAfter = await ethers.provider.getBalance(driver.address);

    expect(balanceAfter.add(gasCost).sub(balanceBefore)).to.equal(fare.mul(2));
    expect(await blockRide.escrowOf(0)).to.equal(0);
  });

  it("refunds passengers on cancellation", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.02");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 3);
    await blockRide.connect(alice).bookSeats(0, 2, { value: fare.mul(2) });
    await blockRide.connect(bob).bookSeats(0, 1, { value: fare });

    const aliceBefore = await ethers.provider.getBalance(alice.address);
    const bobBefore = await ethers.provider.getBalance(bob.address);

    await blockRide.connect(driver).cancelRide(0);

    const aliceAfter = await ethers.provider.getBalance(alice.address);
    const bobAfter = await ethers.provider.getBalance(bob.address);

    expect(aliceAfter.sub(aliceBefore)).to.equal(fare.mul(2));
    expect(bobAfter.sub(bobBefore)).to.equal(fare);
    expect(await blockRide.escrowOf(0)).to.equal(0);
  });

  it("only driver can complete or cancel a ride", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);

    await expect(blockRide.connect(alice).cancelRide(0)).to.be.revertedWith("BlockRide: not driver");
    await expect(blockRide.connect(alice).completeRide(0)).to.be.revertedWith("BlockRide: not driver");
  });

  it("blocks booking after cancel", async function () {
    const departsAt = await futureTime();
    const fare = ethers.utils.parseEther("0.01");
    await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
    await blockRide.connect(driver).cancelRide(0);
    await expect(
      blockRide.connect(alice).bookSeats(0, 1, { value: fare })
    ).to.be.revertedWith("BlockRide: ride inactive");
  });

  describe("ratings", function () {
    async function setupCompletedRide(fare = ethers.utils.parseEther("0.01")) {
      const departsAt = await futureTime(60);
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 2);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await blockRide.connect(bob).bookSeats(0, 1, { value: fare });
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine", []);
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
      ).to.be.revertedWith("BlockRide: not a passenger");
    });

    it("rejects double rating from the same passenger", async function () {
      await setupCompletedRide();
      await blockRide.connect(alice).rateDriver(0, 5, "");
      await expect(
        blockRide.connect(alice).rateDriver(0, 4, "")
      ).to.be.revertedWith("BlockRide: already rated");
    });

    it("rejects rating before completion", async function () {
      const departsAt = await futureTime();
      const fare = ethers.utils.parseEther("0.01");
      await blockRide.connect(driver).postRide("Boston", "NYC", departsAt, fare, 1);
      await blockRide.connect(alice).bookSeats(0, 1, { value: fare });
      await expect(
        blockRide.connect(alice).rateDriver(0, 5, "")
      ).to.be.revertedWith("BlockRide: ride not completed");
    });

    it("rejects out-of-range scores", async function () {
      await setupCompletedRide();
      await expect(blockRide.connect(alice).rateDriver(0, 0, "")).to.be.revertedWith("BlockRide: score must be 1-5");
      await expect(blockRide.connect(alice).rateDriver(0, 6, "")).to.be.revertedWith("BlockRide: score must be 1-5");
    });
  });
});
