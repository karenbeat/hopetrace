'use client'

import { useEffect, useRef } from 'react'
import styles from './ParticleBackground.module.css'

export default function ParticleBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    // Gerar particulas com posicoes e delays aleatorios
    const container = containerRef.current
    if (!container) return

    // Criar 25 particulas hexagonais
    for (let i = 0; i < 25; i++) {
      const particle = document.createElement('div')
      particle.className = styles.particle
      
      // Tamanho aleatorio
      const size = Math.random() * 10 + 4
      particle.style.width = `${size}px`
      particle.style.height = `${size}px`
      
      // Posicao aleatoria
      particle.style.left = `${Math.random() * 100}%`
      particle.style.top = `${Math.random() * 100}%`
      
      // Opacidade aleatoria
      particle.style.opacity = Math.random() * 0.3 + 0.1
      
      // Delay e duracao aleatorios
      particle.style.animationDelay = `${Math.random() * 5}s`
      particle.style.animationDuration = `${Math.random() * 12 + 8}s`
      
      container.appendChild(particle)
    }

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }
  }, [])

  return <div ref={containerRef} className={styles.container} />
}
