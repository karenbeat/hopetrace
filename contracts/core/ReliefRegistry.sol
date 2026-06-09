// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importações OpenZeppelin
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interfaces do HopeTrace
import "../interfaces/IReliefRegistry.sol";
import "../interfaces/IOrganizationRegistry.sol";

/// @title ReliefRegistry
/// @author HopeTrace
/// @notice Registra e valida campanhas e ações humanitárias verificáveis
/// @dev Depende do OrganizationRegistry para verificar organizações autorizadas
/// @dev Dados sensíveis de beneficiários NUNCA são armazenados on-chain
contract ReliefRegistry is IReliefRegistry, Ownable, ReentrancyGuard {

    // ============ ESTADO ============

    /// @notice Referência ao contrato de organizações
    /// @dev Usado para verificar se quem chama é uma organização ativa
    IOrganizationRegistry public immutable organizationRegistry;

    /// @notice Contadores de IDs — começam em 1
    uint256 private _campaignIdCounter;
    uint256 private _actionIdCounter;

    /// @notice Mapeamentos principais de dados
    mapping(uint256 => Campaign) private _campaigns;
    mapping(uint256 => ReliefAction) private _actions;

    /// @notice Mapeamento de campanha para lista de ações
    mapping(uint256 => uint256[]) private _campaignActions;

    /// @notice Mapeamento de organização para lista de campanhas
    mapping(address => uint256[]) private _orgCampaigns;

    /// @notice Lista de todos os IDs de campanhas
    uint256[] private _campaignIds;

    /// @notice Endereços autorizados a validar ações
    /// @dev Admin pode adicionar validadores — ex: auditores externos
    mapping(address => bool) private _validators;

    /// @notice Estatísticas globais de impacto
    uint256 private _totalBeneficiaries;
    uint256 private _totalValidatedActions;

    // ============ MODIFICADORES ============

    /// @notice Garante que apenas organizações ativas podem chamar
    modifier onlyActiveOrganization() {
        require(
            organizationRegistry.isActiveOrganization(msg.sender),
            "HopeTrace: apenas organizacoes ativas podem executar esta acao"
        );
        _;
    }

    /// @notice Garante que apenas validadores autorizados podem chamar
    modifier onlyValidator() {
        require(
            _validators[msg.sender] || msg.sender == owner(),
            "HopeTrace: apenas validadores autorizados podem executar esta acao"
        );
        _;
    }

    /// @notice Garante que a campanha existe
    modifier campaignExists(uint256 campaignId) {
        require(
            campaignId > 0 && campaignId <= _campaignIdCounter,
            "HopeTrace: campanha nao encontrada"
        );
        _;
    }

    /// @notice Garante que a ação existe
    modifier actionExists(uint256 actionId) {
        require(
            actionId > 0 && actionId <= _actionIdCounter,
            "HopeTrace: acao nao encontrada"
        );
        _;
    }

    /// @notice Garante que a campanha está ativa
    modifier campaignActive(uint256 campaignId) {
        require(
            _campaigns[campaignId].status == CampaignStatus.Active,
            "HopeTrace: campanha nao esta ativa"
        );
        _;
    }

    // ============ CONSTRUTOR ============

    /// @notice Inicializa o contrato vinculando ao OrganizationRegistry
    /// @dev O endereço do OrganizationRegistry é imutável após o deploy
    /// @param _organizationRegistry Endereço do contrato OrganizationRegistry
    constructor(address _organizationRegistry) Ownable(msg.sender) {
        require(
            _organizationRegistry != address(0),
            "HopeTrace: endereco invalido para OrganizationRegistry"
        );
        organizationRegistry = IOrganizationRegistry(_organizationRegistry);
        _campaignIdCounter = 0;
        _actionIdCounter = 0;
        _totalBeneficiaries = 0;
        _totalValidatedActions = 0;
    }

    // ============ FUNÇÕES DE VALIDADORES ============

    /// @notice Adiciona um validador autorizado — somente admin
    /// @dev Validadores podem aprovar ou rejeitar ações humanitárias
    /// @param validator Endereço do validador a adicionar
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "HopeTrace: endereco invalido");
        require(!_validators[validator], "HopeTrace: ja e um validador");
        _validators[validator] = true;
    }

    /// @notice Remove um validador autorizado — somente admin
    /// @param validator Endereço do validador a remover
    function removeValidator(address validator) external onlyOwner {
        require(_validators[validator], "HopeTrace: nao e um validador");
        _validators[validator] = false;
    }

    /// @notice Verifica se um endereço é validador
    /// @param validator Endereço a verificar
    /// @return bool true se for validador
    function isValidator(address validator) external view returns (bool) {
        return _validators[validator] || validator == owner();
    }

    // ============ FUNÇÕES DE CAMPANHA ============

    /// @notice Cria uma nova campanha humanitária
    /// @dev Apenas organizações ativas podem criar campanhas
    /// @param title Título da campanha (ex: "Apoio às vítimas das enchentes")
    /// @param description Descrição do contexto da crise
    /// @param location Localização geral da campanha (sem dados sensíveis)
    function createCampaign(
        string calldata title,
        string calldata description,
        string calldata location
    ) external override onlyActiveOrganization nonReentrant {

        // CHECKS
        require(bytes(title).length > 0, "HopeTrace: titulo obrigatorio");
        require(bytes(title).length <= 200, "HopeTrace: titulo muito longo");
        require(bytes(description).length > 0, "HopeTrace: descricao obrigatoria");
        require(bytes(description).length <= 1000, "HopeTrace: descricao muito longa");
        require(bytes(location).length > 0, "HopeTrace: localizacao obrigatoria");

        // EFFECTS
        _campaignIdCounter++;
        uint256 newId = _campaignIdCounter;

        _campaigns[newId] = Campaign({
            id: newId,
            organization: msg.sender,
            title: title,
            description: description,
            location: location,
            status: CampaignStatus.Active,
            createdAt: block.timestamp,
            totalActions: 0,
            totalBeneficiaries: 0
        });

        // Vincula campanha à organização
        _orgCampaigns[msg.sender].push(newId);
        _campaignIds.push(newId);

        // INTERACTIONS
        emit CampaignCreated(newId, msg.sender, title, location);
    }

    /// @notice Encerra uma campanha ativa
    /// @dev Apenas a organização dona pode encerrar sua própria campanha
    /// @param campaignId ID da campanha a encerrar
    function closeCampaign(
        uint256 campaignId
    ) external override campaignExists(campaignId) campaignActive(campaignId) {

        // CHECKS
        require(
            _campaigns[campaignId].organization == msg.sender || msg.sender == owner(),
            "HopeTrace: apenas a organizacao responsavel pode encerrar"
        );

        // EFFECTS
        _campaigns[campaignId].status = CampaignStatus.Closed;

        // INTERACTIONS
        emit CampaignClosed(campaignId, msg.sender);
    }

    /// @notice Valida uma campanha inteira — somente admin
    /// @dev Campanha validada pode ter NFT emitido pelo HopeCertificate
    /// @param campaignId ID da campanha a validar
    function validateCampaign(
        uint256 campaignId
    ) external override onlyOwner campaignExists(campaignId) {

        // CHECKS
        require(
            _campaigns[campaignId].status == CampaignStatus.Closed,
            "HopeTrace: campanha deve ser encerrada antes de ser validada"
        );

        // EFFECTS
        _campaigns[campaignId].status = CampaignStatus.Validated;

        // INTERACTIONS
        emit CampaignValidated(campaignId, msg.sender);
    }

    // ============ FUNÇÕES DE AÇÃO ============

    /// @notice Registra uma ação humanitária em uma campanha
    /// @dev Evidências pessoais ficam off-chain — apenas o hash é registrado
    /// @param campaignId ID da campanha
    /// @param actionType Tipo da ação humanitária
    /// @param title Título descritivo da ação
    /// @param location Local da ação (sem endereço completo)
    /// @param quantity Quantidade de beneficiários ou itens
    /// @param evidenceHash Hash IPFS do arquivo de evidência off-chain
    function registerAction(
        uint256 campaignId,
        ActionType actionType,
        string calldata title,
        string calldata location,
        uint256 quantity,
        string calldata evidenceHash
    ) external override
        onlyActiveOrganization
        nonReentrant
        campaignExists(campaignId)
        campaignActive(campaignId)
    {
        // CHECKS
        require(
            _campaigns[campaignId].organization == msg.sender,
            "HopeTrace: apenas a organizacao responsavel pode registrar acoes"
        );
        require(bytes(title).length > 0, "HopeTrace: titulo obrigatorio");
        require(quantity > 0, "HopeTrace: quantidade deve ser maior que zero");
        require(bytes(evidenceHash).length > 0, "HopeTrace: hash de evidencia obrigatorio");

        // EFFECTS
        _actionIdCounter++;
        uint256 newId = _actionIdCounter;

        _actions[newId] = ReliefAction({
            id: newId,
            campaignId: campaignId,
            organization: msg.sender,
            actionType: actionType,
            title: title,
            location: location,
            quantity: quantity,
            evidenceHash: evidenceHash,
            status: ActionStatus.Pending,
            validator: address(0),  // Sem validador ainda
            registeredAt: block.timestamp,
            validatedAt: 0          // Será preenchido na validação
        });

        // Vincula ação à campanha
        _campaignActions[campaignId].push(newId);
        _campaigns[campaignId].totalActions++;

        // INTERACTIONS
        emit ReliefActionRegistered(
            newId,
            campaignId,
            msg.sender,
            actionType,
            quantity
        );
    }

    /// @notice Valida uma ação humanitária pendente
    /// @dev Apenas validadores autorizados podem validar ações
    /// @param actionId ID da ação a validar
    function validateAction(
        uint256 actionId
    ) external override onlyValidator actionExists(actionId) {

        // CHECKS
        require(
            _actions[actionId].status == ActionStatus.Pending,
            "HopeTrace: acao nao esta pendente"
        );

        // EFFECTS
        _actions[actionId].status = ActionStatus.Validated;
        _actions[actionId].validator = msg.sender;
        _actions[actionId].validatedAt = block.timestamp;

        // Atualiza estatísticas da campanha e globais
        uint256 campaignId = _actions[actionId].campaignId;
        uint256 quantity = _actions[actionId].quantity;

        _campaigns[campaignId].totalBeneficiaries += quantity;
        _totalBeneficiaries += quantity;
        _totalValidatedActions++;

        // INTERACTIONS
        emit ReliefActionValidated(actionId, campaignId, msg.sender);
        emit GlobalImpactUpdated(
            _totalBeneficiaries,
            _totalValidatedActions,
            _campaignIdCounter
        );
    }

    /// @notice Rejeita uma ação humanitária com justificativa
    /// @dev Ação rejeitada não conta nas estatísticas públicas
    /// @param actionId ID da ação
    /// @param reason Motivo da rejeição para auditoria
    function rejectAction(
        uint256 actionId,
        string calldata reason
    ) external override onlyValidator actionExists(actionId) {

        // CHECKS
        require(
            _actions[actionId].status == ActionStatus.Pending,
            "HopeTrace: acao nao esta pendente"
        );
        require(bytes(reason).length > 0, "HopeTrace: motivo da rejeicao obrigatorio");

        // EFFECTS
        _actions[actionId].status = ActionStatus.Rejected;
        _actions[actionId].validator = msg.sender;
        _actions[actionId].validatedAt = block.timestamp;

        // INTERACTIONS
        emit ReliefActionRejected(actionId, _actions[actionId].campaignId, reason);
    }

    // ============ FUNÇÕES DE CONSULTA (VIEW) ============

    /// @notice Retorna dados completos de uma campanha
    function getCampaign(
        uint256 campaignId
    ) external view override campaignExists(campaignId) returns (Campaign memory) {
        return _campaigns[campaignId];
    }

    /// @notice Retorna dados completos de uma ação
    function getAction(
        uint256 actionId
    ) external view override actionExists(actionId) returns (ReliefAction memory) {
        return _actions[actionId];
    }

    /// @notice Retorna todas as ações de uma campanha
    /// @param campaignId ID da campanha
    /// @return Array de ReliefAction com todas as ações
    function getCampaignActions(
        uint256 campaignId
    ) external view override campaignExists(campaignId) returns (ReliefAction[] memory) {
        uint256[] memory actionIds = _campaignActions[campaignId];
        ReliefAction[] memory actions = new ReliefAction[](actionIds.length);

        for (uint256 i = 0; i < actionIds.length; i++) {
            actions[i] = _actions[actionIds[i]];
        }

        return actions;
    }

    /// @notice Retorna todas as campanhas de uma organização
    /// @param organization Endereço da organização
    /// @return Array de Campaign
    function getOrganizationCampaigns(
        address organization
    ) external view returns (Campaign[] memory) {
        uint256[] memory campaignIds = _orgCampaigns[organization];
        Campaign[] memory campaigns = new Campaign[](campaignIds.length);

        for (uint256 i = 0; i < campaignIds.length; i++) {
            campaigns[i] = _campaigns[campaignIds[i]];
        }

        return campaigns;
    }

    /// @notice Retorna todos os IDs de campanhas cadastradas
    /// @return Array com todos os IDs
    function getAllCampaignIds() external view returns (uint256[] memory) {
        return _campaignIds;
    }

    /// @notice Retorna estatísticas globais de impacto do HopeTrace
    /// @return totalBeneficiaries Total de pessoas beneficiadas
    /// @return totalActions Total de ações validadas
    /// @return totalCampaigns Total de campanhas criadas
    /// @return totalOrganizations Total de organizações cadastradas
    function getGlobalStats() external view override returns (
        uint256 totalBeneficiaries,
        uint256 totalActions,
        uint256 totalCampaigns,
        uint256 totalOrganizations
    ) {
        return (
            _totalBeneficiaries,
            _totalValidatedActions,
            _campaignIdCounter,
            organizationRegistry.getTotalOrganizations()
        );
    }

    /// @notice Retorna ações pendentes de validação
    /// @dev Usado pelo painel do validador no frontend
    /// @return Array de ReliefAction com status Pending
    function getPendingActions() external view returns (ReliefAction[] memory) {
        // Conta quantas ações estão pendentes
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= _actionIdCounter; i++) {
            if (_actions[i].status == ActionStatus.Pending) {
                pendingCount++;
            }
        }

        // Monta o array de retorno
        ReliefAction[] memory pending = new ReliefAction[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= _actionIdCounter; i++) {
            if (_actions[i].status == ActionStatus.Pending) {
                pending[index] = _actions[i];
                index++;
            }
        }

        return pending;
    }
}
