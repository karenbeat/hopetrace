import './globals.css'
import { WalletProvider } from '../context/WalletContext'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const metadata = {
  title: 'HopeTrace - Transparencia Humanitaria',
  description: 'Plataforma Web3 para registrar, validar e auditar acoes humanitarias verificaveis na blockchain.',
  keywords: 'acoes humanitarias, blockchain, NFT, certificado, impacto social, Sepolia, transparencia',
}

export const viewport = {
  themeColor: '#0A0F0D',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <WalletProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  )
}
