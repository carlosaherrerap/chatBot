// app.js – UI logic for QR scanner and conversation viewer

document.addEventListener('DOMContentLoaded', () => {
    initQrScanner();
    loadConversations();
});

// Initialize html5-qrcode scanner
function initQrScanner() {
    const qrResult = document.getElementById('qr-result');
    const qrReader = new Html5Qrcode('qr-reader');
    const config = { fps: 10, qrbox: 250 };

    qrReader.start({ facingMode: 'environment' }, config, decodedText => {
        qrResult.textContent = `Código QR leído: ${decodedText}`;
        // In a real implementation you would POST this to the backend to set the session.
        console.log('QR code:', decodedText);
        // Stop scanning after first read
        qrReader.stop().catch(err => console.error('Error stopping QR scanner', err));
    }, errorMessage => {
        // console.warn('QR scan error', errorMessage);
    }).catch(err => {
        qrResult.textContent = 'No se pudo iniciar el escáner de QR.';
        console.error('Failed to start QR scanner', err);
    });
}

// Load mock conversation data (replace with real API in production)
async function loadConversations() {
    const tbody = document.getElementById('conv-body');
    try {
        const resp = await fetch('mock_conversations.json');
        const data = await resp.json();
        data.forEach(conv => {
            const tr = document.createElement('tr');
            const dirTd = document.createElement('td');
            dirTd.textContent = conv.direction;
            const msgTd = document.createElement('td');
            msgTd.textContent = conv.message;
            const timeTd = document.createElement('td');
            const date = new Date(conv.timestamp);
            timeTd.textContent = date.toLocaleString();
            tr.appendChild(dirTd);
            tr.appendChild(msgTd);
            tr.appendChild(timeTd);
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loading conversations', e);
        tbody.innerHTML = '<tr><td colspan="3">No se pudieron cargar las conversaciones.</td></tr>';
    }
}
