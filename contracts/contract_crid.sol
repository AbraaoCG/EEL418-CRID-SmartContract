// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InscricaoDisciplina {
    // Endereço da reitoria (owner do contrato)
    address public reitoria;
    
    // Informações da disciplina
    string public nomeDisciplina;
    string public periodo; // Ex: "2024.1", "2024.2", "2025.1"
    uint256 public totalVagas;
    uint256 public vagasOcupadas;
    uint256 public deadline; // Timestamp para efetivação das inscrições
    
    // Status das inscrições
    enum StatusInscricao { Inexistente, Prevista, Cancelada, Efetivada }
    
    // Mapeamento de inscrições por aluno
    mapping(address => StatusInscricao) public inscricoes;
    
    // Lista de alunos inscritos (para facilitar iteração)
    address[] public alunosInscritos;
    
    // Mapping para verificar se aluno já está na lista
    mapping(address => bool) public alunoNaLista;
    
    // Eventos
    event InscricaoRealizada(address indexed aluno, uint256 timestamp);
    event InscricaoCancelada(address indexed aluno, uint256 timestamp);
    event InscricaoEfetivada(address indexed aluno, uint256 timestamp);
    
    // Modificadores
    modifier apenasReitoria() {
        require(msg.sender == reitoria, "Apenas a reitoria pode executar esta funcao");
        _;
    }
    
    modifier prazoAberto() {
        require(block.timestamp < deadline, "Prazo para inscricoes encerrado");
        _;
    }
    
    modifier vagasDisponiveis() {
        require(vagasOcupadas < totalVagas, "Nao ha vagas disponiveis");
        _;
    }
    
    // Construtor
    constructor(
        string memory _nomeDisciplina,
        string memory _periodo,
        uint256 _totalVagas,
        uint256 _deadline
    ) {
        require(_deadline > block.timestamp, "Deadline deve ser no futuro");
        require(bytes(_nomeDisciplina).length > 0, "Nome da disciplina nao pode ser vazio");
        require(bytes(_periodo).length > 0, "Periodo nao pode ser vazio");
        require(_totalVagas > 0, "Total de vagas deve ser maior que zero");
        
        reitoria = msg.sender;
        nomeDisciplina = _nomeDisciplina;
        periodo = _periodo;
        totalVagas = _totalVagas;
        deadline = _deadline;
        vagasOcupadas = 0;
    }
    
    // Função para aluno se inscrever
    function inscrever() external prazoAberto vagasDisponiveis {
        require(inscricoes[msg.sender] == StatusInscricao.Inexistente, "Aluno ja possui inscricao");
        
        inscricoes[msg.sender] = StatusInscricao.Prevista;
        
        // Adiciona à lista se não estiver
        if (!alunoNaLista[msg.sender]) {
            alunosInscritos.push(msg.sender);
            alunoNaLista[msg.sender] = true;
        }
        
        vagasOcupadas++;
        
        emit InscricaoRealizada(msg.sender, block.timestamp);
    }
    
    // Função para aluno cancelar inscrição
    function cancelarInscricao() external prazoAberto {
        require(inscricoes[msg.sender] == StatusInscricao.Prevista, "Nao ha inscricao prevista para cancelar");
        
        inscricoes[msg.sender] = StatusInscricao.Cancelada;
        vagasOcupadas--;
        
        emit InscricaoCancelada(msg.sender, block.timestamp);
    }
    
    // Função para efetivar inscrições após deadline (apenas reitoria)
    function efetivarInscricoes() external apenasReitoria {
        require(block.timestamp >= deadline, "Deadline ainda nao foi atingido");
        
        for (uint256 i = 0; i < alunosInscritos.length; i++) {
            address aluno = alunosInscritos[i];
            
            if (inscricoes[aluno] == StatusInscricao.Prevista) {
                inscricoes[aluno] = StatusInscricao.Efetivada;
                emit InscricaoEfetivada(aluno, block.timestamp);
            }
        }
    }
    
    // Função para obter status da inscrição do aluno
    function obterStatusInscricao(address _aluno) external view returns (StatusInscricao) {
        return inscricoes[_aluno];
    }
    
    // Função para obter informações gerais da disciplina
    function obterInfoDisciplina() external view returns (
        string memory nome,
        string memory per,
        uint256 vagas,
        uint256 ocupadas,
        uint256 prazo
    ) {
        return (
            nomeDisciplina,
            periodo,
            totalVagas,
            vagasOcupadas,
            deadline
        );
    }
    
    // Função para obter lista de alunos inscritos (apenas reitoria)
    function obterAlunosInscritos() external view apenasReitoria returns (address[] memory) {
        return alunosInscritos;
    }
    
    // Função para verificar se deadline passou
    function deadlinePassou() external view returns (bool) {
        return block.timestamp >= deadline;
    }
    
    // Função para obter contagem de inscrições por status
    function obterContagemPorStatus() external view returns (
        uint256 previstas,
        uint256 canceladas,
        uint256 efetivadas
    ) {
        for (uint256 i = 0; i < alunosInscritos.length; i++) {
            StatusInscricao status = inscricoes[alunosInscritos[i]];
            
            if (status == StatusInscricao.Prevista) {
                previstas++;
            } else if (status == StatusInscricao.Cancelada) {
                canceladas++;
            } else if (status == StatusInscricao.Efetivada) {
                efetivadas++;
            }
        }
    }
    
    // Função para obter vagas disponíveis
    function obterVagasDisponiveis() external view returns (uint256) {
        return totalVagas - vagasOcupadas;
    }
}