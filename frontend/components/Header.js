'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Header.module.css'
import { useWallet } from '../context/WalletContext'

export default function Header() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const {
    account,
    isConnected,
    isCorrectNetwork,
    isLoading,
    connectWallet,
    disconnectWallet,
    formatAddress,
  } = useWallet()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/voluntario', label: 'Organizacoes' },
    { href: '/admin', label: 'Admin' },
    { href: '/verificar', label: 'Verificar' },
  ]

  return (
    <motion.header
      className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8v8c0 7.732 5.12 14.936 12 17 6.88-2.064 12-9.268 12-17V8L16 2z" fill="url(#logoGradient)" />
              <path d="M14 16l-3-3 1.5-1.5L14 13l4.5-4.5L20 10l-6 6z" fill="white" />
              <defs>
                <linearGradient id="logoGradient" x1="4" y1="2" x2="28" y2="27">
                  <stop stopColor="#52B788" />
                  <stop offset="1" stopColor="#1B4332" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className={styles.logoText}>HopeTrace</span>
        </Link>

        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
            >
              {link.label}
              {pathname === link.href && (
                <motion.div
                  className={styles.activeIndicator}
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className={styles.walletSection}>
          {isConnected ? (
            <div className={styles.walletConnected}>
              {isCorrectNetwork ? (
                <span className={styles.networkBadgeOk}>Sepolia</span>
              ) : (
                <span className={styles.networkBadgeError}>Rede errada</span>
              )}
              <span className={styles.walletAddress}>
                {formatAddress(account)}
              </span>
              <button onClick={disconnectWallet} className={styles.disconnectBtn}>
                Desconectar
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className={styles.connectBtn}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" className={styles.walletIcon}>
                <path d="M19 7h-1V6a3 3 0 00-3-3H5a3 3 0 00-3 3v12a3 3 0 003 3h14a3 3 0 003-3v-8a3 3 0 00-3-3zM5 5h10a1 1 0 011 1v1H5a1 1 0 010-2zm15 13a1 1 0 01-1 1H5a1 1 0 01-1-1V8.83A3 3 0 005 9h14a1 1 0 011 1v8z" fill="currentColor"/>
                <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
</svg>
              {isLoading ? 'Conectando...' : 'Conectar Carteira'}
            </button>
          )}
        </div>

        <button
          className={styles.mobileMenuBtn}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <span className={`${styles.hamburger} ${mobileMenuOpen ? styles.open : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={link.href}
                  className={`${styles.mobileNavLink} ${pathname === link.href ? styles.active : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              {!isConnected && (
                <button
                  onClick={connectWallet}
                  className={styles.mobileConnectBtn}
                  disabled={isLoading}
                >
                  {isLoading ? 'Conectando...' : 'Conectar Carteira'}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
