const { ethers, upgrades } = require("hardhat");

async function main() {
    const VivVote = await ethers.getContractFactory("VivVote");
    const vote = await VivVote.deploy();
    await vote.deployed();

    console.log('Governor -> deployed to address:', vote.address);
    console.log(process.env.HARDHAT_NETWORK);

    if (process.env.HARDHAT_NETWORK != 'localhost') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await ethers.run('verify:verify', {
            address: vote.address,
            contract: 'contracts/wallets/VivVote.sol:VivVote'
        });
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });