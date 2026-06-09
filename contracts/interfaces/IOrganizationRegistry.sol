// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IOrganizationRegistry
/// @notice Interface para o registro de organizações autorizadas no HopeTrace
interface IOrganizationRegistry {

    // ============ ENUMS ============

    /// @notice Tipos de organização aceitos na plataforma
    enum OrgType {
        NGO,           // Organização Não Governamental
        Government,    // Órgão governamental
        Company,       // Empresa privada
        Community      // Organização comunitária
    }

    /// @notice Status da organização na plataforma
    enum OrgStatus {
        Pending,    // Aguardando aprovação
        Active,     // Aprovada e ativa
        Suspended   // Suspensa pelo admin
    }

    // ============ STRUCTS ============

    /// @notice Estrutura de dados de uma organização
    struct Organization {
        uint256 id;
        address wallet;
        string name;
        string description;
        OrgType orgType;
        OrgStatus status;
        uint256 registeredAt;
        uint256 approvedAt;
        uint256 totalActions;
    }

    // ============ EVENTOS ============

    /// @notice Emitido quando uma organização solicita cadastro
    event OrganizationRegistered(
        uint256 indexed id,
        address indexed wallet,
        string name,
        OrgType orgType
    );

    /// @notice Emitido quando o admin aprova uma organização
    event OrganizationApproved(
        uint256 indexed id,
        address indexed wallet,
        string name
    );

    /// @notice Emitido quando uma organização é suspensa
    event OrganizationSuspended(
        uint256 indexed id,
        address indexed wallet,
        string reason
    );

    /// @notice Emitido quando uma organização é reativada
    event OrganizationReactivated(
        uint256 indexed id,
        address indexed wallet
    );

    // ============ FUNÇÕES ============

    function registerOrganization(
        string calldata name,
        string calldata description,
        OrgType orgType
    ) external;

    function approveOrganization(uint256 orgId) external;

    function suspendOrganization(uint256 orgId, string calldata reason) external;

    function reactivateOrganization(uint256 orgId) external;

    function getOrganization(uint256 orgId) external view returns (Organization memory);

    function getOrganizationByWallet(address wallet) external view returns (Organization memory);

    function isActiveOrganization(address wallet) external view returns (bool);

    function getTotalOrganizations() external view returns (uint256);
}
