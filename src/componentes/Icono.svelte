<script>
  // Íconos de la mesa: trazo redondo de 1.8 sobre una cuadrícula de 24.
  // Uso: <Icono nombre="lore" /> (decorativo) o con titulo="…" si va solo.
  let { nombre, tam = 20, titulo = '' } = $props()

  const TRAZOS = {
    hoja: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M7.5 18c.9-2.2 2.6-3.3 4.5-3.3s3.6 1.1 4.5 3.3"/>',
    dj: '<path d="M3 6.5 8.5 4v14L3 20.5zM8.5 4l7 2.5v14l-7-2.5zM15.5 6.5 21 4v14l-5.5 2.5z"/>',
    lore: '<path d="M3.5 5.5c0-.8.7-1.5 1.5-1.5h6v16H5c-.8 0-1.5-.7-1.5-1.5zM20.5 5.5c0-.8-.7-1.5-1.5-1.5h-6v16h6c.8 0 1.5-.7 1.5-1.5z"/>',
    tiradas: '<path d="M9 6.5h11M9 12h11M9 17.5h7"/><circle cx="4.75" cy="6.5" r=".9"/><circle cx="4.75" cy="12" r=".9"/><circle cx="4.75" cy="17.5" r=".9"/>',
    ajustes: '<path d="M4 7h9M18 7h2M4 17h3M12 17h8"/><circle cx="15.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/>',
    cerrar: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    mas: '<path d="M12 5.5v13M5.5 12h13"/>',
    menos: '<path d="M5.5 12h13"/>',
    arriba: '<path d="M6.5 14.5 12 9l5.5 5.5"/>',
    abajo: '<path d="M6.5 9.5 12 15l5.5-5.5"/>',
    derecha: '<path d="M9.5 6.5 15 12l-5.5 5.5"/>',
    izquierda: '<path d="M14.5 6.5 9 12l5.5 5.5"/>',
    espadas: '<path d="M4 4l10 10M4 4h4M4 4v4M20 4 10 14M20 4h-4M20 4v4M7.5 15.5l1 1M16.5 15.5l-1 1M5.5 18.5l-1.5 1.5M18.5 18.5l1.5 1.5"/>',
    ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    'ojo-no': '<path d="M2.5 12S6 5.5 12 5.5c2 0 3.7.7 5 1.7M21.5 12s-3.5 6.5-9.5 6.5c-2 0-3.7-.7-5-1.7"/><path d="M4 4l16 16"/>',
    luna: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    chispa: '<path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5zM18.5 15.5c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z"/>',
    escudo: '<path d="M12 3.5 19.5 6v5.5c0 4.4-3.1 7.8-7.5 9-4.4-1.2-7.5-4.6-7.5-9V6z"/>',
    corazon: '<path d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6c0 5.3-7.5 9.7-7.5 9.7z"/>',
    calavera: '<path d="M12 3.5c-4.4 0-7.5 3-7.5 7 0 2.4 1 3.9 2.5 4.8V19c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5v-3.7c1.5-.9 2.5-2.4 2.5-4.8 0-4-3.1-7-7.5-7z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/><path d="M10.5 20.5v-2.5M13.5 20.5v-2.5"/>',
    editar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    basura: '<path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 12.5c.1.8.7 1.5 1.5 1.5h6c.8 0 1.4-.7 1.5-1.5l1-12.5"/>',
    buscar: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/>',
    imagen: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="9.5" r="1.8"/><path d="M4 17.5l4.5-4.5 3.5 3.5 3-3 5 5"/>',
    subir: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4.5 15.5v2.5c0 .8.7 1.5 1.5 1.5h12c.8 0 1.5-.7 1.5-1.5v-2.5"/>',
    listo: '<path d="M5 12.5 10 17.5 19 7"/>',
    alerta: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17v.01"/>',
    llave: '<circle cx="8" cy="15.5" r="4"/><path d="M11 12.5l8.5-8.5M16.5 7l2.5 2.5M14.5 9l2 2"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    dado: '<path d="M12 2.8 20.2 7.5v9L12 21.2 3.8 16.5v-9z"/><path d="M12 2.8 7.5 9.5h9zM7.5 9.5 3.8 16.5M16.5 9.5l3.7 7M7.5 9.5 12 21.2l4.5-11.7"/>',
    carta: '<rect x="5.5" y="3.5" width="13" height="17" rx="2.5"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
    mochila: '<path d="M7 8.5a5 5 0 0 1 10 0V19c0 .8-.7 1.5-1.5 1.5h-7C7.7 20.5 7 19.8 7 19z"/><path d="M9.5 6V4.5h5V6M9.5 14h5"/>',
    pata: '<circle cx="7" cy="9.5" r="1.8"/><circle cx="11" cy="6.5" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M12 12c-2.8 0-5 3.2-5 5.3 0 1.4 1 2.2 2.3 2.2 1.1 0 1.8-.6 2.7-.6s1.6.6 2.7.6c1.3 0 2.3-.8 2.3-2.2 0-2.1-2.2-5.3-5-5.3z"/>',
    salir: '<path d="M14 4.5h4c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5h-4M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    pincel: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5z"/><path d="M6 13c-2 .5-2.5 2.5-2.5 6.5 4 0 6-.5 6.5-2.5"/>',
    letra: '<path d="M4.5 19 9.5 5h1l5 14M6.5 14h7M16.5 19v-6.5M16.5 12.5c.5-.8 1.4-1.2 2.4-1.2"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    amanecer: '<path d="M7.5 16a4.5 4.5 0 0 1 9 0M3 19.5h18M12 4.5v3M4.8 9.3l1.8 1.4M19.2 9.3l-1.8 1.4"/>',
    atardecer: '<path d="M7.5 16a4.5 4.5 0 0 1 9 0M3 19.5h18M12 8.5v-3M4.8 9.3l1.8 1.4M19.2 9.3l-1.8 1.4M9.5 3.5 12 6l2.5-2.5"/>',
    persona: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5"/>',
    grupo: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6"/><circle cx="16.5" cy="8" r="2.5"/><path d="M15.5 13.6c2.3-.3 4.3 1 5 3.9"/>',
    copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6c0-.8-.7-1.5-1.5-1.5H6c-.8 0-1.5.7-1.5 1.5v8c0 .8.7 1.5 1.5 1.5h2.5"/>',
    reiniciar: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
    mapa: '<rect x="3.5" y="3.5" width="17" height="12.5" rx="2"/><path d="M8 20.5l4-4.5 4 4.5M7 12l3-3 2.5 2.5L15 9l2 2"/>',
    mover: '<path d="M12 3.5v17M3.5 12h17M12 3.5 9.5 6M12 3.5 14.5 6M12 20.5 9.5 18M12 20.5 14.5 18M3.5 12 6 9.5M3.5 12 6 14.5M20.5 12 18 9.5M20.5 12 18 14.5"/>',
  }

  const trazo = $derived(TRAZOS[nombre] ?? TRAZOS.dado)
</script>

<svg
  class="icono-svg"
  viewBox="0 0 24 24"
  width={tam}
  height={tam}
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden={titulo ? undefined : 'true'}
  role={titulo ? 'img' : undefined}
  aria-label={titulo || undefined}
>{@html trazo}</svg>

<style>
  .icono-svg { flex: none; display: block; }
</style>
