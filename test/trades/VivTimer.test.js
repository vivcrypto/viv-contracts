const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  send,
  time,
} = require('@openzeppelin/test-helpers');
const assertFailure = require('../helpers/assertFailure');
const { ether } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { getSign } = require('../helpers/sign');

const ERC20Mock = artifacts.require('ERC20Mock');
const VivTimerMock = artifacts.require('VivTimerMock');

contract('VivTimer', function (accounts) {
  const [seller, buyer, guarantor, platform, other] = accounts;

  const [
    sellerPrivateKey,
    buyerPrivateKey,
    guarantorPrivateKey,
    platformPrivateKey,
  ] = [
    '0xbe4cf486849abc347e947fd76f94f7402a4342b209b9680b02335b7f97bd4e19',
    '0xb32f0ec38fc01c0dc9de03e08249ba52094e2194599c0346184a3fe6d4519112',
    '0x25eac5d15ebbe0c980db0ec0806abfa8022901b0b12a0523d438eb0347cd76ef',
    '0x803f890f213d454efb4e556cd0ef055e1ba04be95b28ecb01ec67b1aa2f3119c',
  ];

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(70000);
  const feeRate = new BN(500);
  const tid = '0x303030303030303030303030303030303030';
  const couponId = '0x303030303030303030303030303030303030';
  const arbitrateFee = new BN(0);
  const couponRate = new BN(0);
  const penaltyRate = new BN(100);
  const deposit = new BN(60000);
  const users = [seller, platform, guarantor, ZERO_ADDRESS];

  const value = new BN(10000);
  const values = [10000, 10000, 10000, 10000];
  let times;
  const ONE_DAY_SECONDS = 86400;

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, buyer, tradeAmount);
    this.trade = await VivTimerMock.new();
    this.start = await time.latest();
    times = [];
    times.push(this.start);
    times.push(this.start.addn(ONE_DAY_SECONDS));
    times.push(this.start.addn(ONE_DAY_SECONDS * 2));
    times.push(this.start.addn(ONE_DAY_SECONDS * 3));
  });

  describe('purchase', function () {
    describe('When trade amount is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.purchase(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            0,
            deposit,
            { from: buyer, value: tradeAmount },
          ),
          'VIV0001',
        );
      });
    });

    describe('when the first payment', function () {
      describe('When seller is zero address', function () {
        const users = [ZERO_ADDRESS, platform, guarantor, ZERO_ADDRESS];

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5001',
          );
        });
      });

      describe('When platform is zero address', function () {
        const users = [seller, ZERO_ADDRESS, guarantor, ZERO_ADDRESS];

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5002',
          );
        });
      });

      describe('When guarantor is zero address', function () {
        const users = [seller, platform, ZERO_ADDRESS, ZERO_ADDRESS];

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5003',
          );
        });
      });

      describe('When the size of values is not equal to the size of times.', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              [this.start],
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5408',
          );
        });
      });

      describe('When the size of values is equals to 0', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              [],
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5409',
          );
        });
      });

      describe('When the size of times is equals to 0', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              [],
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5409',
          );
        });
      });
    });

    describe('when not the first payment', function () {
      describe('when the transaction has ended', function () {
        let values;
        let times;

        beforeEach(async function () {
          values = [10000];
          times = [await time.latest()];
          await this.trade.purchase(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            { from: buyer, value: tradeAmount },
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5505',
          );
        });
      });

      describe('when the paid deposit is insufficient', function () {
        let values;
        let times;
        let start;

        beforeEach(async function () {
          start = await time.latest();
          values = [10000, 10000];
          times = [start, start.addn(ONE_DAY_SECONDS)];
          await this.trade.purchaseInternal(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            start,
            { from: buyer, value: tradeAmount },
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchaseInternal(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              0,
              start.addn(ONE_DAY_SECONDS).addn(ONE_DAY_SECONDS),
              { from: buyer, value: tradeAmount },
            ),
            'VIV5501',
          );
        });
      });
    });

    describe('when the token is zero address', function () {
      const newTradeAmount = tradeAmount.subn(1);

      describe('When trade amount does not equals the value', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: newTradeAmount },
            ),
            'VIV0002',
          );
        });
      });

      describe('When buyer does not have enough balance', function () {
        let balance;
        beforeEach(async function () {
          balance = await current(buyer);
          await ether(buyer, other, 1);
        });

        it('reverts', async function () {
          await assertFailure(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: balance },
            ),
          );
        });
      });

      describe('When paid with the deposit', function () {
        describe('When paying for the first time', function () {
          // platform fee from value on first payment
          const feeAmount = value.mul(feeRate).divn(10000);

          it('emits a transfer event', async function () {
            expectEvent(
              await this.trade.purchase(
                users,
                values,
                times,
                tid,
                penaltyRate,
                feeRate,
                value,
                deposit,
                { from: buyer, value: tradeAmount },
              ),
              'Transfer',
              {
                sender: this.trade.address,
                receiver: platform,
                value: feeAmount,
              },
            );
          });
        });

        describe('When pay after the due date', function () {
          let values;
          let times;
          let start;
          const penaltyAmount = deposit.mul(penaltyRate).divn(10000);
          const newTradeAmount = value.add(penaltyAmount);
          // platform fee from deposit and value after the due date
          const feeAmount = newTradeAmount.mul(feeRate).divn(10000);

          beforeEach(async function () {
            start = await time.latest();
            values = [10000, 10000];
            times = [start, start.addn(ONE_DAY_SECONDS)];
            await this.trade.purchaseInternal(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              start,
              { from: buyer, value: tradeAmount },
            );
          });

          it('emits a transfer event', async function () {
            expectEvent(
              await this.trade.purchaseInternal(
                users,
                values,
                times,
                tid,
                penaltyRate,
                feeRate,
                value,
                penaltyAmount,
                start.addn(ONE_DAY_SECONDS).addn(ONE_DAY_SECONDS),
                { from: buyer, value: newTradeAmount },
              ),
              'Transfer',
              {
                sender: this.trade.address,
                receiver: platform,
                value: feeAmount,
              },
            );
          });
        });
      });

      describe('When paid without the deposit', function () {
        let values;
        let times;
        let start;

        // platform fee from value when repayments are made on time
        const feeAmount = value.mul(feeRate).divn(10000);

        beforeEach(async function () {
          start = await time.latest();
          values = [10000, 10000];
          times = [start, start.addn(ONE_DAY_SECONDS)];
          await this.trade.purchaseInternal(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            start,
            { from: buyer, value: tradeAmount },
          );
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.purchaseInternal(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              0,
              start.addn(ONE_DAY_SECONDS),
              { from: buyer, value: value },
            ),
            'Transfer',
            {
              sender: this.trade.address,
              receiver: platform,
              value: feeAmount,
            },
          );
        });
      });
    });

    describe('when the token is erc20 address', function () {
      let users;
      beforeEach(async function () {
        users = [seller, platform, guarantor, this.erc20.address];
      });

      describe('when the buyer does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(buyer, other, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: 0 },
            ),
            'VIV0003',
          );
        });
      });

      describe('when the buyer does not have enough allowance', function () {
        const allowance = tradeAmount.subn(1);

        beforeEach(async function () {
          await this.erc20.approveInternal(
            buyer,
            this.trade.address,
            allowance,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: 0 },
            ),
            'VIV0004',
          );
        });
      });

      describe('When buyer have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(
            buyer,
            this.trade.address,
            tradeAmount,
          );
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: 0 },
            ),
            'Transfer',
            { sender: buyer, receiver: this.trade.address, value: tradeAmount },
          );
        });
      });
    });

    describe('when buyer does not have enough money to pay the debt', function () {
      let values;
      let times;
      let start;
      let penaltyAmount;
      let newValue;

      beforeEach(async function () {
        start = await time.latest();
        values = [10000, 10000];
        times = [start, start.addn(ONE_DAY_SECONDS)];
        await this.trade.purchaseInternal(
          users,
          values,
          times,
          tid,
          penaltyRate,
          feeRate,
          value,
          deposit,
          start,
          { from: buyer, value: tradeAmount },
        );
        penaltyAmount = deposit.mul(penaltyRate).divn(10000);
        newValue = value.subn(1);
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.purchaseInternal(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            newValue,
            penaltyAmount,
            start.addn(ONE_DAY_SECONDS).addn(ONE_DAY_SECONDS),
            { from: buyer, value: newValue.add(penaltyAmount) },
          ),
          'VIV5502',
        );
      });
    });
  });

  describe('withdraw', function () {
    const withdrawAmount = new BN(600);
    describe('when the token is zero address', function () {
      describe('When the parameter is invalid', function () {
        beforeEach(async function () {
          await this.trade.purchase(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the trade is not exists', function () {
          const newTid = '0x303030303030303030303030303030303031';

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                '0x',
                '0x',
                '0x',
                withdrawAmount,
                couponRate,
                arbitrateFee,
                newTid,
                '0x',
                { from: seller, value: 0 },
              ),
              'VIV5005',
            );
          });
        });

        describe('When the withdrawal amount is zero', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                '0x',
                '0x',
                '0x',
                0,
                couponRate,
                arbitrateFee,
                tid,
                '0x',
                { from: seller, value: 0 },
              ),
              'VIV0001',
            );
          });
        });

        describe('When the sender is not buyer or seller', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                '0x',
                '0x',
                '0x',
                withdrawAmount,
                couponRate,
                arbitrateFee,
                tid,
                '0x',
                { from: platform, value: 0 },
              ),
              'VIV5406',
            );
          });
        });

        describe('When this transaction has ended', function () {
          let values;
          let times;
          let newTrade;

          beforeEach(async function () {
            values = [10000];
            times = [await time.latest()];
            newTrade = await VivTimerMock.new();
            await newTrade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            );
          });

          it('reverts', async function () {
            await expectRevert(
              newTrade.withdraw(
                '0x',
                '0x',
                '0x',
                withdrawAmount,
                couponRate,
                arbitrateFee,
                tid,
                '0x',
                { from: seller, value: 0 },
              ),
              'VIV5505',
            );
          });
        });
      });

      describe('When the coupon rate is not zero', function () {
        const couponRate = new BN(500);
        const signedValue1 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [withdrawAmount, 0, tid],
          buyerPrivateKey,
        );
        const signedValue2 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [withdrawAmount, 0, tid],
          sellerPrivateKey,
        );
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await this.trade.purchase(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the coupon is reused', function () {
          beforeEach('Withdraw as normal and use coupons', async function () {
            await this.trade.withdrawInternal(
              signedValue1,
              signedValue2,
              signedValue3,
              withdrawAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
              this.start.addn(ONE_DAY_SECONDS * 2),
              { from: seller, value: 0 },
            );
          });

          it('reverts', async function () {
            // const current = await this.trade.getCurrent(tid);
            // console.log(current.toString());
            await expectRevert(
              this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: seller, value: 0 },
              ),
              'VIV0006',
            );
          });
        });

        describe('When the signedValue3 is wrong', function () {
          // Sign with a non-platform private key
          const signedValue3 = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            buyerPrivateKey,
          );

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                { from: seller, value: 0 },
              ),
              'VIV0007',
            );
          });
        });

        describe('when the platform fee is not zero', function () {
          const availableAmount = withdrawAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const couponAmount = feeAmount.mul(couponRate).divn(10000);
          const finalFeeAmount = feeAmount.sub(couponAmount);

          it('The platform get the service fee after using the coupon', async function () {
            const platformBalance = await current(platform);
            const newBalance = platformBalance.add(finalFeeAmount);
            await this.trade.withdrawInternal(
              signedValue1,
              signedValue2,
              signedValue3,
              withdrawAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
              this.start.addn(ONE_DAY_SECONDS * 2),
              { from: seller, value: 0 },
            );
            expect(await current(platform)).to.be.bignumber.equal(newBalance);
          });
        });

        describe('when the platform fee is zero', function () {
          // use 100% coupon
          const couponRate = new BN(10000);
          const signedValue3 = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            platformPrivateKey,
          );

          it('The balance of platform is not change', async function () {
            const platformBalance = await current(platform);
            await this.trade.withdrawInternal(
              signedValue1,
              signedValue2,
              signedValue3,
              withdrawAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
              this.start.addn(ONE_DAY_SECONDS * 2),
              { from: seller, value: 0 },
            );
            expect(await current(platform)).to.be.bignumber.equal(
              platformBalance,
            );
          });
        });
      });

      describe('When the coupon rate is zero', function () {
        const signedValue1 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [withdrawAmount, 0, tid],
          buyerPrivateKey,
        );
        const signedValue2 = getSign(
          ['uint256', 'uint256', 'bytes'],
          [withdrawAmount, 0, tid],
          sellerPrivateKey,
        );
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        const availableAmount = withdrawAmount.sub(arbitrateFee);
        const feeAmount = availableAmount.mul(feeRate).divn(10000);

        beforeEach('purchase', async function () {
          await this.trade.purchase(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            { from: buyer, value: tradeAmount },
          );
        });

        it('The platform get the full service fee', async function () {
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(feeAmount);
          await this.trade.withdrawInternal(
            signedValue1,
            signedValue2,
            signedValue3,
            withdrawAmount,
            couponRate,
            arbitrateFee,
            tid,
            couponId,
            this.start.addn(ONE_DAY_SECONDS * 2),
            { from: seller, value: 0 },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });

      describe('When arbitrate fee is zero', function () {
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        describe('When the signedValue1 is wrong', function () {
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue1 = getSign(['bytes'], [tid], platformPrivateKey);
          const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);

          beforeEach('purchase', async function () {
            await this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            );
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                0,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the signedValue2 is wrong', function () {
          const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue2 = getSign(['bytes'], [tid], platformPrivateKey);

          beforeEach('purchase', async function () {
            await this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            );
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                0,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the buyer pays, the seller withdraws', function () {
          describe('When the withdrawal amount exceeds the amount that can be withdrawn', function () {
            const newTradeAmount = withdrawAmount.addn(1);
            const signedValue1 = getSign(
              ['uint256', 'uint256', 'bytes'],
              [newTradeAmount, 0, tid],
              buyerPrivateKey,
            );
            const signedValue2 = getSign(
              ['uint256', 'uint256', 'bytes'],
              [newTradeAmount, 0, tid],
              sellerPrivateKey,
            );
            const signedValue3 = getSign(
              ['uint256', 'bytes', 'bytes'],
              [couponRate, couponId, tid],
              platformPrivateKey,
            );

            beforeEach('purchase', async function () {
              await this.trade.purchase(
                users,
                values,
                times,
                tid,
                penaltyRate,
                feeRate,
                value,
                deposit,
                { from: buyer, value: tradeAmount },
              );
            });

            it('reverts', async function () {
              await expectRevert(
                this.trade.withdrawInternal(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  newTradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  this.start.addn(ONE_DAY_SECONDS * 2),
                  { from: seller, value: 0 },
                ),
                'VIV5405',
              );
            });
          });

          describe('When unlocking a period and withdrawing', function () {
            describe('When the seller withdraws normally', function () {
              const signedValue1 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [withdrawAmount, 0, tid],
                buyerPrivateKey,
              );
              const signedValue2 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [withdrawAmount, 0, tid],
                sellerPrivateKey,
              );

              const availableAmount = withdrawAmount.sub(arbitrateFee);
              const feeAmount = availableAmount.mul(feeRate).divn(10000);
              const sellerRecevieAmount = availableAmount.sub(feeAmount);

              beforeEach('purchase', async function () {
                await this.trade.purchase(
                  users,
                  values,
                  times,
                  tid,
                  penaltyRate,
                  feeRate,
                  value,
                  deposit,
                  { from: buyer, value: tradeAmount },
                );
              });

              it('Normal withdraw', async function () {
                expectEvent(
                  await this.trade.withdrawInternal(
                    signedValue1,
                    signedValue2,
                    signedValue3,
                    withdrawAmount,
                    couponRate,
                    arbitrateFee,
                    tid,
                    couponId,
                    this.start.addn(ONE_DAY_SECONDS * 2),
                    { from: seller, value: 0 },
                  ),
                  'Transfer',
                  {
                    sender: this.trade.address,
                    receiver: seller,
                    value: sellerRecevieAmount,
                  },
                );
              });
            });

            describe('When withdrawing multiple times', function () {
              const newTradeAmount = withdrawAmount.subn(300);
              const feeAmount = newTradeAmount.mul(feeRate).divn(10000);
              const signedValue1 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [newTradeAmount, 0, tid],
                buyerPrivateKey,
              );
              const signedValue2 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [newTradeAmount, 0, tid],
                sellerPrivateKey,
              );
              const signedValue3 = getSign(
                ['uint256', 'bytes', 'bytes'],
                [couponRate, couponId, tid],
                platformPrivateKey,
              );

              beforeEach('purchase', async function () {
                await this.trade.purchase(
                  users,
                  values,
                  times,
                  tid,
                  penaltyRate,
                  feeRate,
                  value,
                  deposit,
                  { from: buyer, value: tradeAmount },
                );
              });

              it('When the seller withdraws multiple times, the platform get multiple service fees', async function () {
                const platformBalance = await current(platform);
                let newBalance = platformBalance.add(feeAmount);
                await this.trade.withdrawInternal(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  newTradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  this.start.addn(ONE_DAY_SECONDS * 2),
                  { from: seller, value: 0 },
                );
                expect(await current(platform)).to.be.bignumber.equal(
                  newBalance,
                );

                newBalance = newBalance.add(feeAmount);
                await this.trade.withdrawInternal(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  newTradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  this.start.addn(ONE_DAY_SECONDS * 2),
                  { from: seller, value: 0 },
                );
                expect(await current(platform)).to.be.bignumber.equal(
                  newBalance,
                );
              });
            });
          });
        });

        describe('When the buyer applies for a refund and the seller agrees, the buyer withdraws', function () {
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, 0, tid],
            buyerPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, 0, tid],
            sellerPrivateKey,
          );
          const signedValue3 = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            platformPrivateKey,
          );

          beforeEach('purchase', async function () {
            await this.trade.purchase(
              users,
              values,
              times,
              tid,
              penaltyRate,
              feeRate,
              value,
              deposit,
              { from: buyer, value: tradeAmount },
            );
          });

          describe('When the buyer withdraws the remaining amount', function () {
            describe('When the withdrawal amount exceeds the amount that can be withdrawn', function () {
              const withdrawAmount = tradeAmount.addn(1);
              const signedValue1 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [withdrawAmount, 0, tid],
                buyerPrivateKey,
              );
              const signedValue2 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [withdrawAmount, 0, tid],
                sellerPrivateKey,
              );

              it('reverts', async function () {
                await expectRevert(
                  this.trade.withdrawInternal(
                    signedValue1,
                    signedValue2,
                    signedValue3,
                    withdrawAmount,
                    couponRate,
                    arbitrateFee,
                    tid,
                    couponId,
                    this.start.addn(ONE_DAY_SECONDS * 2),
                    { from: buyer, value: 0 },
                  ),
                  'VIV5405',
                );
              });
            });

            describe('When the seller has not withdrawn', function () {
              const withdrawAmount = deposit;
              const signedValue1 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [withdrawAmount, 0, tid],
                buyerPrivateKey,
              );
              const signedValue2 = getSign(
                ['uint256', 'uint256', 'bytes'],
                [withdrawAmount, 0, tid],
                sellerPrivateKey,
              );

              it('When the buyer withdraws, the platform get the service fee', async function () {
                const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
                const platformBalance = await current(platform);
                const newBalance = platformBalance.add(feeAmount);
                await this.trade.withdrawInternal(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  withdrawAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  this.start.addn(ONE_DAY_SECONDS * 2),
                  { from: buyer, value: 0 },
                );
                expect(await current(platform)).to.be.bignumber.equal(
                  newBalance,
                );
              });
            });

            describe('When the seller has already withdrawn', function () {
              beforeEach(
                'The seller withdraws and the buyer applies for a refund',
                async function () {
                  await this.trade.withdrawInternal(
                    signedValue1,
                    signedValue2,
                    signedValue3,
                    withdrawAmount,
                    couponRate,
                    arbitrateFee,
                    tid,
                    couponId,
                    this.start.addn(ONE_DAY_SECONDS * 2),
                    { from: seller, value: 0 },
                  );
                },
              );

              it('When the buyer withdraws, the platform get the service fee', async function () {
                const remainderAmount = deposit.sub(withdrawAmount);
                const feeAmount = remainderAmount.mul(feeRate).divn(10000);
                const platformBalance = await current(platform);
                const newBalance = platformBalance.add(feeAmount);
                const signedValue1 = getSign(
                  ['uint256', 'uint256', 'bytes'],
                  [remainderAmount, 0, tid],
                  buyerPrivateKey,
                );
                const signedValue2 = getSign(
                  ['uint256', 'uint256', 'bytes'],
                  [remainderAmount, 0, tid],
                  sellerPrivateKey,
                );
                await this.trade.withdrawInternal(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  remainderAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  this.start.addn(ONE_DAY_SECONDS * 2),
                  { from: buyer, value: 0 },
                );
                expect(await current(platform)).to.be.bignumber.equal(
                  newBalance,
                );
              });
            });
          });
        });
      });

      describe('When arbitrate fee is not zero', function () {
        const arbitrateFee = new BN(20000);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await this.trade.purchase(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the signedValue1 is wrong', function () {
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            platformPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            sellerPrivateKey,
          );

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the signedValue2 is wrong', function () {
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            buyerPrivateKey,
          );
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            platformPrivateKey,
          );
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the withdrawal amount exceeds the amount that can be withdrawn', function () {
          const newTradeAmount = tradeAmount.addn(1);
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [newTradeAmount, arbitrateFee, tid],
            guarantorPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [newTradeAmount, arbitrateFee, tid],
            sellerPrivateKey,
          );

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                newTradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: seller, value: 0 },
              ),
              'VIV5405',
            );
          });
        });

        describe('When supporting the seller', function () {
          const withdrawAmount = deposit;
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, arbitrateFee, tid],
            guarantorPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, arbitrateFee, tid],
            sellerPrivateKey,
          );

          const availableAmount = withdrawAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const recevieAmount = availableAmount.sub(feeAmount);

          it('withdraw', async function () {
            expectEvent(
              await this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: seller, value: 0 },
              ),
              'Transfer',
              {
                sender: this.trade.address,
                receiver: seller,
                value: recevieAmount,
              },
            );
          });
        });

        describe('When supporting the buyer', function () {
          const withdrawAmount = deposit;
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, arbitrateFee, tid],
            guarantorPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, arbitrateFee, tid],
            buyerPrivateKey,
          );

          const availableAmount = withdrawAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const recevieAmount = availableAmount.sub(feeAmount);

          it('withdraw', async function () {
            expectEvent(
              await this.trade.withdrawInternal(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                this.start.addn(ONE_DAY_SECONDS * 2),
                { from: buyer, value: 0 },
              ),
              'Transfer',
              {
                sender: this.trade.address,
                receiver: buyer,
                value: recevieAmount,
              },
            );
          });
        });

        describe('When supporting the seller and the buyer', function () {
          const withdrawAmount = deposit.divn(2);
          const arbitrateFee = new BN(10000);

          describe('When the seller withdraw', function () {
            const signedValue1 = getSign(
              ['uint256', 'uint256', 'bytes'],
              [withdrawAmount, arbitrateFee, tid],
              guarantorPrivateKey,
            );
            const signedValue2 = getSign(
              ['uint256', 'uint256', 'bytes'],
              [withdrawAmount, arbitrateFee, tid],
              sellerPrivateKey,
            );

            const availableAmount = withdrawAmount.sub(arbitrateFee);
            const feeAmount = availableAmount.mul(feeRate).divn(10000);
            const recevieAmount = availableAmount.sub(feeAmount);

            it('withdraw', async function () {
              expectEvent(
                await this.trade.withdrawInternal(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  withdrawAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  this.start.addn(ONE_DAY_SECONDS * 2),
                  { from: seller, value: 0 },
                ),
                'Transfer',
                {
                  sender: this.trade.address,
                  receiver: seller,
                  value: recevieAmount,
                },
              );
            });
          });

          describe('When the buyer withdraw', function () {
            const signedValue1 = getSign(
              ['uint256', 'uint256', 'bytes'],
              [withdrawAmount, arbitrateFee, tid],
              guarantorPrivateKey,
            );
            const signedValue2 = getSign(
              ['uint256', 'uint256', 'bytes'],
              [withdrawAmount, arbitrateFee, tid],
              buyerPrivateKey,
            );

            const availableAmount = withdrawAmount.sub(arbitrateFee);
            const feeAmount = availableAmount.mul(feeRate).divn(10000);
            const recevieAmount = availableAmount.sub(feeAmount);

            it('withdraw', async function () {
              expectEvent(
                await this.trade.withdrawInternal(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  withdrawAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  this.start.addn(ONE_DAY_SECONDS * 2),
                  { from: buyer, value: 0 },
                ),
                'Transfer',
                {
                  sender: this.trade.address,
                  receiver: buyer,
                  value: recevieAmount,
                },
              );
            });
          });
        });
      });

      describe('when all deposit is withdrawn it means the transaction ends', function () {
        const penaltyRate = new BN(10000);

        beforeEach(async function () {
          await this.trade.purchase(
            users,
            values,
            times,
            tid,
            penaltyRate,
            feeRate,
            value,
            deposit,
            { from: buyer, value: tradeAmount },
          );
        });

        it('return current', async function () {
          const withdrawAmount = deposit;
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, 0, tid],
            buyerPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [withdrawAmount, 0, tid],
            sellerPrivateKey,
          );
          const signedValue3 = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            platformPrivateKey,
          );

          await this.trade.withdrawInternal(
            signedValue1,
            signedValue2,
            signedValue3,
            withdrawAmount,
            couponRate,
            arbitrateFee,
            tid,
            couponId,
            this.start.addn(ONE_DAY_SECONDS * 2),
            { from: seller, value: 0 },
          );
          expect(await this.trade.getCurrent(tid)).to.be.bignumber.equal(
            new BN(values.length),
          );
        });
      });
    });

    describe('When the token is erc20 address', function () {
      const signedValue1 = getSign(
        ['uint256', 'uint256', 'bytes'],
        [withdrawAmount, 0, tid],
        buyerPrivateKey,
      );
      const signedValue2 = getSign(
        ['uint256', 'uint256', 'bytes'],
        [withdrawAmount, 0, tid],
        sellerPrivateKey,
      );
      const signedValue3 = getSign(
        ['uint256', 'bytes', 'bytes'],
        [couponRate, couponId, tid],
        platformPrivateKey,
      );
      let users;

      beforeEach(async function () {
        users = [seller, platform, guarantor, this.erc20.address];
        await this.erc20.approveInternal(
          buyer,
          this.trade.address,
          tradeAmount,
        );
        await this.trade.purchase(
          users,
          values,
          times,
          tid,
          penaltyRate,
          feeRate,
          value,
          deposit,
          { from: buyer, value: 0 },
        );
      });

      it('Withdraw ERC20', async function () {
        const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
        const platformBalance = await this.erc20.balanceOf(platform);
        const newBalance = platformBalance.add(feeAmount);
        await this.trade.withdrawInternal(
          signedValue1,
          signedValue2,
          signedValue3,
          withdrawAmount,
          couponRate,
          arbitrateFee,
          tid,
          couponId,
          this.start.addn(ONE_DAY_SECONDS * 2),
          { from: seller, value: 0 },
        );
        expect(await this.erc20.balanceOf(platform)).to.be.bignumber.equal(
          newBalance,
        );
      });
    });
  });

  describe('refundDeposit', function () {
    describe('When the parameter is invalid', function () {
      beforeEach(async function () {
        await this.trade.purchase(
          users,
          values,
          times,
          tid,
          penaltyRate,
          feeRate,
          value,
          deposit,
          { from: buyer, value: tradeAmount },
        );
      });

      describe('When the trade is not exists', function () {
        const newTid = '0x303030303030303030303030303030303031';

        it('reverts', async function () {
          await expectRevert(
            this.trade.refundDeposit(newTid, { from: buyer }),
            'VIV5005',
          );
        });
      });

      describe('When the sender is not buyer ', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.refundDeposit(tid, { from: platform }),
            'VIV0021',
          );
        });
      });
    });

    describe('When this transaction is not end', function () {
      beforeEach(async function () {
        await this.trade.purchase(
          users,
          values,
          times,
          tid,
          penaltyRate,
          feeRate,
          value,
          deposit,
          { from: buyer, value: tradeAmount },
        );
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.refundDeposit(tid, { from: buyer }),
          'VIV5507',
        );
      });
    });

    describe('When the cashable amount is 0 ', function () {
      const penaltyRate = new BN(10000);
      const withdrawAmount = deposit;
      const signedValue1 = getSign(
        ['uint256', 'uint256', 'bytes'],
        [withdrawAmount, 0, tid],
        buyerPrivateKey,
      );
      const signedValue2 = getSign(
        ['uint256', 'uint256', 'bytes'],
        [withdrawAmount, 0, tid],
        sellerPrivateKey,
      );
      const signedValue3 = getSign(
        ['uint256', 'bytes', 'bytes'],
        [couponRate, couponId, tid],
        platformPrivateKey,
      );

      beforeEach(async function () {
        await this.trade.purchase(
          users,
          values,
          times,
          tid,
          penaltyRate,
          feeRate,
          value,
          deposit,
          { from: buyer, value: tradeAmount },
        );
        await this.trade.withdrawInternal(
          signedValue1,
          signedValue2,
          signedValue3,
          withdrawAmount,
          couponRate,
          arbitrateFee,
          tid,
          couponId,
          this.start.addn(ONE_DAY_SECONDS * 2),
          { from: seller, value: 0 },
        );
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.refundDepositInternal(
            tid,
            this.start.addn(ONE_DAY_SECONDS * 2),
            { from: buyer },
          ),
          'VIV5506',
        );
      });
    });

    describe('When refund all deposits', function () {
      const tradeAmount = new BN(100000);

      beforeEach(async function () {
        await this.trade.purchase(
          users,
          values,
          times,
          tid,
          penaltyRate,
          feeRate,
          tradeAmount.sub(deposit),
          deposit,
          { from: buyer, value: tradeAmount },
        );
      });

      it('emit a transfer event', async function () {
        expectEvent(
          await this.trade.refundDeposit(tid, { from: buyer }),
          'Transfer',
          { sender: this.trade.address, receiver: buyer, value: deposit },
        );
      });
    });
  });

  describe('getPayAmount', function () {
    const getValue = ({ 0: result0, 1: result1 }) => ({
      0: result0.toString(),
      1: result1.toString(),
    });

    beforeEach(async function () {
      await this.trade.purchase(
        users,
        values,
        times,
        tid,
        penaltyRate,
        feeRate,
        value,
        deposit,
        { from: buyer, value: tradeAmount },
      );
    });

    it('return payed Amount', async function () {
      const actual = getValue(await this.trade.getPayAmount(tid));
      const expected = getValue({ 0: new BN(30000), 1: new BN(10000) });
      expect(actual).to.be.deep.equal(expected);
    });
  });

  describe('getDeposit', function () {
    const getValue = ({
      0: result0,
      1: result1,
      2: result2,
      3: result3,
      4: result4,
    }) => ({
      0: result0.toString(),
      1: result1.toString(),
      2: result2.toString(),
      3: result3.toString(),
      4: result4.toString(),
    });

    beforeEach(async function () {
      await this.trade.purchase(
        users,
        values,
        times,
        tid,
        penaltyRate,
        feeRate,
        value,
        deposit,
        { from: buyer, value: tradeAmount },
      );
    });

    it('return deposit', async function () {
      const actual = getValue(await this.trade.getDeposit(tid));
      const expected = getValue({
        0: new BN(60000),
        1: new BN(0),
        2: new BN(0),
        3: new BN(0),
        4: new BN(0),
      });
      expect(actual).to.be.deep.equal(expected);
    });
  });

  describe('getCurrent', function () {
    beforeEach(async function () {
      await this.trade.purchase(
        users,
        values,
        times,
        tid,
        penaltyRate,
        feeRate,
        value,
        deposit,
        { from: buyer, value: tradeAmount },
      );
    });

    it('return current', async function () {
      expect(await this.trade.getCurrent(tid)).to.be.bignumber.equal(new BN(1));
    });
  });

  describe('getWithdrawAmount', function () {
    const getValue = ({ 0: result0, 1: result1, 2: result2 }) => ({
      0: result0.toString(),
      1: result1.toString(),
      2: result2.toString(),
    });

    beforeEach(async function () {
      await this.trade.purchase(
        users,
        values,
        times,
        tid,
        penaltyRate,
        feeRate,
        value,
        deposit,
        { from: buyer, value: tradeAmount },
      );
    });

    it('return withdraw amount', async function () {
      const actual = getValue(await this.trade.getWithdrawAmount(tid));
      const expected = getValue({ 0: new BN(0), 1: new BN(0), 2: new BN(0) });
      expect(actual).to.be.deep.equal(expected);
    });
  });
});
