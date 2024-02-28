const replaceScript = sessionStorage.getItem('replaceAlert');
const script = document.createElement("script");
script.innerHTML = replaceScript;
document.head.appendChild(script);