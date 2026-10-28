import { useEffect, useState } from 'react';

// Data e ora correnti, aggiornate ogni minuto (per "aperto adesso" e orari di arrivo)
export function useAdesso(intervallo = 60000) {
  const [adesso, setAdesso] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAdesso(new Date()), intervallo);
    return () => clearInterval(id);
  }, [intervallo]);
  return adesso;
}
