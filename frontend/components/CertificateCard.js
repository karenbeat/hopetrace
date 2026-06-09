'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import styles from './CertificateCard.module.css'

export default function CertificateCard({ certificate, index = 0 }) {
  const cardRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })

  const levelStyles = {
    bronze: { gradient: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', glow: 'rgba(205, 127, 50, 0.3)' },
    prata: { gradient: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', glow: 'rgba(192, 192, 192, 0.3)' },
    ouro: { gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', glow: 'rgba(255, 215, 0, 0.4)' },
  }

  const level = levelStyles[certificate.level] || levelStyles.bronze

  // Efeito 3D tilt no mouse move
  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setMousePosition({ x, y })

    const rotateX = (y - 50) / 5
    const rotateY = (x - 50) / 5

    card.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (card) {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'
    }
    setMousePosition({ x: 50, y: 50 })
  }

  return (
    <motion.div
      ref={cardRef}
      className={styles.card}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ '--glow-color': level.glow }}
    >
      {/* Holographic overlay */}
      <div 
        className={styles.holographicOverlay}
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(116, 198, 157, 0.25), transparent 60%)`
        }}
      />

      {/* Badge de nivel */}
      <div className={styles.levelBadge} style={{ background: level.gradient }}>
        <div className={styles.medalIcon}>
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="6" fill="currentColor" opacity="0.3"/>
            <circle cx="12" cy="8" r="4" fill="currentColor"/>
            <path d="M8 14l-2 8 6-3 6 3-2-8" fill="currentColor" opacity="0.8"/>
          </svg>
        </div>
        <span className={styles.levelText}>{certificate.level}</span>
      </div>

      {/* Conteudo */}
      <div className={styles.content}>
        <div className={styles.nftBadge}>
          <span className={styles.onChainDot} />
          NFT #{certificate.tokenId}
        </div>

        <h3 className={styles.title}>{certificate.name}</h3>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{certificate.totalBeneficiaries || certificate.totalHours}</span>
            <span className={styles.statLabel}>Beneficiados</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{certificate.actionsCount}</span>
            <span className={styles.statLabel}>Acoes</span>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.address}>
            <svg viewBox="0 0 24 24" fill="none" className={styles.icon}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {certificate.owner}
          </div>
          <div className={styles.date}>{certificate.issuedDate}</div>
        </div>
      </div>

      {/* Shimmer effect on hover */}
      <div className={styles.shimmer} />
    </motion.div>
  )
}
