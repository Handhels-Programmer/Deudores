// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const loginForm = document.getElementById('login-form');
    const mainContainer = document.getElementById('main-container');
    const clientDashboard = document.getElementById('client-dashboard');
    const adminDashboard = document.getElementById('admin-dashboard');
    const logoutButtons = document.querySelectorAll('.logout-button');
    
    // Referencias al Modal de Gestión
    const manageClientModal = document.getElementById('manage-client-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const manageClientForm = document.getElementById('manage-client-form');
    const clientListContainer = document.getElementById('client-list-container');

    // Referencias a Funcionalidades de Gemini
    const getFinancialTipsButton = document.getElementById('get-financial-tips-button');
    const suggestPaymentPlanButton = document.getElementById('suggest-payment-plan-button');

    // Asignación de eventos
    loginForm.addEventListener('submit', handleLogin);
    logoutButtons.forEach(button => button.addEventListener('click', handleLogout));
    closeModalButton.addEventListener('click', closeManagementModal);
    manageClientForm.addEventListener('submit', handleSaveChanges);
    clientListContainer.addEventListener('click', handleClientListClick);
    getFinancialTipsButton.addEventListener('click', handleGetFinancialTips);
    suggestPaymentPlanButton.addEventListener('click', handleSuggestPaymentPlan);

    // --- MANEJADORES DE EVENTOS ---

    function handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value.toLowerCase();
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const user = users[username];

        if (user && user.password === password && user.role === role) {
            errorMessage.classList.remove('show');
            mainContainer.classList.add('hidden');
            if (role === 'cliente') {
                showClientDashboard(user, username);
            } else if (role === 'administrador') {
                showAdminDashboard();
            }
        } else {
            errorMessage.textContent = 'Usuario, contraseña o rol incorrecto.';
            errorMessage.classList.add('show');
        }
    }

    function handleLogout() {
        clientDashboard.classList.add('hidden');
        adminDashboard.classList.add('hidden');
        mainContainer.classList.remove('hidden');
        loginForm.reset();
    }
    
    function handleClientListClick(event) {
        if (event.target.classList.contains('button-manage')) {
            const username = event.target.dataset.username;
            openManagementModal(username);
        }
    }

    function handleSaveChanges(event) {
        event.preventDefault();
        const username = event.target.dataset.username;
        const user = users[username];
        const newPayment = parseFloat(document.getElementById('new-payment').value) || 0;
        const newDebt = parseFloat(document.getElementById('update-debt').value);

        if (newPayment > 0) {
            user.account.paymentHistory.push({
                amount: newPayment,
                date: new Date().toISOString()
            });
        }
        if (!isNaN(newDebt) && newDebt >= 0) {
            user.account.totalDebt = newDebt;
        }

        closeManagementModal();
        renderClientList();
    }

    // --- MANEJADORES DE EVENTOS DE GEMINI ---
    
    async function handleGetFinancialTips(event) {
        const username = event.target.dataset.username;
        const user = users[username];
        const totalPayments = user.account.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
        const balance = user.account.totalDebt - totalPayments;
        
        const container = document.getElementById('financial-tips-container');
        const contentDiv = document.getElementById('financial-tips-content');
        const spinner = container.querySelector('.spinner-container');
        
        container.classList.remove('hidden');
        contentDiv.innerHTML = '';
        spinner.classList.remove('hidden');

        const prompt = `Como asesor financiero, dame 5 consejos cortos y prácticos para una persona en República Dominicana con una deuda pendiente de ${balance.toLocaleString('es-DO')} DOP. Los consejos deben ser accionables y fáciles de entender. Formatea la respuesta como una lista HTML (ul y li).`;

        try {
            const responseText = await callGemini(prompt);
            contentDiv.innerHTML = `<h4>Consejos para ti:</h4>${responseText}`;
        } catch (error) {
            contentDiv.innerHTML = `<p class="error-text">No se pudieron generar los consejos. Inténtalo de nuevo.</p>`;
            console.error("Error fetching financial tips:", error);
        } finally {
            spinner.classList.add('hidden');
        }
    }

    async function handleSuggestPaymentPlan(event) {
        const username = event.target.dataset.username;
        const user = users[username];
        const totalPayments = user.account.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
        const balance = user.account.totalDebt - totalPayments;

        const container = document.getElementById('payment-plan-container');
        const contentDiv = document.getElementById('payment-plan-content');
        const spinner = container.querySelector('.spinner-container');

        container.classList.remove('hidden');
        contentDiv.innerHTML = '';
        spinner.classList.remove('hidden');

        const prompt = `Basado en una deuda pendiente de ${balance} DOP, genera 3 planes de pago distintos.`;
        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    planName: { type: "STRING" },
                    installments: { type: "NUMBER" },
                    installmentAmount: { type: "NUMBER" },
                    frequency: { type: "STRING" }
                },
                required: ["planName", "installments", "installmentAmount", "frequency"]
            }
        };
        
        try {
            const plans = await callGemini(prompt, schema);
            let html = '<h4>Planes Sugeridos:</h4>';
            plans.forEach(plan => {
                html += `
                    <div class="payment-plan-card">
                        <h5>${plan.planName}</h5>
                        <p><strong>Cuotas:</strong> ${plan.installments} ${plan.frequency}s</p>
                        <p><strong>Monto por cuota:</strong> RD$ ${plan.installmentAmount.toLocaleString('es-DO')}</p>
                    </div>
                `;
            });
            contentDiv.innerHTML = html;
        } catch (error) {
            contentDiv.innerHTML = `<p class="error-text">No se pudieron generar los planes. Inténtalo de nuevo.</p>`;
            console.error("Error fetching payment plans:", error);
        } finally {
            spinner.classList.add('hidden');
        }
    }

    // --- LÓGICA DE VISTAS Y MODALES ---

    function showClientDashboard(userData, username) {
        clientDashboard.classList.remove('hidden');
        const totalPayments = userData.account.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
        const balance = userData.account.totalDebt - totalPayments;

        document.getElementById('client-welcome').textContent = `Bienvenido, ${userData.profile.fullName}`;
        document.getElementById('client-address').textContent = userData.profile.address;
        document.getElementById('client-contact').textContent = userData.profile.contact;
        document.getElementById('client-id').textContent = userData.profile.idNumber;
        document.getElementById('total-debt').textContent = userData.account.totalDebt.toLocaleString('es-DO');
        document.getElementById('payments-made').textContent = totalPayments.toLocaleString('es-DO');
        document.getElementById('current-balance').textContent = balance.toLocaleString('es-DO');
        
        renderPaymentHistory(userData.account.paymentHistory);
        
        getFinancialTipsButton.dataset.username = username;
        document.getElementById('financial-tips-container').classList.add('hidden');
    }

    function renderPaymentHistory(history) {
        const container = document.getElementById('payment-history-container');
        if (history.length === 0) {
            container.innerHTML = '<p>No se han registrado pagos.</p>';
            return;
        }

        // Ordenar historial por fecha, de más reciente a más antiguo
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Monto Pagado</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedHistory.forEach(payment => {
            const paymentDate = new Date(payment.date);
            const formattedDate = paymentDate.toLocaleDateString('es-DO', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            tableHTML += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>RD$ ${payment.amount.toLocaleString('es-DO')}</td>
                </tr>`;
        });

        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    function showAdminDashboard() {
        adminDashboard.classList.remove('hidden');
        renderClientList();
    }

    function renderClientList() {
        const clientUsers = Object.entries(users).filter(([, user]) => user.role === 'cliente');
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>Deuda Total</th>
                        <th>Pagos Realizados</th>
                        <th>Balance Pendiente</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>`;

        clientUsers.forEach(([username, client]) => {
            const totalPayments = client.account.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
            const balance = client.account.totalDebt - totalPayments;
            tableHTML += `
                <tr>
                    <td>${client.profile.fullName}</td>
                    <td>RD$ ${client.account.totalDebt.toLocaleString('es-DO')}</td>
                    <td>RD$ ${totalPayments.toLocaleString('es-DO')}</td>
                    <td>RD$ ${balance.toLocaleString('es-DO')}</td>
                    <td>
                        <button class="button-manage" data-username="${username}">Gestionar</button>
                    </td>
                </tr>`;
        });

        tableHTML += `</tbody></table>`;
        clientListContainer.innerHTML = tableHTML;
    }

    function openManagementModal(username) {
        const user = users[username];
        if (!user) return;

        document.getElementById('modal-client-name').textContent = `Gestionar a: ${user.profile.fullName}`;
        manageClientForm.dataset.username = username;
        suggestPaymentPlanButton.dataset.username = username;
        manageClientModal.classList.remove('hidden');
        document.getElementById('payment-plan-container').classList.add('hidden');
    }

    function closeManagementModal() {
        manageClientModal.classList.add('hidden');
        manageClientForm.reset();
    }

    // --- FUNCIÓN DE LLAMADA A LA API DE GEMINI ---

    async function callGemini(prompt, jsonSchema = null) {
        const apiKey = ""; // Se deja en blanco según las instrucciones
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        let payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        if (jsonSchema) {
            payload.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: jsonSchema
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            return jsonSchema ? JSON.parse(text) : text;
        } else {
            throw new Error("No content received from API.");
        }
    }
});


// --- BASE DE DATOS DE EJEMPLO ---
const users = {
    'juanperez': {
        password: '123',
        role: 'cliente',
        profile: { fullName: 'Juan Pérez', address: 'Calle Falsa 123, Santo Domingo', contact: '809-123-4567', idNumber: '001-1234567-8' },
        account: { 
            totalDebt: 50000, 
            paymentHistory: [
                { amount: 5000, date: '2025-06-15T14:00:00Z' },
                { amount: 10000, date: '2025-07-16T15:30:00Z' }
            ] 
        }
    },
    'mariagomez': {
        password: '456',
        role: 'cliente',
        profile: { fullName: 'Maria Gómez', address: 'Avenida Siempreviva 742, Santiago', contact: '829-987-6543', idNumber: '002-7654321-0' },
        account: { 
            totalDebt: 125000, 
            paymentHistory: [
                { amount: 25000, date: '2025-05-20T10:00:00Z' },
                { amount: 25000, date: '2025-06-20T11:00:00Z' },
                { amount: 25000, date: '2025-07-21T12:00:00Z' }
            ] 
        }
    },
    'carlosrodriguez': {
        password: '789',
        role: 'cliente',
        profile: { fullName: 'Carlos Rodríguez', address: 'Plaza Central, Local 5, Punta Cana', contact: '849-555-0101', idNumber: '003-1122334-5' },
        account: { 
            totalDebt: 2500, 
            paymentHistory: [] 
        }
    },
    'admin': {
        password: 'admin',
        role: 'administrador',
        profile: { fullName: 'Administrador Principal' }
    }
};
