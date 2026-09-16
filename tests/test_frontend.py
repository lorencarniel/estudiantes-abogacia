from pathlib import Path
HTML=Path('app/static/index.html').read_text()
JS=Path('app/static/app.js').read_text()
def test_accessible_form_and_states():
 assert 'novalidate' in HTML and 'aria-live' in HTML and 'tabindex="0"' in HTML
 assert "button.disabled=true" in JS and "button.disabled=false" in JS
def test_vis_navigation_and_export():
 for token in ['vis.Network','hierarchical','dragView','zoomView','network.fit','toDataURL','maxExportPixels']:
  assert token in JS
 assert '<button id="download" type="button" disabled>' in HTML
