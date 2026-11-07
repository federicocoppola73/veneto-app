import { registerRootComponent } from 'expo';

// Il contenitore (App.js della radice) mostra le città e carica quella scelta nel motore condiviso in ../motore.
import App from '../App';

registerRootComponent(App);
