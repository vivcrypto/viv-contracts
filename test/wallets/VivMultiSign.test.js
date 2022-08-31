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
  const data = '0x303030303030303030303030303030303030';
  const operation = getHashString(['bytes'], [data]);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, owner, tradeAmount);
    this.trade = await VivMultiSign.new(owners, threshold);
  });

  describe('constructor', function () {
    describe('The threshold is more than the size of owners', function () {
      const owners = [owner];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold),
          'VIV0033',
        );
      });
    });

    describe('The owners contains zero address', function () {
      const owners = [owner, ZERO_ADDRESS];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold),
          'VIV0034',
        );
      });
    });

    describe('The owners contains repeate address', function () {
      const owners = [owner, owner];
      const threshold = new BN(2);
      it('reverts', async function () {
        await expectRevert(
          VivMultiSign.new(owners, threshold),
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

      describe('The normal transaction', function () {
        beforeEach(async function () {
          await ether(owner, this.trade.address, tradeAmount);
        });

        describe('Wait confirm', function () {
          it('emits a single transact event', async function () {
            expectEvent(
              await this.trade.execute(other, tradeAmount, ZERO_ADDRESS, data, { from: owner }),
              'Confirmation',
              { member: owner, operation: operation },
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

      describe('The normal transaction', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(owner, this.trade.address, tradeAmount);
        });

        describe('Wait confirm', function () {
          it('emits a single transact event', async function () {
            expectEvent(
              await this.trade.execute(other, tradeAmount, this.erc20.address, data, { from: owner }),
              'Confirmation',
              { member: owner, operation: operation },
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
            { member: account1, operation: operation },
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
            { member: account2, operation: operation, value: tradeAmount, to: other, data: data },
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
            { member: account1, operation: operation },
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
            { member: account2, operation: operation, value: tradeAmount, to: other, data: data },
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


  describe('isMember', function () {
    describe('When the request address is not member', function () {
      it('return false', async function () {
        expect(await this.trade.isMember(other)).to.be.equal(false);
      });
    });

    describe('When the request address is not member', function () {
      it('return true', async function () {
        expect(await this.trade.isMember(account1)).to.be.equal(true);
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

  describe('numberOfMembers', function () {
    it('return 4', async function () {
      expect(await this.trade.numberOfMembers()).to.be.bignumber.equal(new BN(4));
    });
  });

  describe('numberOfThreshold', function () {
    it('return 3', async function () {
      expect(await this.trade.numberOfThreshold()).to.be.bignumber.equal(new BN(3));
    });
  });

  describe('getMembers', function () {
    it('return 4', async function () {
      const owners = await this.trade.getMembers();
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
