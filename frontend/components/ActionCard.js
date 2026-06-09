'use client'

import { motion } from 'framer-motion'
import styles from './ActionCard.module.css'

export default function ActionCard({ action, index = 0, onRegister }) {
  const statusColors = {
    aberta: { bg: 'rgba(82, 183, 136, 0.1)', text: '#52B788', label: 'Aberta' },
    encerrada: { bg: 'rgba(168, 185, 174, 0.1)', text: '#A8B9AE', label: 'Encerrada' },
    emandamento: { bg: 'rgba(255, 215, 0, 0.1)', text: '#FFD700', label: 'Em Andamento' },
  }

  const status = statusColors[action.status] || statusColors.aberta

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
    >
      <div className={styles.cardHeader}>
        <span 
          className={styles.status}
          style={{ background: status.bg, color: status.text }}
        >
          {status.label}
        </span>
        <span className={styles.hours}>{action.beneficiaries} beneficiados</span>
      </div>

      <h3 className={styles.title}>{action.name}</h3>
      <p className={styles.description}>{action.description}</p>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <svg viewBox="0 0 24 24" fill="none" className={styles.icon}>
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{action.date}</span>
        </div>
        <div className={styles.metaItem}>
          <svg viewBox="0 0 24 24" fill="none" className={styles.icon}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{action.organizations}/{action.slots} organizacoes</span>
        </div>
      </div>

      <div className={styles.progressWrapper}>
        <div 
          className={styles.progressBar}
          style={{ width: `${(action.organizations / action.slots) * 100}%` }}
        />
      </div>

      {action.status === 'aberta' && (
        <button className={styles.registerBtn} onClick={() => onRegister?.(action)}>
          Participar
          <svg viewBox="0 0 24 24" fill="none" className={styles.arrowIcon}>
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </motion.div>
  )
}
