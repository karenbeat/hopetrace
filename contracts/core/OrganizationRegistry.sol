// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importações do OpenZeppelin — biblioteca auditada e padrão da indústria
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Importação da nossa interface
import "../interfaces/IOrganizationRegistry.sol";

/// @title OrganizationRegistry
/// @author HopeTrace
/// @notice Gerencia o cadastro e aprovação de organizações autorizadas
/// @dev Implementa IOrganizationRegistry com padrões de segurança OpenZeppelin
/// @dev Somente organizações aprovadas podem registrar ações humanitárias
contract OrganizationRegistry is IOrganizationRegistry, Ownable, ReentrancyGuard {

    // ============ ESTADO ============

    /// @notice Contador de IDs — começa em 1 para evitar confusão com "não encontrado"
    uint256 private _orgIdCounter;

    /// @notice Mapeamento de ID para dados da organização
    mapping(uint256 => Organization) private _organizations;

    /// @notice Mapeamento de endereço de carteira para ID da organização
    /// @dev Garante que cada carteira tenha apenas uma organização cadastrada
    mapping(address => uint256) private _walletToOrgId;

    /// @notice Lista de todos os IDs cadastrados para iteração no dashboard
    uint256[] private _orgIds;

    // ============ MODIFICADORES ============

    /// @notice Garante que o chamador não tem organização cadastrada
    modifier notRegistered() {
        require(
            _walletToOrgId[msg.sender] == 0,
            "HopeTrace: carteira ja possui organizacao cadastrada"
        );
        _;
    }

    /// @notice Garante que a organização existe
    modifier orgExists(uint256 orgId) {
        require(
            orgId > 0 && orgId <= _orgIdCounter,
            "HopeTrace: organizacao nao encontrada"
        );
        _;
    }

    /// @notice Garante que o chamador é uma organização ativa
    modifier onlyActiveOrg() {
        uint256 orgId = _walletToOrgId[msg.sender];
        require(orgId != 0, "HopeTrace: organizacao nao cadastrada");
        require(
            _organizations[orgId].status == OrgStatus.Active,
            "HopeTrace: organizacao nao esta ativa"
        );
        _;
    }

    // ============ CONSTRUTOR ============

    /// @notice Inicializa o contrato com o deployer como admin
    /// @dev Ownable(msg.sender) define o dono inicial do contrato
    constructor() Ownable(msg.sender) {
        // Contador começa em 0 — primeiro ID gerado será 1
        _orgIdCounter = 0;
    }

    // ============ FUNÇÕES PÚBLICAS ============

    /// @notice Registra uma nova organização — qualquer endereço pode solicitar
    /// @dev A organização fica com status Pending até aprovação do admin
    /// @param name Nome da organização
    /// @param description Descrição da missão e atuação
    /// @param orgType Tipo da organização (ONG, Governo, Empresa, Comunidade)
    function registerOrganization(
        string calldata name,
        string calldata description,
        OrgType orgType
    ) external override notRegistered nonReentrant {

        // CHECKS — validações antes de qualquer mudança de estado
        require(bytes(name).length > 0, "HopeTrace: nome nao pode ser vazio");
        require(bytes(name).length <= 100, "HopeTrace: nome muito longo");
        require(bytes(description).length > 0, "HopeTrace: descricao nao pode ser vazia");
        require(bytes(description).length <= 500, "HopeTrace: descricao muito longa");

        // EFFECTS — atualiza o estado do contrato
        _orgIdCounter++;
        uint256 newId = _orgIdCounter;

        // Cria a organização com status Pending
        _organizations[newId] = Organization({
            id: newId,
            wallet: msg.sender,
            name: name,
            description: description,
            orgType: orgType,
            status: OrgStatus.Pending,
            registeredAt: block.timestamp,
            approvedAt: 0,          // Será preenchido na aprovação
            totalActions: 0         // Começa sem ações registradas
        });

        // Vincula carteira ao ID para consultas rápidas
        _walletToOrgId[msg.sender] = newId;

        // Adiciona à lista geral
        _orgIds.push(newId);

        // INTERACTIONS — emite evento para auditoria on-chain
        emit OrganizationRegistered(newId, msg.sender, name, orgType);
    }

    /// @notice Aprova uma organização pendente — somente admin
    /// @dev Muda status de Pending para Active
    /// @param orgId ID da organização a ser aprovada
    function approveOrganization(
        uint256 orgId
    ) external override onlyOwner orgExists(orgId) {

        // CHECKS
        require(
            _organizations[orgId].status == OrgStatus.Pending,
            "HopeTrace: organizacao nao esta pendente"
        );

        // EFFECTS
        _organizations[orgId].status = OrgStatus.Active;
        _organizations[orgId].approvedAt = block.timestamp;

        // INTERACTIONS
        emit OrganizationApproved(
            orgId,
            _organizations[orgId].wallet,
            _organizations[orgId].name
        );
    }

    /// @notice Suspende uma organização ativa — somente admin
    /// @dev Organização suspensa não pode registrar novas ações
    /// @param orgId ID da organização
    /// @param reason Motivo da suspensão para auditoria
    function suspendOrganization(
        uint256 orgId,
        string calldata reason
    ) external override onlyOwner orgExists(orgId) {

        // CHECKS
        require(
            _organizations[orgId].status == OrgStatus.Active,
            "HopeTrace: organizacao nao esta ativa"
        );
        require(bytes(reason).length > 0, "HopeTrace: motivo obrigatorio");

        // EFFECTS
        _organizations[orgId].status = OrgStatus.Suspended;

        // INTERACTIONS
        emit OrganizationSuspended(
            orgId,
            _organizations[orgId].wallet,
            reason
        );
    }

    /// @notice Reativa uma organização suspensa — somente admin
    /// @param orgId ID da organização
    function reactivateOrganization(
        uint256 orgId
    ) external override onlyOwner orgExists(orgId) {

        // CHECKS
        require(
            _organizations[orgId].status == OrgStatus.Suspended,
            "HopeTrace: organizacao nao esta suspensa"
        );

        // EFFECTS
        _organizations[orgId].status = OrgStatus.Active;

        // INTERACTIONS
        emit OrganizationReactivated(orgId, _organizations[orgId].wallet);
    }

    // ============ FUNÇÕES DE CONSULTA (VIEW) ============

    /// @notice Retorna dados completos de uma organização por ID
    /// @param orgId ID da organização
    /// @return Organization struct com todos os dados
    function getOrganization(
        uint256 orgId
    ) external view override orgExists(orgId) returns (Organization memory) {
        return _organizations[orgId];
    }

    /// @notice Retorna dados de uma organização pelo endereço da carteira
    /// @param wallet Endereço da carteira da organização
    /// @return Organization struct com todos os dados
    function getOrganizationByWallet(
        address wallet
    ) external view override returns (Organization memory) {
        uint256 orgId = _walletToOrgId[wallet];
        require(orgId != 0, "HopeTrace: nenhuma organizacao para este endereco");
        return _organizations[orgId];
    }

    /// @notice Verifica se um endereço é uma organização ativa
    /// @dev Usado pelo ReliefRegistry para validar quem pode registrar ações
    /// @param wallet Endereço a verificar
    /// @return bool true se ativa, false caso contrário
    function isActiveOrganization(
        address wallet
    ) external view override returns (bool) {
        uint256 orgId = _walletToOrgId[wallet];
        if (orgId == 0) return false;
        return _organizations[orgId].status == OrgStatus.Active;
    }

    /// @notice Retorna o total de organizações cadastradas
    /// @return uint256 total de organizações
    function getTotalOrganizations() external view override returns (uint256) {
        return _orgIdCounter;
    }

    /// @notice Retorna todos os IDs de organizações cadastradas
    /// @dev Usado pelo frontend para listar todas as organizações
    /// @return uint256[] array com todos os IDs
    function getAllOrganizationIds() external view returns (uint256[] memory) {
        return _orgIds;
    }

    /// @notice Incrementa o contador de ações de uma organização
    /// @dev Chamado pelo ReliefRegistry quando uma ação é registrada
    /// @param wallet Endereço da organização
    function incrementOrgActions(address wallet) external {
        uint256 orgId = _walletToOrgId[wallet];
        if (orgId != 0) {
            _organizations[orgId].totalActions++;
        }
    }
}
