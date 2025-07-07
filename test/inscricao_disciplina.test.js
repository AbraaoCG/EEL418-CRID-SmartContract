const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InscricaoDisciplina", function () {
  let InscricaoDisciplina;
  let inscricaoDisciplina;
  let reitoria;
  let aluno1;
  let aluno2;
  let aluno3;

  // Constantes para os testes
  const NOME_DISCIPLINA = "Calculo I";
  const PERIODO = "2024.1";
  const TOTAL_VAGAS = 2;
  const DEADLINE_OFFSET = 86400; // 24 horas em segundos

  beforeEach(async function () {
    // Obter os signers
    [reitoria, aluno1, aluno2, aluno3] = await ethers.getSigners();

    // Deploy do contrato
    InscricaoDisciplina = await ethers.getContractFactory("InscricaoDisciplina");
    
    // Calcular deadline para 24 horas no futuro
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = currentTime + DEADLINE_OFFSET;
    
    inscricaoDisciplina = await InscricaoDisciplina.deploy(
      NOME_DISCIPLINA,
      PERIODO,
      TOTAL_VAGAS,
      deadline
    );
    
    await inscricaoDisciplina.waitForDeployment();
  });

  describe("Deploy", function () {
    /**
     * Teste de deploy com parâmetros válidos
     * 
     * Cenário: Deploy do contrato com todos os parâmetros corretos
     * - Nome da disciplina: "Calculo I"
     * - Período: "2024.1"
     * - Total de vagas: 2
     * - Deadline: 24 horas no futuro
     * 
     * Resultado esperado:
     * - Contrato deve ser deployado com sucesso
     * - Todas as variáveis devem estar corretamente inicializadas
     * - Vagas ocupadas deve começar em 0
     * - Reitoria deve ser o endereço que fez o deploy
     */
    it("testeDeployComParametrosValidos", async function () {
      expect(await inscricaoDisciplina.nomeDisciplina()).to.equal(NOME_DISCIPLINA);
      expect(await inscricaoDisciplina.periodo()).to.equal(PERIODO);
      expect(await inscricaoDisciplina.totalVagas()).to.equal(TOTAL_VAGAS);
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(0);
      expect(await inscricaoDisciplina.reitoria()).to.equal(reitoria.address);
    });

    /**
     * Teste de deploy com número de vagas inválido
     * 
     * Cenário: Tentativa de deploy com 0 vagas
     * - Parâmetros corretos exceto totalVagas = 0
     * 
     * Resultado esperado:
     * - Deploy deve falhar com erro "Total de vagas deve ser maior que zero"
     * - Contrato não deve ser criado
     */
    it("testeDeployComVagasZero", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const deadline = currentTime + DEADLINE_OFFSET;
      
      await expect(
        InscricaoDisciplina.deploy(
          NOME_DISCIPLINA,
          PERIODO,
          0, // vagas zero
          deadline
        )
      ).to.be.revertedWith("Total de vagas deve ser maior que zero");
    });
  });

  describe("Inscricoes", function () {
    /**
     * Teste de inscrição bem-sucedida
     * 
     * Cenário: Aluno se inscreve em disciplina com vagas disponíveis
     * - Prazo de inscrição ainda está aberto
     * - Há vagas disponíveis (2 vagas, 0 ocupadas)
     * - Aluno não possui inscrição prévia
     * 
     * Resultado esperado:
     * - Evento "InscricaoRealizada" deve ser emitido
     * - Número de vagas ocupadas deve aumentar para 1
     * - Status da inscrição do aluno deve ser "Prevista" (1)
     */
    it("testeInscricaoComSucesso", async function () {
      await expect(inscricaoDisciplina.connect(aluno1).inscrever())
        .to.emit(inscricaoDisciplina, "InscricaoRealizada")
      
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(1);
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno1.address)).to.equal(1); // Prevista
    });

    /**
     * Teste de inscrição sem vagas disponíveis
     * 
     * Cenário: Tentativa de inscrição quando todas as vagas estão ocupadas
     * - Dois alunos já se inscreveram (2 vagas ocupadas de 2 totais)
     * - Terceiro aluno tenta se inscrever
     * 
     * Resultado esperado:
     * - Transação deve falhar com erro "Nao ha vagas disponiveis"
     * - Número de vagas ocupadas deve permanecer em 2
     * - Terceiro aluno não deve ser inscrito
     */
    it("testeInscricaoSemVagasDisponiveis", async function () {
      // Ocupar todas as vagas
      await inscricaoDisciplina.connect(aluno1).inscrever();
      await inscricaoDisciplina.connect(aluno2).inscrever();
      
      // Tentar inscrever terceiro aluno
      await expect(
        inscricaoDisciplina.connect(aluno3).inscrever()
      ).to.be.revertedWith("Nao ha vagas disponiveis");
    });
  });

  describe("Cancelamento", function () {
    beforeEach(async function () {
      // Inscrever aluno1 antes de cada teste de cancelamento
      await inscricaoDisciplina.connect(aluno1).inscrever();
    });

    /**
     * Teste de cancelamento bem-sucedido
     * 
     * Cenário: Aluno cancela sua inscrição dentro do prazo
     * - Aluno1 já está inscrito com status "Prevista"
     * - Prazo de inscrição ainda está aberto
     * 
     * Resultado esperado:
     * - Evento "InscricaoCancelada" deve ser emitido
     * - Status da inscrição deve mudar para "Cancelada" (2)
     * - Operação deve ser bem-sucedida
     */
    it("testeCancelamentoComSucesso", async function () {
      await expect(inscricaoDisciplina.connect(aluno1).cancelarInscricao())
        .to.emit(inscricaoDisciplina, "InscricaoCancelada")
      
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno1.address)).to.equal(2); // Cancelada
    });

    /**
     * Teste de liberação de vaga após cancelamento
     * 
     * Cenário: Verificar se vaga é liberada após cancelamento
     * - Aluno1 está inscrito (1 vaga ocupada)
     * - Aluno1 cancela a inscrição
     * - Aluno2 tenta se inscrever na vaga liberada
     * 
     * Resultado esperado:
     * - Após cancelamento, vagas ocupadas deve voltar para 0
     * - Aluno2 deve conseguir se inscrever na vaga liberada
     * - Evento "InscricaoRealizada" deve ser emitido para aluno2
     */
    it("testeCancelamentoLiberaVaga", async function () {
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(1);
      
      await inscricaoDisciplina.connect(aluno1).cancelarInscricao();
      
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(0);
      
      // Verificar se outro aluno pode se inscrever na vaga liberada
      await expect(inscricaoDisciplina.connect(aluno2).inscrever())
        .to.emit(inscricaoDisciplina, "InscricaoRealizada");
    });
  });

  describe("Efetivacao", function () {
    beforeEach(async function () {
      // Inscrever alguns alunos
      await inscricaoDisciplina.connect(aluno1).inscrever();
      await inscricaoDisciplina.connect(aluno2).inscrever();
      
    });

    /**
     * Teste de efetivação restrita à reitoria
     * 
     * Cenário: Verificar controle de acesso para efetivação
     * - Dois alunos estão inscritos com status "Prevista"
     * - Deadline já passou
     * - Aluno tenta efetivar (não deve conseguir)
     * - Reitoria efetiva (deve conseguir)
     * 
     * Resultado esperado:
     * - Tentativa do aluno deve falhar com erro de permissão
     * - Efetivação pela reitoria deve funcionar
     * - Evento "InscricaoEfetivada" deve ser emitido
     */
    it("testeEfetivacaoApenasReitoria", async function () {
      // Cria contrato com deadline de 100 segundos
      const timeDif = 100;
      const now = Math.floor(Date.now() / 1000);
      const deadline = now + timeDif;

      const contratoDeadlineCurto = await InscricaoDisciplina.deploy(
        NOME_DISCIPLINA,
        PERIODO,
        TOTAL_VAGAS,
        deadline
      );
      
      await contratoDeadlineCurto.waitForDeployment();
      // Inscreve dois alunos
      await contratoDeadlineCurto.connect(aluno1).inscrever();
      await contratoDeadlineCurto.connect(aluno2).inscrever();

      // Avança o tempo do EVM para passar o deadline
      await ethers.provider.send("evm_increaseTime", [timeDif + 1]);
      await ethers.provider.send("evm_mine");

      // Tentar efetivar com aluno (não reitoria)
      await expect(
      contratoDeadlineCurto.connect(aluno1).efetivarInscricoes()
      ).to.be.revertedWith("Apenas a reitoria pode executar esta funcao");

      // Efetivar com reitoria
      await expect(contratoDeadlineCurto.connect(reitoria).efetivarInscricoes())
      .to.emit(contratoDeadlineCurto, "InscricaoEfetivada");
    });

    /**
     * Teste de efetivação antes do deadline
     * 
     * Cenário: Tentativa de efetivação antes do prazo
     * - Alunos estão inscritos
     * - Deadline ainda não foi atingido (volta no tempo)
     * - Reitoria tenta efetivar antes do prazo
     * 
     * Resultado esperado:
     * - Efetivação deve falhar com erro "Deadline ainda nao foi atingido"
     * - Nenhuma inscrição deve ser efetivada
     */
    
    it("testeEfetivacaoAntesDeadline", async function () {
      // // Voltar tempo para antes do deadline
      // await ethers.provider.send("evm_increaseTime", [-(DEADLINE_OFFSET + 100)]);
      // await ethers.provider.send("evm_mine");
      
      await expect(
        inscricaoDisciplina.connect(reitoria).efetivarInscricoes()
      ).to.be.revertedWith("Deadline ainda nao foi atingido");
    });
  });


  describe("Consultas", function () {
    beforeEach(async function () {
      await inscricaoDisciplina.connect(aluno1).inscrever();
    });

    /**
     * Teste de consulta de status de inscrição
     * 
     * Cenário: Verificar diferentes status de inscrição
     * - Aluno1 está inscrito (status "Prevista")
     * - Aluno2 nunca se inscreveu (status "Inexistente")
     * - Aluno1 cancela inscrição (status "Cancelada")
     * 
     * Resultado esperado:
     * - Status do aluno1 deve ser 1 (Prevista) inicialmente
     * - Status do aluno2 deve ser 0 (Inexistente)
     * - Após cancelamento, status do aluno1 deve ser 2 (Cancelada)
     */
    it("testeObterStatusInscricao", async function () {
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno1.address)).to.equal(1); // Prevista
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno2.address)).to.equal(0); // Inexistente
      
      await inscricaoDisciplina.connect(aluno1).cancelarInscricao();
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno1.address)).to.equal(2); // Cancelada
    });

    /**
     * Teste de consulta da lista de alunos inscritos (restrito à reitoria)
     * 
     * Cenário: Verificar controle de acesso à lista de inscritos
     * - Aluno1 está inscrito
     * - Aluno tenta acessar lista (não deve conseguir)
     * - Reitoria acessa lista (deve conseguir)
     * 
     * Resultado esperado:
     * - Tentativa do aluno deve falhar com erro de permissão
     * - Reitoria deve conseguir acessar a lista
     * - Lista deve conter 1 aluno (aluno1)
     */
    it("testeObterAlunosInscritosApenasReitoria", async function () {
      // Tentar acessar com aluno (não reitoria)
      await expect(
        inscricaoDisciplina.connect(aluno1).obterAlunosInscritos()
      ).to.be.revertedWith("Apenas a reitoria pode executar esta funcao");
      
      // Acessar com reitoria
      const alunosInscritos = await inscricaoDisciplina.connect(reitoria).obterAlunosInscritos();
      expect(alunosInscritos).to.have.lengthOf(1);
      expect(alunosInscritos[0]).to.equal(aluno1.address);
    });

    /**
     * Teste de consulta de vagas disponíveis
     * 
     * Cenário: Verificar cálculo correto de vagas disponíveis
     * - Inicialmente: 2 vagas totais, 1 ocupada = 1 disponível
     * - Após segunda inscrição: 2 vagas totais, 2 ocupadas = 0 disponível
     * 
     * Resultado esperado:
     * - Função deve retornar 1 vaga disponível inicialmente
     * - Após segunda inscrição, deve retornar 0 vagas disponíveis
     */
    it("testeObterVagasDisponiveis", async function () {
      expect(await inscricaoDisciplina.obterVagasDisponiveis()).to.equal(1); // 2 total - 1 ocupada
      
      await inscricaoDisciplina.connect(aluno2).inscrever();
      expect(await inscricaoDisciplina.obterVagasDisponiveis()).to.equal(0); // 2 total - 2 ocupadas
    });
  });

  describe("Cenarios Complexos", function () {
    /**
     * Teste de gerenciamento completo de vagas
     * 
     * Cenário: Fluxo completo de inscrições com múltiplas operações
     * - Verifica estado inicial das vagas
     * - Inscreve dois alunos (ocupando todas as vagas)
     * - Cancela uma inscrição (liberando vaga)
     * - Inscreve terceiro aluno na vaga liberada
     * - Verifica contagem de status durante o processo
     * - Efetiva inscrições após deadline
     * - Verifica estado final
     * 
     * Resultado esperado:
     * - Gerenciamento correto de vagas durante todo o processo
     * - Contagem correta de status em cada etapa
     * - Status final: 1 cancelada, 2 efetivadas
     * - Todas as operações devem funcionar conforme esperado
     */
    it("testeGerenciamentoVagasCompleto", async function () {
      // Verificar vagas iniciais
      expect(await inscricaoDisciplina.obterVagasDisponiveis()).to.equal(2);
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(0);
      
      // Inscrever primeiro aluno
      await inscricaoDisciplina.connect(aluno1).inscrever();
      expect(await inscricaoDisciplina.obterVagasDisponiveis()).to.equal(1);
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(1);
      
      // Inscrever segundo aluno
      await inscricaoDisciplina.connect(aluno2).inscrever();
      expect(await inscricaoDisciplina.obterVagasDisponiveis()).to.equal(0);
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(2);
      
      // Cancelar primeira inscrição
      await inscricaoDisciplina.connect(aluno1).cancelarInscricao();
      expect(await inscricaoDisciplina.obterVagasDisponiveis()).to.equal(1);
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(1);
      
      // Inscrever terceiro aluno na vaga liberada
      await inscricaoDisciplina.connect(aluno3).inscrever();
      expect(await inscricaoDisciplina.obterVagasDisponiveis()).to.equal(0);
      expect(await inscricaoDisciplina.vagasOcupadas()).to.equal(2);
      
      // Verificar contagem por status
      const [previstas, canceladas, efetivadas] = await inscricaoDisciplina.obterContagemPorStatus();
      expect(previstas).to.equal(2); // aluno2 e aluno3
      expect(canceladas).to.equal(1); // aluno1
      expect(efetivadas).to.equal(0); // nenhum ainda
      
      // Avançar tempo e efetivar
      await ethers.provider.send("evm_increaseTime", [DEADLINE_OFFSET + 1]);
      await ethers.provider.send("evm_mine");
      
      await inscricaoDisciplina.connect(reitoria).efetivarInscricoes();
      
      // Verificar status final
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno1.address)).to.equal(2); // Cancelada
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno2.address)).to.equal(3); // Efetivada
      expect(await inscricaoDisciplina.obterStatusInscricao(aluno3.address)).to.equal(3); // Efetivada
      
      // Verificar contagem final
      const [previstasFinal, canceladasFinal, efetivadasFinal] = await inscricaoDisciplina.obterContagemPorStatus();
      expect(previstasFinal).to.equal(0);
      expect(canceladasFinal).to.equal(1);
      expect(efetivadasFinal).to.equal(2);
    });
  });
});