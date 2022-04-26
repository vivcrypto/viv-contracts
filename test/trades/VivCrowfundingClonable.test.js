const { BN, constants, expectRevert, balance, send } = require('@openzeppelin/test-helpers');
const { ether } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { getSign } = require('../helpers/sign');

const ERC20Mock = artifacts.require('ERC20Mock');
const VivCrowfundingClonable = artifacts.require('VivCrowfundingClonable');

contract('VivCrowfundingClonable', function (accounts) {
  const [ owner, buyer, platform ] = accounts;

  const [ ownerPrivateKey, buyerPrivateKey, platformPrivateKey] = [
    '0xbe4cf486849abc347e947fd76f94f7402a4342b209b9680b02335b7f97bd4e19',
    '0xb32f0ec38fc01c0dc9de03e08249ba52094e2194599c0346184a3fe6d4519112',
    '0x25eac5d15ebbe0c980db0ec0806abfa8022901b0b12a0523d438eb0347cd76ef'];

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(10000);
  const feeRate = new BN(500);
  const tid = '0x303030303030303030303030303030303030';
  const couponId = '0x303030303030303030303030303030303030';
  const couponRate = new BN(0);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, buyer, tradeAmount);
    this.trade = await VivCrowfundingClonable.new();
  });

  describe('init', function () {
    describe('When the owner address is zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.init(ZERO_ADDRESS, platform, feeRate, ZERO_ADDRESS),
          'VIV5703',
        );
      });
    });

    describe('When the platform address is zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.init(owner, ZERO_ADDRESS, feeRate, ZERO_ADDRESS),
          'VIV5704',
        );
      });
    });

    describe('When initialized multiple times', function () {
      beforeEach(async function () {
        await this.trade.init(owner, platform, feeRate, ZERO_ADDRESS);
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.init(owner, platform, feeRate, ZERO_ADDRESS),
          'VIV5702',
        );
      });
    });

    describe('When initialized success', function () {
      const getValue = ({
        0: platform,
        1: owner,
        2: feeRate,
        3: token,
        4: balance,
      }) => ({
        0: platform,
        1: owner,
        2: feeRate.toString(),
        3: token,
        4: balance.toString(),
      });

      it('initialized', async function () {
        await this.trade.init(owner, platform, feeRate, ZERO_ADDRESS);
        const actual = getValue(await this.trade.getCrowfunding());
        const expected = getValue({ 0: platform, 1: owner, 2: feeRate, 3: ZERO_ADDRESS, 4: new BN(0) });
        expect(actual).to.be.deep.equal(expected);
      });
    });
  });

  describe('withdraw', function () {
    const feeAmount = tradeAmount.mul(feeRate).divn(10000);
    const signedValue1 = getSign(['uint256', 'uint256', 'bytes'], [tradeAmount, feeAmount, tid], platformPrivateKey);
    const signedValue2 = getSign(['uint256', 'uint256', 'bytes'], [tradeAmount, feeAmount, tid], ownerPrivateKey);
    const signedValue3 = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);

    beforeEach(async function () {
      await this.trade.init(owner, platform, feeRate, ZERO_ADDRESS);
      await ether(buyer, this.trade.address, tradeAmount);
    });

    describe('When the value is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.withdraw(signedValue1, signedValue2, signedValue3, 0, couponRate, tid, couponId, { from: owner }),
          'VIV0001',
        );
      });
    });

    describe('When transactions are repeated', function () {
      beforeEach('Withdraw as normal and use coupons', async function () {
        await this.trade.withdraw(
          signedValue1,
          signedValue2,
          signedValue3,
          tradeAmount,
          couponRate,
          tid,
          couponId,
          { from: owner },
        );
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            tradeAmount,
            couponRate,
            tid,
            couponId,
            { from: owner },
          ),
          'VIV0060',
        );
      });
    });

    describe('When the sender is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            tradeAmount,
            couponRate,
            tid,
            couponId,
            { from: buyer },
          ),
          'VIV5701',
        );
      });
    });

    describe('When the coupon rate is not zero', function () {
      const couponRate = new BN(500);
      const couponAmount = feeAmount.mul(couponRate).divn(10000);
      const finalFeeAmount = feeAmount.sub(couponAmount);
      const signedValue1 = getSign(
        ['uint256', 'uint256', 'bytes'],
        [tradeAmount, finalFeeAmount, tid],
        platformPrivateKey,
      );
      const signedValue2 = getSign(
        ['uint256', 'uint256', 'bytes'],
        [tradeAmount, finalFeeAmount, tid],
        ownerPrivateKey,
      );
      const signedValue3 = getSign(
        ['uint256', 'bytes', 'bytes'],
        [couponRate, couponId, tid],
        platformPrivateKey,
      );

      describe('When the coupon is reused', function () {
        const newTid = '0x303030303030303030303030303030303031';

        beforeEach('Withdraw as normal and use coupons', async function () {
          await this.trade.withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            tradeAmount,
            couponRate,
            tid,
            couponId,
            { from: owner },
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              newTid,
              couponId,
              { from: owner },
            ),
            'VIV0006',
          );
        });
      });

      describe('When the signedValue3 is wrong', function () {
        // Sign with a non-platform private key
        const signedValue3 = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], buyerPrivateKey);

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              tid,
              couponId,
              { from: owner },
            ),
            'VIV0007',
          );
        });
      });

      describe('When the signedValue1 is wrong', function () {
        //  Not the signature of any one of owner and platform.
        const signedValue1 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [tradeAmount, finalFeeAmount, tid],
          buyerPrivateKey,
        );

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              tid,
              couponId,
              { from: owner },
            ),
            'VIV5006',
          );
        });
      });

      describe('When the signedValue2 is wrong', function () {
        //  Not the signature of any one of owner and platform.
        const signedValue2 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [tradeAmount, finalFeeAmount, tid],
          buyerPrivateKey,
        );

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              tid,
              couponId,
              { from: owner },
            ),
            'VIV5006',
          );
        });
      });

      describe('when the platform fee is not zero', function () {
        it('The platform get the service fee after using the coupon', async function () {
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(finalFeeAmount);
          await this.trade.withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            tradeAmount,
            couponRate,
            tid,
            couponId,
            { from: owner },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });

      describe('when the platform fee is zero', function () {
        // use 100% coupon
        const couponRate = new BN(10000);
        const couponAmount = feeAmount.mul(couponRate).divn(10000);
        const finalFeeAmount = feeAmount.sub(couponAmount);

        const signedValue1 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [tradeAmount, finalFeeAmount, tid],
          platformPrivateKey,
        );
        const signedValue2 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [tradeAmount, finalFeeAmount, tid],
          ownerPrivateKey,
        );
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        it('The balance of platform is not change', async function () {
          const platformBalance = await current(platform);
          await this.trade.withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            tradeAmount,
            couponRate,
            tid,
            couponId,
            { from: owner },
          );
          expect(await current(platform)).to.be.bignumber.equal(platformBalance);
        });
      });
    });

    describe('When the coupon rate is zero', function () {
      const signedValue3 = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);

      it('The platform get the full service fee', async function () {
        const platformBalance = await current(platform);
        const newBalance = platformBalance.add(feeAmount);
        await this.trade.withdraw(
          signedValue1,
          signedValue2,
          signedValue3,
          tradeAmount,
          couponRate,
          tid,
          couponId,
          { from: owner },
        );
        expect(await current(platform)).to.be.bignumber.equal(newBalance);
      });
    });

    describe('When the contract balance is insufficient', function () {
      beforeEach('Withdraw as normal and use coupons', async function () {
        await this.trade.withdraw(
          signedValue1,
          signedValue2,
          signedValue3,
          tradeAmount,
          couponRate,
          tid,
          couponId,
          { from: owner },
        );
      });

      describe('When the contract balance is insufficient', function () {
        const newTid = '0x303030303030303030303030303030303031';
        const signedValue1 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [tradeAmount, feeAmount, newTid],
          platformPrivateKey,
        );
        const signedValue2 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [tradeAmount, feeAmount, newTid],
          ownerPrivateKey,
        );
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, newTid],
          platformPrivateKey,
        );

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              newTid,
              couponId,
              { from: owner },
            ),
            'VIV5007',
          );
        });
      });
    });
  });

  describe('getCrowfunding', function () {
    beforeEach(async function () {
      await this.trade.init(owner, platform, feeRate, ZERO_ADDRESS);
      await ether(buyer, this.trade.address, tradeAmount);
    });

    it('return target', async function () {
      const getValue = ({
        0: platform,
        1: owner,
        2: feeRate,
        3: token,
        4: balance,
      }) => ({
        0: platform,
        1: owner,
        2: feeRate.toString(),
        3: token,
        4: balance.toString(),
      });
      const actual = getValue(await this.trade.getCrowfunding());
      const expected = getValue({ 0: platform, 1: owner, 2: feeRate, 3: ZERO_ADDRESS, 4: tradeAmount });

      expect(actual).to.be.deep.equal(expected);
    });
  });
});
