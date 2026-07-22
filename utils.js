export async function loadComponent(targetId, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Fehler beim Laden von ${filePath}: ${response.statusText}`);
    }
    const html = await response.text();
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      targetElement.innerHTML = html;
    }
  } catch (error) {
    console.error('Fehler in loadComponent:', error);
  }
}