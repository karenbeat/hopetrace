'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import CertificateCard from '@/components/CertificateCard'
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
  getCertificateLevelName,
  getCertificateLevelColor,
} from '@/utils/contracts'
import { CONTRACT_ADDRESSES, BLOCK_EXPLORER } from '@/utils/contractAddresses'

const ACTION_TYPES = [
  { label: 'Abrigo', value: 0 },
  { label: 'Alimentacao', value: 1 },
  { label: 'Kit Higiene', value: 2 },
  { label: 'Suporte Medico', value: 3 },
  { label: 'Atendimento Social', value: 4 },
  { label: 'Roupa', value: 5 },
  { label: 'Outro', value: 6 },
]

const ORG_TYPES = [
  { label: 'ONG', value: 0 },
  { label: 'Governo', value: 1 },
  { label: 'Empresa', value: 2 },
  { label: 'Comunidade', value: 3 },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function OrganizacaoPage() {
  const { account, isConnected } = useWallet()
  const [activeTab, setActiveTab] = useState('cadastro')
  const [expandedCampaign, setExpandedCampaign] = useState(null)

  // Dados da blockchain
  const [orgData, setOrgData] = useState(null)
  const [orgStatus, setOrgStatus] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulários
  const [cadastroForm, setCadastroForm] = useState({ name: '', description: '', type: 0 })
  const [campanhaForm, setCampanhaForm] = useState({ title: '', description: '', location: '' })
  const [acaoForm, setAcaoForm] = useState({ campaignId: '', type: 0, title: '', location: '', quantity: '', ipfsHash: '' })

  // UI
  const [showCampanhaModal, setShowCampanhaModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    if (isConnected && account) {
      loadOrgData()
    } else {
      setLoading(false)
    }
  }, [isConnected, account])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadOrgData = async () => {
    try {
      setLoading(true)
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)
      const orgRegistry = await getOrganizationRegistry(provider)
      const reliefRegistry = await getReliefRegistry(provider)
      const hopeCertificate = await getHopeCertificate(provider)

      // Verifica se tem organização cadastrada
      try {
        const org = await orgRegistry.getOrganizationByWallet(account)
        setOrgData({
          id: Number(org.id),
          name: org.name,
          description: org.description,
          type: getOrgTypeName(Number(org.orgType)),
          totalActions: Number(org.totalActions),
          registeredAt: formatDate(org.registeredAt),
        })
        const status = Number(org.status)
        console.log('Status numerico:', status)
        console.log('Wallet:', account)
        setOrgStatus(status === 0 ? 'pendente' : status === 1 ? 'ativa' : 'suspensa')

        // Se ativa, carrega campanhas
        if (status === 1) {
	console.log('Carregando campanhas para:', account)
	console.log('Status da org:', status)
          const orgCampaigns = await reliefRegistry.getOrganizationCampaigns(account)
	console.log('Campanhas encontradas:', orgCampaigns)          
	const campaignsData = []
          for (const c of orgCampaigns) {
            const actions = await reliefRegistry.getCampaignActions(Number(c.id))
            campaignsData.push({
              id: Number(c.id),
              title: c.title,
              description: c.description,
              location: c.location,
              status: Number(c.status) === 0 ? 'ativa' : Number(c.status) === 1 ? 'encerrada' : 'validada',
              totalBeneficiaries: Number(c.totalBeneficiaries),
              totalActions: Number(c.totalActions),
              actions: actions.map(a => ({
                id: Number(a.id),
                title: a.title,
                type: getActionTypeName(Number(a.actionType)),
                quantity: Number(a.quantity),
                location: a.location,
                status: Number(a.status) === 0 ? 'pendente' : Number(a.status) === 1 ? 'validado' : 'rejeitado',
              })),
            })
          }
          setCampaigns(campaignsData)

          // Carrega certificados
          const certs = await hopeCertificate.getOrganizationCertificates(account)
          const certsData = certs.map(cert => ({
            tokenId: Number(cert.tokenId).toString(),
            name: cert.campaignTitle,
            level: getCertificateLevelName(Number(cert.level)).toLowerCase(),
            totalBeneficiaries: Number(cert.totalBeneficiaries),
            actionsCount: Number(cert.totalActions),
            issuedDate: formatDate(cert.issuedAt),
          }))
          setCertificates(certsData)
        }
      } catch (err) {
        console.log("Erro ao buscar org:", err.message)
        setOrgData(null)
        setOrgStatus(null)
      }

      setLoading(false)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setLoading(false)
    }
  }

  const handleCadastroSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { signer } = await getProviderAndSigner()
      const orgRegistry = await getOrganizationRegistry(signer)
      const tx = await orgRegistry.registerOrganization(
        cadastroForm.name,
        cadastroForm.description,
        cadastroForm.type
      )
      await tx.wait()
      showNotification('Solicitacao enviada! Aguarde aprovacao do administrador.')
      await loadOrgData()
    } catch (err) {
      console.error(err)
      showNotification('Erro ao enviar solicitacao.', 'error')
    }
    setIsSubmitting(false)
  }

  const handleCampanhaSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { signer } = await getProviderAndSigner()
      const reliefRegistry = await getReliefRegistry(signer)
      const tx = await reliefRegistry.createCampaign(
        campanhaForm.title,
        campanhaForm.description,
        campanhaForm.location
      )
      await tx.wait()
      showNotification('Campanha criada com sucesso!')
      setShowCampanhaModal(false)
      setCampanhaForm({ title: '', description: '', location: '' })
      await loadOrgData()
    } catch (err) {
      console.error(err)
      showNotification('Erro ao criar campanha.', 'error')
    }
    setIsSubmitting(false)
  }

  const handleAcaoSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { signer } = await getProviderAndSigner()
      const reliefRegistry = await getReliefRegistry(signer)
      const tx = await reliefRegistry.registerAction(
        Number(acaoForm.campaignId),
        Number(acaoForm.type),
        acaoForm.title,
        acaoForm.location,
        Number(acaoForm.quantity),
        acaoForm.ipfsHash
      )
      await tx.wait()
      showNotification('Acao registrada com sucesso! Aguarde validacao.')
      setAcaoForm({ campaignId: '', type: 0, title: '', location: '', quantity: '', ipfsHash: '' })
      await loadOrgData()
    } catch (err) {
      console.error(err)
      showNotification('Erro ao registrar acao.', 'error')
    }
    setIsSubmitting(false)
  }

  const handleEncerrarCampanha = async (campaignId) => {
    try {
      const { signer } = await getProviderAndSigner()
      const reliefRegistry = await getReliefRegistry(signer)
      const tx = await reliefRegistry.closeCampaign(campaignId)
      await tx.wait()
      showNotification('Campanha encerrada com sucesso!')
      await loadOrgData()
    } catch (err) {
      console.error(err)
      showNotification('Erro ao encerrar campanha.', 'error')
    }
  }

  const isOrgActive = orgStatus === 'ativa'
  const activeCampaigns = campaigns.filter(c => c.status === 'ativa')
  const hasActiveCampaign = activeCampaigns.length > 0

  const getTabs = () => {
    const tabs = [{ id: 'cadastro', label: 'Minha Organizacao' }]
    if (isOrgActive) {
      tabs.push({ id: 'campanhas', label: 'Minhas Campanhas' })
      if (hasActiveCampaign) tabs.push({ id: 'acoes', label: 'Registrar Acao' })
    }
    tabs.push({ id: 'certificados', label: 'Certificados' })
    return tabs
  }

  // Carteira não conectada
  if (!isConnected) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.container}>
            <motion.div className={styles.walletWarning} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
              <h2>Carteira Nao Conectada</h2>
              <p>Conecte sua carteira MetaMask para acessar o painel da organizacao.</p>
            </motion.div>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.container}>
            <p style={{ color: '#A8B9AE', textAlign: 'center', padding: '4rem' }}>
              Carregando dados da blockchain...
            </p>
          </div>
        </main>
      </div>
    )
  }

  const tabs = getTabs()

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
              position: 'fixed', top: '100px', right: '24px', zIndex: 9999,
              padding: '16px 24px', borderRadius: '12px',
              background: notification.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(82,183,136,0.15)',
              border: notification.type === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(82,183,136,0.3)',
              color: notification.type === 'error' ? '#EF4444' : '#52B788',
              backdropFilter: 'blur(20px)', maxWidth: '320px',
            }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <main className={styles.main}>
        <div className={styles.container}>

          <motion.div className={styles.panelHeader} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.welcomeSection}>
              <span className={styles.welcomeLabel}>Painel da Organizacao</span>
              <h1 className={styles.title}>
                {orgData ? orgData.name : 'Bem-vindo ao HopeTrace'}
              </h1>
              <div className={styles.walletAddress}>
                {formatAddress(account)}
              </div>
            </div>
          </motion.div>

          {orgStatus === 'suspensa' && (
            <motion.div className={styles.suspensionWarning} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3>Organizacao Suspensa</h3>
              <p>Entre em contato com os administradores para regularizar sua situacao.</p>
            </motion.div>
          )}

          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div className={styles.tabIndicator} layoutId="orgTab" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ABA - Minha Organizacao */}
            {activeTab === 'cadastro' && (
              <motion.div key="cadastro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                {!orgData ? (
                  <div className={styles.cadastroSection}>
                    <div className={styles.sectionHeader}>
                      <h2>Solicitar Cadastro</h2>
                      <p>Preencha os dados para solicitar o cadastro da sua organizacao.</p>
                    </div>
                    <form onSubmit={handleCadastroSubmit} className={styles.form}>
                      <div className={styles.formGroup}>
                        <label>Nome da Organizacao</label>
                        <input type="text" value={cadastroForm.name} onChange={(e) => setCadastroForm({ ...cadastroForm, name: e.target.value })} placeholder="Ex: Instituto Esperanca Viva" required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Descricao</label>
                        <textarea value={cadastroForm.description} onChange={(e) => setCadastroForm({ ...cadastroForm, description: e.target.value })} placeholder="Descreva a missao da sua organizacao..." rows={4} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Tipo de Organizacao</label>
                        <select value={cadastroForm.type} onChange={(e) => setCadastroForm({ ...cadastroForm, type: Number(e.target.value) })} required>
                          {ORG_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                        {isSubmitting ? <><span className={styles.spinner} /> Aguardando MetaMask...</> : 'Solicitar Cadastro'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className={styles.statusSection}>
                    <div className={styles.statusCard}>
                      <div className={styles.statusHeader}>
                        <h3>Status do Cadastro</h3>
                        <span className={`${styles.statusBadge} ${styles[orgStatus]}`}>
                          {orgStatus === 'pendente' ? 'Pendente' : orgStatus === 'ativa' ? 'Ativa' : 'Suspensa'}
                        </span>
                      </div>
                      <div className={styles.orgDetails}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Nome:</span>
                          <span className={styles.detailValue}>{orgData.name}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Tipo:</span>
                          <span className={styles.detailValue}>{orgData.type}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Descricao:</span>
                          <span className={styles.detailValue}>{orgData.description}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Total de Acoes:</span>
                          <span className={styles.detailValue}>{orgData.totalActions}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Cadastro em:</span>
                          <span className={styles.detailValue}>{orgData.registeredAt}</span>
                        </div>
                      </div>
                      {orgStatus === 'pendente' && (
                        <div className={styles.pendingInfo}>
                          <p>Sua solicitacao esta sendo analisada. Aguarde a aprovacao do administrador.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ABA - Minhas Campanhas */}
            {activeTab === 'campanhas' && isOrgActive && (
              <motion.div key="campanhas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>Minhas Campanhas</h2>
                    <p>Gerencie suas campanhas humanitarias e acompanhe o impacto gerado.</p>
                  </div>
                  <button className={styles.newCampaignBtn} onClick={() => setShowCampanhaModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Nova Campanha
                  </button>
                </div>

                {campaigns.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h3>Nenhuma campanha criada ainda.</h3>
                    <p>Clique em "Nova Campanha" para comecar.</p>
                  </div>
                ) : (
                  <div className={styles.campaignsList}>
                    {campaigns.map((campaign, index) => (
                      <motion.div key={campaign.id} className={styles.campaignCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                        <div className={styles.campaignHeader}>
                          <div className={styles.campaignInfo}>
                            <h3>{campaign.title}</h3>
                            <p className={styles.campaignLocation}>
                              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2"/>
                                <circle cx="12" cy="9" r="2" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                              {campaign.location}
                            </p>
                          </div>
                          <span className={`${styles.campaignStatus} ${styles[campaign.status]}`}>
                            {campaign.status === 'ativa' ? 'Ativa' : campaign.status === 'encerrada' ? 'Encerrada' : 'Validada'}
                          </span>
                        </div>
                        <p className={styles.campaignDescription}>{campaign.description}</p>
                        <div className={styles.campaignStats}>
                          <div className={styles.campaignStat}>
                            <span className={styles.statNumber}>{campaign.totalBeneficiaries}</span>
                            <span className={styles.statText}>Beneficiados</span>
                          </div>
                          <div className={styles.campaignStat}>
                            <span className={styles.statNumber}>{campaign.totalActions}</span>
                            <span className={styles.statText}>Acoes</span>
                          </div>
                        </div>
                        <div className={styles.campaignActions}>
                          {campaign.status === 'ativa' && (
                            <button className={styles.encerrarBtn} onClick={() => handleEncerrarCampanha(campaign.id)}>
                              Encerrar Campanha
                            </button>
                          )}
                          <button className={styles.verAcoesBtn} onClick={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}>
                            {expandedCampaign === campaign.id ? 'Ocultar Acoes' : 'Ver Acoes'}
                            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ transform: expandedCampaign === campaign.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                        <AnimatePresence>
                          {expandedCampaign === campaign.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={styles.actionsExpanded}>
                              {campaign.actions.length === 0 ? (
                                <p style={{ color: '#A8B9AE', padding: '1rem' }}>Nenhuma acao registrada ainda.</p>
                              ) : (
                                <div className={styles.actionsList}>
                                  {campaign.actions.map((action) => (
                                    <div key={action.id} className={styles.actionItem}>
                                      <div className={styles.actionDetails}>
                                        <span className={styles.actionTitle}>{action.title}</span>
                                        <span className={styles.actionMeta}>{action.type} — {action.quantity} pessoas — {action.location}</span>
                                      </div>
                                      <span className={`${styles.actionStatus} ${styles[action.status]}`}>{action.status}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Modal Nova Campanha */}
                <AnimatePresence>
                  {showCampanhaModal && (
                    <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCampanhaModal(false)}>
                      <motion.div className={styles.modal} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                          <h2>Nova Campanha</h2>
                          <button className={styles.closeBtn} onClick={() => setShowCampanhaModal(false)}>
                            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                        <form onSubmit={handleCampanhaSubmit} className={styles.form}>
                          <div className={styles.formGroup}>
                            <label>Titulo da Campanha</label>
                            <input type="text" value={campanhaForm.title} onChange={(e) => setCampanhaForm({ ...campanhaForm, title: e.target.value })} placeholder="Ex: Ajuda RS - Enchentes 2024" required />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Descricao</label>
                            <textarea value={campanhaForm.description} onChange={(e) => setCampanhaForm({ ...campanhaForm, description: e.target.value })} placeholder="Descreva o objetivo da campanha..." rows={3} required />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Localizacao Geral</label>
                            <input type="text" value={campanhaForm.location} onChange={(e) => setCampanhaForm({ ...campanhaForm, location: e.target.value })} placeholder="Ex: Rio Grande do Sul, Brasil" required />
                          </div>
                          <div className={styles.modalActions}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setShowCampanhaModal(false)}>Cancelar</button>
                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                              {isSubmitting ? <><span className={styles.spinner} /> Aguardando MetaMask...</> : 'Criar Campanha'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ABA - Registrar Acao */}
            {activeTab === 'acoes' && isOrgActive && hasActiveCampaign && (
              <motion.div key="acoes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                <div className={styles.sectionHeader}>
                  <h2>Registrar Nova Acao</h2>
                  <p>Registre uma acao humanitaria vinculada a uma campanha ativa.</p>
                </div>
                <form onSubmit={handleAcaoSubmit} className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Campanha Ativa</label>
                      <select value={acaoForm.campaignId} onChange={(e) => setAcaoForm({ ...acaoForm, campaignId: e.target.value })} required>
                        <option value="">Selecione uma campanha</option>
                        {activeCampaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Tipo de Acao</label>
                      <select value={acaoForm.type} onChange={(e) => setAcaoForm({ ...acaoForm, type: Number(e.target.value) })} required>
                        {ACTION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Titulo da Acao</label>
                    <input type="text" value={acaoForm.title} onChange={(e) => setAcaoForm({ ...acaoForm, title: e.target.value })} placeholder="Ex: Distribuicao de Agua Potavel" required />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Localizacao</label>
                      <input type="text" value={acaoForm.location} onChange={(e) => setAcaoForm({ ...acaoForm, location: e.target.value })} placeholder="Ex: Porto Alegre, RS" required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Quantidade de Beneficiados</label>
                      <input type="number" value={acaoForm.quantity} onChange={(e) => setAcaoForm({ ...acaoForm, quantity: e.target.value })} placeholder="450" min="1" required />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Hash IPFS da Evidencia</label>
                    <input type="text" value={acaoForm.ipfsHash} onChange={(e) => setAcaoForm({ ...acaoForm, ipfsHash: e.target.value })} placeholder="QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" required />
                    <span className={styles.inputHint}>Faca upload da evidencia no IPFS e cole o hash aqui. Nao inclua dados pessoais dos beneficiarios.</span>
                  </div>
                  <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? <><span className={styles.spinner} /> Aguardando MetaMask...</> : 'Registrar Acao na Blockchain'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ABA - Certificados */}
            {activeTab === 'certificados' && (
              <motion.div key="certificados" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                <div className={styles.sectionHeader}>
                  <h2>Certificados NFT</h2>
                  <p>Seus certificados de campanhas validadas registrados na blockchain.</p>
                </div>
                {certificates.length > 0 ? (
                  <div className={styles.certificatesGrid}>
                    {certificates.map((cert, index) => (
                      <motion.div key={cert.tokenId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                        <CertificateCard certificate={cert} index={index} />
                        <a
                          href={BLOCK_EXPLORER + '/token/' + CONTRACT_ADDRESSES.HOPE_CERTIFICATE + '?a=' + cert.tokenId}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.etherscanLink}
                        >
                          Ver no Etherscan
                        </a>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <h3>Nenhum certificado ainda</h3>
                    <p>Crie campanhas e registre acoes para receber certificados NFT apos validacao!</p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

    </div>
  )
}
