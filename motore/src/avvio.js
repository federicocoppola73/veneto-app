// Prepara i dati della città attiva: va chiamata dopo aver caricato i file del pacchetto.
import { inizializzaVaporetti } from './vaporetti';
import { inizializzaServizi } from './servizi';
import { inizializzaAguzza } from './aguzza';
import { inizializzaOrari } from './orariVaporetti';
import { inizializzaCuriosita } from './curiosita';
import { inizializzaItinerari } from './itinerari';
import { inizializzaPrincipali } from '../App';

export function inizializzaCitta() {
  inizializzaVaporetti();
  inizializzaServizi();
  inizializzaAguzza();
  inizializzaOrari();
  inizializzaCuriosita();
  inizializzaItinerari();
  inizializzaPrincipali();
}
