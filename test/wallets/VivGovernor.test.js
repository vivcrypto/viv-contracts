const { BN, constants, expectEvent, expectRevert, balance, send } = require('@openzeppelin/test-helpers');
const { ether } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const Enums = require('../helpers/enums');
const { GovernorHelper } = require('../helpers/governance');

const VivVote = artifacts.require('VivVote');
const Timelock = artifacts.require('TimelockController');
const VivGovernor = artifacts.require('VivGovernor');
const VivWithdraw = artifacts.require('VivWithdraw');

contract('VivGovernor', function (accounts) {
  const [ owner, voter1, voter2, voter3, voter4, other ] = accounts;

  const TIMELOCK_ADMIN_ROLE = web3.utils.soliditySha3('TIMELOCK_ADMIN_ROLE');
  const PROPOSER_ROLE = web3.utils.soliditySha3('PROPOSER_ROLE');
  const EXECUTOR_ROLE = web3.utils.soliditySha3('EXECUTOR_ROLE');

  const tokenSupply = web3.utils.toWei('100');
  const value = web3.utils.toWei('1');
  const votingDelay = new BN(4);
  const votingPeriod = new BN(16);


  beforeEach(async function () {
    const [ deployer ] = await web3.eth.getAccounts();

    this.token = await VivVote.new();
    this.timelock = await Timelock.new(3600, [], []);
    this.mock = await VivGovernor.new(
      this.token.address,
      this.timelock.address,
      votingDelay,
      votingPeriod
    );
    this.receiver = await VivWithdraw.new(this.timelock.address);

    this.helper = new GovernorHelper(this.mock);

    this.TIMELOCK_ADMIN_ROLE = await this.timelock.TIMELOCK_ADMIN_ROLE();
    this.PROPOSER_ROLE = await this.timelock.PROPOSER_ROLE();
    this.EXECUTOR_ROLE = await this.timelock.EXECUTOR_ROLE();

    await web3.eth.sendTransaction({ from: owner, to: this.receiver.address, value });

    // normal setup: governor is proposer, everyone is executor, timelock is its own admin
    console.log(TIMELOCK_ADMIN_ROLE);
    console.log(PROPOSER_ROLE);
    console.log(EXECUTOR_ROLE);
    await this.timelock.grantRole(PROPOSER_ROLE, this.mock.address);
    await this.timelock.grantRole(EXECUTOR_ROLE, ZERO_ADDRESS);
    await this.timelock.revokeRole(TIMELOCK_ADMIN_ROLE, deployer);

    await this.token.mint(owner, tokenSupply);
    await this.helper.delegate({ token: this.token, to: voter1, value: web3.utils.toWei('10') }, { from: owner });
    await this.helper.delegate({ token: this.token, to: voter2, value: web3.utils.toWei('7') }, { from: owner });
    await this.helper.delegate({ token: this.token, to: voter3, value: web3.utils.toWei('5') }, { from: owner });
    await this.helper.delegate({ token: this.token, to: voter4, value: web3.utils.toWei('2') }, { from: owner });

    // default proposal
    this.proposal = this.helper.setProposal([
      {
        target: this.receiver.address,
        value: '0',
        data: this.receiver.contract.methods.transfer(other, value, ZERO_ADDRESS).encodeABI(),
      },
    ], '<proposal description>');
    this.proposal.timelockid = await this.timelock.hashOperationBatch(
      ...this.proposal.shortProposal.slice(0, 3),
      '0x0',
      this.proposal.shortProposal[3],
    );
  });

  it('post deployment check', async function () {
    expect(await this.mock.token()).to.be.equal(this.token.address);
    expect(await this.mock.timelock()).to.be.equal(this.timelock.address);
    expect(await this.mock.votingDelay()).to.be.bignumber.equal(votingDelay);
    expect(await this.mock.votingPeriod()).to.be.bignumber.equal(votingPeriod);
  });

  it('nominal', async function () {
    await this.helper.propose();
    await this.helper.waitForSnapshot();
    await this.helper.vote({ support: Enums.VoteType.For }, { from: voter1 });
    await this.helper.vote({ support: Enums.VoteType.For }, { from: voter2 });
    await this.helper.vote({ support: Enums.VoteType.Against }, { from: voter3 });
    await this.helper.vote({ support: Enums.VoteType.Abstain }, { from: voter4 });
    await this.helper.waitForDeadline();
    const txQueue = await this.helper.queue();
    await this.helper.waitForEta();
    const txExecute = await this.helper.execute();

    expectEvent(txQueue, 'ProposalQueued', { proposalId: this.proposal.id });
    await expectEvent.inTransaction(txQueue.tx, this.timelock, 'CallScheduled', { id: this.proposal.timelockid });

    expectEvent(txExecute, 'ProposalExecuted', { proposalId: this.proposal.id });
    await expectEvent.inTransaction(txExecute.tx, this.timelock, 'CallExecuted', { id: this.proposal.timelockid });
    await expectEvent.inTransaction(txExecute.tx, this.receiver, 'Transfer', {from: this.receiver.address, to: other, value: value});
  }); 

});
