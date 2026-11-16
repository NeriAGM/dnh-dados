import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { aplicarLetra, letraGuardada } from './lib/letra.js'

// La letra elegida se pone antes de pintar para que no brinque
aplicarLetra(letraGuardada())

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
