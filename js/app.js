// app.js — application controller

const App = (() => {
  let currentMode = null;

  function startMode(mode) {
    currentMode = mode;

    // Scroll to simulator
    document.getElementById('simulator').scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (mode === 'configure') {
      showPanel('configure');
      Config.init();
    } else if (mode === 'voter') {
      showPanel('voter');
      Config.init(); // init config silently (for simulation backend)
      // Init voter ballot with default candidates, no polling shown
      Voter.init(Config.getCandidates().map((c, i) => ({ ...c })));
    }
  }

  function showPanel(name) {
    ['configure', 'voter', 'results'].forEach(p => {
      const el = document.getElementById(`panel-${p}`);
      if (el) el.style.display = p === name ? 'block' : 'none';
    });
  }

  function reset() {
    currentMode = null;
    showPanel('configure');
    // Scroll back to hero
    document.querySelector('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      ['configure', 'voter', 'results'].forEach(p => {
        const el = document.getElementById(`panel-${p}`);
        if (el) el.style.display = 'none';
      });
    }, 600);
  }

  return { startMode, showPanel, reset };
})();
