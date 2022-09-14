const { BN, constants, expectEvent, expectRevert, balance, send } = require('@openzeppelin/test-helpers');
const { ether } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { getHashString } = require('../helpers/sign');
const Wallet = require('ethereumjs-wallet').default;

const ERC20Mock = artifacts.require('ERC20Mock');
const VivMultiSign = artifacts.require('VivMultiSign');

contract('VivMultiSign', function (accounts) {
  const [ owner, account1, account2, account3, account4, other] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(100);

  const owners = [owner, account1, account2, account3];
  const threshold = new BN(3);
  const data = '0x303030303030303030303030303030303030';
  const operation = getHashString(['bytes'], [data]);
  const delay = new BN(0);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, owner, tradeAmount);
    this.trade = await VivMultiSign.new(owners, threshold, delay);
  });

  describe('constructor', function () {
    describe('The threshold is more than the size of owners', function () {
      const owners = [owner];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold, delay),
          'VIV0033',
        );
      });
    });

    describe('The owners contains zero address', function () {
      const owners = [owner, ZERO_ADDRESS];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold, delay),
          'VIV0034',
        );
      });
    });

    describe('The owners contains repeate address', function () {
      const owners = [owner, owner];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold, delay),
          'VIV0035',
        );
      });
    });
  });

  describe('transfer', function () {
    
    describe('When the token is zero address', function () {

      describe('The normal transaction', function () {
        let proposalId;
        beforeEach(async function () {
          const data = this.trade.contract.methods.transfer(other, tradeAmount, ZERO_ADDRESS).encodeABI();
          const receipt = await this.trade.submitProposal(this.trade.address, data, { from: owner });
          proposalId = receipt.logs.find(({ event }) => event === 'Submission').args.proposalId;
          await this.trade.vote(proposalId, {from: account1});
          await ether(owner, this.trade.address, tradeAmount);
        });

        describe('Vote a proposal', function () {
          it('emits a execution event', async function () {
            const oldBalance = await current(other);
            const newBalance = oldBalance.add(tradeAmount);
            expectEvent(
              await this.trade.vote(proposalId, {from: account2}),
              'Execution',
              { proposalId: proposalId },
            );
            expect(await current(other)).to.be.bignumber.equal(newBalance);
          });
        });
      });
    });

    
    describe('When the token is erc20 address', function () {
      describe('The normal transaction', function () {
        let proposalId;
        beforeEach(async function () {
          const data = this.trade.contract.methods.transfer(other, tradeAmount, this.erc20.address).encodeABI();
          const receipt = await this.trade.submitProposal(this.trade.address, data, { from: owner });
          proposalId = receipt.logs.find(({ event }) => event === 'Submission').args.proposalId;
          await this.trade.vote(proposalId, {from: account1});
          await this.erc20.transferInternal(owner, this.trade.address, tradeAmount);
        });

        describe('Vote a proposal', function () {
          it('emits a execution event', async function () {
            const oldBalance = await this.erc20.balanceOf(other);
            const newBalance = oldBalance.add(tradeAmount);
            expectEvent(
              await this.trade.vote(proposalId, {from: account2}),
              'Execution',
              { proposalId: proposalId },
            );
            expect(await this.erc20.balanceOf(other)).to.be.bignumber.equal(newBalance);
          });
        });
      });
    });
  });

  describe('addOwner', function () {
    describe('When add an owner', function () {
      describe('When the request address is not owner', function () {
        let proposalId;
        let data;
        beforeEach(async function () {
          data = this.trade.contract.methods.addOwner(other, threshold).encodeABI();
          const receipt = await this.trade.submitProposal(this.trade.address, data, { from: owner });
          proposalId = receipt.logs.find(({ event }) => event === 'Submission').args.proposalId;
          await this.trade.vote(proposalId, {from: account1});
        });

        describe('Vote a proposal', function () {
          it('emits a execution event', async function () {
            expect(await this.trade.isOwner(other)).to.be.equal(false);
            expectEvent(
              await this.trade.vote(proposalId, {from: account2}),
              'Execution',
              { proposalId: proposalId },
            );
            expect(await this.trade.isOwner(other)).to.be.equal(true);
          });
        });
      });
    });
  });

  describe('removeOwner', function () {
    describe('When remove an owner', function () {
      describe('When the request address is owner', function () {
        let proposalId;
        let data;
        beforeEach(async function () {
          data = this.trade.contract.methods.removeOwner(account3, threshold).encodeABI();
          const receipt = await this.trade.submitProposal(this.trade.address, data, { from: owner });
          proposalId = receipt.logs.find(({ event }) => event === 'Submission').args.proposalId;
          await this.trade.vote(proposalId, {from: account1});
        });

        describe('Vote a proposal', function () {
          it('emits a execution event', async function () {
            expect(await this.trade.isOwner(account3)).to.be.equal(true);
            expectEvent(
              await this.trade.vote(proposalId, {from: account2}),
              'Execution',
              { proposalId: proposalId },
            );
            expect(await this.trade.isOwner(account3)).to.be.equal(false);
          });
        });
      });
    });
  });

  describe('changeOwner', function () {
    describe('When change an owner', function () {
      describe('When the request address is owner', function () {
        let proposalId;
        let data;
        beforeEach(async function () {
          data = this.trade.contract.methods.changeOwner(account3, other).encodeABI();
          const receipt = await this.trade.submitProposal(this.trade.address, data, { from: owner });
          proposalId = receipt.logs.find(({ event }) => event === 'Submission').args.proposalId;
          await this.trade.vote(proposalId, {from: account1});
        });

        describe('Vote a proposal', function () {
          it('emits a execution event', async function () {
            expect(await this.trade.isOwner(account3)).to.be.equal(true);
            expect(await this.trade.isOwner(other)).to.be.equal(false);
            expectEvent(
              await this.trade.vote(proposalId, {from: account2}),
              'Execution',
              { proposalId: proposalId },
            );
            expect(await this.trade.isOwner(account3)).to.be.equal(false);
            expect(await this.trade.isOwner(other)).to.be.equal(true);
          });
        });
      });
    });
  });

  describe('changeRequirement', function () {
    describe('When change requirement', function () {
      describe('When new threshold is valid', function () {
        let proposalId;
        let data;
        beforeEach(async function () {
          data = this.trade.contract.methods.changeRequirement(2).encodeABI();
          const receipt = await this.trade.submitProposal(this.trade.address, data, { from: owner });
          proposalId = receipt.logs.find(({ event }) => event === 'Submission').args.proposalId;
          await this.trade.vote(proposalId, {from: account1});
        });

        describe('Vote a proposal', function () {
          it('emits a execution event', async function () {
            expectEvent(
              await this.trade.vote(proposalId, {from: account2}),
              'Execution',
              { proposalId: proposalId },
            );
          });
        });
      });
    });
  });

  describe('updateDelay', function () {
    describe('When update delay', function () {
      describe('When new delay', function () {
        let proposalId;
        let data;
        beforeEach(async function () {
          data = this.trade.contract.methods.updateDelay(8).encodeABI();
          const receipt = await this.trade.submitProposal(this.trade.address, data, { from: owner });
          proposalId = receipt.logs.find(({ event }) => event === 'Submission').args.proposalId;
          await this.trade.vote(proposalId, {from: account1});
        });

        describe('Vote a proposal', function () {
          it('emits a execution event', async function () {
            expectEvent(
              await this.trade.vote(proposalId, {from: account2}),
              'Execution',
              { proposalId: proposalId },
            );
          });
        });
      });
    });
  });

});
