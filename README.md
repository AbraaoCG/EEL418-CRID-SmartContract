# Smart Contract para Certificados de Registro de Inscrição em Disciplinas (CRID)

## Sobre o Projeto

Este projeto implementa um sistema descentralizado para gerenciamento e emissão de certificados de registro de inscrição em disciplinas universitárias utilizando **smart contracts** em uma rede de blocos descentralizada. O sistema visa substituir processos manuais e centralizados por uma solução que oferece **transparência**, **imutabilidade** e **verificabilidade** para as inscrições acadêmicas.

## Objetivos

- **Registrar disciplinas** de forma segura e transparente na blockchain
- Permitir que **alunos se inscrevam** em disciplinas com controle automático de vagas
- Possibilitar à **reitoria emitir certificados digitais** de registro de inscrição
- Garantir **verificabilidade instantânea** e permanente dos certificados
- Estabelecer um **pipeline CI/CD robusto** para desenvolvimento e testes automatizados

## Arquitetura

### Smart Contract Principal
- **`InscricaoDisciplina.sol`**: Gerencia o processo completo de inscrições
  - Controle de vagas disponíveis
  - Gerenciamento de prazos (deadlines)
  - Sistema de estados para inscrições
  - Funções administrativas restritas à reitoria

### Estados de Inscrição
- **Inexistente** (0): Aluno não se inscreveu
- **Prevista** (1): Inscrição realizada dentro do prazo
- **Cancelada** (2): Inscrição cancelada pelo aluno
- **Efetivada** (3): Inscrição confirmada pela reitoria após deadline

### Funcionalidades Principais
-  **Inscrição de alunos** com controle de vagas
-  **Cancelamento de inscrições** com liberação de vagas
-  **Efetivação de inscrições** pela reitoria após deadline
-  **Consulta de status** de inscrições
-  **Auditoria completa** através de eventos blockchain

## Tecnologias Utilizadas

- **Solidity 0.8.0** - Linguagem para smart contracts
- **Hardhat** - Framework de desenvolvimento e testes
- **GitHub Actions** - Pipeline CI/CD automatizado
- **Ethereum** - Blockchain para deploy dos contratos

## Como Executar

### Pré-requisitos
```bash
node --version  # >= 14.0.0
npm --version   # >= 6.0.0
```

### Instalação
```bash
# Clone o repositório
git clone https://github.com/AbraaoCG/EEL418-SmartContract.git
cd EEL418-SmartContract

# Instale as dependências
npm install
```

### Compilação
```bash
# Compile os contratos
npx hardhat compile
```

### Testes
```bash
# Execute todos os testes
npx hardhat test

# Execute testes com relatório de gas
npx hardhat test --reporter hardhat-gas-reporter

# Execute testes com cobertura de código
npx hardhat coverage
```

### Deploy Local
```bash
# Inicie uma rede local
npx hardhat node

# Em outro terminal, faça o deploy
npx hardhat run scripts/deploy.js --network localhost
```

##  Casos de Teste

O projeto inclui **12 casos de teste** abrangentes que validam:

### Testes de Inicialização
-  Deploy com parâmetros válidos
-  Rejeição de parâmetros inválidos

### Testes de Inscrição
-  Inscrição bem-sucedida
-  Controle de vagas esgotadas

### Testes de Cancelamento
-  Cancelamento de inscrição
-  Liberação de vagas

### Testes de Efetivação
-  Controle de acesso (apenas reitoria)
-  Validação de deadline

### Testes de Consulta
-  Consulta de status de inscrição
-  Lista de alunos inscritos (restrito)
-  Consulta de vagas disponíveis

### Teste Integrado
-  Fluxo completo de gerenciamento

## Pipeline CI/CD

O projeto utiliza **GitHub Actions** para automação completa:

```yaml
# Executado em cada Pull Request
- Instalação de dependências
- Compilação dos contratos
- Execução de todos os testes
- Análise de cobertura de código
- Análise estática de segurança
- Deploy em testnets (opcional)
```

## Eventos e Auditoria

O contrato emite eventos para rastreabilidade completa:

```solidity
event InscricaoRealizada(address indexed aluno, uint256 timestamp);
event InscricaoCancelada(address indexed aluno, uint256 timestamp);
event InscricaoEfetivada(address indexed aluno, uint256 timestamp);
```

## Segurança

- **Controle de acesso** baseado em roles (reitoria vs alunos)
- **Validação de deadlines** para operações temporais
- **Proteção contra overflow** (Solidity 0.8.0+)
- **Análise estática** de vulnerabilidades
- **Testes de segurança** automatizados

## Benefícios

- **Transparência**: Todos os registros são públicos e verificáveis
- **Imutabilidade**: Dados não podem ser alterados maliciosamente
- **Descentralização**: Elimina pontos únicos de falha
- **Automação**: Reduz processos manuais e burocráticos
- **Auditabilidade**: Histórico completo de todas as operações

## Trabalhos Futuros

- Implementação de **pré-requisitos** para disciplinas
- Sistema de **prioridades** de inscrição
- Interface web para interação com o contrato
- Integração com sistemas acadêmicos existentes
- Suporte a **múltiplas disciplinas** em um único contrato

## Equipe

- **Abraão Carvalho Gomes** - Universidade Federal do Rio de Janeiro (UFRJ)
- **Pedro Eduardo** - Universidade Federal do Rio de Janeiro (UFRJ)
- **João Lacerda** - Universidade Federal do Rio de Janeiro (UFRJ)

## Licença

Este projeto é parte de um trabalho acadêmico desenvolvido na disciplina EEL418 - Universidade Federal do Rio de Janeiro.

## Referências

- [Blockcerts - MIT Media Lab](https://www.blockcerts.org/)
- [OpenBadges - Mozilla Foundation](https://openbadges.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Hardhat Framework](https://hardhat.org/)

-
