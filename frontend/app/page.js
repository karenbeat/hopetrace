'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ethers } from 'ethers'
import ParticleBackground from '@/components/ParticleBackground'
import StatsCard from '@/components/StatsCard'
import ActionCard from '@/components/ActionCard'
import styles from './page.module.css'
import {
  getReliefRegistry,
  getOrganizationRegistry,
  getHopeCertificate,
  getCertificateLevelName,
  formatAddress,
  formatDate,
} from '@/utils/contracts'
import { CONTRACT_ADDRESSES, BLOCK_EXPLORER } from '@/utils/contractAddresses'

const STEPS = [
  {
    number: '01',
    title: 'Organizacao se Cadastra',
    description: 'A organizacao solicita cadastro na plataforma. Um administrador analisa e aprova, ativando a conta.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Cria Campanhas e Registra Acoes',
    description: 'A organizacao cria campanhas humanitarias e registra acoes com evidencias vinculadas via IPFS.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Validacao e NFT Emitido',
    description: 'Validadores independentes aprovam as acoes. Apos validacao, a campanha e certificada com NFT imutavel.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function Home() {
  const [filter, setFilter] = useState('todas')
  const [typedText, setTypedText] = useState('')
  const fullText = 'que voce pode provar.'

  const [stats, setStats] = useState({
    totalBeneficiaries: 0,
    totalOrganizations: 0,
    totalCampaigns: 0,
    totalCertificates: 0,
  })
  const [campaigns, setCampaigns] = useState([])
  const [certificates, setCertificates] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, 80)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadBlockchainData()
  }, [])

  const loadBlockchainData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
      )

      const reliefRegistry = await getReliefRegistry(provider)
      const hopeCertificate = await getHopeCertificate(provider)

      const globalStats = await reliefRegistry.getGlobalStats()
      const totalCerts = Number(await hopeCertificate.getTotalCertificates())

      setStats({
        totalBeneficiaries: Number(globalStats.totalBeneficiaries),
        totalOrganizations: Number(globalStats.totalOrganizations),
        totalCampaigns: Number(globalStats.totalCampaigns),
        totalCertificates: totalCerts,
      })
      setLoadingStats(false)

      const campaignIds = await reliefRegistry.getAllCampaignIds()
      const campaignPromises = campaignIds.map(id => reliefRegistry.getCampaign(id))
      const campaignData = await Promise.all(campaignPromises)

      const formattedCampaigns = campaignData.map(c => ({
        id: Number(c.id),
        name: c.title,
        description: c.description,
        location: c.location,
        status: Number(c.status) === 0 ? 'aberta' : Number(c.status) === 1 ? 'encerrada' : 'validada',
        totalBeneficiaries: Number(c.totalBeneficiaries),
        totalActions: Number(c.totalActions),
        organization: formatAddress(c.organization),
        date: formatDate(c.createdAt),
      }))
      setCampaigns(formattedCampaigns)
      setLoadingCampaigns(false)

      if (totalCerts > 0) {
        const lastCerts = []
        const start = Math.max(1, totalCerts - 2)
        for (let i = start; i <= totalCerts; i++) {
          const cert = await hopeCertificate.getCertificate(i)
          lastCerts.push({
            tokenId: Number(cert.tokenId).toString(),
            campaignTitle: cert.campaignTitle,
            organization: formatAddress(cert.organization),
            level: getCertificateLevelName(Number(cert.level)).toLowerCase(),
            totalBeneficiaries: Number(cert.totalBeneficiaries),
            issuedDate: formatDate(cert.issuedAt),
          })
        }
        setCertificates(lastCerts.reverse())
      }

    } catch (error) {
      console.error('Erro ao carregar dados da blockchain:', error)
      setLoadingStats(false)
      setLoadingCampaigns(false)
    }
  }

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'todas') return true
    return c.status === filter
  })

  return (
    <div className={styles.page}>

      <section className={styles.hero}>
        <ParticleBackground />
        <div className={styles.heroContent}>
          <motion.div
            className={styles.heroBadge}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className={styles.badgeDot} />
            Powered by Blockchain
          </motion.div>

          <motion.h1
            className={styles.heroTitle}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Impacto humanitario
            <br />
            <span className={styles.gradientText}>
              {typedText}
              <span className={styles.cursor}>|</span>
            </span>
          </motion.h1>

          <motion.p
            className={styles.heroSubtitle}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Plataforma Web3 para registrar, validar e auditar acoes humanitarias verificaveis na blockchain.
          </motion.p>

          <motion.div
            className={styles.heroButtons}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <a href="/voluntario" className={styles.btnPrimary}>
              Registrar Acao Humanitaria
              <svg viewBox="0 0 24 24" fill="none" className={styles.btnIcon}>
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="/verificar" className={styles.btnSecondary}>
              Verificar Certificado
            </a>
          </motion.div>

          <motion.div
            className={styles.scrollIndicator}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <span>Descubra mais</span>
            <div className={styles.scrollArrow}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className={styles.sectionTitle}>
              Impacto <span className={styles.gradientText}>em Numeros</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Acompanhe o impacto coletivo das organizacoes humanitarias
            </p>
            <div className={styles.decorativeLine} />
          </motion.div>

          <div className={styles.statsGrid}>
            {loadingStats ? (
              <p style={{ color: '#A8B9AE' }}>Carregando dados da blockchain...</p>
            ) : (
              <>
                <StatsCard icon="🌍" value={stats.totalBeneficiaries} label="Pessoas Beneficiadas" index={0} />
                <StatsCard icon="🏢" value={stats.totalOrganizations} label="Organizacoes Ativas" index={1} />
                <StatsCard icon="📋" value={stats.totalCampaigns} label="Campanhas Registradas" index={2} />
                <StatsCard icon="🏆" value={stats.totalCertificates} label="Certificados NFT Emitidos" index={3} />
              </>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className={styles.sectionTitle}>
              Campanhas <span className={styles.gradientText}>Registradas</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Campanhas humanitarias registradas e verificaveis na blockchain
            </p>
          </motion.div>

          <div className={styles.filterTabs}>
            {['todas', 'aberta', 'encerrada', 'validada'].map((f) => (
              <button
                key={f}
                className={`${styles.filterTab} ${filter === f ? styles.active : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'todas' ? 'Todas' : f === 'aberta' ? 'Ativas' : f === 'encerrada' ? 'Encerradas' : 'Validadas'}
                {filter === f && (
                  <motion.div className={styles.tabIndicator} layoutId="tab" />
                )}
              </button>
            ))}
          </div>

          {loadingCampaigns ? (
            <p style={{ color: '#A8B9AE', textAlign: 'center', padding: '2rem' }}>
              Carregando campanhas da blockchain...
            </p>
          ) : filteredCampaigns.length === 0 ? (
            <p style={{ color: '#A8B9AE', textAlign: 'center', padding: '2rem' }}>
              Nenhuma campanha encontrada.
            </p>
          ) : (
            <div className={styles.actionsGrid}>
              {filteredCampaigns.map((campaign, index) => (
                <ActionCard key={campaign.id} action={campaign} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className={styles.sectionTitle}>
              Como <span className={styles.gradientText}>Funciona</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Tres passos simples para comecar sua jornada de impacto
            </p>
          </motion.div>

          <div className={styles.stepsContainer}>
            <div className={styles.stepsLine} />
            {STEPS.map((step, index) => (
              <motion.div
                key={step.number}
                className={styles.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className={styles.stepNumber}>{step.number}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {certificates.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <motion.div
              className={styles.sectionHeader}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className={styles.sectionTitle}>
                Campanhas <span className={styles.gradientText}>Recentemente Validadas</span>
              </h2>
              <p className={styles.sectionSubtitle}>
                Campanhas que receberam certificados NFT apos validacao de impacto
              </p>
            </motion.div>

            <div className={styles.validatedGrid}>
              {certificates.map((cert, index) => (
                <motion.div
                  key={cert.tokenId}
                  className={styles.validatedCard}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={styles.validatedHeader}>
                    <span className={`${styles.levelBadge} ${styles[cert.level]}`}>
                      {cert.level.toUpperCase()}
                    </span>
                    <span className={styles.validatedDate}>{cert.issuedDate}</span>
                  </div>
                  <h3 className={styles.validatedTitle}>{cert.campaignTitle}</h3>
                  <p className={styles.validatedOrg}>{cert.organization}</p>
                  <div className={styles.validatedStats}>
                    <span>{cert.totalBeneficiaries.toLocaleString('pt-BR')} beneficiados</span>
                    
<a href={BLOCK_EXPLORER + '/token/' + CONTRACT_ADDRESSES.HOPE_CERTIFICATE + '?a=' + cert.tokenId} target="_blank" rel="noopener noreferrer" style={{color:'#52B788'}}>NFT #{cert.tokenId}</a>                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div
            className={styles.ctaCard}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className={styles.ctaTitle}>
              Pronto para fazer <span className={styles.gradientText}>a diferenca</span>?
            </h2>
            <p className={styles.ctaText}>
              Junte-se a centenas de organizacoes que ja estao transformando suas acoes em certificados verificaveis na blockchain.
            </p>
            <a href="/voluntario" className={styles.btnPrimary}>
              Comecar Agora
              <svg viewBox="0 0 24 24" fill="none" className={styles.btnIcon}>
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </motion.div>
        </div>
      </section>

    </div>
  )
}
