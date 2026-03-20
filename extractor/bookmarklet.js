javascript:(function(){
  var s = document.createElement('script');
  s.src = 'http://localhost:8765/extractor.js?t=' + Date.now();
  s.onerror = function() {
    alert('PMI Extractor: Could not load script. Is the local server running?\nRun: npm run serve');
  };
  document.head.appendChild(s);
})();
