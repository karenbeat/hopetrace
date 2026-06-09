import { expect } from "chai";
import { network } from "hardhat";

describe("HopeTrace — Testes Completos", function () {

  let ethers: any;
  let organizationRegistry: any;
  let reliefRegistry: any;
  let hopeCertificate: any;
  let owner: any;
  let org1: any;
  let org2: any;
  let validator: any;
  let stranger: any;

  beforeEach(async function () {
    const conn = await network.create();
    ethers = conn.ethers;

    [owner, org1, org2, validator, stranger] = await ethers.getSigners();

    const OrgRegistry = await ethers.getContractFactory("OrganizationRegistry");
    organizationRegistry = await OrgRegistry.deploy();
    await organizationRegistry.waitForDeployment();

    const ReliefReg = await ethers.getContractFactory("ReliefRegistry");
    reliefRegistry = await ReliefReg.deploy(
      await organizationRegistry.getAddress()
    );
    await reliefRegistry.waitForDeployment();

    const HopeCert = await ethers.getContractFactory("HopeCertificate");
    hopeCertificate = await HopeCert.deploy(
      await reliefRegistry.getAddress()
    );
    await hopeCertificate.waitForDeployment();
  });

  describe("OrganizationRegistry", function () {

    it("deve permitir que uma organização se cadastre", async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Organização de apoio a vítimas de desastres", 0
      );
      const org = await organizationRegistry.getOrganizationByWallet(org1.address);
      expect(org.name).to.equal("ONG Esperança");
      expect(org.status).to.equal(0);
    });

    it("deve impedir cadastro duplicado da mesma carteira", async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Descrição da ONG", 0
      );
      await expect(
        organizationRegistry.connect(org1).registerOrganization(
          "Outra ONG", "Outra descrição", 0
        )
      ).to.be.revertedWith("HopeTrace: carteira ja possui organizacao cadastrada");
    });

    it("deve impedir cadastro com nome vazio", async function () {
      await expect(
        organizationRegistry.connect(org1).registerOrganization(
          "", "Descrição válida", 0
        )
      ).to.be.revertedWith("HopeTrace: nome nao pode ser vazio");
    });

    it("deve permitir que o admin aprove uma organização pendente", async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Descrição", 0
      );
      await organizationRegistry.connect(owner).approveOrganization(1);
      const org = await organizationRegistry.getOrganization(1);
      expect(org.status).to.equal(1);
    });

    it("deve impedir que não-admin aprove organização", async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Descrição", 0
      );
      await expect(
        organizationRegistry.connect(stranger).approveOrganization(1)
	).to.revert(ethers);     
    });

    it("deve permitir que o admin suspenda uma organização ativa", async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Descrição", 0
      );
      await organizationRegistry.connect(owner).approveOrganization(1);
      await organizationRegistry.connect(owner).suspendOrganization(
        1, "Irregularidades detectadas"
      );
      const org = await organizationRegistry.getOrganization(1);
      expect(org.status).to.equal(2);
    });

    it("deve verificar corretamente se organização é ativa", async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Descrição", 0
      );
      expect(
        await organizationRegistry.isActiveOrganization(org1.address)
      ).to.equal(false);
      await organizationRegistry.connect(owner).approveOrganization(1);
      expect(
        await organizationRegistry.isActiveOrganization(org1.address)
      ).to.equal(true);
    });

  });

  describe("ReliefRegistry", function () {

    beforeEach(async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Organização de apoio humanitário", 0
      );
      await organizationRegistry.connect(owner).approveOrganization(1);
      await reliefRegistry.connect(owner).addValidator(validator.address);
    });

    it("deve permitir que organização ativa crie campanha", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Apoio às enchentes RS",
        "Campanha emergencial para vítimas das enchentes",
        "Rio Grande do Sul, Brasil"
      );
      const campaign = await reliefRegistry.getCampaign(1);
      expect(campaign.title).to.equal("Apoio às enchentes RS");
      expect(campaign.status).to.equal(0);
      expect(campaign.organization).to.equal(org1.address);
    });

    it("deve impedir que organização não aprovada crie campanha", async function () {
      await expect(
        reliefRegistry.connect(org2).createCampaign(
          "Campanha inválida", "Descrição", "Local"
        )
      ).to.be.revertedWith(
        "HopeTrace: apenas organizacoes ativas podem executar esta acao"
      );
    });

    it("deve permitir registrar ação humanitária em campanha ativa", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Apoio às enchentes RS", "Campanha emergencial", "Rio Grande do Sul"
      );
      await reliefRegistry.connect(org1).registerAction(
        1, 0, "Abrigo temporário — Ginásio Municipal",
        "Porto Alegre, RS", 150, "QmHash123456789"
      );
      const action = await reliefRegistry.getAction(1);
      expect(action.title).to.equal("Abrigo temporário — Ginásio Municipal");
      expect(action.quantity).to.equal(150);
      expect(action.status).to.equal(0);
    });

    it("deve impedir registrar ação com quantidade zero", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Campanha", "Descrição", "Local"
      );
      await expect(
        reliefRegistry.connect(org1).registerAction(
          1, 0, "Ação inválida", "Local", 0, "QmHash"
        )
      ).to.be.revertedWith("HopeTrace: quantidade deve ser maior que zero");
    });

    it("deve permitir que validador valide uma ação pendente", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Campanha", "Descrição", "Local"
      );
      await reliefRegistry.connect(org1).registerAction(
        1, 0, "Abrigo", "Local", 100, "QmHash"
      );
      await reliefRegistry.connect(validator).validateAction(1);
      const action = await reliefRegistry.getAction(1);
      expect(action.status).to.equal(1);
      expect(action.validator).to.equal(validator.address);
    });

    it("deve impedir que stranger valide ação", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Campanha", "Descrição", "Local"
      );
      await reliefRegistry.connect(org1).registerAction(
        1, 0, "Abrigo", "Local", 100, "QmHash"
      );
      await expect(
        reliefRegistry.connect(stranger).validateAction(1)
      ).to.be.revertedWith(
        "HopeTrace: apenas validadores autorizados podem executar esta acao"
      );
    });

    it("deve atualizar estatísticas globais após validação", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Campanha", "Descrição", "Local"
      );
      await reliefRegistry.connect(org1).registerAction(
        1, 0, "Abrigo", "Local", 200, "QmHash"
      );
      let stats = await reliefRegistry.getGlobalStats();
      expect(stats.totalBeneficiaries).to.equal(0);
      await reliefRegistry.connect(validator).validateAction(1);
      stats = await reliefRegistry.getGlobalStats();
      expect(stats.totalBeneficiaries).to.equal(200);
      expect(stats.totalActions).to.equal(1);
    });

    it("deve permitir rejeitar ação com motivo", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Campanha", "Descrição", "Local"
      );
      await reliefRegistry.connect(org1).registerAction(
        1, 0, "Abrigo", "Local", 100, "QmHash"
      );
      await reliefRegistry.connect(validator).rejectAction(
        1, "Evidência insuficiente para validação"
      );
      const action = await reliefRegistry.getAction(1);
      expect(action.status).to.equal(2);
    });

    it("deve permitir encerrar e validar campanha", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Campanha", "Descrição", "Local"
      );
      await reliefRegistry.connect(org1).closeCampaign(1);
      let campaign = await reliefRegistry.getCampaign(1);
      expect(campaign.status).to.equal(1);
      await reliefRegistry.connect(owner).validateCampaign(1);
      campaign = await reliefRegistry.getCampaign(1);
      expect(campaign.status).to.equal(2);
    });

  });

  describe("HopeCertificate", function () {

    beforeEach(async function () {
      await organizationRegistry.connect(org1).registerOrganization(
        "ONG Esperança", "Descrição", 0
      );
      await organizationRegistry.connect(owner).approveOrganization(1);
      await reliefRegistry.connect(owner).addValidator(validator.address);
      await reliefRegistry.connect(org1).createCampaign(
        "Apoio às enchentes RS", "Campanha emergencial", "Rio Grande do Sul"
      );
      await reliefRegistry.connect(org1).registerAction(
        1, 0, "Abrigo", "Porto Alegre", 150, "QmHash"
      );
      await reliefRegistry.connect(validator).validateAction(1);
      await reliefRegistry.connect(org1).closeCampaign(1);
      await reliefRegistry.connect(owner).validateCampaign(1);
    });

    it("deve emitir certificado NFT para campanha validada", async function () {
      await hopeCertificate.connect(owner).mintCertificate(
        1, "ipfs://QmMetadataHash123"
      );
      const ownerOfToken = await hopeCertificate.ownerOf(1);
      expect(ownerOfToken).to.equal(org1.address);
      const cert = await hopeCertificate.getCertificate(1);
      expect(cert.campaignId).to.equal(1);
      expect(cert.totalBeneficiaries).to.equal(150);
    });

    it("deve calcular nível Silver para 100-499 beneficiários", async function () {
      await hopeCertificate.connect(owner).mintCertificate(
        1, "ipfs://QmMetadata"
      );
      const cert = await hopeCertificate.getCertificate(1);
      expect(cert.level).to.equal(1);
    });

    it("deve impedir emissão de certificado duplicado", async function () {
      await hopeCertificate.connect(owner).mintCertificate(
        1, "ipfs://QmMetadata"
      );
      await expect(
        hopeCertificate.connect(owner).mintCertificate(
          1, "ipfs://QmMetadata"
        )
      ).to.be.revertedWith("HopeTrace: campanha ja possui certificado emitido");
    });

    it("deve impedir certificado para campanha não validada", async function () {
      await reliefRegistry.connect(org1).createCampaign(
        "Campanha Não Validada", "Descrição", "Local"
      );
      await expect(
        hopeCertificate.connect(owner).mintCertificate(
          2, "ipfs://QmMetadata"
        )
      ).to.be.revertedWith(
        "HopeTrace: campanha precisa estar validada para receber certificado"
      );
    });

    it("deve impedir que não-admin emita certificado", async function () {
      await expect(
        hopeCertificate.connect(stranger).mintCertificate(
          1, "ipfs://QmMetadata"
        )
      ).to.revert(ethers);
    });

    it("deve retornar certificados de uma organização", async function () {
      await hopeCertificate.connect(owner).mintCertificate(
        1, "ipfs://QmMetadata"
      );
      const certs = await hopeCertificate.getOrganizationCertificates(org1.address);
      expect(certs.length).to.equal(1);
      expect(certs[0].campaignTitle).to.equal("Apoio às enchentes RS");
    });

  });

});
