// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IReliefRegistry
/// @notice Interface para o registro de campanhas e ações humanitárias no HopeTrace
/// @dev Define os tipos, estruturas, eventos e funções que o ReliefRegistry deve implementar
interface IReliefRegistry {

    // ============ ENUMS ============

    /// @notice Tipos de ação humanitária registrável na plataforma
    /// @dev Cada tipo representa uma categoria diferente de impacto social
    enum ActionType {
        Shelter,        // Abrigo temporário — vagas disponibilizadas
        Food,           // Distribuição de alimentos ou refeições
        HygieneKit,     // Entrega de kits de higiene
        MedicalSupport, // Suporte médico ou psicológico
        SocialCare,     // Atendimento social geral
        Clothing,       // Doação de roupas
        Other           // Outros tipos de ação humanitária
    }

    /// @notice Status do ciclo de vida de uma campanha
    enum CampaignStatus {
        Active,     // Campanha em andamento, aceitando ações
        Closed,     // Campanha encerrada pelo organizador
        Validated   // Campanha auditada e validada pelo admin
    }

    /// @notice Status do ciclo de vida de uma ação humanitária
    enum ActionStatus {
        Pending,    // Registrada, aguardando validação
        Validated,  // Validada por um validador autorizado
        Rejected    // Rejeitada por inconsistência ou fraude
    }

    // ============ STRUCTS ============

    /// @notice Estrutura de uma campanha humanitária
    /// @dev Campanhas agrupam ações de impacto de uma mesma organização/evento
    struct Campaign {
        uint256 id;
        address organization;       // Endereço da organização responsável
        string title;               // Título da campanha
        string description;         // Descrição do contexto da crise
        string location;            // Localização geral (cidade, estado)
        CampaignStatus status;      // Status atual da campanha
        uint256 createdAt;          // Timestamp de criação
        uint256 totalActions;       // Total de ações registradas
        uint256 totalBeneficiaries; // Total de pessoas beneficiadas
    }

    /// @notice Estrutura de uma ação humanitária registrada
    /// @dev Dados sensíveis dos beneficiários NUNCA são armazenados on-chain
    struct ReliefAction {
        uint256 id;
        uint256 campaignId;         // Campanha à qual pertence
        address organization;       // Organização que registrou
        ActionType actionType;      // Tipo da ação humanitária
        string title;               // Título descritivo da ação
        string location;            // Local da ação (sem endereço completo)
        uint256 quantity;           // Quantidade (vagas, refeições, kits)
        string evidenceHash;        // Hash IPFS da evidência off-chain
        ActionStatus status;        // Status de validação
        address validator;          // Endereço de quem validou
        uint256 registeredAt;       // Timestamp do registro
        uint256 validatedAt;        // Timestamp da validação
    }

    // ============ EVENTOS ============

    /// @notice Emitido quando uma nova campanha é criada
    event CampaignCreated(
        uint256 indexed id,
        address indexed organization,
        string title,
        string location
    );

    /// @notice Emitido quando uma campanha é encerrada
    event CampaignClosed(
        uint256 indexed id,
        address indexed organization
    );

    /// @notice Emitido quando uma campanha é validada pelo admin
    event CampaignValidated(
        uint256 indexed id,
        address indexed validator
    );

    /// @notice Emitido quando uma ação humanitária é registrada
    event ReliefActionRegistered(
        uint256 indexed id,
        uint256 indexed campaignId,
        address indexed organization,
        ActionType actionType,
        uint256 quantity
    );

    /// @notice Emitido quando uma ação é validada
    event ReliefActionValidated(
        uint256 indexed id,
        uint256 indexed campaignId,
        address indexed validator
    );

    /// @notice Emitido quando uma ação é rejeitada
    event ReliefActionRejected(
        uint256 indexed id,
        uint256 indexed campaignId,
        string reason
    );

    /// @notice Emitido quando o impacto global é atualizado
    event GlobalImpactUpdated(
        uint256 totalBeneficiaries,
        uint256 totalActions,
        uint256 totalCampaigns
    );

    // ============ FUNÇÕES ============

    /// @notice Cria uma nova campanha humanitária
    function createCampaign(
        string calldata title,
        string calldata description,
        string calldata location
    ) external;

    /// @notice Registra uma ação humanitária em uma campanha
    function registerAction(
        uint256 campaignId,
        ActionType actionType,
        string calldata title,
        string calldata location,
        uint256 quantity,
        string calldata evidenceHash
    ) external;

    /// @notice Valida uma ação humanitária registrada
    function validateAction(uint256 actionId) external;

    /// @notice Rejeita uma ação humanitária com justificativa
    function rejectAction(uint256 actionId, string calldata reason) external;

    /// @notice Encerra uma campanha
    function closeCampaign(uint256 campaignId) external;

    /// @notice Valida uma campanha inteira (admin)
    function validateCampaign(uint256 campaignId) external;

    /// @notice Retorna dados de uma campanha
    function getCampaign(uint256 campaignId) external view returns (Campaign memory);

    /// @notice Retorna dados de uma ação
    function getAction(uint256 actionId) external view returns (ReliefAction memory);

    /// @notice Retorna todas as ações de uma campanha
    function getCampaignActions(uint256 campaignId) external view returns (ReliefAction[] memory);

    /// @notice Retorna estatísticas globais de impacto
    function getGlobalStats() external view returns (
        uint256 totalBeneficiaries,
        uint256 totalActions,
        uint256 totalCampaigns,
        uint256 totalOrganizations
    );
}
