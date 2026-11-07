import { registerRootComponent } from 'expo';

// Il contenitore usa il motore condiviso in ../motore (stesso codice per tutte le città).
import App from '../motore/App';

registerRootComponent(App);
