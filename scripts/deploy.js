const { ethers, run, network } = require("hardhat");

const SEPOLIA_CHAIN_ID = 11155111;

async function main() {
  const Factory = await ethers.getContractFactory("BlockRide");
  console.log("Deploying BlockRide...");
  const blockRide = await Factory.deploy();
  await blockRide.deployed();
  console.log(`BlockRide deployed at: ${blockRide.address}`);
  console.log(`Network chainId: ${network.config.chainId}`);

  if (network.config.chainId === SEPOLIA_CHAIN_ID && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for confirmations before verification...");
    await blockRide.deployTransaction.wait(6);
    await verify(blockRide.address, []);
  }
}

async function verify(contractAddress, args) {
  console.log("Verifying contract on Etherscan...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified.");
    } else {
      console.error(e);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
