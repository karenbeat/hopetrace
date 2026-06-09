import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.main}>
          {/* Logo e descricao */}
          <div className={styles.brand}>
            <div className={styles.logo}>
              <svg viewBox="0 0 32 32" fill="none" className={styles.logoIcon}>
                <path d="M16 2L4 8v8c0 7.732 5.12 14.936 12 17 6.88-2.064 12-9.268 12-17V8L16 2z" fill="url(#footerGradient)" />
                <path d="M14 16l-3-3 1.5-1.5L14 13l4.5-4.5L20 10l-6 6z" fill="white" />
                <defs>
                  <linearGradient id="footerGradient" x1="4" y1="2" x2="28" y2="27">
                    <stop stopColor="#52B788" />
                    <stop offset="1" stopColor="#1B4332" />
                  </linearGradient>
                </defs>
              </svg>
              <span className={styles.logoText}>HopeTrace</span>
            </div>
            <p className={styles.description}>
              Plataforma descentralizada para registro e certificacao de acoes humanitarias. 
              Rastreando esperanca, registrando impacto.
            </p>
            <div className={styles.network}>
              <span className={styles.networkDot} />
              Sepolia Testnet
            </div>
          </div>

          {/* Links */}
          <div className={styles.links}>
            <div className={styles.linkColumn}>
              <h4 className={styles.linkTitle}>Plataforma</h4>
              <Link href="/" className={styles.link}>Inicio</Link>
              <Link href="/voluntario" className={styles.link}>Painel da Organizacao</Link>
              <Link href="/verificar" className={styles.link}>Verificar Certificado</Link>
            </div>
            <div className={styles.linkColumn}>
              <h4 className={styles.linkTitle}>Recursos</h4>
              <a href="#" className={styles.link}>Documentacao</a>
              <a href="#" className={styles.link}>Smart Contracts</a>
              <a href="#" className={styles.link}>API</a>
            </div>
            <div className={styles.linkColumn}>
              <h4 className={styles.linkTitle}>Comunidade</h4>
              <a href="#" className={styles.link}>Discord</a>
              <a href="#" className={styles.link}>Twitter</a>
              <a href="#" className={styles.link}>GitHub</a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            2024 HopeTrace. Rastreando esperanca, registrando impacto.
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              <svg viewBox="0 0 24 24" fill="none" className={styles.badgeIcon}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Seguro
            </span>
            <span className={styles.badge}>
              <svg viewBox="0 0 24 24" fill="none" className={styles.badgeIcon}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Verificavel
            </span>
            <span className={styles.badge}>
              <svg viewBox="0 0 24 24" fill="none" className={styles.badgeIcon}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2"/>
              </svg>
              On-Chain
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
