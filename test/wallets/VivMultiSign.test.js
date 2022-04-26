const { BN, constants, expectEvent, expectRevert, send } = require('@openzeppelin/test-helpers');
const { ether } = send;
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
  const daylimit = new BN(0);
  const data = '0x303030303030303030303030303030303030';
  const operation = getHashString(['bytes'], [data]);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, owner, tradeAmount);
    this.trade = await VivMultiSign.new(owners, threshold, daylimit);
  });

  describe('constructor', function () {
    describe('The threshold is more than the size of owners', function () {
      const owners = [owner];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold, daylimit),
          'VIV0033',
        );
      });
    });

    describe('The owners contains zero address', function () {
      const owners = [owner, ZERO_ADDRESS];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold, daylimit),
          'VIV0034',
        );
      });
    });

    describe('The owners contains repeate address', function () {
      const owners = [owner, owner];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold, daylimit),
          'VIV0035',
        );
      });
    });
  });

  describe('execute', function () {
    describe('When the sender address is the not owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.execute(ZERO_ADDRESS, tradeAmount, ZERO_ADDRESS, data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When the recipient address is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.execute(ZERO_ADDRESS, tradeAmount, ZERO_ADDRESS, data, { from: owner }),
          'VIV1401',
        );
      });
    });

    describe('When the value is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.execute(other, 0, ZERO_ADDRESS, data, { from: owner }),
          'VIV0001',
        );
      });
    });

    describe('When the token is zero address', function () {
      describe('Then value is more than the balance of contract', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner }),
            'VIV0036',
          );
        });
      });

      describe('The value is under daliy limit', function () {
        let newTrade;
        const daylimit = new BN(100);

        beforeEach(async function () {
          newTrade = await VivMultiSign.new(owners, threshold, daylimit);
          await ether(owner, newTrade.address, tradeAmount);
        });

        it('emits a single transact event', async function () {
          expectEvent(
            await newTrade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner }),
            'SingleTransact',
            { owner: owner, value: tradeAmount, to: other, data: data },
          );
        });
      });

      describe('The value is over daliy limit', function () {
        beforeEach(async function () {
          await ether(owner, this.trade.address, tradeAmount);
        });

        describe('Wait confirm', function () {
          it('emits a single transact event', async function () {
            expectEvent(
              await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner }),
              'Confirmation',
              { owner: owner, operation: operation },
            );
          });
        });
      });
    });

    describe('When the token is erc20 address', function () {
      describe('Then value is more than the balance of contract', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.execute(other, tradeAmount, this.erc20.address, data, { from: owner }),
            'VIV0037',
          );
        });
      });

      describe('The value is under daliy limit', function () {
        let newTrade;
        const daylimit = new BN(100);

        beforeEach(async function () {
          newTrade = await VivMultiSign.new(owners, threshold, daylimit);
          await this.erc20.transferInternal(owner, newTrade.address, tradeAmount);
        });

        it('emits a single transact event', async function () {
          expectEvent(
            await newTrade.execute(other, tradeAmount, this.erc20.address, data, { from: owner }),
            'SingleTransact',
            { owner: owner, value: tradeAmount, to: other, data: data },
          );
        });
      });

      describe('The value is over daliy limit', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(owner, this.trade.address, tradeAmount);
        });

        describe('Wait confirm', function () {
          it('emits a single transact event', async function () {
            expectEvent(
              await this.trade.execute(other, tradeAmount, this.erc20.address, data, { from: owner }),
              'Confirmation',
              { owner: owner, operation: operation },
            );
          });
        });
      });
    });
  });

  describe('confirm', function () {
    describe('When the trade is not exists', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.confirm(data, { from: owner }),
          'VIV5005',
        );
      });
    });

    describe('When the sender address is not the owner', function () {
      beforeEach(async function () {
        await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner, value: tradeAmount });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.confirm(data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When the token is zero address', function () {
      beforeEach(async function () {
        await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner, value: tradeAmount });
      });

      describe('When the first confirm', function () {
        it('emit a Confirmation event', async function () {
          expectEvent(
            await this.trade.confirm(data, { from: account1 }),
            'Confirmation',
            { owner: account1, operation: operation },
          );
        });
      });

      describe('When the last confirm', function () {
        beforeEach(async function () {
          await this.trade.confirm(data, { from: account1 });
        });

        it('emit a MultiTransact event', async function () {
          expectEvent(
            await this.trade.confirm(data, { from: account2 }),
            'MultiTransact',
            { owner: account2, operation: operation, value: tradeAmount, to: other, data: data },
          );
        });
      });

      describe('When the repeate confirm', function () {
        beforeEach(async function () {
          await this.trade.confirm(data, { from: account1 });
        });

        it('reverts', async function () {
          // const { receipt } = await this.trade.confirm(data, {from: account1});
          // expect(receipt.logs.filter(({ event }) => event === 'Confirmation').length).to.be.equal(0);
          await expectRevert(
            this.trade.confirm(data, { from: account1 }),
            'VIV1402',
          );
        });
      });
    });

    describe('When the token is erc20 address', function () {
      beforeEach(async function () {
        await this.erc20.transferInternal(owner, this.trade.address, tradeAmount);
        await this.trade.execute(other, tradeAmount, this.erc20.address, data, { from: owner, value: tradeAmount });
      });

      describe('When the first confirm', function () {
        it('emit a Confirmation event', async function () {
          expectEvent(
            await this.trade.confirm(data, { from: account1 }),
            'Confirmation',
            { owner: account1, operation: operation },
          );
        });
      });

      describe('When the last confirm', function () {
        beforeEach(async function () {
          await this.trade.confirm(data, { from: account1 });
        });

        it('emit a MultiTransact event', async function () {
          expectEvent(
            await this.trade.confirm(data, { from: account2 }),
            'MultiTransact',
            { owner: account2, operation: operation, value: tradeAmount, to: other, data: data },
          );
        });
      });

      describe('When the repeate confirm', function () {
        beforeEach(async function () {
          await this.trade.confirm(data, { from: account1 });
        });

        it('reverts', async function () {
          // const { receipt } = await this.trade.confirm(data, {from: account1});
          // expect(receipt.logs.filter(({ event }) => event === 'Confirmation').length).to.be.equal(0);
          await expectRevert(
            this.trade.confirm(data, { from: account1 }),
            'VIV1402',
          );
        });
      });
    });
  });

  describe('revoke', function () {
    describe('When the trade is not exists', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.revoke(data, { from: owner }),
          'VIV5005',
        );
      });
    });

    describe('When the sender address is not the owner', function () {
      beforeEach(async function () {
        await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner, value: tradeAmount });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.revoke(data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When reovke a confirm', function () {
      beforeEach(async function () {
        await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner, value: tradeAmount });
      });

      describe('When not confirm before', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.revoke(data, { from: account1 }),
            'VIV1403',
          );
        });
      });

      describe('When confirm before', function () {
        it('emit a revoke event', async function () {
          expectEvent(
            await this.trade.revoke(data, { from: owner }),
            'Revoke',
            { owner: owner, operation: operation },
          );
        });
      });
    });
  });

  describe('changeOwner', function () {
    describe('When the from address is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.changeOwner(ZERO_ADDRESS, account4, data, { from: owner }),
          'VIV1405',
        );
      });
    });

    describe('When the to address is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.changeOwner(account1, ZERO_ADDRESS, data, { from: owner }),
          'VIV1405',
        );
      });
    });

    describe('When the from address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.changeOwner(other, account4, data, { from: owner }),
          'VIV0005',
        );
      });
    });

    describe('When the to address is the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.changeOwner(account1, account2, data, { from: account4 }),
          'VIV0031',
        );
      });
    });

    describe('When the sender address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.changeOwner(account1, account4, data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When the first invoke', function () {
      it('emit a confirmation event', async function () {
        expectEvent(
          await this.trade.changeOwner(account1, account4, data, { from: owner }),
          'Confirmation',
          { owner: owner, operation: operation },
        );
      });
    });

    describe('When repeate invoke', function () {
      beforeEach(async function () {
        await this.trade.changeOwner(account1, account4, data, { from: owner });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.changeOwner(account1, account4, data, { from: owner }),
          'VIV1402',
        );
      });
    });

    describe('When all confirm', function () {
      beforeEach(async function () {
        await this.trade.changeOwner(account1, account4, data, { from: owner });
        await this.trade.changeOwner(account1, account4, data, { from: account2 });
      });

      it('emit a owner changed event', async function () {
        expectEvent(
          await this.trade.changeOwner(account1, account4, data, { from: account3 }),
          'OwnerChanged',
          { oldOwner: account1, newOwner: account4, operation: operation },
        );
      });
    });
  });

  describe('addOwner', function () {
    const newthreshold = new BN(4);

    describe('When the owner address is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.addOwner(ZERO_ADDRESS, newthreshold, data, { from: owner }),
          'VIV1405',
        );
      });
    });

    describe('When the new owner address is the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.addOwner(account1, newthreshold, data, { from: owner }),
          'VIV0031',
        );
      });
    });

    describe('When the sender address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.addOwner(account4, newthreshold, data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When new threshold is invalid', function () {
      describe('When new threshold is more than the number of members', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.addOwner(account4, 6, data, { from: owner }),
            'VIV0032',
          );
        });
      });

      describe('When new threshold is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.addOwner(account4, 0, data, { from: owner }),
            'VIV0032',
          );
        });
      });
    });

    describe('When the number of members is more than the maximum number of members', function () {
      let newTrade;
      const members = [owner];

      beforeEach(async function () {
        for (let i = 0; i < 9; i++) {
          const account = Wallet.generate();
          members.push(web3.utils.toChecksumAddress(account.getAddressString()));
        }
        newTrade = await VivMultiSign.new(members, threshold, daylimit);
      });

      it('reverts', async function () {
        await expectRevert(
          newTrade.addOwner(account4, newthreshold, data, { from: owner }),
          'VIV1404',
        );
      });
    });

    describe('When the first invoke', function () {
      it('emit a confirmation event', async function () {
        expectEvent(
          await this.trade.addOwner(account4, newthreshold, data, { from: owner }),
          'Confirmation',
          { owner: owner, operation: operation },
        );
      });
    });

    describe('When repeate invoke', function () {
      beforeEach(async function () {
        await this.trade.addOwner(account4, newthreshold, data, { from: owner });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.addOwner(account4, newthreshold, data, { from: owner }),
          'VIV1402',
        );
      });
    });

    describe('When all confirm', function () {
      beforeEach(async function () {
        await this.trade.addOwner(account4, newthreshold, data, { from: owner });
        await this.trade.addOwner(account4, newthreshold, data, { from: account1 });
      });

      it('emit a owner added event', async function () {
        expectEvent(
          await this.trade.addOwner(account4, newthreshold, data, { from: account2 }),
          'OwnerAdded',
          { newOwner: account4, operation: operation },
        );
      });
    });
  });

  describe('removeOwner', function () {
    const newthreshold = new BN(2);

    describe('When the owner address is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.removeOwner(ZERO_ADDRESS, newthreshold, data, { from: owner }),
          'VIV1405',
        );
      });
    });

    describe('When the removed owner address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.removeOwner(account4, newthreshold, data, { from: owner }),
          'VIV0005',
        );
      });
    });

    describe('When the sender address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.removeOwner(account3, newthreshold, data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When new threshold is invalid', function () {
      describe('When new threshold is more than the number of members', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.removeOwner(account3, 4, data, { from: owner }),
            'VIV0032',
          );
        });
      });

      describe('When new threshold is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.removeOwner(account3, 0, data, { from: owner }),
            'VIV0032',
          );
        });
      });
    });

    describe('When the first invoke', function () {
      it('emit a confirmation event', async function () {
        expectEvent(
          await this.trade.removeOwner(account3, newthreshold, data, { from: owner }),
          'Confirmation',
          { owner: owner, operation: operation },
        );
      });
    });

    describe('When repeate invoke', function () {
      beforeEach(async function () {
        await this.trade.removeOwner(account3, newthreshold, data, { from: owner });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.removeOwner(account3, newthreshold, data, { from: owner }),
          'VIV1402',
        );
      });
    });

    describe('When all confirm', function () {
      beforeEach(async function () {
        await this.trade.removeOwner(account3, newthreshold, data, { from: owner });
        await this.trade.removeOwner(account3, newthreshold, data, { from: account1 });
      });

      it('emit a owner removed event', async function () {
        expectEvent(
          await this.trade.removeOwner(account3, newthreshold, data, { from: account2 }),
          'OwnerRemoved',
          { oldOwner: account3, operation: operation },
        );
      });
    });
  });

  describe('changeRequirement', function () {
    const newthreshold = new BN(2);

    describe('When the sender address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.changeRequirement(newthreshold, data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When new threshold is invalid', function () {
      describe('When new threshold is more than the number of members', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.changeRequirement(5, data, { from: owner }),
            'VIV0032',
          );
        });
      });

      describe('When new threshold is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.changeRequirement(0, data, { from: owner }),
            'VIV0032',
          );
        });
      });
    });

    describe('When the first invoke', function () {
      it('emit a confirmation event', async function () {
        expectEvent(
          await this.trade.changeRequirement(newthreshold, data, { from: owner }),
          'Confirmation',
          { owner: owner, operation: operation },
        );
      });
    });

    describe('When repeate invoke', function () {
      beforeEach(async function () {
        await this.trade.changeRequirement(newthreshold, data, { from: owner });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.changeRequirement(newthreshold, data, { from: owner }),
          'VIV1402',
        );
      });
    });

    describe('When all confirm', function () {
      beforeEach(async function () {
        await this.trade.changeRequirement(newthreshold, data, { from: owner });
        await this.trade.changeRequirement(newthreshold, data, { from: account1 });
      });

      it('emit a requirement changed event', async function () {
        // const {receipt} = await this.trade.changeRequirement(newthreshold, data, {from: account2});
        // console.log(receipt);
        expectEvent(
          await this.trade.changeRequirement(newthreshold, data, { from: account2 }),
          'RequirementChanged',
          { newRequirement: newthreshold, operation: operation },
        );
      });
    });
  });

  describe('changeDailyLimit', function () {
    const newLimit = new BN(100);
    describe('When the sender address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.changeDailyLimit(newLimit, data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When the first invoke', function () {
      it('emit a confirmation event', async function () {
        expectEvent(
          await this.trade.changeDailyLimit(newLimit, data, { from: owner }),
          'Confirmation',
          { owner: owner, operation: operation },
        );
      });
    });

    describe('When repeate invoke', function () {
      beforeEach(async function () {
        await this.trade.changeDailyLimit(newLimit, data, { from: owner });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.changeDailyLimit(newLimit, data, { from: owner }),
          'VIV1402',
        );
      });
    });

    describe('When all confirm', function () {
      beforeEach(async function () {
        await this.trade.changeDailyLimit(newLimit, data, { from: owner });
        await this.trade.changeDailyLimit(newLimit, data, { from: account1 });
      });

      it('emit a daily limit changed event', async function () {
        expectEvent(
          await this.trade.changeDailyLimit(newLimit, data, { from: account2 }),
          'DailyLimitChanged',
          { newLimit: newLimit },
        );
      });
    });
  });

  describe('clearSpentToday', function () {
    describe('When the sender address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.clearSpentToday(data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When the first invoke', function () {
      it('emit a confirmation event', async function () {
        expectEvent(
          await this.trade.clearSpentToday(data, { from: owner }),
          'Confirmation',
          { owner: owner, operation: operation },
        );
      });
    });

    describe('When repeate invoke', function () {
      beforeEach(async function () {
        await this.trade.clearSpentToday(data, { from: owner });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.clearSpentToday(data, { from: owner }),
          'VIV1402',
        );
      });
    });

    describe('When all confirm', function () {
      beforeEach(async function () {
        await this.trade.clearSpentToday(data, { from: owner });
        await this.trade.clearSpentToday(data, { from: account1 });
      });

      it('emit a daily limit changed event', async function () {
        expectEvent(
          await this.trade.clearSpentToday(data, { from: account2 }),
          'SpentTodayCleared',
          { spentToday: new BN(0) },
        );
      });
    });
  });

  describe('kill', function () {
    describe('When the to address is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.kill(ZERO_ADDRESS, data, { from: other }),
          'VIV1405',
        );
      });
    });

    describe('When the sender address is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.kill(owner, data, { from: other }),
          'VIV0005',
        );
      });
    });

    describe('When the first invoke', function () {
      it('emit a confirmation event', async function () {
        expectEvent(
          await this.trade.kill(owner, data, { from: owner }),
          'Confirmation',
          { owner: owner, operation: operation },
        );
      });
    });

    describe('When repeate invoke', function () {
      beforeEach(async function () {
        await this.trade.kill(owner, data, { from: owner });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.kill(owner, data, { from: owner }),
          'VIV1402',
        );
      });
    });

    describe('When all confirm', function () {
      beforeEach(async function () {
        await this.trade.kill(owner, data, { from: owner });
        await this.trade.kill(owner, data, { from: account1 });
      });

      it('emit a destruct event', async function () {
        expectEvent(
          await this.trade.kill(owner, data, { from: account2 }),
          'Destruct',
          { to: owner },
        );
      });
    });
  });

  describe('isOwner', function () {
    describe('When the request address is not owner', function () {
      it('return false', async function () {
        expect(await this.trade.isOwner(other)).to.be.equal(false);
      });
    });

    describe('When the request address is not owner', function () {
      it('return true', async function () {
        expect(await this.trade.isOwner(account1)).to.be.equal(true);
      });
    });
  });

  describe('hasConfirmed', function () {
    describe('When the request is not confirmed', function () {
      it('return false', async function () {
        expect(await this.trade.hasConfirmed(owner, data)).to.be.equal(false);
      });
    });

    describe('When the request is confirmed', function () {
      beforeEach(async function () {
        await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner, value: tradeAmount });
      });

      it('return true', async function () {
        expect(await this.trade.hasConfirmed(owner, data)).to.be.equal(true);
      });
    });
  });

  describe('numberOfOwners', function () {
    it('return 4', async function () {
      expect(await this.trade.numberOfOwners()).to.be.bignumber.equal(new BN(4));
    });
  });

  describe('numberOfThreshold', function () {
    it('return 3', async function () {
      expect(await this.trade.numberOfThreshold()).to.be.bignumber.equal(new BN(3));
    });
  });

  describe('getOwners', function () {
    it('return 4', async function () {
      const owners = await this.trade.getOwners();
      expect(owners.length).to.be.equal(4);
    });
  });

  describe('getConfirm', function () {
    const getValue = ({ 0: result, 1: value }) => ({ 0: result.toString(), 1: value.filter(v => v !== ZERO_ADDRESS) });

    describe('When the request is not confirmed', function () {
      it('no confirmed', async function () {
        const actual = getValue(await this.trade.getConfirm(data));
        const expected = getValue({ 0: new BN(0), 1: [] });
        expect(actual).to.deep.equal(expected);
      });
    });

    describe('When the request is confirmed', function () {
      beforeEach(async function () {
        await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner, value: tradeAmount });
      });

      it('one confrmed', async function () {
        const actual = getValue(await this.trade.getConfirm(data));
        const expected = getValue({ 0: new BN(1), 1: ['0x16DAe577216FD28948Df33bb1cE9c8Cf658fC88c'] });
        expect(actual).to.deep.equal(expected);
      });
    });
  });
});
