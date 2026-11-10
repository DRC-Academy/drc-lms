/** La diana de la prueba de nivel: la del bloque del inicio y la de la barra. */
export default function IconoPrueba({ tamano = 24 }: { tamano?: number }) {
  return (
    <svg aria-hidden width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}
