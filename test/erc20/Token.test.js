const { BN, constants, expectEvent, expectRevert, balance, send } = require('@openzeppelin/test-helpers');
const { ether, transaction } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const ERC20Mock = artifacts.require('ERC20Mock');
const TokenMock = artifacts.require('TokenMock');

contract('Token', function (accounts) {
  // , recipient, anotherAccount
  const [ initialHolder, recipient ] = accounts;
  const name = 'My Token';
  const symbol = 'MTKN';

  const initialSupply = new BN(100);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, initialHolder, initialSupply);
    this.token = await TokenMock.new();
    this.from = this.token.address;
    this.to = recipient;
  });

  describe('balanceOf', function () {
    describe('when the token is zero address', function () {
      describe('when the requested account has no eth', function () {
        it('returns zero', async function () {
          expect(await this.token.balanceOf(ZERO_ADDRESS)).to.be.bignumber.equal('0');
        });
      });

      describe('when the requested account has some eth', function () {
        beforeEach(async function () {
          await ether(initialHolder, this.token.address, initialSupply);
        });

        it('returns the total amount of eth', async function () {
          expect(await this.token.balanceOf(ZERO_ADDRESS)).to.be.bignumber.equal(initialSupply);
        });
      });
    });

    describe('when the token is not zero address', function () {
      describe('when the token contract has no tokens', function () {
        it('returns zero', async function () {
          expect(await this.token.balanceOf(this.erc20.address)).to.be.bignumber.equal('0');
        });
      });

      describe('when the requested account has some tokens', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(initialHolder, this.token.address, initialSupply);
        });

        it('returns the total amount of tokens', async function () {
          expect(await this.token.balanceOf(this.erc20.address)).to.be.bignumber.equal(initialSupply);
        });
      });
    });
  });

  describe('allowance', function () {
    describe('when the token is zero address', function () {
      describe('when the requested account has no eth', function () {
        it('approves the requested amount', async function () {
          expect(await this.token.allowance(ZERO_ADDRESS, initialHolder, this.token.address),
          ).to.be.bignumber.equal('0');
        });
      });
    });

    describe('when the token is not zero address', function () {
      describe('when there was no approved amount before', function () {
        it('approves the requested amount', async function () {
          expect(await this.token.allowance(this.erc20.address, initialHolder, this.token.address),
          ).to.be.bignumber.equal('0');
        });
      });

      describe('when the spender had an approved amount', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(initialHolder, this.token.address, initialSupply);
        });

        it('approves the requested amount and replaces the previous one', async function () {
          expect(await this.token.allowance(this.erc20.address, initialHolder, this.token.address),
          ).to.be.bignumber.equal(initialSupply);
        });
      });
    });
  });

  describe('transfer', function () {
    describe('when the token is zero address', function () {
      describe('when the recipient is not the zero address', function () {
        const amount = initialSupply;

        beforeEach(async function () {
          await ether(initialHolder, this.from, amount);
        });

        it('transfers the requested amount', async function () {
          const oldBalance = await current(this.to);
          const newBalance = oldBalance.add(amount);

          await this.token.transfer(ZERO_ADDRESS, this.to, amount);

          expect(await current(this.from)).to.be.bignumber.equal('0');

          expect(await current(this.to)).to.be.bignumber.equal(newBalance);
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.token.transfer(ZERO_ADDRESS, this.to, amount),
            'Transfer',
            { sender: this.from, receiver: this.to, value: amount },
          );
        });
      });

      describe('when the recipient is the zero address', function () {
        it('reverts', async function () {
          await expectRevert(this.token.transfer(ZERO_ADDRESS, ZERO_ADDRESS, initialSupply),
            'Transaction reverted without a reason string',
          );
        });
      });
    });

    describe('when the token is not zero address', function () {
      const balance = initialSupply;

      describe('when the recipient is not the zero address', function () {
        describe('when the sender does not have enough balance', function () {
          const amount = balance.addn(1);

          it('reverts', async function () {
            await expectRevert(this.token.transfer(this.erc20.address, recipient, amount),
              'ERC20: transfer amount exceeds balance',
            );
          });
        });

        describe('when the sender transfers all balance', function () {
          const amount = balance;

          beforeEach(async function () {
            await this.erc20.transferInternal(initialHolder, this.from, balance);
          });

          it('transfers the requested amount', async function () {
            await this.token.transfer(this.erc20.address, this.to, amount);

            expect(await this.erc20.balanceOf(this.from)).to.be.bignumber.equal('0');

            expect(await this.erc20.balanceOf(this.to)).to.be.bignumber.equal(amount);
          });

          it('emits a transfer event', async function () {
            expectEvent(
              await this.token.transfer(this.erc20.address, this.to, amount),
              'Transfer',
              { sender: this.from, receiver: this.to, value: amount },
            );
          });
        });

        describe('when the sender transfers zero tokens', function () {
          const amount = new BN('0');

          beforeEach(async function () {
            await this.erc20.transferInternal(initialHolder, this.from, balance);
          });

          it('transfers the requested amount', async function () {
            await this.token.transfer(this.erc20.address, this.to, amount);

            expect(await this.erc20.balanceOf(this.from)).to.be.bignumber.equal(balance);

            expect(await this.erc20.balanceOf(this.to)).to.be.bignumber.equal('0');
          });

          it('emits a transfer event', async function () {
            expectEvent(
              await this.token.transfer(this.erc20.address, this.to, amount),
              'Transfer',
              { sender: this.from, receiver: this.to, value: amount },
            );
          });
        });
      });

      describe('when the recipient is the zero address', function () {
        it('reverts', async function () {
          await expectRevert(this.token.transfer(this.erc20.address, ZERO_ADDRESS, balance),
            'ERC20: transfer to the zero address',
          );
        });
      });
    });
  });

  describe('transfer from', function () {
    describe('when the token is zero address', function () {
      const amount = initialSupply;
      it('There is no effect when the token is zero address', async function () {
        await this.token.transferFrom(ZERO_ADDRESS, initialHolder, this.to, amount);
        expect(await current(this.from)).to.be.bignumber.equal('0');
      });
    });

    describe('when the token is not zero address', function () {
      describe('when the token owner is not the zero address', function () {
        const tokenOwner = initialHolder;

        describe('when the recipient is not the zero address', function () {
          const to = recipient;

          describe('when the spender has enough allowance', function () {
            beforeEach(async function () {
              await this.erc20.approveInternal(tokenOwner, this.from, initialSupply);
            });

            describe('when the token owner has enough balance', function () {
              const amount = initialSupply;

              it('transfers the requested amount', async function () {
                await this.token.transferFrom(this.erc20.address, tokenOwner, to, amount);

                expect(await this.erc20.balanceOf(tokenOwner)).to.be.bignumber.equal('0');

                expect(await this.erc20.balanceOf(to)).to.be.bignumber.equal(amount);
              });

              it('decreases the spender allowance', async function () {
                await this.token.transferFrom(this.erc20.address, tokenOwner, to, amount);

                expect(await this.erc20.allowance(tokenOwner, this.from)).to.be.bignumber.equal('0');
              });

              it('emits a transfer event', async function () {
                expectEvent(
                  await this.token.transferFrom(this.erc20.address, tokenOwner, to, amount),
                  'Transfer',
                  { sender: tokenOwner, receiver: to, value: amount },
                );
              });

              it('emits an approval event', async function () {
                expectEvent(
                  await this.token.transferFrom(this.erc20.address, tokenOwner, to, amount),
                  'Approval',
                  { owner: tokenOwner, spender: this.from, value: await this.erc20.allowance(tokenOwner, this.from) },
                );
              });
            });

            describe('when the token owner does not have enough balance', function () {
              const amount = initialSupply;

              beforeEach('reducing balance', async function () {
                await this.erc20.transferInternal(tokenOwner, to, 1);
              });

              it('reverts', async function () {
                await expectRevert(
                  this.token.transferFrom(this.erc20.address, tokenOwner, to, amount),
                  'ERC20: transfer amount exceeds balance',
                );
              });
            });
          });

          describe('when the spender does not have enough allowance', function () {
            const allowance = initialSupply.subn(1);

            beforeEach(async function () {
              await this.erc20.approveInternal(tokenOwner, this.from, allowance);
            });

            describe('when the token owner has enough balance', function () {
              const amount = initialSupply;

              it('reverts', async function () {
                await expectRevert(
                  this.token.transferFrom(this.erc20.address, tokenOwner, to, amount),
                  'ERC20: insufficient allowance',
                );
              });
            });

            describe('when the token owner does not have enough balance', function () {
              const amount = allowance;

              beforeEach('reducing balance', async function () {
                await this.erc20.transferInternal(tokenOwner, to, 2);
              });

              it('reverts', async function () {
                await expectRevert(
                  this.token.transferFrom(this.erc20.address, tokenOwner, to, amount),
                  'ERC20: transfer amount exceeds balance',
                );
              });
            });
          });

          describe('when the spender has unlimited allowance', function () {
            beforeEach(async function () {
              await this.erc20.approveInternal(tokenOwner, this.from, MAX_UINT256);
            });

            it('does not decrease the spender allowance', async function () {
              await this.token.transferFrom(this.erc20.address, tokenOwner, to, 1);

              expect(await this.erc20.allowance(tokenOwner, this.from)).to.be.bignumber.equal(MAX_UINT256);
            });

            it('does not emit an approval event', async function () {
              expectEvent.notEmitted(
                await this.token.transferFrom(this.erc20.address, tokenOwner, to, 1),
                'Approval',
              );
            });
          });
        });

        describe('when the recipient is the zero address', function () {
          const amount = initialSupply;
          const to = ZERO_ADDRESS;

          beforeEach(async function () {
            await this.erc20.approveInternal(tokenOwner, this.from, amount);
          });

          it('reverts', async function () {
            await expectRevert(this.token.transferFrom(
              this.erc20.address, tokenOwner, to, amount), 'ERC20: transfer to the zero address',
            );
          });
        });
      });

      describe('when the token owner is the zero address', function () {
        const amount = 0;
        const tokenOwner = ZERO_ADDRESS;
        const to = recipient;

        it('reverts', async function () {
          await expectRevert(
            this.token.transferFrom(this.erc20.address, tokenOwner, to, amount),
            'from the zero address',
          );
        });
      });
    });
  });

  describe('checkTransferIn', function () {
    const tokenOwner = initialHolder;
    const to = recipient;

    describe('when the token is zero address', function () {
      describe('when transfer value equals the value in args', function () {
        const amount = initialSupply;

        it('payment equals the value', async function () {
          const oldBalance = await current(this.from);
          const newBalance = oldBalance.add(amount);
          await transaction(this.token, 'checkTransferIn', 'address,address,address,uint256',
            [ZERO_ADDRESS, tokenOwner, to, amount], { from: tokenOwner, value: amount });
          expect(await current(this.from)).to.be.bignumber.equal(newBalance);
        });
      });

      describe('when transfer value does not equals the value in args', function () {
        const amount = initialSupply;
        const value = initialSupply.subn(1);

        it('payment does not equals the value', async function () {
          await expectRevert(
            transaction(this.token, 'checkTransferIn', 'address,address,address,uint256',
              [ZERO_ADDRESS, tokenOwner, to, amount], { from: tokenOwner, value: value }),
            'VIV0002',
          );
        });
      });
    });

    describe('when the token is not zero address', function () {
      const amount = initialSupply;

      describe('when the sender has enough balance', function () {
        describe('when the sender have enough allowance', function () {
          beforeEach(async function () {
            await this.erc20.approveInternal(tokenOwner, this.from, amount);
          });

          it('payment equals the value', async function () {
            await this.token.checkTransferIn(this.erc20.address, tokenOwner, to, amount);
            expect(await this.erc20.balanceOf(tokenOwner)).to.be.bignumber.equal('0');
            expect(await this.erc20.balanceOf(to)).to.be.bignumber.equal(amount);
          });
        });

        describe('when the sender does not have enough allowance', function () {
          const allowance = initialSupply.subn(1);

          beforeEach(async function () {
            await this.erc20.approveInternal(tokenOwner, this.from, allowance);
          });

          it('reverts', async function () {
            await expectRevert(
              this.token.checkTransferIn(this.erc20.address, tokenOwner, to, amount),
              'VIV0004',
            );
          });
        });
      });

      describe('when the token owner does not have enough balance', function () {
        beforeEach('reducing balance', async function () {
          await this.erc20.transferInternal(tokenOwner, to, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            this.token.checkTransferIn(this.erc20.address, tokenOwner, to, amount),
            'VIV0003',
          );
        });
      });
    });
  });
});
