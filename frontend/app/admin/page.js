'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import styles from './page.module.css'
import { useWallet } from '@/context/WalletContext'
import {
  getOrganizationRegistry,
  getReliefRegistry,
  getHopeCertificate,
  getProviderAndSigner,
  formatAddress,
  formatDate,
  getOrgTypeName,
  getActionTypeName,
} from '@/utils/contracts'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" className={styles.checkIcon}>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function AdminPage() {
  const { account, isConnected } = useWallet()
  const [activeTab, setActiveTab] = useState('organizacoes')
  const [isOwner, setIsOwner] = useState(false)
  const [checkingOwner, setCheckingOwner] = useState(true)

  // Dados da blockchain
  const [organizations, setOrganizations] = useState([])
  const [validators, setValidators] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [pendingActions, setPendingActions] = useState([])
  const [totalCertificates, setTotalCertificates] = useState(0)

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [buttonStates, setButtonStates] = useState({})
  const [newValidatorAddress, setNewValidatorAddress] = useState('')
  const [nftUris, setNftUris] = useState({})
  const [showSuspendModal, setShowSuspendModal] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [notification, setNotification] = useState(null)

  // Verifica se é owner e carrega dados
  useEffect(() => {
    if (isConnected && account) {
      checkOwnerAndLoadData()
    } else {
      setCheckingOwner(false)
      setLoading(false)
    }
  }, [isConnected, account])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const checkOwnerAndLoadData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)
      const orgRegistry = await getOrganizationRegistry(provider)
      const owner = await orgRegistry.owner()
      const ownerCheck = owner.toLowerCase() === account.toLowerCase()
      setIsOwner(ownerCheck)
      setCheckingOwner(false)
      if (ownerCheck) {
        await loadAllData(provider)
      }
    } catch (err) {
      console.error('Erro ao verificar owner:', err)
      setCheckingOwner(false)
    }
  }

  const loadAllData = async (provider) => {
    try {
      setLoading(true)
      const orgRegistry = await getOrganizationRegistry(provider)
      const reliefRegistry = await getReliefRegistry(provider)
      const hopeCertificate = await getHopeCertificate(provider)

      // Carrega organizações
      const totalOrgs = Number(await orgRegistry.getTotalOrganizations())
      const orgsData = []
      for (let i = 1; i <= totalOrgs; i++) {
        const org = await orgRegistry.getOrganization(i)
        orgsData.push({
          id: Number(org.id),
          name: org.name,
          description: org.description,
          type: getOrgTypeName(Number(org.orgType)),
          status: Number(org.status) === 0 ? 'pendente' : Number(org.status) === 1 ? 'ativa' : 'suspensa',
          address: org.wallet,
          registeredAt: formatDate(org.registeredAt),
          totalActions: Number(org.totalActions),
        })
      }
      setOrganizations(orgsData)

      // Carrega campanhas
      const campaignIds = await reliefRegistry.getAllCampaignIds()
      const campaignsData = []
      for (const id of campaignIds) {
        const c = await reliefRegistry.getCampaign(id)
        const certTokenId = await hopeCertificate.getCampaignCertificate(id)
        campaignsData.push({
          id: Number(c.id),
          name: c.title,
          organization: formatAddress(c.organization),
          beneficiaries: Number(c.totalBeneficiaries),
          actionsCount: Number(c.totalActions),
          status: Number(c.status) === 0 ? 'ativa' : Number(c.status) === 1 ? 'encerrada' : 'validada',
          nftIssued: Number(certTokenId) > 0,
          tokenId: Number(certTokenId),
        })
      }
      setCampaigns(campaignsData)

      // Carrega ações pendentes
      const pending = await reliefRegistry.getPendingActions()
      const pendingData = pending.map(a => ({
        id: Number(a.id),
        title: a.title,
        type: getActionTypeName(Number(a.actionType)),
        quantity: Number(a.quantity),
        organization: formatAddress(a.organization),
        campaignId: Number(a.campaignId),
        evidenceHash: a.evidenceHash,
        date: formatDate(a.registeredAt),
      }))
      setPendingActions(pendingData)

      // Total de certificados
      const totalCerts = Number(await hopeCertificate.getTotalCertificates())
      setTotalCertificates(totalCerts)

      setLoading(false)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setLoading(false)
    }
  }

  const handleApproveOrg = async (orgId) => {
    setButtonStates(prev => ({ ...prev, [`approve-${orgId}`]: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const orgRegistry = await getOrganizationRegistry(signer)
      const tx = await orgRegistry.approveOrganization(orgId)
      await tx.wait()
      setOrganizations(orgs => orgs.map(o => o.id === orgId ? { ...o, status: 'ativa' } : o))
      setButtonStates(prev => ({ ...prev, [`approve-${orgId}`]: 'success' }))
      showNotification('Organização aprovada com sucesso!')
      setTimeout(() => setButtonStates(prev => ({ ...prev, [`approve-${orgId}`]: null })), 2000)
    } catch (err) {
      console.error(err)
      showNotification('Erro ao aprovar organização.', 'error')
      setButtonStates(prev => ({ ...prev, [`approve-${orgId}`]: null }))
    }
  }

  const handleSuspendOrg = async (orgId) => {
    if (!suspendReason.trim()) return
    setButtonStates(prev => ({ ...prev, [`suspend-${orgId}`]: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const orgRegistry = await getOrganizationRegistry(signer)
      const tx = await orgRegistry.suspendOrganization(orgId, suspendReason)
      await tx.wait()
      setOrganizations(orgs => orgs.map(o => o.id === orgId ? { ...o, status: 'suspensa' } : o))
      setShowSuspendModal(null)
      setSuspendReason('')
      showNotification('Organização suspensa.')
    } catch (err) {
      console.error(err)
      showNotification('Erro ao suspender organização.', 'error')
    }
    setButtonStates(prev => ({ ...prev, [`suspend-${orgId}`]: null }))
  }

  const handleReactivateOrg = async (orgId) => {
    setButtonStates(prev => ({ ...prev, [`reactivate-${orgId}`]: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const orgRegistry = await getOrganizationRegistry(signer)
      const tx = await orgRegistry.reactivateOrganization(orgId)
      await tx.wait()
      setOrganizations(orgs => orgs.map(o => o.id === orgId ? { ...o, status: 'ativa' } : o))
      setButtonStates(prev => ({ ...prev, [`reactivate-${orgId}`]: 'success' }))
      showNotification('Organização reativada!')
      setTimeout(() => setButtonStates(prev => ({ ...prev, [`reactivate-${orgId}`]: null })), 2000)
    } catch (err) {
      console.error(err)
      showNotification('Erro ao reativar organização.', 'error')
      setButtonStates(prev => ({ ...prev, [`reactivate-${orgId}`]: null }))
    }
  }

  const handleAddValidator = async (e) => {
    e.preventDefault()
    if (!newValidatorAddress.trim() || !newValidatorAddress.startsWith('0x')) return
    setButtonStates(prev => ({ ...prev, addValidator: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const reliefRegistry = await getReliefRegistry(signer)
      const tx = await reliefRegistry.addValidator(newValidatorAddress)
      await tx.wait()
      setValidators(prev => [...prev, {
        id: prev.length + 1,
        address: newValidatorAddress,
        addedAt: new Date().toLocaleDateString('pt-BR'),
      }])
      setNewValidatorAddress('')
      setButtonStates(prev => ({ ...prev, addValidator: 'success' }))
      showNotification('Validador adicionado com sucesso!')
      setTimeout(() => setButtonStates(prev => ({ ...prev, addValidator: null })), 2000)
    } catch (err) {
      console.error(err)
      showNotification('Erro ao adicionar validador.', 'error')
      setButtonStates(prev => ({ ...prev, addValidator: null }))
    }
  }

  const handleValidateCampaign = async (campaignId) => {
    setButtonStates(prev => ({ ...prev, [`validate-campaign-${campaignId}`]: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const reliefRegistry = await getReliefRegistry(signer)
      const tx = await reliefRegistry.validateCampaign(campaignId)
      await tx.wait()
      setCampaigns(camps => camps.map(c => c.id === campaignId ? { ...c, status: 'validada' } : c))
      setButtonStates(prev => ({ ...prev, [`validate-campaign-${campaignId}`]: 'success' }))
      showNotification('Campanha validada com sucesso!')
      setTimeout(() => setButtonStates(prev => ({ ...prev, [`validate-campaign-${campaignId}`]: null })), 2000)
    } catch (err) {
      console.error(err)
      showNotification('Erro ao validar campanha.', 'error')
      setButtonStates(prev => ({ ...prev, [`validate-campaign-${campaignId}`]: null }))
    }
  }

  const handleIssueNFT = async (campaignId) => {
    const uri = nftUris[campaignId] || ''
    if (!uri.trim()) return
    setButtonStates(prev => ({ ...prev, [`nft-${campaignId}`]: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const hopeCertificate = await getHopeCertificate(signer)
      const tx = await hopeCertificate.mintCertificate(campaignId, uri)
      await tx.wait()
      setCampaigns(camps => camps.map(c => c.id === campaignId ? { ...c, nftIssued: true } : c))
      setNftUris(prev => ({ ...prev, [campaignId]: '' }))
      setButtonStates(prev => ({ ...prev, [`nft-${campaignId}`]: 'success' }))
      showNotification('Certificado NFT emitido com sucesso!')
      setTimeout(() => setButtonStates(prev => ({ ...prev, [`nft-${campaignId}`]: null })), 2000)
    } catch (err) {
      console.error(err)
      showNotification('Erro ao emitir NFT.', 'error')
      setButtonStates(prev => ({ ...prev, [`nft-${campaignId}`]: null }))
    }
  }

  const handleValidateAction = async (actionId) => {
    setButtonStates(prev => ({ ...prev, [`validate-${actionId}`]: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const reliefRegistry = await getReliefRegistry(signer)
      const tx = await reliefRegistry.validateAction(actionId)
      await tx.wait()
      setPendingActions(actions => actions.filter(a => a.id !== actionId))
      showNotification('Ação validada com sucesso!')
    } catch (err) {
      console.error(err)
      showNotification('Erro ao validar ação.', 'error')
      setButtonStates(prev => ({ ...prev, [`validate-${actionId}`]: null }))
    }
  }

  const handleRejectAction = async (actionId) => {
    if (!rejectReason.trim()) return
    setButtonStates(prev => ({ ...prev, [`reject-${actionId}`]: 'loading' }))
    try {
      const { signer } = await getProviderAndSigner()
      const reliefRegistry = await getReliefRegistry(signer)
      const tx = await reliefRegistry.rejectAction(actionId, rejectReason)
      await tx.wait()
      setPendingActions(actions => actions.filter(a => a.id !== actionId))
      setShowRejectModal(null)
      setRejectReason('')
      showNotification('Ação rejeitada.')
    } catch (err) {
      console.error(err)
      showNotification('Erro ao rejeitar ação.', 'error')
      setButtonStates(prev => ({ ...prev, [`reject-${actionId}`]: null }))
    }
  }

  const getStatusStyle = (status) => {
    switch(status) {
      case 'ativa': return { bg: 'rgba(82, 183, 136, 0.15)', color: '#52B788' }
      case 'pendente': return { bg: 'rgba(255, 215, 0, 0.15)', color: '#FFD700' }
      case 'suspensa': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }
      case 'encerrada': return { bg: 'rgba(168, 185, 174, 0.15)', color: '#A8B9AE' }
      case 'validada': return { bg: 'rgba(123, 47, 190, 0.15)', color: '#B794F6' }
      default: return { bg: 'rgba(168, 185, 174, 0.1)', color: '#A8B9AE' }
    }
  }

  const pendingOrgs = organizations.filter(o => o.status === 'pendente').length
  const pendingCampaigns = campaigns.filter(c => c.status === 'encerrada').length

  const tabs = [
    { id: 'organizacoes', label: 'Organizacoes', badge: pendingOrgs > 0 ? pendingOrgs : null },
    { id: 'validadores', label: 'Validadores', badge: validators.length > 0 ? validators.length : null },
    { id: 'campanhas', label: 'Campanhas', badge: pendingCampaigns > 0 ? pendingCampaigns : null },
    { id: 'acoes', label: 'Acoes Pendentes', badge: pendingActions.length > 0 ? pendingActions.length : null },
  ]

  // Tela de carteira não conectada
  if (!isConnected) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" fill="none" width="64" height="64">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="#52B788" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h3>Carteira nao conectada</h3>
              <p>Conecte sua carteira MetaMask para acessar o painel admin.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Tela de verificando owner
  if (checkingOwner) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.emptyState}>
              <p style={{ color: '#A8B9AE' }}>Verificando permissoes...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Tela de acesso restrito
  if (!isOwner) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" fill="none" width="64" height="64">
                <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h3>Acesso Restrito</h3>
              <p>Apenas o administrador do contrato pode acessar este painel.</p>
              <p style={{ color: '#52B788', fontSize: '0.875rem', marginTop: '8px' }}>
                Conectado como: {formatAddress(account)}
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* Notificação */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            style={{
              position: 'fixed',
              top: '100px',
              right: '24px',
              zIndex: 9999,
              padding: '16px 24px',
              borderRadius: '12px',
              background: notification.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(82,183,136,0.15)',
              border: notification.type === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(82,183,136,0.3)',
              color: notification.type === 'error' ? '#EF4444' : '#52B788',
              backdropFilter: 'blur(20px)',
              maxWidth: '320px',
            }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <main className={styles.main}>
        <div className={styles.container}>

          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <span className={styles.label}>Painel Administrativo</span>
              <h1 className={styles.title}>Gerenciar HopeTrace</h1>
            </div>
          </motion.div>

          {loading ? (
            <p style={{ color: '#A8B9AE', textAlign: 'center', padding: '2rem' }}>
              Carregando dados da blockchain...
            </p>
          ) : (
            <>
              <div className={styles.statsGrid}>
                <motion.div className={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <span className={styles.statValue}>{organizations.filter(o => o.status === 'ativa').length}</span>
                  <span className={styles.statLabel}>Organizacoes Ativas</span>
                </motion.div>
                <motion.div className={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <span className={styles.statValue}>{validators.length}</span>
                  <span className={styles.statLabel}>Validadores</span>
                </motion.div>
                <motion.div className={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <span className={styles.statValue}>{totalCertificates}</span>
                  <span className={styles.statLabel}>NFTs Emitidos</span>
                </motion.div>
                <motion.div className={styles.statCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <span className={styles.statValue}>{pendingActions.length}</span>
                  <span className={`${styles.statLabel} ${pendingActions.length > 0 ? styles.pending : ''}`}>
                    Pendentes
                    {pendingActions.length > 0 && <span className={styles.pendingDot} />}
                  </span>
                </motion.div>
              </div>

              <div className={styles.tabs}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                    {tab.badge !== null && tab.badge !== undefined && (
                      <span className={`${styles.tabBadge} ${tab.badge > 0 ? styles.alert : ''}`}>
                        {tab.badge}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <motion.div
                        className={styles.tabIndicator}
                        layoutId="adminTab"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* Aba Organizacoes */}
                {activeTab === 'organizacoes' && (
                  <motion.div key="organizacoes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                    {organizations.length === 0 ? (
                      <div className={styles.emptyState}>
                        <h3>Nenhuma organizacao cadastrada ainda.</h3>
                      </div>
                    ) : (
                      <div className={styles.cardList}>
                        {organizations.map((org, index) => (
                          <motion.div key={org.id} className={styles.orgCard} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                            <div className={styles.orgInfo}>
                              <div className={styles.orgHeader}>
                                <h3 className={styles.orgName}>{org.name}</h3>
                                <span className={styles.statusBadge} style={{ background: getStatusStyle(org.status).bg, color: getStatusStyle(org.status).color }}>
                                  {org.status === 'ativa' ? 'Ativa' : org.status === 'pendente' ? 'Pendente' : 'Suspensa'}
                                </span>
                              </div>
                              <div className={styles.orgMeta}>
                                <span className={styles.orgType}>{org.type}</span>
                                <span className={styles.orgAddress}>{formatAddress(org.address)}</span>
                                <span className={styles.orgDate}>Cadastro: {org.registeredAt}</span>
                                <span className={styles.orgDate}>{org.totalActions} acoes</span>
                              </div>
                            </div>
                            <div className={styles.orgActions}>
                              {org.status === 'pendente' && (
                                <button
                                  className={`${styles.actionBtn} ${styles.approveBtn} ${buttonStates[`approve-${org.id}`] ? styles[buttonStates[`approve-${org.id}`]] : ''}`}
                                  onClick={() => handleApproveOrg(org.id)}
                                  disabled={!!buttonStates[`approve-${org.id}`]}
                                >
                                  {buttonStates[`approve-${org.id}`] === 'loading' && <div className={styles.spinner} />}
                                  {buttonStates[`approve-${org.id}`] === 'success' && <CheckIcon />}
                                  {!buttonStates[`approve-${org.id}`] && 'Aprovar'}
                                </button>
                              )}
                              {org.status === 'ativa' && (
                                <button className={`${styles.actionBtn} ${styles.suspendBtn}`} onClick={() => setShowSuspendModal(org.id)}>
                                  Suspender
                                </button>
                              )}
                              {org.status === 'suspensa' && (
                                <button
                                  className={`${styles.actionBtn} ${styles.reactivateBtn} ${buttonStates[`reactivate-${org.id}`] ? styles[buttonStates[`reactivate-${org.id}`]] : ''}`}
                                  onClick={() => handleReactivateOrg(org.id)}
                                  disabled={!!buttonStates[`reactivate-${org.id}`]}
                                >
                                  {buttonStates[`reactivate-${org.id}`] === 'loading' && <div className={styles.spinner} />}
                                  {buttonStates[`reactivate-${org.id}`] === 'success' && <CheckIcon />}
                                  {!buttonStates[`reactivate-${org.id}`] && 'Reativar'}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Aba Validadores */}
                {activeTab === 'validadores' && (
                  <motion.div key="validadores" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                    <form onSubmit={handleAddValidator} className={styles.addValidatorForm}>
                      <div className={styles.inputWrapper}>
                        <input
                          type="text"
                          value={newValidatorAddress}
                          onChange={(e) => setNewValidatorAddress(e.target.value)}
                          placeholder="Endereco Ethereum do validador (0x...)"
                          className={styles.validatorInput}
                        />
                      </div>
                      <button
                        type="submit"
                        className={`${styles.addValidatorBtn} ${buttonStates.addValidator ? styles[buttonStates.addValidator] : ''}`}
                        disabled={!!buttonStates.addValidator || !newValidatorAddress.trim()}
                      >
                        {buttonStates.addValidator === 'loading' && <div className={styles.spinner} />}
                        {buttonStates.addValidator === 'success' && <CheckIcon />}
                        {!buttonStates.addValidator && (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Adicionar Validador
                          </>
                        )}
                      </button>
                    </form>
                    <h3 className={styles.sectionTitle}>Validadores Registrados</h3>
                    {validators.length === 0 ? (
                      <div className={styles.emptyState}>
                        <h3>Nenhum validador adicionado ainda.</h3>
                      </div>
                    ) : (
                      <div className={styles.validatorsList}>
                        {validators.map((validator, index) => (
                          <motion.div key={index} className={styles.validatorCard} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                            <div className={styles.validatorInfo}>
                              <span className={styles.validatorAddress}>{validator.address}</span>
                              <span className={styles.validatorDate}>Adicionado em: {validator.addedAt}</span>
                            </div>
                            <span className={styles.activeIndicator}>
                              <span className={styles.activeDot} />
                              Ativo
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Aba Campanhas */}
                {activeTab === 'campanhas' && (
                  <motion.div key="campanhas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                    {campaigns.length === 0 ? (
                      <div className={styles.emptyState}>
                        <h3>Nenhuma campanha registrada ainda.</h3>
                      </div>
                    ) : (
                      <div className={styles.cardList}>
                        {campaigns.map((campaign, index) => (
                          <motion.div key={campaign.id} className={styles.campaignCard} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                            <div className={styles.campaignInfo}>
                              <div className={styles.campaignHeader}>
                                <h3 className={styles.campaignName}>{campaign.name}</h3>
                                <span className={styles.statusBadge} style={{ background: getStatusStyle(campaign.status).bg, color: getStatusStyle(campaign.status).color }}>
                                  {campaign.status === 'ativa' ? 'Ativa' : campaign.status === 'encerrada' ? 'Encerrada' : 'Validada'}
                                </span>
                              </div>
                              <div className={styles.campaignMeta}>
                                <span className={styles.campaignOrg}>{campaign.organization}</span>
                                <span className={styles.campaignStats}>{campaign.beneficiaries} beneficiados</span>
                                <span className={styles.campaignStats}>{campaign.actionsCount} acoes</span>
                              </div>
                              {campaign.nftIssued && (
                                <span className={styles.nftBadge}>
                                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  NFT #{campaign.tokenId}
                                </span>
                              )}
                            </div>
                            <div className={styles.campaignActions}>
                              {campaign.status === 'encerrada' && (
                                <button
                                  className={`${styles.actionBtn} ${styles.validateCampaignBtn} ${buttonStates[`validate-campaign-${campaign.id}`] ? styles[buttonStates[`validate-campaign-${campaign.id}`]] : ''}`}
                                  onClick={() => handleValidateCampaign(campaign.id)}
                                  disabled={!!buttonStates[`validate-campaign-${campaign.id}`]}
                                >
                                  {buttonStates[`validate-campaign-${campaign.id}`] === 'loading' && <div className={styles.spinner} />}
                                  {buttonStates[`validate-campaign-${campaign.id}`] === 'success' && <CheckIcon />}
                                  {!buttonStates[`validate-campaign-${campaign.id}`] && 'Validar Campanha'}
                                </button>
                              )}
                              {campaign.status === 'validada' && !campaign.nftIssued && (
                                <div className={styles.nftForm}>
                                  <input
                                    type="text"
                                    value={nftUris[campaign.id] || ''}
                                    onChange={(e) => setNftUris(prev => ({ ...prev, [campaign.id]: e.target.value }))}
                                    placeholder="IPFS URI do certificado"
                                    className={styles.nftInput}
                                  />
                                  <button
                                    className={`${styles.actionBtn} ${styles.issueNftBtn} ${buttonStates[`nft-${campaign.id}`] ? styles[buttonStates[`nft-${campaign.id}`]] : ''}`}
                                    onClick={() => handleIssueNFT(campaign.id)}
                                    disabled={!!buttonStates[`nft-${campaign.id}`] || !nftUris[campaign.id]}
                                  >
                                    {buttonStates[`nft-${campaign.id}`] === 'loading' && <div className={styles.spinner} />}
                                    {buttonStates[`nft-${campaign.id}`] === 'success' && <CheckIcon />}
                                    {!buttonStates[`nft-${campaign.id}`] && 'Emitir NFT'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Aba Acoes Pendentes */}
                {activeTab === 'acoes' && (
                  <motion.div key="acoes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                    {pendingActions.length === 0 ? (
                      <div className={styles.emptyState}>
                        <svg viewBox="0 0 24 24" fill="none" width="64" height="64">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h3>Nenhuma acao pendente</h3>
                        <p>Todas as acoes foram validadas ou rejeitadas.</p>
                      </div>
                    ) : (
                      <div className={styles.cardList}>
                        {pendingActions.map((action, index) => (
                          <motion.div key={action.id} className={styles.pendingActionCard} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                            <div className={styles.actionInfo}>
                              <div className={styles.actionHeader}>
                                <h3 className={styles.actionTitle}>{action.title}</h3>
                                <span className={styles.actionType}>{action.type}</span>
                              </div>
                              <div className={styles.actionMeta}>
                                <span className={styles.actionQuantity}>{action.quantity} unidades</span>
                                <span className={styles.actionOrg}>{action.organization}</span>
                                <span className={styles.actionCampaign}>Campanha #{action.campaignId}</span>
                                <span className={styles.actionDate}>{action.date}</span>
                              </div>
                              {action.evidenceHash && (
                                <span className={styles.orgDate}>
                                  Evidencia: {action.evidenceHash.slice(0, 20)}...
                                </span>
                              )}
                            </div>
                            <div className={styles.pendingActions}>
                              <button
                                className={`${styles.actionBtn} ${styles.validateActionBtn} ${buttonStates[`validate-${action.id}`] ? styles[buttonStates[`validate-${action.id}`]] : ''}`}
                                onClick={() => handleValidateAction(action.id)}
                                disabled={!!buttonStates[`validate-${action.id}`]}
                              >
                                {buttonStates[`validate-${action.id}`] === 'loading' && <div className={styles.spinner} />}
                                {buttonStates[`validate-${action.id}`] === 'success' && <CheckIcon />}
                                {!buttonStates[`validate-${action.id}`] && 'Validar'}
                              </button>
                              <button className={`${styles.actionBtn} ${styles.rejectActionBtn}`} onClick={() => setShowRejectModal(action.id)}>
                                Rejeitar
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </>
          )}
        </div>
      </main>

      {/* Modal Suspensao */}
      <AnimatePresence>
        {showSuspendModal && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSuspendModal(null)}>
            <motion.div className={styles.modal} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Suspender Organizacao</h2>
                <button className={styles.closeBtn} onClick={() => setShowSuspendModal(null)}>
                  <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className={styles.modalBody}>
                <label>Motivo da suspensao</label>
                <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Descreva o motivo..." rows={3} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowSuspendModal(null)}>Cancelar</button>
                <button className={`${styles.submitBtn} ${styles.dangerBtn}`} onClick={() => handleSuspendOrg(showSuspendModal)} disabled={!suspendReason.trim()}>Suspender</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Rejeicao */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRejectModal(null)}>
            <motion.div className={styles.modal} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Rejeitar Acao</h2>
                <button className={styles.closeBtn} onClick={() => setShowRejectModal(null)}>
                  <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className={styles.modalBody}>
                <label>Motivo da rejeicao</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Descreva o motivo..." rows={3} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowRejectModal(null)}>Cancelar</button>
                <button className={`${styles.submitBtn} ${styles.dangerBtn}`} onClick={() => handleRejectAction(showRejectModal)} disabled={!rejectReason.trim()}>Rejeitar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
