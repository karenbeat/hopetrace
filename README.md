# HopeTrace 🌱

> **Rastreando esperança, registrando impacto.**

Plataforma Web3 para registrar, validar e certificar ações humanitárias verificáveis na blockchain.

<!-- Banner: adicionar imagem após criar no Canva -->
<!-- ![HopeTrace Banner](assets/banner.png) -->

---

## 📋 Sobre o Projeto

<!-- Screenshot da Home -->
<!-- ![Home Page](assets/screenshots/home.png) -->

O HopeTrace é uma plataforma descentralizada que transforma ações humanitárias em registros verificáveis, auditáveis e transparentes na blockchain.

Em situações de emergência — enchentes, crises habitacionais, campanhas de assistência — as ações de ajuda costumam ser registradas de forma fragmentada em planilhas, mensagens e relatórios internos. Isso dificulta a transparência para doadores, governos e comunidades, além de criar riscos de exposição de dados sensíveis das pessoas atendidas.

O HopeTrace resolve esse problema criando uma infraestrutura Web3 onde organizações autorizadas registram abrigos, doações, refeições, kits e atendimentos sociais com evidências digitais verificáveis. O smart contract valida e armazena provas públicas do impacto, enquanto dados pessoais permanecem protegidos fora da blockchain.

---

## 🎯 Problema

Empresas, ONGs, governos e organizações sociais frequentemente enfrentam dificuldades para comprovar ações de impacto humanitário de maneira confiável, transparente e auditável.

Muitas iniciativas ainda dependem de:
- Relatórios manuais e planilhas
- Registros internos sem rastreabilidade
- Fotos ou documentos isolados
- Validações pouco padronizadas
- Métricas difíceis de auditar

Esse cenário gera baixa rastreabilidade, ausência de métricas confiáveis, dificuldade de validação e baixa confiança de apoiadores, empresas e comunidades.

---

## 💡 Solução

O HopeTrace utiliza blockchain e smart contracts para:

- ✅ **Registrar** ações humanitárias com evidências criptográficas
- ✅ **Validar** cada ação por auditores independentes autorizados
- ✅ **Certificar** campanhas com NFTs verificáveis no Etherscan
- ✅ **Preservar privacidade** — dados pessoais ficam off-chain (IPFS)
- ✅ **Auditar publicamente** — qualquer pessoa pode verificar o impacto

---

## 🏗️ Arquitetura

<!-- Diagrama de arquitetura -->
![Arquitetura HopeTrace](assets/architecture.png)

### Smart Contracts (Modular)

| Contrato | Responsabilidade |
|----------|-----------------|
| `OrganizationRegistry.sol` | Controla quais organizações são autorizadas — identidade e acesso |
| `ReliefRegistry.sol` | Registra campanhas e ações humanitárias — validação e métricas |
| `HopeCertificate.sol` | Emite certificados NFT para campanhas validadas — ERC-721 |

### Fluxo Principal

Organização solicita cadastro
Admin aprova organização
Organização cria campanha humanitária
Organização registra ações com evidência IPFS
Validador independente aprova cada ação
Admin valida a campanha inteira
Smart contract emite NFT automaticamente
Dashboard público exibe impacto verificável

