export const API_URL = 'http://localhost:5001/api';  // Simple relative path

export function showMessage(message, isError = false) {
    const msgBox = document.createElement('div');
    msgBox.textContent = message;
    msgBox.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${isError ? '#ff4444' : '#44ff44'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
    `;
    document.body.appendChild(msgBox);
    setTimeout(() => msgBox.remove(), 3000);
}