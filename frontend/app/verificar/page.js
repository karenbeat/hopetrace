'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import styles from './page.module.css'
import {
  getOrganizationRegistry,
  getReliefRegistry,
  getHopeCertificate,
  formatAddress,
  formatDate,
  getOrgTypeName,
  getActionTypeName,
  getCertificateLevelName,
} from '@/utils/contracts'
import { CONTRACT_ADDRESSES, BLOCK_EXPLORER } from '@/utils/contractAddresses'

export default function VerificarPage() {
  const [activeTab, setActiveTab] = useState('organizacao')

  const [orgAddress, setOrgAddress] = useState('')
  const [orgSearching, setOrgSearching] = useState(false)
  const [orgResult, setOrgResult] = useState(null)
  const [orgNotFound, setOrgNotFound] = useState(false)

  const [campaignId, setCampaignId] = useState('')
  const [campaignSearching, setCampaignSearching] = useState(false)
  const [campaignResult, setCampaignResult] = useState(null)
  const [campaignNotFound, setCampaignNotFound] = useState(false)

  const [pendingActions, setPendingActions] = useState([])
  const [loadingPending, setLoadingPending] = useState(false)

  const getProvider = () => new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)

  const handleSearchOrg = async (e) => {
    e.preventDefault()
    if (!orgAddress.trim()) return
    setOrgSearching(true)
    setOrgResult(null)
    setOrgNotFound(false)
    try {
      const provider = getProvider()
      const orgRegistry = await getOrganizationRegistry(provider)
      const reliefRegistry = await getReliefRegistry(provider)
      const org = await orgRegistry.getOrganizationByWallet(orgAddress)
      const orgCampaigns = await reliefRegistry.getOrganizationCampaigns(orgAddress)
      setOrgResult({
        id: Number(org.id),
        name: org.name,
        description: org.description,
        type: getOrgTypeName(Number(org.orgType)),
        status: Number(org.status) === 0 ? 'pendente' : Number(org.status) === 1 ? 'ativa' : 'suspensa',
        address: org.wallet,
        registeredAt: formatDate(org.registeredAt),
        approvedAt: Number(org.approvedAt) > 0 ? formatDate(org.approvedAt) : 'Aguardando',
        totalActions: Number(org.totalActions),
        campaigns: orgCampaigns.map(c => ({
          id: Number(c.id),
          title: c.title,
          status: Number(c.status) === 0 ? 'ativa' : Number(c.status) === 1 ? 'encerrada' : 'validada',
        })),
      })
    } catch {
      setOrgNotFound(true)
    }
    setOrgSearching(false)
  }

  const handleSearchCampaign = async (e) => {
    e.preventDefault()
    if (!campaignId.trim()) return
    setCampaignSearching(true)
    setCampaignResult(null)
    setCampaignNotFound(false)
    try {
      const provider = getProvider()
      const reliefRegistry = await getReliefRegistry(provider)
      const hopeCertificate = await getHopeCertificate(provider)
      const campaign = await reliefRegistry.getCampaign(Number(campaignId))
      const actions = await reliefRegistry.getCampaignActions(Number(campaignId))
      const certTokenId = await hopeCertificate.getCampaignCertificate(Number(campaignId))
      let certificate = null
      if (Number(certTokenId) > 0) {
        const cert = await hopeCertificate.getCertificate(Number(certTokenId))
        certificate = {
          tokenId: Number(cert.tokenId).toString(),
          level: getCertificateLevelName(Number(cert.level)),
          issuedDate: formatDate(cert.issuedAt),
        }
      }
      setCampaignResult({
        id: Number(campaign.id),
        title: campaign.title,
        description: campaign.description,
        organization: formatAddress(campaign.organization),
        organizationFull: campaign.organization,
        location: campaign.location,
        status: Number(campaign.status) === 0 ? 'ativa' : Number(campaign.status) === 1 ? 'encerrada' : 'validada',
        totalBeneficiaries: Number(campaign.totalBeneficiaries),
        totalActions: Number(campaign.totalActions),
        createdAt: formatDate(campaign.createdAt),
        actions: actions
          .filter(a => Number(a.status) === 1)
          .map(a => ({
            id: Number(a.id),
            title: a.title,
            type: getActionTypeName(Number(a.actionType)),
            quantity: Number(a.quantity),
            location: a.location,
            date: formatDate(a.validatedAt),
            evidenceHash: a.evidenceHash,
          })),
        certificate,
      })
    } catch {
      setCampaignNotFound(true)
    }
    setCampaignSearching(false)
  }

  const loadPendingActions = async () => {
    setLoadingPending(true)
    try {
      const provider = getProvider()
      const reliefRegistry = await getReliefRegistry(provider)
      const pending = await reliefRegistry.getPendingActions()
      setPendingActions(pending.map(a => ({
        id: Number(a.id),
        title: a.title,
        type: getActionTypeName(Number(a.actionType)),
        quantity: Number(a.quantity),
        organization: formatAddress(a.organization),
        campaignId: Number(a.campaignId),
        date: formatDate(a.registeredAt),
        evidenceHash: a.evidenceHash,
      })))
    } catch (err) {
      console.error(err)
    }
    setLoadingPending(false)
  }

  useEffect(() => {
    if (activeTab === 'pendentes') {
      loadPendingActions()
    }
  }, [activeTab])

  const getStatusStyle = (status) => {
    const map = {
      ativa: { bg: 'rgba(82, 183, 136, 0.15)', color: '#52B788', label: 'Ativa' },
      validada: { bg: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', label: 'Validada' },
      pendente: { bg: 'rgba(255, 193, 7, 0.15)', color: '#FFC107', label: 'Pendente' },
      suspensa: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: 'Suspensa' },
      encerrada: { bg: 'rgba(168, 185, 174, 0.15)', color: '#A8B9AE', label: 'Encerrada' },
    }
    return map[status] || map.pendente
  }

  const levelColors = {
    Bronze: 'linear-gradient(135deg, #CD7F32, #8B4513)',
    Prata: 'linear-gradient(135deg, #C0C0C0, #808080)',
    Ouro: 'linear-gradient(135deg, #FFD700, #FFA500)',
    Platina: 'linear-gradient(135deg, #E5E4E2, #A9A9A9)',
  }

  const tabs = [
    { id: 'organizacao', label: 'Verificar Organizacao' },
    { id: 'campanha', label: 'Verificar Campanha' },
    { id: 'pendentes', label: 'Acoes Pendentes' },
  ]

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.container}>

          <motion.div className={styles.header} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.badge}>
              <svg viewBox="0 0 24 24" fill="none" className={styles.badgeIcon}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Verificacao On-Chain
            </div>
            <h1 className={styles.title}>
              Verificar <span className={styles.gradientText}>Transparencia</span>
            </h1>
            <p className={styles.subtitle}>
              Verifique organizacoes, campanhas e acoes humanitarias registradas na blockchain Sepolia.
            </p>
          </motion.div>

          <motion.div className={styles.tabs} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {activeTab === tab.id && <motion.div className={styles.tabIndicator} layoutId="verifyTab" />}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">

            {/* Aba Verificar Organizacao */}
            {activeTab === 'organizacao' && (
              <motion.div key="organizacao" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                <form className={styles.searchForm} onSubmit={handleSearchOrg}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                      placeholder="Digite o endereco Ethereum da organizacao (0x...)"
                      className={styles.input}
                    />
                  </div>
                  <button type="submit" className={styles.searchBtn} disabled={orgSearching}>
                    {orgSearching ? <><div className={styles.spinner} />Buscando...</> : 'Verificar'}
                  </button>
                </form>

                {orgResult && (
                  <motion.div className={styles.resultCard} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={styles.resultHeader}>
                      <div className={styles.verifiedBadge}>
                        <svg viewBox="0 0 24 24" fill="none" className={styles.verifiedIcon}>
                          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Organizacao Verificada On-Chain
                      </div>
                      <span className={styles.statusBadge} style={{ background: getStatusStyle(orgResult.status).bg, color: getStatusStyle(orgResult.status).color }}>
                        {getStatusStyle(orgResult.status).label}
                      </span>
                    </div>
                    <h2 className={styles.orgName}>{orgResult.name}</h2>
                    <p style={{ color: '#A8B9AE', marginBottom: '1rem' }}>{orgResult.description}</p>
                    <div className={styles.detailsGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Tipo</span>
                        <span className={styles.detailValue}>{orgResult.type}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Cadastro</span>
                        <span className={styles.detailValue}>{orgResult.registeredAt}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Aprovacao</span>
                        <span className={styles.detailValue}>{orgResult.approvedAt}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Total Acoes</span>
                        <span className={styles.detailValue}>{orgResult.totalActions}</span>
                      </div>
                    </div>
                    <div className={styles.addressSection}>
                      <span className={styles.addressLabel}>Endereco Ethereum</span>
                      <div className={styles.addressValue}>{orgResult.address}</div>
                      <a href={BLOCK_EXPLORER + '/address/' + orgResult.address} target="_blank" rel="noopener noreferrer" style={{ color: '#52B788', fontSize: '0.875rem' }}>
                        Ver no Etherscan
                      </a>
                    </div>
                    {orgResult.campaigns.length > 0 && (
                      <div className={styles.campaignsList}>
                        <h4 className={styles.listTitle}>Campanhas da Organizacao</h4>
                        {orgResult.campaigns.map((camp) => (
                          <div key={camp.id} className={styles.campaignItem}>
                            <span className={styles.campaignTitle}>#{camp.id} — {camp.title}</span>
                            <span className={styles.campaignStatus} style={{ background: getStatusStyle(camp.status).bg, color: getStatusStyle(camp.status).color }}>
                              {getStatusStyle(camp.status).label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {orgNotFound && (
                  <motion.div className={styles.notFoundCard} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                    <h3>Organizacao Nao Encontrada</h3>
                    <p>Nenhuma organizacao cadastrada com este endereco na blockchain.</p>
                  </motion.div>
                )}

                {!orgResult && !orgNotFound && (
                  <div className={styles.infoHint}>
                    <p>Insira o endereco Ethereum completo da organizacao para verificar seu cadastro e status na blockchain.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Aba Verificar Campanha */}
            {activeTab === 'campanha' && (
              <motion.div key="campanha" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                <form className={styles.searchForm} onSubmit={handleSearchCampaign}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="number"
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      placeholder="Digite o ID numerico da campanha (ex: 1, 2, 3...)"
                      className={styles.input}
                      min="1"
                    />
                  </div>
                  <button type="submit" className={styles.searchBtn} disabled={campaignSearching}>
                    {campaignSearching ? <><div className={styles.spinner} />Buscando...</> : 'Verificar'}
                  </button>
                </form>

                {campaignResult && (
                  <motion.div className={styles.resultCard} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={styles.resultHeader}>
                      <div className={styles.verifiedBadge}>
                        <svg viewBox="0 0 24 24" fill="none" className={styles.verifiedIcon}>
                          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Campanha #{campaignResult.id} Verificada On-Chain
                      </div>
                      <span className={styles.statusBadge} style={{ background: getStatusStyle(campaignResult.status).bg, color: getStatusStyle(campaignResult.status).color }}>
                        {getStatusStyle(campaignResult.status).label}
                      </span>
                    </div>
                    <h2 className={styles.campaignName}>{campaignResult.title}</h2>
                    <p style={{ color: '#A8B9AE', marginBottom: '1rem' }}>{campaignResult.description}</p>
                    <div className={styles.campaignMeta}>
                      <span>Organizacao: {campaignResult.organization}</span>
                      <span>Local: {campaignResult.location}</span>
                    </div>
                    <div className={styles.detailsGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Total Beneficiados</span>
                        <span className={styles.detailValue}>{campaignResult.totalBeneficiaries.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Total Acoes</span>
                        <span className={styles.detailValue}>{campaignResult.totalActions}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Criada em</span>
                        <span className={styles.detailValue}>{campaignResult.createdAt}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Organizacao</span>
                        <span className={styles.detailValue}>{campaignResult.organization}</span>
                      </div>
                    </div>

                    {campaignResult.actions.length > 0 && (
                      <div className={styles.actionsList}>
                        <h4 className={styles.listTitle}>Acoes Validadas</h4>
                        {campaignResult.actions.map((action) => (
                          <div key={action.id} className={styles.actionItem}>
                            <div className={styles.actionType}>{action.type}</div>
                            <div className={styles.actionInfo}>
                              <span className={styles.actionTitle}>{action.title}</span>
                              <span className={styles.actionMeta}>{action.quantity} beneficiados — {action.location}</span>
                              {action.evidenceHash && (
                                <span style={{ color: '#52B788', fontSize: '0.75rem' }}>
                                  Evidencia IPFS: {action.evidenceHash.slice(0, 20)}...
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {campaignResult.certificate && (
                      <div className={styles.certificateSection}>
                        <h4 className={styles.listTitle}>Certificado NFT Emitido</h4>
                        <div className={styles.certificateCard}>
                          <div className={styles.certLevel} style={{ background: levelColors[campaignResult.certificate.level] || levelColors.Bronze }}>
                            {campaignResult.certificate.level.toUpperCase()}
                          </div>
                          <div className={styles.certInfo}>
                            <span>Token #{campaignResult.certificate.tokenId}</span>
                            <span>Emitido em {campaignResult.certificate.issuedDate}</span>
                          </div>
                          <a href={BLOCK_EXPLORER + '/token/' + CONTRACT_ADDRESSES.HOPE_CERTIFICATE + '?a=' + campaignResult.certificate.tokenId} target="_blank" rel="noopener noreferrer" className={styles.etherscanLink}>Ver no Etherscan</a>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {campaignNotFound && (
                  <motion.div className={styles.notFoundCard} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                    <h3>Campanha Nao Encontrada</h3>
                    <p>Nenhuma campanha encontrada com este ID na blockchain.</p>
                  </motion.div>
                )}

                {!campaignResult && !campaignNotFound && (
                  <div className={styles.infoHint}>
                    <p>Insira o ID numerico da campanha para verificar detalhes, acoes validadas e certificados NFT.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Aba Acoes Pendentes */}
            {activeTab === 'pendentes' && (
              <motion.div key="pendentes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.tabContent}>
                <div className={styles.pendingHeader}>
                  <h3>Acoes Aguardando Validacao</h3>
                  {!loadingPending && (
                    <span className={styles.pendingCount}>{pendingActions.length} acoes pendentes</span>
                  )}
                </div>

                {loadingPending ? (
                  <p style={{ color: '#A8B9AE', textAlign: 'center', padding: '2rem' }}>
                    Carregando da blockchain...
                  </p>
                ) : pendingActions.length === 0 ? (
                  <div className={styles.infoHint}>
                    <p>Nenhuma acao pendente de validacao no momento.</p>
                  </div>
                ) : (
                  <div className={styles.pendingList}>
                    {pendingActions.map((action, index) => (
                      <motion.div
                        key={action.id}
                        className={styles.pendingCard}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className={styles.pendingBadge}>
                          Aguardando Validacao
                        </div>
                        <div className={styles.pendingContent}>
                          <div className={styles.pendingType}>{action.type}</div>
                          <h4 className={styles.pendingTitle}>{action.title}</h4>
                          <div className={styles.pendingMeta}>
                            <span>Organizacao: {action.organization}</span>
                            <span>Campanha #{action.campaignId}</span>
                          </div>
                          <div className={styles.pendingStats}>
                            <span className={styles.pendingQuantity}>{action.quantity} beneficiados</span>
                            <span className={styles.pendingDate}>Registrado em {action.date}</span>
                          </div>
                          {action.evidenceHash && (
                            <span style={{ color: '#52B788', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                              Evidencia IPFS: {action.evidenceHash.slice(0, 30)}...
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className={styles.pendingInfo}>
                  <p>Estas acoes estao aguardando validacao por um auditor independente. Apos validacao, serao contabilizadas na campanha correspondente e ficaram visiveis on-chain.</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
