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

  /**
   * Teste 1: Verificação da inicialização correta do contrato
   * 
   * Este teste verifica se o contrato foi inicializado corretamente após o deploy:
   * - Confirma que o endereço do sender foi definido como msg.sender no constructor
   * - Confirma que o endereço do recipient foi definido corretamente
   * - Verifica se o contrato recebeu o valor correto (1 ETH) enviado durante o deploy
   * 
   * Relaciona-se com o constructor do contrato que define sender, recipient e recebe valor
   */
  it("deve inicializar corretamente o contrato", async () => {
    expect(await contract.sender()).to.equal(sender.address);
    expect(await contract.recipient()).to.equal(recipient.address);
    expect(await ethers.provider.getBalance(contract.target)).to.equal(amount); 
  });

  /**
   * Teste 2: Fechamento válido do canal pelo recipient
   * 
   * Este teste verifica o fluxo principal do payment channel:
   * - O sender assina uma mensagem autorizando o pagamento de 0.4 ETH
   * - O recipient usa essa assinatura para fechar o canal
   * - Verifica se o recipient recebeu o valor correto (descontando gas)
   * - Confirma que o contrato foi esvaziado após o fechamento
   * - Testa a função close() que é o core do contrato
   * 
   * Relaciona-se com a função close() que valida assinatura e transfere fundos
   */
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

  /**
   * Teste 3: Controle de acesso - apenas recipient pode fechar
   * 
   * Este teste verifica a segurança do contrato:
   * - Tenta fechar o canal com um endereço que não é o recipient
   * - Deve falhar com a mensagem "Only recipient can close"
   * - Testa o modifier/require que protege a função close()
   * 
   * Relaciona-se com o require(msg.sender == recipient) na função close()
   */
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

  /**
   * Teste 4: Validação de assinatura
   * 
   * Este teste verifica a segurança criptográfica do contrato:
   * - Usa uma assinatura de uma conta diferente do sender
   * - Deve falhar com "Invalid signature"
   * - Testa a função isValidSignature() que verifica se a assinatura é do sender
   * 
   * Relaciona-se com isValidSignature() que usa ecrecover para verificar assinatura
   */
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

  /**
   * Teste 5: Extensão da expiração pelo sender
   * 
   * Este teste verifica a funcionalidade de extensão do canal:
   * - Apenas o sender pode estender a expiração
   * - A nova expiração deve ser maior que a atual
   * - Testa a função extend() que permite prolongar o canal
   * 
   * Relaciona-se com a função extend() que permite ao sender dar mais tempo
   */
  it("deve permitir que o sender estenda a expiração", async () => {
    const oldExpiration = await contract.expiration();
    const newExpiration = oldExpiration + 3600n; // Usando BigInt
    
    const tx = await contract.connect(sender).extend(newExpiration);
    await tx.wait();
    
    expect(await contract.expiration()).to.equal(newExpiration);
  });

  /**
   * Teste 6: Validação da extensão - deve ser maior que expiração atual
   * 
   * Este teste verifica as regras de extensão:
   * - Não permite manter a mesma expiração
   * - Não permite reduzir a expiração
   * - Deve falhar com "New expiration must be greater"
   * 
   * Relaciona-se com require(newExpiration > expiration) na função extend()
   */
  it("não deve permitir reduzir ou manter a mesma expiração", async () => {
    const oldExpiration = await contract.expiration();
    
    await expect(
      contract.connect(sender).extend(oldExpiration)
    ).to.be.revertedWith("New expiration must be greater");
    
    await expect(
      contract.connect(sender).extend(oldExpiration - 100n)
    ).to.be.revertedWith("New expiration must be greater");
  });

  /**
   * Teste 7: Recuperação de fundos após expiração
   * 
   * Este teste verifica o mecanismo de timeout:
   * - Simula a passagem do tempo até após a expiração
   * - Permite que o sender recupere todos os fundos
   * - Testa a função claimTimeout() que é o mecanismo de segurança
   * 
   * Relaciona-se com claimTimeout() que permite recuperar fundos após expiração
   */
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

  /**
   * Teste 8: Proteção contra timeout prematuro
   * 
   * Este teste verifica a proteção temporal:
   * - Tenta executar claimTimeout() antes da expiração
   * - Deve falhar com "Not yet expired"
   * - Garante que o sender não pode recuperar fundos prematuramente
   * 
   * Relaciona-se com require(block.timestamp >= expiration) em claimTimeout()
   */
  it("não deve permitir claimTimeout antes da expiração", async () => {
    await expect(
      contract.connect(sender).claimTimeout()
    ).to.be.revertedWith("Not yet expired");
  });
});