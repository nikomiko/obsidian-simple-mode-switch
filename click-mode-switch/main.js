'use strict';

const { Plugin } = require('obsidian');

/**
 * ClickModeSwitch
 *
 * Comportements :
 *  - Double-clic sur zone vide (Reading View)  → passe en Live Preview (édition)
 *  - Clic simple hors de la largeur du contenu (Live Preview) → passe en Reading View
 */
module.exports = class ClickModeSwitch extends Plugin {

  async onload() {
    // On enregistre un handler global sur le document
    // La délégation d'événements permet de couvrir toutes les feuilles,
    // y compris celles ouvertes après le chargement du plugin.
    this.registerDomEvent(document, 'dblclick', (evt) => this.handleDblClick(evt));
    this.registerDomEvent(document, 'click',    (evt) => this.handleClick(evt));

    console.log('[ClickModeSwitch] Plugin chargé');
  }

  onunload() {
    console.log('[ClickModeSwitch] Plugin déchargé');
  }

  // ----------------------------------------------------------------
  // Récupère la feuille (WorkspaceLeaf) associée à un événement DOM
  // ----------------------------------------------------------------
  getLeafFromEvent(evt) {
    // On remonte le DOM pour trouver le conteneur .workspace-leaf
    const leafEl = evt.target.closest('.workspace-leaf');
    if (!leafEl) return null;

    let foundLeaf = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.containerEl === leafEl) foundLeaf = leaf;
    });
    return foundLeaf;
  }

  // ----------------------------------------------------------------
  // Détecte si le clic s'est produit SUR du texte/contenu éditable
  // ----------------------------------------------------------------
  isOnContent(evt) {
    const target = evt.target;
    // En Reading View, le contenu est dans .markdown-reading-view
    // En Live Preview, le contenu est dans .cm-content
    return (
      target.closest('.cm-content') !== null ||
      target.closest('.markdown-reading-view p, .markdown-reading-view h1, .markdown-reading-view h2, .markdown-reading-view h3, .markdown-reading-view h4, .markdown-reading-view h5, .markdown-reading-view h6, .markdown-reading-view li, .markdown-reading-view blockquote, .markdown-reading-view table, .markdown-reading-view pre, .markdown-reading-view img') !== null
    );
  }

  // ----------------------------------------------------------------
  // Détecte si le clic X est en dehors de la largeur visible du texte
  // ----------------------------------------------------------------
  isOutsideContentWidth(evt) {
    // On cherche le conteneur de largeur max du contenu
    // Obsidian utilise .cm-sizer ou .markdown-preview-sizer
    const sizer =
      evt.target.closest('.cm-sizer') ||
      document.querySelector('.cm-editor .cm-sizer') ||
      evt.target.closest('.markdown-preview-sizer');

    if (!sizer) return false;

    const rect = sizer.getBoundingClientRect();
    return evt.clientX < rect.left || evt.clientX > rect.right;
  }

  // ----------------------------------------------------------------
  // Double-clic : Reading View → Live Preview
  // ----------------------------------------------------------------
  handleDblClick(evt) {
    const leaf = this.getLeafFromEvent(evt);
    if (!leaf) return;

    const state = leaf.getViewState();
    if (state.type !== 'markdown') return;

    // On est en reading view si le mode est "preview"
    if (state.state?.mode !== 'preview') return;

    // On passe en Live Preview (source = false → live preview)
    leaf.setViewState({
      ...state,
      state: { ...state.state, mode: 'source', source: false }
    });

    evt.preventDefault();
  }

  // ----------------------------------------------------------------
  // Clic simple : Live Preview → Reading View si hors contenu
  // ----------------------------------------------------------------
  handleClick(evt) {
    const leaf = this.getLeafFromEvent(evt);
    if (!leaf) return;

    const state = leaf.getViewState();
    if (state.type !== 'markdown') return;

    // On est en édition (live preview ou source)
    if (state.state?.mode !== 'source') return;

    // Si le clic est sur du contenu, on ne fait rien
    if (this.isOnContent(evt)) return;

    // Si le clic est en dehors de la largeur de ligne → lecture
    if (this.isOutsideContentWidth(evt)) {
      leaf.setViewState({
        ...state,
        state: { ...state.state, mode: 'preview' }
      });
    }
  }
};
