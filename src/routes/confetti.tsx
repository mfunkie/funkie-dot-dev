import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { TitleWithNav } from '~/components/Title'
import confetti from 'canvas-confetti'

export const Route = createFileRoute('/confetti')({
  component: Confetti,
})

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      })

      // Launch initial confetti
      launchConfetti(myConfetti)
    }
  }, [])

  const launchConfetti = (confettiInstance: confetti.CreateTypes) => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confettiInstance({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confettiInstance({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)
  }

  const handlePartyClick = () => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      })
      launchConfetti(myConfetti)
    }
  }

  const handleRealisticClick = () => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      })

      const count = 200
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 0,
      }

      function fire(particleRatio: number, opts: confetti.Options) {
        myConfetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        })
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      })
      fire(0.2, {
        spread: 60,
      })
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      })
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      })
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      })
    }
  }

  const handleFireworksClick = () => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      })

      const duration = 5000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        myConfetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        })
      }, 250)
    }
  }

  const handleSchoolPrideClick = () => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      })

      const end = Date.now() + 3000

      const colors = ['#bb0000', '#ffffff']

      ;(function frame() {
        myConfetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
          zIndex: 0,
        })
        myConfetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
          zIndex: 0,
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      })()
    }
  }

  const handleSnowClick = () => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      })

      const duration = 5000
      const animationEnd = Date.now() + duration

      let skew = 1

      ;(function frame() {
        const timeLeft = animationEnd - Date.now()
        const ticks = Math.max(200, 500 * (timeLeft / duration))
        skew = Math.max(0.8, skew - 0.001)

        myConfetti({
          particleCount: 1,
          startVelocity: 0,
          ticks: ticks,
          origin: {
            x: Math.random(),
            y: Math.random() * skew - 0.2,
          },
          colors: ['#ffffff'],
          shapes: ['circle'],
          gravity: randomInRange(0.4, 0.6),
          scalar: randomInRange(0.4, 1),
          drift: randomInRange(-0.4, 0.4),
          zIndex: 0,
        })

        if (timeLeft > 0) {
          requestAnimationFrame(frame)
        }
      })()

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }
    }
  }

  return (
    <div className="home-container">
      <TitleWithNav>Confetti</TitleWithNav>
      <div style={{ position: 'relative', minHeight: '70vh' }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center',
            paddingTop: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Click a button to celebrate!
          </h2>
          <button
            onClick={handlePartyClick}
            className="confetti-button"
          >
            Party Time!
          </button>
          <button
            onClick={handleRealisticClick}
            className="confetti-button"
          >
            Realistic Burst
          </button>
          <button
            onClick={handleFireworksClick}
            className="confetti-button"
          >
            Fireworks
          </button>
          <button
            onClick={handleSchoolPrideClick}
            className="confetti-button"
          >
            School Pride
          </button>
          <button
            onClick={handleSnowClick}
            className="confetti-button"
          >
            Snow
          </button>
        </div>
      </div>
    </div>
  )
}
