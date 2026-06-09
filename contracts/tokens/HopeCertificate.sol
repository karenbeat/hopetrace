// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC-721 padrão OpenZeppelin — token não fungível (NFT)
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// Extensão que adiciona metadados URI a cada token
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// Controle de acesso — só o dono pode emitir certificados
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface do ReliefRegistry para verificar campanhas
import "../interfaces/IReliefRegistry.sol";

/// @title HopeCertificate
/// @author HopeTrace
/// @notice Emite certificados NFT para campanhas humanitárias validadas
/// @dev ERC-721 com metadados on-chain — cada token representa uma campanha auditada
/// @dev Apenas campanhas com status Validated no ReliefRegistry recebem certificado
contract HopeCertificate is ERC721, ERC721URIStorage, Ownable {

    // ============ ESTADO ============

    /// @notice Referência ao ReliefRegistry para verificar campanhas
    IReliefRegistry public immutable reliefRegistry;

    /// @notice Contador de tokens — começa em 1
    uint256 private _tokenIdCounter;

    /// @notice Mapeamento de campanha para token emitido
    /// @dev Garante que cada campanha receba apenas um certificado
    mapping(uint256 => uint256) private _campaignToToken;

    /// @notice Mapeamento de token para dados do certificado
    mapping(uint256 => CertificateData) private _certificates;

    /// @notice Mapeamento de organização para lista de tokens
    mapping(address => uint256[]) private _orgTokens;

    // ============ STRUCTS ============

    /// @notice Dados do certificado armazenados on-chain
    struct CertificateData {
        uint256 tokenId;
        uint256 campaignId;         // Campanha que originou o certificado
        address organization;       // Organização que recebe o certificado
        string campaignTitle;       // Título da campanha certificada
        uint256 totalBeneficiaries; // Total de pessoas beneficiadas
        uint256 totalActions;       // Total de ações validadas
        uint256 issuedAt;           // Timestamp de emissão
        CertificateLevel level;     // Nível do certificado por impacto
    }

    /// @notice Níveis de certificado baseados no impacto da campanha
    enum CertificateLevel {
        Bronze,   // 1 a 99 beneficiários
        Silver,   // 100 a 499 beneficiários
        Gold,     // 500 a 1999 beneficiários
        Platinum  // 2000 ou mais beneficiários
    }

    // ============ EVENTOS ============

    /// @notice Emitido quando um certificado é emitido para uma campanha
    event CertificateMinted(
        uint256 indexed tokenId,
        uint256 indexed campaignId,
        address indexed organization,
        CertificateLevel level,
        uint256 totalBeneficiaries
    );

    // ============ CONSTRUTOR ============

    /// @notice Inicializa o contrato NFT vinculado ao ReliefRegistry
    /// @param _reliefRegistry Endereço do contrato ReliefRegistry
    constructor(
        address _reliefRegistry
    ) ERC721("HopeTrace Certificate", "HOPE") Ownable(msg.sender) {
        require(
            _reliefRegistry != address(0),
            "HopeTrace: endereco invalido para ReliefRegistry"
        );
        reliefRegistry = IReliefRegistry(_reliefRegistry);
        _tokenIdCounter = 0;
    }

    // ============ FUNÇÕES PRINCIPAIS ============

    /// @notice Emite certificado NFT para uma campanha validada
    /// @dev Só pode ser chamado pelo admin após campanha ser validada
    /// @dev Cada campanha pode receber apenas um certificado
    /// @param campaignId ID da campanha no ReliefRegistry
    /// @param metadataURI URI dos metadados do NFT (armazenado no IPFS)
    function mintCertificate(
        uint256 campaignId,
        string calldata metadataURI
    ) external onlyOwner {

        // CHECKS — verifica se campanha pode receber certificado
        require(
            _campaignToToken[campaignId] == 0,
            "HopeTrace: campanha ja possui certificado emitido"
        );
        require(
            bytes(metadataURI).length > 0,
            "HopeTrace: URI de metadados obrigatoria"
        );

        // Busca dados da campanha no ReliefRegistry
        IReliefRegistry.Campaign memory campaign = reliefRegistry.getCampaign(campaignId);

        // Verifica se campanha foi validada
        require(
            campaign.status == IReliefRegistry.CampaignStatus.Validated,
            "HopeTrace: campanha precisa estar validada para receber certificado"
        );

        // EFFECTS — calcula nível e emite o NFT
        CertificateLevel level = _calculateLevel(campaign.totalBeneficiaries);

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        // Armazena dados do certificado on-chain
        _certificates[newTokenId] = CertificateData({
            tokenId: newTokenId,
            campaignId: campaignId,
            organization: campaign.organization,
            campaignTitle: campaign.title,
            totalBeneficiaries: campaign.totalBeneficiaries,
            totalActions: campaign.totalActions,
            issuedAt: block.timestamp,
            level: level
        });

        // Vincula campanha ao token
        _campaignToToken[campaignId] = newTokenId;

        // Adiciona à lista da organização
        _orgTokens[campaign.organization].push(newTokenId);

        // Minta o NFT para a organização responsável
        _safeMint(campaign.organization, newTokenId);

        // Define os metadados do token
        _setTokenURI(newTokenId, metadataURI);

        // INTERACTIONS
        emit CertificateMinted(
            newTokenId,
            campaignId,
            campaign.organization,
            level,
            campaign.totalBeneficiaries
        );
    }

    // ============ FUNÇÕES DE CONSULTA ============

    /// @notice Retorna dados completos de um certificado
    /// @param tokenId ID do token NFT
    /// @return CertificateData struct com todos os dados
    function getCertificate(
        uint256 tokenId
    ) external view returns (CertificateData memory) {
        require(
            tokenId > 0 && tokenId <= _tokenIdCounter,
            "HopeTrace: certificado nao encontrado"
        );
        return _certificates[tokenId];
    }

    /// @notice Retorna o token de uma campanha específica
    /// @param campaignId ID da campanha
    /// @return tokenId do certificado (0 se não emitido)
    function getCampaignCertificate(
        uint256 campaignId
    ) external view returns (uint256) {
        return _campaignToToken[campaignId];
    }

    /// @notice Retorna todos os certificados de uma organização
    /// @param organization Endereço da organização
    /// @return Array de CertificateData
    function getOrganizationCertificates(
        address organization
    ) external view returns (CertificateData[] memory) {
        uint256[] memory tokenIds = _orgTokens[organization];
        CertificateData[] memory certs = new CertificateData[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            certs[i] = _certificates[tokenIds[i]];
        }

        return certs;
    }

    /// @notice Retorna o total de certificados emitidos
    function getTotalCertificates() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /// @notice Retorna o nível do certificado em texto
    /// @param level Enum CertificateLevel
    /// @return string com o nome do nível
    function getLevelName(
        CertificateLevel level
    ) external pure returns (string memory) {
        if (level == CertificateLevel.Bronze) return "Bronze";
        if (level == CertificateLevel.Silver) return "Prata";
        if (level == CertificateLevel.Gold) return "Ouro";
        return "Platina";
    }

    // ============ FUNÇÕES INTERNAS ============

    /// @notice Calcula o nível do certificado baseado no impacto
    /// @dev Bronze < 100, Silver < 500, Gold < 2000, Platinum >= 2000
    /// @param totalBeneficiaries Total de pessoas beneficiadas
    /// @return CertificateLevel nível calculado
    function _calculateLevel(
        uint256 totalBeneficiaries
    ) internal pure returns (CertificateLevel) {
        if (totalBeneficiaries >= 2000) return CertificateLevel.Platinum;
        if (totalBeneficiaries >= 500) return CertificateLevel.Gold;
        if (totalBeneficiaries >= 100) return CertificateLevel.Silver;
        return CertificateLevel.Bronze;
    }

    // ============ OVERRIDES OBRIGATÓRIOS ============

    /// @notice Override obrigatório quando ERC721 e ERC721URIStorage são combinados
    /// @dev Solidity exige override explícito quando duas classes pai implementam a mesma função
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /// @notice Override obrigatório para suporte a interfaces ERC-721
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
