"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  isMetaMaskInstalled,
  connectWallet as connectWalletUtil,
  checkNetwork,
  switchToSepolia,
  formatAddress,
} from "../utils/contracts";

// Cria o contexto global da carteira
const WalletContext = createContext({});

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verifica conexão existente ao carregar a página
  useEffect(() => {
    checkExistingConnection();

    if (isMetaMaskInstalled()) {
      // Detecta mudança de conta
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      // Detecta mudança de rede
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (isMetaMaskInstalled()) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // Verifica se já existe conta conectada
  const checkExistingConnection = async () => {
    if (!isMetaMaskInstalled()) return;
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        const correctNetwork = await checkNetwork();
        setIsCorrectNetwork(correctNetwork);
      }
    } catch (err) {
      console.error("Erro ao verificar conexão:", err);
    }
  };

  // Lida com mudança de conta
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
      setIsConnected(true);
    }
  };

  // Lida com mudança de rede
  const handleChainChanged = async () => {
    const correctNetwork = await checkNetwork();
    setIsCorrectNetwork(correctNetwork);
  };

  // Conecta carteira
  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isMetaMaskInstalled()) {
        throw new Error("MetaMask não encontrada. Instale a extensão.");
      }
      const address = await connectWalletUtil();
      setAccount(address);
      setIsConnected(true);
      const correctNetwork = await checkNetwork();
      setIsCorrectNetwork(correctNetwork);
      if (!correctNetwork) {
        await switchToSepolia();
        setIsCorrectNetwork(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Desconecta carteira
  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnected,
        isCorrectNetwork,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        formatAddress,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Hook para usar o contexto em qualquer componente
export const useWallet = () => useContext(WalletContext);
