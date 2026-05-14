const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SignalToken", function () {
  let signal;
  let owner;
  let alice;
  let bob;
  let feeCollector;

  beforeEach(async function () {
    [owner, alice, bob, feeCollector] = await ethers.getSigners();

    const SignalToken = await ethers.getContractFactory("SignalToken");
    signal = await SignalToken.deploy(feeCollector.address);
    await signal.waitForDeployment();
  });

  it("deploys with 100M fixed supply and initial owner whitelist", async function () {
    expect(await signal.totalSupply()).to.equal(ethers.parseEther("100000000"));
    expect(await signal.balanceOf(owner.address)).to.equal(ethers.parseEther("100000000"));
    expect(await signal.feeCollector()).to.equal(feeCollector.address);
    expect(await signal.whitelist(owner.address)).to.equal(true);
  });

  it("charges a 1% fee on standard transfers", async function () {
    await signal.transfer(alice.address, ethers.parseEther("1000"));

    await signal.connect(alice).transfer(bob.address, ethers.parseEther("250"));

    expect(await signal.balanceOf(bob.address)).to.equal(ethers.parseEther("247.5"));
    expect(await signal.balanceOf(feeCollector.address)).to.equal(ethers.parseEther("2.5"));
  });

  it("charges a 1% fee on transferFrom for non-whitelisted accounts", async function () {
    await signal.transfer(alice.address, ethers.parseEther("500"));
    await signal.connect(alice).approve(owner.address, ethers.parseEther("100"));

    await signal.transferFrom(alice.address, bob.address, ethers.parseEther("100"));

    expect(await signal.balanceOf(bob.address)).to.equal(ethers.parseEther("99"));
    expect(await signal.balanceOf(feeCollector.address)).to.equal(ethers.parseEther("1"));
  });

  it("bypasses fees when sender or receiver is whitelisted", async function () {
    await signal.transfer(alice.address, ethers.parseEther("100"));
    await signal.setWhitelist(bob.address, true);

    await signal.connect(alice).transfer(bob.address, ethers.parseEther("40"));

    expect(await signal.balanceOf(bob.address)).to.equal(ethers.parseEther("40"));
    expect(await signal.balanceOf(feeCollector.address)).to.equal(0n);
  });

  it("lets the owner update fee collector", async function () {
    await signal.setFeeCollector(bob.address);
    expect(await signal.feeCollector()).to.equal(bob.address);
  });

  it("restricts admin functions to owner", async function () {
    await expect(
      signal.connect(alice).setWhitelist(bob.address, true)
    ).to.be.revertedWithCustomError(signal, "OwnableUnauthorizedAccount");

    await expect(
      signal.connect(alice).setFeeCollector(bob.address)
    ).to.be.revertedWithCustomError(signal, "OwnableUnauthorizedAccount");
  });

  it("rejects zero address fee collector updates", async function () {
    await expect(
      signal.setFeeCollector(ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid fee collector");
  });
});
