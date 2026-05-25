export function baixarArquivo(conteudo: string, nomeArquivo: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['﻿' + conteudo], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  // dispatchEvent garante que o click funciona em contextos onde HTMLElement.click() é interceptado
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}
