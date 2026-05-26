import { useEffect, useRef, useState } from 'react'

/**
 * Aguarda o container ser medido (width > 0) antes de permitir renderização
 * do ResponsiveContainer do Recharts. Evita o warning recorrente:
 *
 *   "The width(0) and height(0) of chart should be greater than 0"
 *
 * Uso:
 *   const { containerRef, ready } = useChartReady<HTMLDivElement>()
 *   <div ref={containerRef} className="h-72 w-full">
 *     {ready ? <ResponsiveContainer>...</ResponsiveContainer> : <Skeleton />}
 *   </div>
 */
export function useChartReady<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w > 0) setReady(true)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return { containerRef, ready }
}
