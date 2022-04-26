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

const ERC20Mock = artifacts.require('ERC20Mock');
const VivLendMock = artifacts.require('VivLendMock');
const VivNFT = artifacts.require('VivNFT');

contract('VivLend', function (accounts) {
  const [borrower, lender, platform, other] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(10000);
  const feeRate = new BN(500);
  const penaltyRate = new BN(100);
  const interest = new BN(1000);

  const tid = '0x303030303030303030303030303030303030';
  const values = [tradeAmount, interest, feeRate, penaltyRate];
  let nftTokenId;

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, lender, tradeAmount);
    this.trade = await VivLendMock.new();
    this.start = await time.latest();
    this.nft = await VivNFT.new({ from: borrower });
    const receipt = await this.nft.mint(borrower, { from: borrower });
    nftTokenId = receipt.logs.find(({ event }) => event === 'Transfer').args
      .tokenId;
  });

  describe('publish', function () {
    describe('When nft address is zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.publish(
            ZERO_ADDRESS,
            nftTokenId,
            tid,
            values,
            platform,
            ZERO_ADDRESS,
            { from: borrower },
          ),
          'VIV5610',
        );
      });
    });

    describe('When platform is zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.publish(
            this.nft.address,
            nftTokenId,
            tid,
            values,
            ZERO_ADDRESS,
            ZERO_ADDRESS,
            { from: borrower },
          ),
          'VIV5002',
        );
      });
    });

    describe('When value is zero', function () {
      const values = [0, interest, feeRate, penaltyRate];
      it('reverts', async function () {
        await expectRevert(
          this.trade.publish(
            this.nft.address,
            nftTokenId,
            tid,
            values,
            platform,
            ZERO_ADDRESS,
            { from: borrower },
          ),
          'VIV5612',
        );
      });
    });

    describe('When transaction id is duplicated', function () {
      beforeEach(async function () {
        this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
        await this.trade.publish(
          this.nft.address,
          nftTokenId,
          tid,
          values,
          platform,
          ZERO_ADDRESS,
          { from: borrower },
        );
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.publish(
            this.nft.address,
            nftTokenId,
            tid,
            values,
            platform,
            ZERO_ADDRESS,
            { from: borrower },
          ),
          'VIV5004',
        );
      });
    });

    describe('When the sender does not have the nft or approve', function () {
      describe('When the sender does not have the nft', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.publish(
              this.nft.address,
              nftTokenId,
              tid,
              values,
              platform,
              ZERO_ADDRESS,
              { from: lender },
            ),
            'ERC721: transfer caller is not owner nor approved',
          );
        });
      });

      describe('When the sender does not approve', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.publish(
              this.nft.address,
              nftTokenId,
              tid,
              values,
              platform,
              ZERO_ADDRESS,
              { from: borrower },
            ),
            'ERC721: transfer caller is not owner nor approved',
          );
        });
      });
    });

    describe('When publish success', function () {
      beforeEach(async function () {
        this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
      });

      it('emit a recevied nft event', async function () {
        expectEvent(
          await this.trade.publish(
            this.nft.address,
            nftTokenId,
            tid,
            values,
            platform,
            ZERO_ADDRESS,
            { from: borrower },
          ),
          'ReceviedNft',
          {
            operator: this.trade.address,
            from: borrower,
            tokenId: nftTokenId,
            data: tid,
          },
        );
      });
    });
  });

  describe('lendOut', function () {
    let endDate;
    beforeEach(async function () {
      endDate = this.start.addn(86400);
      this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
      await this.trade.publish(
        this.nft.address,
        nftTokenId,
        tid,
        values,
        platform,
        ZERO_ADDRESS,
        { from: borrower },
      );
    });

    describe('When value is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.lendOut(0, tid, endDate, { from: lender, value: 0 }),
          'VIV5613',
        );
      });
    });

    describe('When the trade is not exists', function () {
      const tid = '0x303030303030303030303030303030303031';

      it('reverts', async function () {
        await expectRevert(
          this.trade.lendOut(tradeAmount, tid, endDate, {
            from: lender,
            value: tradeAmount,
          }),
          'VIV5005',
        );
      });
    });

    describe('When the state is not published', function () {
      beforeEach(async function () {
        await this.trade.lendOut(tradeAmount, tid, endDate, {
          from: lender,
          value: tradeAmount,
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.lendOut(tradeAmount, tid, endDate, {
            from: lender,
            value: tradeAmount,
          }),
          'VIV5601',
        );
      });
    });

    describe('When the lend amount is not equal to the loan amount', function () {
      const newTradeAmount = tradeAmount.addn(1);
      it('reverts', async function () {
        await expectRevert(
          this.trade.lendOut(newTradeAmount, tid, endDate, {
            from: lender,
            value: newTradeAmount,
          }),
          'VIV5602',
        );
      });
    });

    describe('when the token is zero address', function () {
      const value = tradeAmount.subn(1);

      describe('When trade amount does not equals the value', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.lendOut(tradeAmount, tid, endDate, {
              from: lender,
              value: value,
            }),
            'VIV0002',
          );
        });
      });

      describe('When buyer does not have enough balance', function () {
        let balance;
        beforeEach(async function () {
          balance = await current(lender);
          await ether(lender, other, 1);
        });

        it('reverts', async function () {
          await assertFailure(
            this.trade.lendOut(tradeAmount, tid, endDate, {
              from: lender,
              value: balance,
            }),
          );
        });
      });

      describe('When buyer have enough balance', function () {
        it('pay the trade amount', async function () {
          const oldBalance = await current(borrower);
          const newBalance = oldBalance.add(tradeAmount);
          await this.trade.lendOut(tradeAmount, tid, endDate, {
            from: lender,
            value: tradeAmount,
          });
          expect(await current(borrower)).to.be.bignumber.equal(newBalance);
        });
      });
    });

    describe('when the token is erc20 address', function () {
      const tid = '0x303030303030303030303030303030303031';
      let nftTokenId;
      beforeEach(async function () {
        const receipt = await this.nft.mint(borrower, { from: borrower });
        nftTokenId = receipt.logs.find(({ event }) => event === 'Transfer').args
          .tokenId;
        this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
        await this.trade.publish(
          this.nft.address,
          nftTokenId,
          tid,
          values,
          platform,
          this.erc20.address,
          { from: borrower },
        );
      });

      describe('when the buyer does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(lender, other, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.lendOut(tradeAmount, tid, endDate, {
              from: lender,
              value: 0,
            }),
            'VIV0003',
          );
        });
      });

      describe('when the buyer does not have enough allowance', function () {
        const allowance = tradeAmount.subn(1);

        beforeEach(async function () {
          await this.erc20.approveInternal(
            lender,
            this.trade.address,
            allowance,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.lendOut(tradeAmount, tid, endDate, {
              from: lender,
              value: 0,
            }),
            'VIV0004',
          );
        });
      });

      describe('When buyer have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(
            lender,
            this.trade.address,
            tradeAmount,
          );
        });

        it('pay the trade amount', async function () {
          const oldBalance = await this.erc20.balanceOf(borrower);
          const newBalance = oldBalance.add(tradeAmount);
          await this.trade.lendOut(tradeAmount, tid, endDate, {
            from: lender,
            value: 0,
          });
          expect(await this.erc20.balanceOf(borrower)).to.be.bignumber.equal(
            newBalance,
          );
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.lendOut(tradeAmount, tid, endDate, {
              from: lender,
              value: 0,
            }),
            'Transfer',
            {
              sender: lender,
              receiver: this.trade.address,
              value: tradeAmount,
            },
          );
        });
      });
    });
  });

  describe('repay', function () {
    let repayDate;
    let endDate;
    const repayAmount = tradeAmount.add(interest);
    beforeEach(async function () {
      endDate = this.start.addn(86400);
      repayDate = this.start.addn(86400);
      this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
      await this.trade.publish(
        this.nft.address,
        nftTokenId,
        tid,
        values,
        platform,
        ZERO_ADDRESS,
        { from: borrower },
      );
      await this.trade.lendOut(tradeAmount, tid, endDate, {
        from: lender,
        value: tradeAmount,
      });
    });

    describe('When the trade is not exists', function () {
      const tid = '0x303030303030303030303030303030303031';

      it('reverts', async function () {
        await expectRevert(
          this.trade.repayInternal(repayAmount, tid, repayDate, {
            from: borrower,
            value: repayAmount,
          }),
          'VIV5005',
        );
      });
    });

    describe('When the state is not lending', function () {
      beforeEach(async function () {
        await this.trade.repayInternal(repayAmount, tid, repayDate, {
          from: borrower,
          value: repayAmount,
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.repayInternal(repayAmount, tid, repayDate, {
            from: borrower,
            value: repayAmount,
          }),
          'VIV5603',
        );
      });
    });

    describe('when the token is zero address', function () {
      const value = repayAmount.subn(1);

      describe('When trade amount does not equals the value', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.repayInternal(repayAmount, tid, repayDate, {
              from: borrower,
              value: value,
            }),
            'VIV0002',
          );
        });
      });

      describe('When buyer does not have enough balance', function () {
        let balance;
        beforeEach(async function () {
          balance = await current(borrower);
          await ether(borrower, other, 1);
        });

        it('reverts', async function () {
          await assertFailure(
            this.trade.repayInternal(repayAmount, tid, repayDate, {
              from: borrower,
              value: balance,
            }),
          );
        });
      });

      describe('When the repayment amount is insufficient', function () {
        beforeEach(async function () {
          // Need to pay penalty interest
          repayDate = this.start.addn(86400 * 2);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.repayInternal(repayAmount, tid, repayDate, {
              from: borrower,
              value: repayAmount,
            }),
            'VIV5604',
          );
        });
      });

      describe('When normal repayment', function () {
        const feeAmount = repayAmount.mul(feeRate).divn(10000);

        it('repay the trade amount', async function () {
          const oldBalance = await current(platform);
          const newBalance = oldBalance.add(feeAmount);
          await this.trade.repayInternal(repayAmount, tid, repayDate, {
            from: borrower,
            value: repayAmount,
          });
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
          expect(await this.nft.ownerOf(nftTokenId)).to.be.equal(borrower);
        });
      });

      describe('When payment is overdue', function () {
        const penaltyAmount = interest.mul(penaltyRate).divn(10000);
        const newRepayAmount = repayAmount.add(penaltyAmount);
        const feeAmount = newRepayAmount.mul(feeRate).divn(10000);
        beforeEach(async function () {
          // Need to pay penalty interest
          repayDate = this.start.addn(86400 * 2);
        });

        it('repay the trade amount', async function () {
          const oldBalance = await current(platform);
          const newBalance = oldBalance.add(feeAmount);
          await this.trade.repayInternal(newRepayAmount, tid, repayDate, {
            from: borrower,
            value: newRepayAmount,
          });
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
          expect(await this.nft.ownerOf(nftTokenId)).to.be.equal(borrower);
        });
      });
    });

    describe('when the token is erc20 address', function () {
      const tid = '0x303030303030303030303030303030303031';
      let nftTokenId;
      beforeEach(async function () {
        const receipt = await this.nft.mint(borrower, { from: borrower });
        nftTokenId = receipt.logs.find(({ event }) => event === 'Transfer').args
          .tokenId;
        this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
        await this.trade.publish(
          this.nft.address,
          nftTokenId,
          tid,
          values,
          platform,
          this.erc20.address,
          { from: borrower },
        );
        await this.erc20.approveInternal(
          lender,
          this.trade.address,
          tradeAmount,
        );
        await this.trade.lendOut(tradeAmount, tid, repayDate, {
          from: lender,
          value: 0,
        });
        this.erc20.mint(borrower, repayAmount, { from: lender });
      });

      describe('when the buyer does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(borrower, other, repayAmount);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.repayInternal(repayAmount, tid, repayDate, {
              from: borrower,
              value: 0,
            }),
            'VIV0003',
          );
        });
      });

      describe('when the buyer does not have enough allowance', function () {
        const allowance = tradeAmount.subn(1);

        beforeEach(async function () {
          await this.erc20.approveInternal(
            borrower,
            this.trade.address,
            allowance,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.repayInternal(repayAmount, tid, repayDate, {
              from: borrower,
              value: 0,
            }),
            'VIV0004',
          );
        });
      });

      describe('When buyer have enough balance', function () {
        const feeAmount = repayAmount.mul(feeRate).divn(10000);

        beforeEach(async function () {
          await this.erc20.approveInternal(
            borrower,
            this.trade.address,
            repayAmount,
          );
        });

        it('pay the trade amount', async function () {
          const oldBalance = await this.erc20.balanceOf(platform);
          const newBalance = oldBalance.add(feeAmount);
          await this.trade.repayInternal(repayAmount, tid, repayDate, {
            from: borrower,
            value: 0,
          });
          expect(await this.erc20.balanceOf(platform)).to.be.bignumber.equal(
            newBalance,
          );
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.repayInternal(repayAmount, tid, repayDate, {
              from: borrower,
              value: 0,
            }),
            'Transfer',
            {
              sender: borrower,
              receiver: this.trade.address,
              value: repayAmount,
            },
          );
        });
      });
    });
  });

  describe('withdraw', function () {
    let endDate;
    let withdrawDate;
    const withdrawAmount = tradeAmount.add(interest).mul(feeRate).divn(10000);
    beforeEach(async function () {
      withdrawDate = this.start.addn(86400 * 2);
      endDate = this.start;
      this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
      await this.trade.publish(
        this.nft.address,
        nftTokenId,
        tid,
        values,
        platform,
        ZERO_ADDRESS,
        { from: borrower },
      );
    });

    describe('When the sender is not borrower or lender', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.withdraw(0, tid, { from: platform, value: 0 }),
          'VIV5605',
        );
      });
    });

    describe('When the sender is borrower', function () {
      describe('When the state is not published', function () {
        beforeEach(async function () {
          await this.trade.lendOut(tradeAmount, tid, endDate, {
            from: lender,
            value: tradeAmount,
          });
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(0, tid, { from: borrower, value: 0 }),
            'VIV5606',
          );
        });
      });

      describe('When withdraw', function () {
        it('Get back the NFT', async function () {
          await this.trade.withdraw(0, tid, { from: borrower, value: 0 });
          expect(await this.nft.ownerOf(nftTokenId)).to.be.equal(borrower);
        });
      });
    });

    describe('When the sender is lender', function () {
      beforeEach(async function () {
        await this.trade.lendOut(tradeAmount, tid, endDate, {
          from: lender,
          value: tradeAmount,
        });
      });

      describe('When the state is not lending', function () {
        beforeEach(async function () {
          await this.trade.withdrawInternal(withdrawAmount, tid, withdrawDate, {
            from: lender,
            value: withdrawAmount,
          });
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(0, tid, { from: lender, value: 0 }),
            'VIV5607',
          );
        });
      });

      describe('When the current date is less than the due date', function () {
        beforeEach(async function () {
          withdrawDate = this.start;
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.withdrawInternal(0, tid, withdrawDate, {
              from: lender,
              value: 0,
            }),
            'VIV5608',
          );
        });
      });

      describe('When the amount paid is less than the handling fee', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.withdrawInternal(0, tid, withdrawDate, {
              from: lender,
              value: 0,
            }),
            'VIV5609',
          );
        });
      });

      describe('when the token is zero address', function () {
        const value = withdrawAmount.subn(1);

        describe('When trade amount does not equals the value', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(withdrawAmount, tid, withdrawDate, {
                from: lender,
                value: value,
              }),
              'VIV0002',
            );
          });
        });

        describe('When buyer does not have enough balance', function () {
          let balance;
          beforeEach(async function () {
            balance = await current(lender);
            await ether(lender, other, 1);
          });

          it('reverts', async function () {
            await assertFailure(
              this.trade.withdrawInternal(withdrawAmount, tid, withdrawDate, {
                from: lender,
                value: balance,
              }),
            );
          });
        });

        describe('When normal repayment', function () {
          it('repay the trade amount', async function () {
            const oldBalance = await current(platform);
            const newBalance = oldBalance.add(withdrawAmount);
            await this.trade.withdrawInternal(
              withdrawAmount,
              tid,
              withdrawDate,
              { from: lender, value: withdrawAmount },
            );
            expect(await current(platform)).to.be.bignumber.equal(newBalance);
            expect(await this.nft.ownerOf(nftTokenId)).to.be.equal(lender);
          });
        });
      });

      describe('when the token is erc20 address', function () {
        const tid = '0x303030303030303030303030303030303031';
        let nftTokenId;
        beforeEach(async function () {
          const receipt = await this.nft.mint(borrower, { from: borrower });
          nftTokenId = receipt.logs.find(({ event }) => event === 'Transfer')
            .args.tokenId;
          this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
          await this.trade.publish(
            this.nft.address,
            nftTokenId,
            tid,
            values,
            platform,
            this.erc20.address,
            { from: borrower },
          );
          await this.erc20.approveInternal(
            lender,
            this.trade.address,
            tradeAmount,
          );
          await this.trade.lendOut(tradeAmount, tid, endDate, {
            from: lender,
            value: 0,
          });
          this.erc20.mint(lender, withdrawAmount, { from: lender });
        });

        describe('when the buyer does not have enough balance', function () {
          beforeEach(async function () {
            await this.erc20.transferInternal(lender, other, withdrawAmount);
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(withdrawAmount, tid, withdrawDate, {
                from: lender,
                value: 0,
              }),
              'VIV0003',
            );
          });
        });

        describe('when the buyer does not have enough allowance', function () {
          const allowance = withdrawAmount.subn(1);

          beforeEach(async function () {
            await this.erc20.approveInternal(
              lender,
              this.trade.address,
              allowance,
            );
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(withdrawAmount, tid, withdrawDate, {
                from: lender,
                value: 0,
              }),
              'VIV0004',
            );
          });
        });

        describe('When buyer have enough balance', function () {
          beforeEach(async function () {
            await this.erc20.approveInternal(
              lender,
              this.trade.address,
              withdrawAmount,
            );
          });

          it('pay the trade amount', async function () {
            const oldBalance = await this.erc20.balanceOf(platform);
            const newBalance = oldBalance.add(withdrawAmount);
            await this.trade.withdrawInternal(
              withdrawAmount,
              tid,
              withdrawDate,
              { from: lender, value: 0 },
            );
            expect(await this.erc20.balanceOf(platform)).to.be.bignumber.equal(
              newBalance,
            );
            expect(await this.nft.ownerOf(nftTokenId)).to.be.equal(lender);
          });

          it('emits a transfer event', async function () {
            expectEvent(
              await this.trade.withdrawInternal(
                withdrawAmount,
                tid,
                withdrawDate,
                { from: lender, value: 0 },
              ),
              'Transfer',
              {
                sender: lender,
                receiver: this.trade.address,
                value: withdrawAmount,
              },
            );
          });
        });
      });
    });
  });

  describe('getTarget', function () {
    beforeEach(async function () {
      this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
      await this.trade.publish(
        this.nft.address,
        nftTokenId,
        tid,
        values,
        platform,
        ZERO_ADDRESS,
        { from: borrower },
      );
    });

    it('return target', async function () {
      const getValue = ({ 0: token, 1: value, 2: interest, 3: endDate }) => ({
        0: token,
        1: value.toString(),
        2: interest.toString(),
        3: endDate.toString(),
      });
      const actual = getValue(await this.trade.getTarget(tid));
      const expected = getValue({
        0: ZERO_ADDRESS,
        1: tradeAmount,
        2: interest,
        3: new BN(0),
      });

      expect(actual).to.be.deep.equal(expected);
    });
  });

  describe('getNft', function () {
    beforeEach(async function () {
      this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
      await this.trade.publish(
        this.nft.address,
        nftTokenId,
        tid,
        values,
        platform,
        ZERO_ADDRESS,
        { from: borrower },
      );
    });

    it('return nft', async function () {
      const getValue = ({ 0: borrower, 1: nftAddress, 2: nftTokenId }) => ({
        0: borrower,
        1: nftAddress,
        2: nftTokenId.toString(),
      });
      const actual = getValue(await this.trade.getNft(tid));
      const expected = getValue({
        0: borrower,
        1: this.nft.address,
        2: nftTokenId,
      });

      expect(actual).to.be.deep.equal(expected);
    });
  });

  describe('getProject', function () {
    beforeEach(async function () {
      const endDate = this.start.addn(86400);
      this.nft.approve(this.trade.address, nftTokenId, { from: borrower });
      await this.trade.publish(
        this.nft.address,
        nftTokenId,
        tid,
        values,
        platform,
        ZERO_ADDRESS,
        { from: borrower },
      );
      await this.trade.lendOut(tradeAmount, tid, endDate, {
        from: lender,
        value: tradeAmount,
      });
    });

    it('return project', async function () {
      const getValue = ({
        0: borrower,
        1: lender,
        2: platform,
        3: feeRate,
        4: penaltyRate,
        5: state,
      }) => ({
        0: borrower,
        1: lender,
        2: platform,
        3: feeRate.toString(),
        4: penaltyRate.toString(),
        5: state.toString(),
      });
      const actual = getValue(await this.trade.getProject(tid));
      const expected = getValue({
        0: borrower,
        1: lender,
        2: platform,
        3: feeRate,
        4: penaltyRate,
        5: new BN(1),
      });

      expect(actual).to.be.deep.equal(expected);
    });
  });
});
