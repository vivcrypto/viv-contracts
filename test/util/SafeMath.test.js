const { BN, constants, expectRevert } = require('@openzeppelin/test-helpers');
const { MAX_UINT256 } = constants;

const { expect } = require('chai');

const SafeMathMock = artifacts.require('SafeMathMock');

contract('SafeMath', function (accounts) {
  beforeEach(async function () {
    this.safeMath = await SafeMathMock.new();
  });

  async function testCommutative (fn, lhs, rhs, expected, ...extra) {
    expect(await fn(lhs, rhs, ...extra)).to.be.bignumber.equal(expected);
    expect(await fn(rhs, lhs, ...extra)).to.be.bignumber.equal(expected);
  }

  async function testFailsCommutative (fn, lhs, rhs, reason, ...extra) {
    if (reason === undefined) {
      await expectRevert.unspecified(fn(lhs, rhs, ...extra));
      await expectRevert.unspecified(fn(rhs, lhs, ...extra));
    } else {
      await expectRevert(fn(lhs, rhs, ...extra), reason);
      await expectRevert(fn(rhs, lhs, ...extra), reason);
    }
  }

  describe('with default revert message', function () {
    describe('add', function () {
      it('adds correctly', async function () {
        const a = new BN('5678');
        const b = new BN('1234');

        await testCommutative(this.safeMath.doAdd, a, b, a.add(b));
      });

      it('reverts on addition overflow', async function () {
        const a = MAX_UINT256;
        const b = new BN('1');

        await testFailsCommutative(this.safeMath.doAdd, a, b, undefined);
      });
    });

    describe('sub', function () {
      it('subtracts correctly', async function () {
        const a = new BN('5678');
        const b = new BN('1234');

        expect(await this.safeMath.doSub(a, b)).to.be.bignumber.equal(a.sub(b));
      });

      it('reverts if subtraction result would be negative', async function () {
        const a = new BN('1234');
        const b = new BN('5678');

        await expectRevert.unspecified(this.safeMath.doSub(a, b));
      });
    });

    describe('mul', function () {
      it('multiplies correctly', async function () {
        const a = new BN('1234');
        const b = new BN('5678');

        await testCommutative(this.safeMath.doMul, a, b, a.mul(b));
      });

      it('multiplies by zero correctly', async function () {
        const a = new BN('0');
        const b = new BN('5678');

        await testCommutative(this.safeMath.doMul, a, b, '0');
      });

      it('reverts on multiplication overflow', async function () {
        const a = MAX_UINT256;
        const b = new BN('2');

        await testFailsCommutative(this.safeMath.doMul, a, b, undefined);
      });
    });

    describe('div', function () {
      it('divides correctly', async function () {
        const a = new BN('5678');
        const b = new BN('5678');

        expect(await this.safeMath.doDiv(a, b)).to.be.bignumber.equal(a.div(b));
      });

      it('divides zero correctly', async function () {
        const a = new BN('0');
        const b = new BN('5678');

        expect(await this.safeMath.doDiv(a, b)).to.be.bignumber.equal('0');
      });

      it('returns complete number result on non-even division', async function () {
        const a = new BN('7000');
        const b = new BN('5678');

        expect(await this.safeMath.doDiv(a, b)).to.be.bignumber.equal('1');
      });

      it('reverts on division by zero', async function () {
        const a = new BN('5678');
        const b = new BN('0');

        await expectRevert.unspecified(this.safeMath.doDiv(a, b));
      });
    });

    describe('rate', function () {
      it('rates correctly', async function () {
        const a = new BN('10000');
        const b = new BN('2');

        expect(await this.safeMath.doRate(a, b)).to.be.bignumber.equal(
          a.mul(b).divn(10000),
        );
      });

      it('rates zero correctly', async function () {
        const a = new BN('0');
        const b = new BN('5678');

        expect(await this.safeMath.doRate(a, b)).to.be.bignumber.equal('0');
      });

      it('returns complete number result on non-even division', async function () {
        const a = new BN('100');
        const b = new BN('2');

        expect(await this.safeMath.doRate(a, b)).to.be.bignumber.equal('0');
      });
    });
  });
});
