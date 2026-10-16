/* Installation sur le poste (Edge / Chrome) : enregistrement du service worker
   et bouton « Installer » quand le navigateur le propose. */
(function () {
  'use strict';
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* l'application marche aussi sans */ });
    });
  }

  let invite = null;
  const bouton = () => document.getElementById('btn-installer');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    invite = e;
    if (bouton()) bouton().hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    invite = null;
    if (bouton()) bouton().hidden = true;
  });

  document.addEventListener('DOMContentLoaded', () => {
    const b = bouton();
    if (!b) return;
    b.addEventListener('click', async () => {
      if (!invite) return;
      invite.prompt();
      await invite.userChoice;
      invite = null;
      b.hidden = true;
    });
  });
})();
