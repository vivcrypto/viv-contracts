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
const VivInstallment = artifacts.require('VivInstallment');

contract('VivInstallment', function (accounts) {
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

  const tradeAmount = new BN(100000);
  const feeRate = new BN(500);
  const tid = '0x303030303030303030303030303030303030';
  const couponId = '0x303030303030303030303030303030303030';
  const arbitrateFee = new BN(0);
  const couponRate = new BN(0);
  const values = [70000, 10000, 10000, 10000];
  let times;

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, buyer, tradeAmount);
    this.trade = await VivInstallment.new();
    this.start = await time.latest();
    times = [];
    times.push(this.start);
    times.push(this.start.addn(10));
    times.push(this.start.addn(20));
    times.push(this.start.addn(30));
  });

  describe('purchase', function () {
    describe('When the parameter is invalid', function () {
      describe('When seller is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              ZERO_ADDRESS,
              platform,
              guarantor,
              values,
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5001',
          );
        });
      });

      describe('When platform is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              seller,
              ZERO_ADDRESS,
              guarantor,
              values,
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5002',
          );
        });
      });

      describe('When guarantor is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              seller,
              platform,
              ZERO_ADDRESS,
              values,
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5003',
          );
        });
      });

      describe('When trade amount is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              seller,
              platform,
              guarantor,
              [0, 0, 0, 0],
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            ),
            'VIV0001',
          );
        });
      });

      describe('When the size of values is not equal to the size of times.', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              seller,
              platform,
              guarantor,
              values,
              [this.start],
              tid,
              ZERO_ADDRESS,
              feeRate,
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
              seller,
              platform,
              guarantor,
              values,
              [],
              tid,
              ZERO_ADDRESS,
              feeRate,
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
              seller,
              platform,
              guarantor,
              [],
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            ),
            'VIV5409',
          );
        });
      });
    });

    describe('When transaction id is duplicated', function () {
      beforeEach(async function () {
        await this.trade.purchase(
          seller,
          platform,
          guarantor,
          values,
          times,
          tid,
          ZERO_ADDRESS,
          feeRate,
          { from: buyer, value: tradeAmount },
        );
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
            { from: buyer, value: tradeAmount },
          ),
          'VIV5004',
        );
      });
    });

    describe('when the token is zero address', function () {
      const value = tradeAmount.subn(1);

      describe('When trade amount does not equals the value', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              seller,
              platform,
              guarantor,
              values,
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: value },
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
              seller,
              platform,
              guarantor,
              [balance.subn(1), 1, 0, 0],
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: balance },
            ),
          );
        });
      });

      describe('When buyer have enough balance', function () {
        it('pay the trade amount', async function () {
          await this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
            { from: buyer, value: tradeAmount },
          );

          expect(await current(this.trade.address)).to.be.bignumber.equal(
            tradeAmount,
          );
        });
      });
    });

    describe('when the token is erc20 address', function () {
      describe('when the buyer does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(buyer, other, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(
              seller,
              platform,
              guarantor,
              values,
              times,
              tid,
              this.erc20.address,
              feeRate,
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
              seller,
              platform,
              guarantor,
              values,
              times,
              tid,
              this.erc20.address,
              feeRate,
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

        it('pay the trade amount', async function () {
          await this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            this.erc20.address,
            feeRate,
            { from: buyer, value: 0 },
          );

          expect(
            await this.erc20.balanceOf(this.trade.address),
          ).to.be.bignumber.equal(tradeAmount);
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.purchase(
              seller,
              platform,
              guarantor,
              values,
              times,
              tid,
              this.erc20.address,
              feeRate,
              { from: buyer, value: 0 },
            ),
            'Transfer',
            { sender: buyer, receiver: this.trade.address, value: tradeAmount },
          );
        });
      });
    });
  });

  describe('withdraw', function () {
    const withdrawAmount = new BN(70000);
    describe('when the token is zero address', function () {
      describe('When the parameter is invalid', function () {
        beforeEach(async function () {
          await this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
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
      });

      describe('When the coupon rate is not zero', function () {
        const couponRate = new BN(500);
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the coupon is reused', function () {
          beforeEach('Withdraw as normal and use coupons', async function () {
            await this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              withdrawAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
              { from: seller, value: 0 },
            );
          });

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
            await this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              withdrawAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
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
            await this.trade.withdraw(
              signedValue1,
              signedValue2,
              signedValue3,
              withdrawAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
              { from: seller, value: 0 },
            );
            expect(await current(platform)).to.be.bignumber.equal(
              platformBalance,
            );
          });
        });
      });

      describe('When the coupon rate is zero', function () {
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        const availableAmount = withdrawAmount.sub(arbitrateFee);
        const feeAmount = availableAmount.mul(feeRate).divn(10000);

        beforeEach('purchase', async function () {
          await this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
            { from: buyer, value: tradeAmount },
          );
        });

        it('The platform get the full service fee', async function () {
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(feeAmount);
          await this.trade.withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            withdrawAmount,
            couponRate,
            arbitrateFee,
            tid,
            couponId,
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
              seller,
              platform,
              guarantor,
              values,
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            );
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                0,
                tid,
                couponId,
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
              seller,
              platform,
              guarantor,
              values,
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            );
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                withdrawAmount,
                couponRate,
                0,
                tid,
                couponId,
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the buyer pays, the seller withdraws', function () {
          describe('When the withdrawal amount exceeds the amount that can be withdrawn', function () {
            const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
            const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
            const signedValue3 = getSign(
              ['uint256', 'bytes', 'bytes'],
              [couponRate, couponId, tid],
              platformPrivateKey,
            );
            const newTradeAmount = withdrawAmount.addn(1);

            beforeEach('purchase', async function () {
              await this.trade.purchase(
                seller,
                platform,
                guarantor,
                values,
                times,
                tid,
                ZERO_ADDRESS,
                feeRate,
                { from: buyer, value: tradeAmount },
              );
            });

            it('reverts', async function () {
              await expectRevert(
                this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  newTradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  { from: seller, value: 0 },
                ),
                'VIV5405',
              );
            });
          });

          describe('When unlocking a period and withdrawing', function () {
            describe('When the seller withdraws normally', function () {
              const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
              const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);

              const availableAmount = withdrawAmount.sub(arbitrateFee);
              const feeAmount = availableAmount.mul(feeRate).divn(10000);
              const sellerRecevieAmount = availableAmount.sub(feeAmount);

              beforeEach('purchase', async function () {
                await this.trade.purchase(
                  seller,
                  platform,
                  guarantor,
                  values,
                  times,
                  tid,
                  ZERO_ADDRESS,
                  feeRate,
                  { from: buyer, value: tradeAmount },
                );
              });

              it('Normal withdraw', async function () {
                expectEvent(
                  await this.trade.withdraw(
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
              const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
              const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
              const signedValue3 = getSign(
                ['uint256', 'bytes', 'bytes'],
                [couponRate, couponId, tid],
                platformPrivateKey,
              );

              beforeEach('purchase', async function () {
                await this.trade.purchase(
                  seller,
                  platform,
                  guarantor,
                  values,
                  times,
                  tid,
                  ZERO_ADDRESS,
                  feeRate,
                  { from: buyer, value: tradeAmount },
                );
              });

              it('When the seller withdraws multiple times, the platform get multiple service fees', async function () {
                let newTradeAmount = withdrawAmount.subn(10000);
                let feeAmount = newTradeAmount.mul(feeRate).divn(10000);
                const platformBalance = await current(platform);
                let newBalance = platformBalance.add(feeAmount);
                await this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  newTradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  { from: seller, value: 0 },
                );
                expect(await current(platform)).to.be.bignumber.equal(
                  newBalance,
                );

                newTradeAmount = new BN(10000);
                feeAmount = newTradeAmount.mul(feeRate).divn(10000);
                newBalance = newBalance.add(feeAmount);
                await this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  newTradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  { from: seller, value: 0 },
                );
                expect(await current(platform)).to.be.bignumber.equal(
                  newBalance,
                );
              });
            });
          });

          describe('When one-time withdrawal when unlocked for multiple periods', function () {
            const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
            const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
            const signedValue3 = getSign(
              ['uint256', 'bytes', 'bytes'],
              [couponRate, couponId, tid],
              platformPrivateKey,
            );
            // first lock amount: 70000, second lock amount: 10000, total lock amount: 80000
            const withdrawAmount = new BN(80000);

            describe('When two phases have been unlocked', function () {
              beforeEach('purchase', async function () {
                // If the time is less than the current time, it means it has been unlocked.
                // Here means the first and second
                const times = [
                  this.start.subn(10),
                  this.start,
                  this.start.addn(10),
                  this.start.addn(20),
                ];
                await this.trade.purchase(
                  seller,
                  platform,
                  guarantor,
                  values,
                  times,
                  tid,
                  ZERO_ADDRESS,
                  feeRate,
                  { from: buyer, value: tradeAmount },
                );
              });

              it('When the buyer withdraws, the platform get the service fee', async function () {
                const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
                const platformBalance = await current(platform);
                const newBalance = platformBalance.add(feeAmount);
                await this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  withdrawAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  { from: seller, value: 0 },
                );
                expect(await current(platform)).to.be.bignumber.equal(
                  newBalance,
                );
              });
            });

            describe('When it is unlocked, it cannot be withdrawn', function () {
              beforeEach('purchase', async function () {
                await this.trade.purchase(
                  seller,
                  platform,
                  guarantor,
                  values,
                  times,
                  tid,
                  ZERO_ADDRESS,
                  feeRate,
                  { from: buyer, value: tradeAmount },
                );
              });

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
                  'VIV5405',
                );
              });
            });
          });
        });

        describe('When the buyer applies for a refund and the seller agrees, the buyer withdraws', function () {
          const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
          const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
          const signedValue3 = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            platformPrivateKey,
          );

          beforeEach('purchase', async function () {
            await this.trade.purchase(
              seller,
              platform,
              guarantor,
              values,
              times,
              tid,
              ZERO_ADDRESS,
              feeRate,
              { from: buyer, value: tradeAmount },
            );
          });

          describe('When buyers cannot withdraw cash when there is no refund request', function () {
            it('reverts', async function () {
              await expectRevert(
                this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                  { from: buyer, value: 0 },
                ),
                'VIV5407',
              );
            });
          });

          describe('When the buyer withdraws the remaining amount', function () {
            describe('When the withdrawal amount exceeds the amount that can be withdrawn', function () {
              const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
              const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
              const signedValue3 = getSign(
                ['uint256', 'bytes', 'bytes'],
                [couponRate, couponId, tid],
                platformPrivateKey,
              );
              const newTradeAmount = tradeAmount.addn(1);

              beforeEach('purchase', async function () {
                await this.trade.refund(tid, { from: buyer });
              });

              it('reverts', async function () {
                await expectRevert(
                  this.trade.withdraw(
                    signedValue1,
                    signedValue2,
                    signedValue3,
                    newTradeAmount,
                    couponRate,
                    arbitrateFee,
                    tid,
                    couponId,
                    { from: buyer, value: 0 },
                  ),
                  'VIV5405',
                );
              });
            });

            describe('When the seller has not withdrawn', function () {
              beforeEach('purchase', async function () {
                await this.trade.refund(tid, { from: buyer });
              });

              it('When the buyer withdraws, the platform get the service fee', async function () {
                const feeAmount = tradeAmount.mul(feeRate).divn(10000);
                const platformBalance = await current(platform);
                const newBalance = platformBalance.add(feeAmount);
                await this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
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
                  await this.trade.withdraw(
                    signedValue1,
                    signedValue2,
                    signedValue3,
                    withdrawAmount,
                    couponRate,
                    arbitrateFee,
                    tid,
                    couponId,
                    { from: seller, value: 0 },
                  );
                  await this.trade.refund(tid, { from: buyer });
                },
              );

              it('When the buyer withdraws, the platform get the service fee', async function () {
                const remainderAmount = tradeAmount.sub(withdrawAmount);
                const feeAmount = remainderAmount.mul(feeRate).divn(10000);
                const platformBalance = await current(platform);
                const newBalance = platformBalance.add(feeAmount);
                await this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  remainderAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
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
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
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
              this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
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
              this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
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
              this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                newTradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
                { from: seller, value: 0 },
              ),
              'VIV5405',
            );
          });
        });

        describe('When supporting the seller', function () {
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            guarantorPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            sellerPrivateKey,
          );

          const availableAmount = tradeAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const recevieAmount = availableAmount.sub(feeAmount);

          it('withdraw', async function () {
            expectEvent(
              await this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
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
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            guarantorPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            buyerPrivateKey,
          );

          const availableAmount = tradeAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const recevieAmount = availableAmount.sub(feeAmount);

          it('withdraw', async function () {
            expectEvent(
              await this.trade.withdraw(
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
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
          const withdrawAmount = new BN(50000);
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
                await this.trade.withdraw(
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
                await this.trade.withdraw(
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  withdrawAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
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
    });

    describe('When the token is erc20 address', function () {
      const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
      const signedValue2 = getSign(['bytes'], [tid], guarantorPrivateKey);
      const signedValue3 = getSign(
        ['uint256', 'bytes', 'bytes'],
        [couponRate, couponId, tid],
        platformPrivateKey,
      );

      beforeEach(async function () {
        await this.erc20.approveInternal(
          buyer,
          this.trade.address,
          tradeAmount,
        );
        await this.trade.purchase(
          seller,
          platform,
          guarantor,
          values,
          times,
          tid,
          this.erc20.address,
          feeRate,
          { from: buyer, value: 0 },
        );
      });

      it('Withdraw ERC20', async function () {
        const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
        const platformBalance = await this.erc20.balanceOf(platform);
        const newBalance = platformBalance.add(feeAmount);
        await this.trade.withdraw(
          signedValue1,
          signedValue2,
          signedValue3,
          withdrawAmount,
          couponRate,
          arbitrateFee,
          tid,
          couponId,
          { from: seller, value: 0 },
        );
        expect(await this.erc20.balanceOf(platform)).to.be.bignumber.equal(
          newBalance,
        );
      });
    });
  });

  describe('refund', function () {
    beforeEach(async function () {
      await this.trade.purchase(
        seller,
        platform,
        guarantor,
        values,
        times,
        tid,
        ZERO_ADDRESS,
        feeRate,
        { from: buyer, value: tradeAmount },
      );
    });

    describe('When the sender is not the buyer', function () {
      it('reverts', async function () {
        await expectRevert(this.trade.refund(tid, { from: seller }), 'VIV5401');
      });
    });

    describe('When applying for a refund repeatedly', function () {
      beforeEach(async function () {
        await this.trade.refund(tid, { from: buyer });
      });

      it('reverts', async function () {
        await expectRevert(this.trade.refund(tid, { from: buyer }), 'VIV5402');
      });
    });

    describe('When requesting a refund', function () {
      it('emit a refund event', async function () {
        expectEvent(await this.trade.refund(tid, { from: buyer }), 'Refund', {
          sender: buyer,
        });
      });
    });
  });

  describe('getUnlockAmount', function () {
    describe('When there is no unlocked amount', function () {
      beforeEach(async function () {
        const times = [
          this.start + 10,
          this.start + 20,
          this.start + 30,
          this.start + 40,
        ];
        await this.trade.purchase(
          seller,
          platform,
          guarantor,
          values,
          times,
          tid,
          ZERO_ADDRESS,
          feeRate,
          { from: buyer, value: tradeAmount },
        );
      });

      it('return zero', async function () {
        expect(await this.trade.getUnlockAmount(tid)).to.be.bignumber.equal(
          new BN(0),
        );
      });
    });

    describe('When there is an unlocked amount', function () {
      beforeEach(async function () {
        await this.trade.purchase(
          seller,
          platform,
          guarantor,
          values,
          times,
          tid,
          ZERO_ADDRESS,
          feeRate,
          { from: buyer, value: tradeAmount },
        );
      });

      it('return total of unlocked amount', async function () {
        expect(await this.trade.getUnlockAmount(tid)).to.be.bignumber.equal(
          new BN(70000),
        );
      });
    });
  });

  describe('getCanWithdrawAmount', function () {
    const withdrawAmount = new BN(70000);

    describe('When there is no cash available', function () {
      describe('When the unlock date is not reached', function () {
        beforeEach(async function () {
          const times = [
            this.start + 10,
            this.start + 20,
            this.start + 30,
            this.start + 40,
          ];
          await this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
            { from: buyer, value: tradeAmount },
          );
        });

        it('return zero', async function () {
          expect(
            await this.trade.getCanWithdrawAmount(tid),
          ).to.be.bignumber.equal(new BN(0));
        });
      });

      describe('when already withdrawn', function () {
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach(async function () {
          await this.trade.purchase(
            seller,
            platform,
            guarantor,
            values,
            times,
            tid,
            ZERO_ADDRESS,
            feeRate,
            { from: buyer, value: tradeAmount },
          );
          await this.trade.withdraw(
            signedValue1,
            signedValue2,
            signedValue3,
            withdrawAmount,
            couponRate,
            arbitrateFee,
            tid,
            couponId,
            { from: seller, value: 0 },
          );
        });

        it('return zero', async function () {
          expect(
            await this.trade.getCanWithdrawAmount(tid),
          ).to.be.bignumber.equal(new BN(0));
        });
      });
    });

    describe('When there is a cashable amount', function () {
      beforeEach(async function () {
        await this.trade.purchase(
          seller,
          platform,
          guarantor,
          values,
          times,
          tid,
          ZERO_ADDRESS,
          feeRate,
          { from: buyer, value: tradeAmount },
        );
      });

      it('return total of cashable amount', async function () {
        expect(
          await this.trade.getCanWithdrawAmount(tid),
        ).to.be.bignumber.equal(withdrawAmount);
      });
    });
  });

  describe('getWithdrawedAmount', function () {
    beforeEach(async function () {
      await this.trade.purchase(
        seller,
        platform,
        guarantor,
        values,
        times,
        tid,
        ZERO_ADDRESS,
        feeRate,
        { from: buyer, value: tradeAmount },
      );
    });

    describe('When there is no withdrawn amount', function () {
      it('return zero', async function () {
        expect(await this.trade.getWithdrawedAmount(tid)).to.be.bignumber.equal(
          new BN(0),
        );
      });
    });

    describe('When there is a withdrawn amount', function () {
      const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
      const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
      const signedValue3 = getSign(
        ['uint256', 'bytes', 'bytes'],
        [couponRate, couponId, tid],
        platformPrivateKey,
      );
      const withdrawAmount = new BN(70000);

      beforeEach(async function () {
        await this.trade.withdraw(
          signedValue1,
          signedValue2,
          signedValue3,
          withdrawAmount,
          couponRate,
          arbitrateFee,
          tid,
          couponId,
          { from: seller, value: 0 },
        );
      });

      it('return total of withdrawn amount', async function () {
        expect(await this.trade.getWithdrawedAmount(tid)).to.be.bignumber.equal(
          withdrawAmount,
        );
      });
    });
  });

  describe('getRefundStatus', function () {
    beforeEach(async function () {
      await this.trade.purchase(
        seller,
        platform,
        guarantor,
        values,
        times,
        tid,
        ZERO_ADDRESS,
        feeRate,
        { from: buyer, value: tradeAmount },
      );
    });

    describe('Status when no refund has been requested', function () {
      it('return false', async function () {
        expect(await this.trade.getRefundStatus(tid)).to.be.equal(false);
      });
    });

    describe('Status when a refund has been requested', function () {
      beforeEach(async function () {
        await this.trade.refund(tid, { from: buyer });
      });

      it('return true', async function () {
        expect(await this.trade.getRefundStatus(tid)).to.be.equal(true);
      });
    });
  });

  describe('getRefundTime', function () {
    beforeEach(async function () {
      await this.trade.purchase(
        seller,
        platform,
        guarantor,
        values,
        times,
        tid,
        ZERO_ADDRESS,
        feeRate,
        { from: buyer, value: tradeAmount },
      );
    });

    describe('Time when no refund has been requested', function () {
      it('return zero', async function () {
        expect(await this.trade.getRefundTime(tid)).to.be.bignumber.equal(
          new BN(0),
        );
      });
    });

    describe('Time when a refund has been requested', function () {
      beforeEach(async function () {
        await this.trade.refund(tid, { from: buyer });
      });

      it('return not zero', async function () {
        expect(await this.trade.getRefundTime(tid)).to.be.bignumber.not.equal(
          new BN(0),
        );
      });
    });
  });
});
