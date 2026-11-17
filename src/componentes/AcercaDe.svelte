<script>
  // «Acerca de»: aviso de licencia y créditos de Daggerheart. Lo abren la pantalla de entrada y Ajustes.
  // Texto en inglés tal como lo pide la licencia DPCGL 2.0: §4.1(a)–(e), §4.3 y el texto combinado de la p. 4.
  import Dialogo from './hoja/Dialogo.svelte'

  let { onCerrar } = $props()
</script>

<Dialogo titulo="Acerca de" subtitulo="Licencia y créditos" {onCerrar} ancho={520}>
  <p>
    <b>Dolor &amp; Hambre · Mesa</b> es una app para jugar Daggerheart™ Compatible en español. Es de uso privado de la
    mesa; no es un producto oficial de Darrington Press.
  </p>

  <section>
    <h4>SRD 2.0</h4>
    <blockquote lang="en">
      This product includes materials from the Daggerheart System Reference Document 2.0, © Critical Role, LLC. under the
      terms of the Darrington Press Community Gaming (DPCGL) License. More information can be found at
      https://www.daggerheart.com.
    </blockquote>
  </section>

  <section>
    <h4>SRD 1.0</h4>
    <blockquote lang="en">
      This product includes materials from the Daggerheart System Reference Document 1.0, © Critical Role, LLC. under the
      terms of the Darrington Press Community Gaming (DPCGL) License. More information can be found at
      https://www.daggerheart.com.
    </blockquote>
  </section>

  <section>
    <h4>Modifications</h4>
    <blockquote lang="en">
      Modifications: this material was translated into Spanish and adapted for this app by Dolor &amp; Hambre. It was taken
      from community transcriptions of the SRD (seansbox/daggerheart-srd for SRD 1.0 and JHerrin00/daggerheart-srd-2.0 for
      part of SRD 2.0), which changed its format and structure, and checked against the official SRD 2.0 PDF.
    </blockquote>
  </section>

  <section>
    <h4>Qué se modificó</h4>
    <p>
      Esta app tradujo el contenido de los dos documentos al español y lo adaptó a una mesa digital. Se tomó de
      transcripciones de la comunidad (seansbox/daggerheart-srd para el SRD 1.0 y JHerrin00/daggerheart-srd-2.0 para parte
      del SRD 2.0), que cambiaron su formato y estructura, y se revisó contra el PDF oficial del SRD 2.0.
    </p>
  </section>

  <section>
    <h4>Qué viene de cada versión</h4>
    <ul>
      <li><b>SRD 1.0:</b> clases, subclases, ancestrías, comunidades, dominios, cartas, armas, armaduras, objetos, consumibles, Formas de Bestia, adversarios y entornos del libro base.</li>
      <li><b>SRD 2.0:</b> las clases nuevas (Asesino, Peleador, Brujo y Bruja) y sus subclases (Gremio de Verdugos, Gremio de Envenenadores, Coloso, Artista Marcial, Pacto de lo Eterno, Pacto de lo Iracundo, Bruja de Seto y Bruja de la Luna), el dominio Pavor, seis ancestrías y seis comunidades nuevas, y el contenido nuevo del SRD 2.0: adversarios, entornos, armas, armaduras, objetos, consumibles y Transformaciones. Los datos del 1.0 se revisaron contra el 2.0.</li>
    </ul>
  </section>

  <section>
    <h4>Dónde leer más</h4>
    <ul>
      <li>Documento de referencia (SRD): <a href="https://www.daggerheart.com/srd/" target="_blank" rel="noopener noreferrer">daggerheart.com/srd</a></li>
      <li>Licencia (Darrington Press Community Gaming License): <a href="https://darringtonpress.com/license/" target="_blank" rel="noopener noreferrer">darringtonpress.com/license</a></li>
    </ul>
  </section>
</Dialogo>

<style>
  p, ul { margin: 0; }
  section { display: grid; gap: 0.35rem; }
  h4 { margin: 0; font-size: 1rem; }
  blockquote {
    margin: 0; padding: 0.6rem 0.8rem; border: 1px solid var(--filete); border-radius: var(--radio-control);
    background: var(--hundido); font-size: 0.85rem; font-weight: 500; line-height: 1.45; color: var(--texto-suave);
    overflow-wrap: anywhere;
  }
  ul { padding-left: 1.1rem; display: grid; gap: 0.3rem; font-size: 0.92rem; }
  p { font-size: 0.92rem; }
  a { color: var(--texto); text-underline-offset: 3px; overflow-wrap: anywhere; }
</style>
