const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimplePaymentChannel", function () {
  let sender, recipient, other;
  let contract;
  let amount = ethers.parseEther("1");

  beforeEach(async () => {
    [sender, recipient, other] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("SimplePaymentChannel", sender);
    contract = await Contract.deploy(recipient.address, 3600, { value: amount }); // 1h
    await contract.waitForDeployment(); // Substituído contract.deployed()
  });

  it("deve inicializar corretamente o contrato", async () => {
    expect(await contract.sender()).to.equal(sender.address);
    expect(await contract.recipient()).to.equal(recipient.address);
    expect(await ethers.provider.getBalance(contract.target)).to.equal(amount); // contract.target em vez de contract.address
  });

  it("deve permitir que o recipient feche o canal com uma assinatura válida", async () => {
    const paidAmount = ethers.parseEther("0.4");
    
    // Criar hash corretamente para ethers v6
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256"], 
      [contract.target, paidAmount]
    );
    
    const signature = await sender.signMessage(ethers.getBytes(messageHash));
    
    const initialRecipientBalance = await ethers.provider.getBalance(recipient.address);
    const tx = await contract.connect(recipient).close(paidAmount, signature);
    const receipt = await tx.wait();
    
    const finalRecipientBalance = await ethers.provider.getBalance(recipient.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    // O recipient recebe o paidAmount menos o custo do gas
    const expectedBalance = initialRecipientBalance + paidAmount - gasUsed;
    expect(finalRecipientBalance).to.equal(expectedBalance);
    
    // Verificar se o contrato foi esvaziado (saldo restante foi para o sender)
    expect(await ethers.provider.getBalance(contract.target)).to.equal(0);
  });

  it("não deve permitir que outro endereço feche o canal", async () => {
    const paidAmount = ethers.parseEther("0.2");
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256"], 
      [contract.target, paidAmount]
    );
    const signature = await sender.signMessage(ethers.getBytes(messageHash));

    await expect(
      contract.connect(other).close(paidAmount, signature)
    ).to.be.revertedWith("Only recipient can close");
  });

  it("não deve aceitar assinatura inválida", async () => {
    const paidAmount = ethers.parseEther("0.2");
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256"], 
      [contract.target, paidAmount]
    );
    const signature = await other.signMessage(ethers.getBytes(messageHash)); // assinatura do outro

    await expect(
      contract.connect(recipient).close(paidAmount, signature)
    ).to.be.revertedWith("Invalid signature");
  });

  it("deve permitir que o sender estenda a expiração", async () => {
    const oldExpiration = await contract.expiration();
    const newExpiration = oldExpiration + 3600n; // Usando BigInt
    
    const tx = await contract.connect(sender).extend(newExpiration);
    await tx.wait();
    
    expect(await contract.expiration()).to.equal(newExpiration);
  });

  it("não deve permitir reduzir ou manter a mesma expiração", async () => {
    const oldExpiration = await contract.expiration();
    
    await expect(
      contract.connect(sender).extend(oldExpiration)
    ).to.be.revertedWith("New expiration must be greater");
    
    await expect(
      contract.connect(sender).extend(oldExpiration - 100n)
    ).to.be.revertedWith("New expiration must be greater");
  });

  it("deve permitir que o sender recupere o saldo após expiração", async () => {
    // avança o tempo
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);

    const balanceBefore = await ethers.provider.getBalance(sender.address);
    const tx = await contract.connect(sender).claimTimeout();
    const receipt = await tx.wait();
    const balanceAfter = await ethers.provider.getBalance(sender.address);

    expect(balanceAfter > balanceBefore).to.be.true;
  });

  it("não deve permitir claimTimeout antes da expiração", async () => {
    await expect(
      contract.connect(sender).claimTimeout()
    ).to.be.revertedWith("Not yet expired");
  });
});