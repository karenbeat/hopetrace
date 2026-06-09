import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Módulo de deploy do HopeTrace — deploya os 3 contratos em ordem
// A ordem importa: OrganizationRegistry → ReliefRegistry → HopeCertificate
const HopeTraceModule = buildModule("HopeTraceModule", (m) => {

  // 1. Deploy do OrganizationRegistry — não depende de ninguém
  const organizationRegistry = m.contract("OrganizationRegistry");

  // 2. Deploy do ReliefRegistry — depende do OrganizationRegistry
  const reliefRegistry = m.contract("ReliefRegistry", [
    organizationRegistry
  ]);

  // 3. Deploy do HopeCertificate — depende do ReliefRegistry
  const hopeCertificate = m.contract("HopeCertificate", [
    reliefRegistry
  ]);

  // Retorna os três contratos para referência após o deploy
  return {
    organizationRegistry,
    reliefRegistry,
    hopeCertificate
  };
});

export default HopeTraceModule;
