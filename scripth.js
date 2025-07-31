document.addEventListener('DOMContentLoaded', () => {
    // Variable para almacenar todos los clientes para la búsqueda
    let allClients = [];
    let currentLoggedInUser = null; // Almacena info del usuario logueado
    let tempNewClientData = {}; // Almacena datos del nuevo cliente temporalmente

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const loginForm = document.getElementById('login-form');
    const mainContainer = document.getElementById('main-container');
    const logoutButtons = document.querySelectorAll('.logout-button');
    const notificationToast = document.getElementById('notification-toast');

    // Dashboards
    const clientDashboard = document.getElementById('client-dashboard');
    const adminDashboard = document.getElementById('admin-dashboard');
    const collectorDashboard = document.getElementById('collector-dashboard'); // NUEVO

    // Admin Dashboard
    const clientListContainer = document.getElementById('client-list-container');
    const clientSearchInput = document.getElementById('client-search-input');
    const pendingPaymentsSection = document.getElementById('pending-payments-section'); // NUEVO
    const pendingPaymentsList = document.getElementById('pending-payments-list'); // NUEVO

    // Collector Dashboard
    const collectorClientSearch = document.getElementById('collector-client-search'); // NUEVO
    const collectorClientList = document.getElementById('collector-client-list'); // NUEVO
    
    // Modales
    const manageClientModal = document.getElementById('manage-client-modal');
    const createClientModal = document.getElementById('create-client-modal');
    const paymentPlanModal = document.getElementById('payment-plan-modal');
    const registerPaymentModal = document.getElementById('register-payment-modal'); // NUEVO

    // Formularios
    const manageClientForm = document.getElementById('manage-client-form');
    const createClientForm = document.getElementById('create-client-form');
    const selectPlanForm = document.getElementById('select-plan-form');
    const registerPaymentForm = document.getElementById('register-payment-form'); // NUEVO


    // --- INICIALIZACIÓN AL CARGAR LA PÁGINA ---
    fetchExternalData();

    // --- MANEJADORES DE EVENTOS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutButtons.forEach(button => button.addEventListener('click', handleLogout));
    
    // Eventos Admin
    clientListContainer.addEventListener('click', handleAdminClientListClick);
    clientSearchInput.addEventListener('input', handleClientSearch);
    manageClientForm.addEventListener('submit', handleSaveChanges);
    document.getElementById('apply-late-fee-button').addEventListener('click', handleApplyLateFee);
    document.getElementById('create-client-button').addEventListener('click', () => createClientModal.classList.remove('hidden'));
    pendingPaymentsList.addEventListener('click', handlePendingPaymentAction); // NUEVO

    // Eventos Cobrador
    collectorClientList.addEventListener('click', handleCollectorClientListClick); // NUEVO
    collectorClientSearch.addEventListener('input', handleCollectorClientSearch); // NUEVO
    registerPaymentForm.addEventListener('submit', handleRegisterPayment); // NUEVO

    // Eventos Modales (Comunes y Creación)
    manageClientModal.querySelector('.close-modal-button').addEventListener('click', () => manageClientModal.classList.add('hidden'));
    createClientModal.querySelector('.close-modal-button').addEventListener('click', () => closeCreateClientModal());
    registerPaymentModal.querySelector('.close-modal-button').addEventListener('click', () => registerPaymentModal.classList.add('hidden')); // NUEVO
    paymentPlanModal.querySelector('.close-modal-button').addEventListener('click', () => paymentPlanModal.classList.add('hidden'));
    
    // Navegación creación de cliente
    createClientForm.addEventListener('submit', handleGeneratePlans);
    document.getElementById('next-step-button').addEventListener('click', handleNextStep);
    document.getElementById('prev-step-button').addEventListener('click', handlePrevStep);
    selectPlanForm.addEventListener('submit', handleConfirmPlan);


    // --- LÓGICA DE LOGIN Y LOGOUT ---
    function handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value.toLowerCase().trim();
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const user = users[username];

        if (user && user.password === password && user.role === role) {
            currentLoggedInUser = { username, ...user }; // Guardar usuario logueado
            errorMessage.classList.remove('show');
            mainContainer.classList.add('hidden');
            if (role === 'cliente') {
                showClientDashboard(user);
            } else if (role === 'administrador') {
                showAdminDashboard();
            } else if (role === 'cobrador') { // NUEVO: Lógica para cobrador
                showCollectorDashboard(user);
            }
        } else {
            currentLoggedInUser = null;
            errorMessage.textContent = 'Usuario, contraseña o rol incorrecto.';
            errorMessage.classList.add('show');
        }
    }

    function handleLogout() {
        clientDashboard.classList.add('hidden');
        adminDashboard.classList.add('hidden');
        collectorDashboard.classList.add('hidden'); // NUEVO
        mainContainer.classList.remove('hidden');
        loginForm.reset();
        currentLoggedInUser = null;
    }

    // --- DASHBOARD DE ADMINISTRADOR ---
    function showAdminDashboard() {
        adminDashboard.classList.remove('hidden');
        allClients = Object.entries(users)
            .filter(([, user]) => user.role === 'cliente')
            .map(([id, data]) => ({ id, ...data }));
        
        renderClientList(allClients, clientListContainer, 'admin');
        updateSummaryCards(allClients);
        renderPendingPayments(allClients); // NUEVO
    }
    
    function renderClientList(clients, container, userRole) {
        let tableHTML = `<table><thead><tr><th>Nombre Completo</th><th>Balance Pendiente</th><th>Próximo Vencimiento</th><th>Acción</th></tr></thead><tbody>`;

        if (clients.length === 0) {
            tableHTML += `<tr><td colspan="4" style="text-align:center;">No hay clientes registrados.</td></tr>`;
        } else {
            clients.forEach(client => {
                const balance = calculateBalance(client.account, true); // Admin ve balance real
                const dueDate = client.account.nextDueDate ? new Date(client.account.nextDueDate) : null;
                const lateStatus = isLate(dueDate) ? '<span class="status-late">Atrasado</span>' : '';
                const actionButton = userRole === 'admin' 
                    ? `<button class="button-manage" data-username="${client.id}">Gestionar</button>`
                    : `<button class="button-register-payment" data-username="${client.id}">Registrar Pago</button>`;

                tableHTML += `
                    <tr>
                        <td>${client.profile.fullName} ${lateStatus}</td>
                        <td>RD$ ${formatCurrency(balance)}</td>
                        <td>${dueDate ? dueDate.toLocaleDateString('es-DO') : 'N/A'}</td>
                        <td>${actionButton}</td>
                    </tr>`;
            });
        }
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    // NUEVO: Renderiza la lista de pagos pendientes para el admin
    function renderPendingPayments(clients) {
        const pending = [];
        clients.forEach(client => {
            client.account.paymentHistory.forEach((p, index) => {
                if (p.status === 'pending') {
                    pending.push({ ...p, clientName: client.profile.fullName, clientId: client.id, paymentIndex: index });
                }
            });
        });

        if (pending.length === 0) {
            pendingPaymentsSection.classList.add('hidden');
            return;
        }

        pendingPaymentsSection.classList.remove('hidden');
        let tableHTML = `<table><thead><tr><th>Cliente</th><th>Fecha</th><th>Monto</th><th>Registrado Por</th><th>Acción</th></tr></thead><tbody>`;
        pending.forEach(p => {
            tableHTML += `
                <tr class="pending-payment-row">
                    <td>${p.clientName}</td>
                    <td>${new Date(p.date).toLocaleDateString('es-DO')}</td>
                    <td>RD$ ${formatCurrency(p.amount)}</td>
                    <td>${p.collector || 'N/A'}</td>
                    <td>
                        <button class="button-approve" data-client-id="${p.clientId}" data-payment-index="${p.paymentIndex}">Aprobar</button>
                        <button class="button-reject" data-client-id="${p.clientId}" data-payment-index="${p.paymentIndex}">Rechazar</button>
                    </td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        pendingPaymentsList.innerHTML = tableHTML;
    }
    
    function handleClientSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const filteredClients = allClients.filter(client => client.profile.fullName.toLowerCase().includes(searchTerm));
        renderClientList(filteredClients, clientListContainer, 'admin');
    }

    function updateSummaryCards(clients) {
        const totalClients = clients.length;
        const totalOutstandingDebt = clients.reduce((sum, client) => sum + calculateBalance(client.account, false), 0);
        const totalCollected = clients.reduce((sum, client) => {
            const approvedPayments = client.account.paymentHistory
                .filter(p => p.type === 'payment' && p.status === 'approved')
                .reduce((s, p) => s + p.amount, 0);
            return sum + approvedPayments;
        }, 0);

        document.getElementById('total-clients').textContent = totalClients;
        document.getElementById('total-outstanding-debt').textContent = `RD$ ${formatCurrency(totalOutstandingDebt)}`;
        document.getElementById('total-collected').textContent = `RD$ ${formatCurrency(totalCollected)}`;
    }

    // --- DASHBOARD DE COBRADOR (NUEVO) ---
    function showCollectorDashboard(userData) {
        collectorDashboard.classList.remove('hidden');
        document.getElementById('collector-welcome').textContent = `Bienvenido, Cobrador ${userData.profile.fullName}`;
        allClients = Object.entries(users)
            .filter(([, user]) => user.role === 'cliente')
            .map(([id, data]) => ({ id, ...data }));
        renderClientList(allClients, collectorClientList, 'collector');
    }

    function handleCollectorClientSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const filteredClients = allClients.filter(client => client.profile.fullName.toLowerCase().includes(searchTerm));
        renderClientList(filteredClients, collectorClientList, 'collector');
    }

    // --- DASHBOARD DE CLIENTE ---
    function showClientDashboard(userData) {
        clientDashboard.classList.remove('hidden');
        const balance = calculateBalance(userData.account, false); // Cliente solo ve balance con pagos aprobados
        const approvedPayments = userData.account.paymentHistory
            .filter(p => p.type === 'payment' && p.status === 'approved')
            .reduce((sum, p) => sum + p.amount, 0);

        document.getElementById('client-welcome').textContent = `Bienvenido, ${userData.profile.fullName}`;
        document.getElementById('client-address').textContent = userData.profile.address || 'No especificada';
        document.getElementById('client-contact').textContent = userData.profile.contact || 'No especificado';
        document.getElementById('client-id').textContent = userData.profile.idNumber || 'No especificada';
        document.getElementById('total-debt').textContent = formatCurrency(userData.account.totalDebt);
        document.getElementById('payments-made').textContent = formatCurrency(approvedPayments);
        document.getElementById('current-balance').textContent = formatCurrency(balance);
        
        // Renderizar solo transacciones aprobadas
        const approvedHistory = userData.account.paymentHistory.filter(t => t.status === 'approved');
        renderPaymentHistory(approvedHistory);
        
        const planCard = document.getElementById('client-plan-card');
        if (userData.account.paymentPlan && userData.account.paymentPlan.frequency) {
            const dueDate = new Date(userData.account.nextDueDate);
            document.getElementById('plan-frequency').textContent = userData.account.paymentPlan.frequency;
            document.getElementById('plan-amount').textContent = formatCurrency(userData.account.paymentPlan.amount);
            document.getElementById('plan-due-date').textContent = dueDate.toLocaleDateString('es-DO');
            planCard.classList.remove('hidden');
            document.getElementById('late-fee-warning').classList.toggle('hidden', !isLate(dueDate));
        } else {
            planCard.classList.add('hidden');
        }
    }

    function renderPaymentHistory(history) {
        const container = document.getElementById('payment-history-container');
        if (!history || history.length === 0) {
            container.innerHTML = '<p>No se han registrado transacciones.</p>';
            return;
        }
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        let tableHTML = `<table><thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr></thead><tbody>`;

        sortedHistory.forEach(transaction => {
            const isFee = transaction.type === 'late_fee';
            tableHTML += `<tr class="${isFee ? 'transaction-late-fee' : ''}">
                    <td>${new Date(transaction.date).toLocaleDateString('es-DO')}</td>
                    <td>${isFee ? 'Cargo por Mora (Aprobado)' : 'Pago Realizado (Aprobado)'}</td>
                    <td>RD$ ${formatCurrency(transaction.amount)}</td></tr>`;
        });
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    // --- LÓGICA DE MODALES Y ACCIONES ---

    function handleAdminClientListClick(event) {
        if (event.target.classList.contains('button-manage')) {
            const username = event.target.dataset.username;
            openManagementModal(username, users[username]);
        }
    }

    function handleCollectorClientListClick(event) { // NUEVO
        if (event.target.classList.contains('button-register-payment')) {
            const username = event.target.dataset.username;
            openRegisterPaymentModal(username, users[username]);
        }
    }

    function handleSaveChanges(event) { // Admin registra pago directo
        event.preventDefault();
        const username = event.target.dataset.username;
        const user = users[username];
        const newPayment = parseFloat(document.getElementById('new-payment').value) || 0;
        const newDebt = parseFloat(document.getElementById('update-debt').value);

        if (newPayment > 0) {
            user.account.paymentHistory.push({
                amount: newPayment,
                date: new Date().toISOString(),
                type: 'payment',
                status: 'approved', // Pagos de admin son aprobados automáticamente
                collector: 'admin'
            });
            // Lógica de actualización de fecha de pago
            const planAmount = user.account.paymentPlan.amount;
            if (planAmount && newPayment >= planAmount) {
                user.account.nextDueDate = getNextDueDate(user.account.nextDueDate, user.account.paymentPlan.frequency).toISOString();
            }
        }
        if (!isNaN(newDebt) && newDebt >= 0) {
            user.account.totalDebt = newDebt;
        }

        showNotification("Cambios guardados correctamente.", "success");
        manageClientModal.classList.add('hidden');
        manageClientForm.reset();
        showAdminDashboard();
    }

    function handleRegisterPayment(event) { // Cobrador registra pago pendiente
        event.preventDefault();
        const username = event.target.dataset.username;
        const user = users[username];
        const newPayment = parseFloat(document.getElementById('collector-new-payment').value) || 0;

        if (newPayment > 0) {
            user.account.paymentHistory.push({
                amount: newPayment,
                date: new Date().toISOString(),
                type: 'payment',
                status: 'pending', // Pagos de cobrador quedan pendientes
                collector: currentLoggedInUser.username
            });
            showNotification("Pago registrado. Pendiente de aprobación.", "success");
            registerPaymentModal.classList.add('hidden');
            registerPaymentForm.reset();
        } else {
            showNotification("El monto debe ser mayor a cero.", "error");
        }
    }

    function handlePendingPaymentAction(event) { // Admin aprueba o rechaza
        const button = event.target;
        const clientId = button.dataset.clientId;
        const paymentIndex = parseInt(button.dataset.paymentIndex, 10);
        const client = users[clientId];

        if (!client || isNaN(paymentIndex)) return;

        const payment = client.account.paymentHistory[paymentIndex];

        if (button.classList.contains('button-approve')) {
            payment.status = 'approved';
            // Opcional: Actualizar fecha de próximo pago si el pago cumple la cuota
            const planAmount = client.account.paymentPlan.amount;
            if (planAmount && payment.amount >= planAmount) {
                 client.account.nextDueDate = getNextDueDate(client.account.nextDueDate, client.account.paymentPlan.frequency).toISOString();
            }
            showNotification("Pago aprobado.", "success");
        } else if (button.classList.contains('button-reject')) {
            // En lugar de borrar, se podría marcar como 'rejected'
            client.account.paymentHistory.splice(paymentIndex, 1);
            showNotification("Pago rechazado.", "error");
        }
        showAdminDashboard(); // Recargar vista de admin
    }
    
    function handleApplyLateFee(event) {
        const username = event.target.dataset.username;
        const user = users[username];
        const balance = calculateBalance(user.account, true);
        const lateFee = balance * (user.account.lateFeeRate / 100);
        
        user.account.totalDebt += lateFee;
        user.account.paymentHistory.push({
            amount: lateFee,
            date: new Date().toISOString(),
            type: 'late_fee',
            status: 'approved' // Cargos por mora son directos
        });
        user.account.nextDueDate = getNextDueDate(user.account.nextDueDate, user.account.paymentPlan.frequency).toISOString();
        
        showNotification("Cargo por mora aplicado.", "success");
        manageClientModal.classList.add('hidden');
        showAdminDashboard();
    }
    
    function openManagementModal(username, user) {
        if (!user) return;
        document.getElementById('modal-client-name').textContent = `Gestionar a: ${user.profile.fullName}`;
        manageClientForm.dataset.username = username;
        
        const lateFeeSection = document.getElementById('late-fee-section');
        const dueDate = user.account.nextDueDate ? new Date(user.account.nextDueDate) : null;
        if (isLate(dueDate)) {
            lateFeeSection.classList.remove('hidden');
            document.getElementById('apply-late-fee-button').dataset.username = username;
        } else {
            lateFeeSection.classList.add('hidden');
        }
        manageClientModal.classList.remove('hidden');
    }

    function openRegisterPaymentModal(username, user) { // NUEVO
        if (!user) return;
        document.getElementById('modal-collector-client-name').textContent = `Registrar pago para: ${user.profile.fullName}`;
        registerPaymentForm.dataset.username = username;
        registerPaymentModal.classList.remove('hidden');
    }

    // --- LÓGICA DE CREACIÓN DE CLIENTE ---
    function handleNextStep() { /* Sin cambios */
        const errorMessage = document.getElementById('create-error-message-step1');
        const newUsername = document.getElementById('new-username').value.toLowerCase().trim();
        if (!document.getElementById('new-fullname').value || !newUsername || !document.getElementById('new-password').value) {
            errorMessage.textContent = 'Nombre, usuario y contraseña son obligatorios.';
            errorMessage.classList.add('show');
            return;
        }
        if (users[newUsername]) {
            errorMessage.textContent = 'El nombre de usuario ya existe.';
            errorMessage.classList.add('show');
            return;
        }
        errorMessage.classList.remove('show');
        tempNewClientData = {
            username: newUsername,
            password: document.getElementById('new-password').value,
            role: 'cliente',
            profile: {
                fullName: document.getElementById('new-fullname').value.trim(),
                address: document.getElementById('new-address').value,
                contact: document.getElementById('new-contact').value,
                idNumber: document.getElementById('new-idnumber').value
            }
        };
        document.getElementById('personal-data-step').classList.add('hidden');
        document.getElementById('loan-conditions-step').classList.remove('hidden');
    }
    function handlePrevStep() { /* Sin cambios */
        document.getElementById('loan-conditions-step').classList.add('hidden');
        document.getElementById('personal-data-step').classList.remove('hidden');
    }
    function handleGeneratePlans(event) { /* Sin cambios */
        event.preventDefault();
        tempNewClientData.account = {
            totalDebt: parseFloat(document.getElementById('initial-debt').value),
            paymentHistory: [],
            paymentPlan: {},
            lateFeeRate: parseFloat(document.getElementById('late-fee-rate').value),
            nextDueDate: null
        };
        const { totalDebt } = tempNewClientData.account;
        const termInMonths = parseInt(document.getElementById('loan-term').value);
        const monthlyInterest = parseFloat(document.getElementById('interest-rate').value);
        calculateAndShowPlans(totalDebt, termInMonths, monthlyInterest);
        createClientModal.classList.add('hidden');
        paymentPlanModal.classList.remove('hidden');
    }
    function handleConfirmPlan(event) { /* Sin cambios */
        event.preventDefault();
        const selectedPlanInput = document.querySelector('input[name="payment-plan"]:checked');
        const errorMessage = document.getElementById('plan-error-message');
        if (!selectedPlanInput) {
            errorMessage.textContent = 'Debe seleccionar un plan de pago.';
            errorMessage.classList.add('show');
            return;
        }
        const planData = JSON.parse(selectedPlanInput.value);
        tempNewClientData.account.paymentPlan = planData;
        tempNewClientData.account.nextDueDate = getNextDueDate(new Date(), planData.frequency).toISOString();
        users[tempNewClientData.username] = tempNewClientData;
        showNotification("Cliente creado exitosamente.", "success");
        tempNewClientData = {};
        paymentPlanModal.classList.add('hidden');
        selectPlanForm.reset();
        closeCreateClientModal();
        showAdminDashboard();
    }
    function closeCreateClientModal() { /* Sin cambios */
        createClientModal.classList.add('hidden');
        createClientForm.reset();
        document.getElementById('personal-data-step').classList.remove('hidden');
        document.getElementById('loan-conditions-step').classList.add('hidden');
        document.getElementById('create-error-message-step1').classList.remove('show');
    }
    function calculateAndShowPlans(principal, termInMonths, monthlyInterest) { /* Sin cambios */
        const container = document.getElementById('plan-options-container');
        container.innerHTML = '';
        const monthlyInterestRate = monthlyInterest / 100;
        const monthlyPayment = monthlyInterestRate > 0 ?
            principal * [monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termInMonths)] / [Math.pow(1 + monthlyInterestRate, termInMonths) - 1] :
            principal / termInMonths;
        const plans = [
            { name: 'Plan Mensual', frequency: 'Mensual', amount: monthlyPayment, installments: termInMonths },
            { name: 'Plan Quincenal', frequency: 'Quincenal', amount: monthlyPayment / 2, installments: termInMonths * 2 },
            { name: 'Plan Semanal', frequency: 'Semanal', amount: monthlyPayment / 4, installments: termInMonths * 4 }
        ];
        plans.forEach((plan, index) => {
            const planData = JSON.stringify({ frequency: plan.frequency, amount: plan.amount });
            const planElement = document.createElement('label');
            planElement.className = 'plan-option';
            planElement.innerHTML = `<input type="radio" name="payment-plan" value='${planData}' id="plan-${index}'"><div class="plan-details"><h4>${plan.name}</h4><p>${plan.installments} cuotas de <strong>RD$ ${formatCurrency(plan.amount)}</strong></p></div>`;
            container.appendChild(planElement);
        });
    }

    // --- FUNCIONES DE UTILIDAD ---
    function calculateBalance(account, includePending) {
        if (!account) return 0;
        const filterCondition = p => p.type === 'payment' && (includePending || p.status === 'approved');
        const totalPayments = (account.paymentHistory || [])
            .filter(filterCondition)
            .reduce((sum, p) => sum + p.amount, 0);
        return account.totalDebt - totalPayments;
    }
    
    function isLate(dueDate) { /* Sin cambios */
        if (!dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(dueDate) < today;
    }

    function getNextDueDate(currentDate, frequency) { /* Sin cambios */
        const date = new Date(currentDate);
        switch (frequency) {
            case 'Mensual': date.setMonth(date.getMonth() + 1); break;
            case 'Quincenal': date.setDate(date.getDate() + 15); break;
            case 'Semanal': date.setDate(date.getDate() + 7); break;
        }
        return date;
    }
    
    function formatCurrency(amount) { /* Sin cambios */
        return (amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function showNotification(message, type = 'success') { /* Sin cambios */
        notificationToast.textContent = message;
        notificationToast.className = `toast show ${type}`;
        setTimeout(() => {
            notificationToast.className = 'toast hidden';
        }, 3000);
    }

    // --- APIs EXTERNAS ---
    function fetchExternalData() { /* Sin cambios */
        fetch('https://api.open-meteo.com/v1/forecast?latitude=18.48&longitude=-69.94&current=temperature_2m,weather_code')
            .then(response => response.json()).then(data => {
                document.getElementById('weather-temp').textContent = `${data.current.temperature_2m}°C`;
                document.getElementById('weather-condition').textContent = getWeatherDescription(data.current.weather_code);
            }).catch(error => { console.error("Error fetching weather:", error); document.getElementById('weather-temp').textContent = 'Error'; });
        fetch('https://api.exchangerate-api.com/v4/latest/USD')
            .then(response => response.json()).then(data => {
                document.getElementById('dollar-rate-value').textContent = data.rates.DOP.toFixed(2);
            }).catch(error => { console.error("Error fetching dollar rate:", error); document.getElementById('dollar-rate-value').textContent = 'Error'; });
    }
    function getWeatherDescription(code) { /* Sin cambios */
        const descriptions = { 0: 'Despejado', 1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa', 61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia fuerte', 80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos violentos', 95: 'Tormenta eléctrica' };
        return descriptions[code] || 'No disponible';
    }
});

// --- BASE DE DATOS LOCAL DE EJEMPLO (ACTUALIZADA) ---
const users = {
    'juanperez': {
        password: '123',
        role: 'cliente',
        profile: { fullName: 'Juan Pérez', address: 'Calle Falsa 123, Santo Domingo', contact: '809-123-4567', idNumber: '001-1234567-8' },
        account: { 
            totalDebt: 50000, 
            paymentHistory: [
                { amount: 5000, date: '2025-06-15T14:00:00Z', type: 'payment', status: 'approved', collector: 'admin' },
                { amount: 10000, date: '2025-07-16T15:30:00Z', type: 'payment', status: 'approved', collector: 'admin' },
                // NUEVO: Pago pendiente de ejemplo
                { amount: 2500, date: '2025-07-29T18:00:00Z', type: 'payment', status: 'pending', collector: 'carloscobro' }
            ],
            paymentPlan: { frequency: 'Mensual', amount: 5500 },
            lateFeeRate: 5,
            nextDueDate: '2025-08-16T15:30:00Z'
        }
    },
    'mariagomez': {
        password: '456',
        role: 'cliente',
        profile: { fullName: 'Maria Gómez', address: 'Avenida Siempreviva 742, Santiago', contact: '829-987-6543', idNumber: '002-7654321-0' },
        account: { 
            totalDebt: 125000, 
            paymentHistory: [
                { amount: 25000, date: '2025-05-20T10:00:00Z', type: 'payment', status: 'approved', collector: 'admin' }
            ],
            paymentPlan: { frequency: 'Mensual', amount: 12500 },
            lateFeeRate: 4.5,
            nextDueDate: '2025-07-20T11:00:00Z'
        }
    },
    'admin': {
        password: 'admin',
        role: 'administrador',
        profile: { fullName: 'Administrador' }
    },
    // NUEVO: Usuario cobrador de ejemplo
    'carloscobro': {
        password: '789',
        role: 'cobrador',
        profile: { fullName: 'Carlos Cobro' }
    }
};
