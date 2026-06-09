import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, REQUIRED_CHAIN_ID } from "./contractAddresses";
import OrganizationRegistryABI from "./OrganizationRegistry.json";
import ReliefRegistryABI from "./ReliefRegistry.json";
import HopeCertificateABI from "./HopeCertificate.json";

// Verifica se MetaMask está instalada
export const isMetaMaskInstalled = () => {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
};

// Conecta carteira MetaMask
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask não encontrada. Por favor instale a extensão.");
  }
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return accounts[0];
};

// Verifica se está na rede Sepolia
export const checkNetwork = async () => {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(chainId, 16) === REQUIRED_CHAIN_ID;
};

// Solicita troca para Sepolia
export const switchToSepolia = async () => {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }], // 11155111 em hex
    });
  } catch (error) {
    throw new Error("Por favor troque para a rede Sepolia no MetaMask.");
  }
};

// Retorna provider e signer
export const getProviderAndSigner = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask não encontrada.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
};

// Retorna instância do OrganizationRegistry
export const getOrganizationRegistry = async (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.ORGANIZATION_REGISTRY,
    OrganizationRegistryABI.abi,
    signerOrProvider
  );
};

// Retorna instância do ReliefRegistry
export const getReliefRegistry = async (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.RELIEF_REGISTRY,
    ReliefRegistryABI.abi,
    signerOrProvider
  );
};

// Retorna instância do HopeCertificate
export const getHopeCertificate = async (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.HOPE_CERTIFICATE,
    HopeCertificateABI.abi,
    signerOrProvider
  );
};

// Formata endereço abreviado
export const formatAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Formata timestamp para data legível
export const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  return new Date(Number(timestamp) * 1000).toLocaleDateString("pt-BR");
};

// Retorna nome do tipo de organização
export const getOrgTypeName = (type) => {
  const types = ["ONG", "Governo", "Empresa", "Comunidade"];
  return types[type] || "Desconhecido";
};

// Retorna nome do status da organização
export const getOrgStatusName = (status) => {
  const statuses = ["Pendente", "Ativa", "Suspensa"];
  return statuses[status] || "Desconhecido";
};

// Retorna nome do tipo de ação humanitária
export const getActionTypeName = (type) => {
  const types = [
    "Abrigo",
    "Alimentação",
    "Kit Higiene",
    "Suporte Médico",
    "Atendimento Social",
    "Roupa",
    "Outro",
  ];
  return types[type] || "Desconhecido";
};

// Retorna nome do status da campanha
export const getCampaignStatusName = (status) => {
  const statuses = ["Ativa", "Encerrada", "Validada"];
  return statuses[status] || "Desconhecido";
};

// Retorna nome do status da ação
export const getActionStatusName = (status) => {
  const statuses = ["Pendente", "Validada", "Rejeitada"];
  return statuses[status] || "Desconhecido";
};

// Retorna nome do nível do certificado
export const getCertificateLevelName = (level) => {
  const levels = ["Bronze", "Prata", "Ouro", "Platina"];
  return levels[level] || "Desconhecido";
};

// Retorna cor do nível do certificado
export const getCertificateLevelColor = (level) => {
  const colors = ["#CD7F32", "#C0C0C0", "#FFD700", "#E5E4E2"];
  return colors[level] || "#FFFFFF";
};
