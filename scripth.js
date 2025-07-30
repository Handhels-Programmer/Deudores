document.addEventListener('DOMContentLoaded', () => {
    // Variable temporal para almacenar datos del nuevo cliente
    let tempNewUserData = null;
    let loggedInUser = null;

    // Referencias a elementos del DOM
    const loginForm = document.getElementById('login-form');
    const mainContainer = document.getElementById('main-container');
    const clientDashboard = document.getElementById('client-dashboard');
    const adminDashboard = document.getElementById('admin-dashboard');
    const collectorDashboard = document.getElementById('collector-dashboard');
    const logoutButtons = document.querySelectorAll('.logout-button');
    const clientListContainer = document.getElementById('client-list-container');
    const collectorClientListContainer = document.getElementById('collector-client-list-container');
    const pendingPaymentsContainer = document.getElementById('pending-payments-container');
    
    // Referencias al Modal de Gestión
    const manageClientModal = document.getElementById('manage-client-modal');
    const manageClientForm = document.getElementById('manage-client-form');
    const applyLateFeeButton = document.getElementById('apply-late-fee-button');

    // Referencias al Modal de Creación de Usuario
    const createUserModal = document.getElementById('create-user-modal');
    const createUserButton = document.getElementById('create-user-button');
    const createUserForm = document.getElementById('create-user-form');
    const newUserRoleSelect = document.getElementById('new-user-role');
    
    // Referencias al Modal de Planes de Pago
    const paymentPlanModal = document.getElementById('payment-plan-modal');
    const selectPlanForm = document.getElementById('select-plan-form');

    // Referencias al Modal de Registro de Pago (Cobrador)
    const registerPaymentModal = document.getElementById('register-payment-modal');
    const registerPaymentForm = document.getElementById('register-payment-form');
    
    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutButtons.forEach(button => button.addEventListener('click', handleLogout));
    clientListContainer.addEventListener('click', handleClientListClick);
    collectorClientListContainer.addEventListener('click', handleCollectorClientListClick);
    pendingPaymentsContainer.addEventListener('click', handlePendingPaymentsClick);

    // Eventos Modales
    manageClientModal.querySelector('.close-modal-button').addEventListener('click', () => manageClientModal.classList.add('hidden'));
    manageClientForm.addEventListener('submit', handleSaveChanges);
    applyLateFeeButton.addEventListener('click', handleApplyLateFee);

    createUserButton.addEventListener('click', () => createUserModal.classList.remove('hidden'));
    createUserModal.querySelector('.close-modal-button').addEventListener('click', () => closeCreateUserModal());
    createUserForm.addEventListener('submit', handleCreateUser);
    newUserRoleSelect.addEventListener('change', toggleClientSpecificFields);

    paymentPlanModal.querySelector('.close-modal-button').addEventListener('click', () => paymentPlanModal.classList.add('hidden'));
    selectPlanForm.addEventListener('submit', handleConfirmPlan);

    registerPaymentModal.querySelector('.close-modal-button').addEventListener('click', () => registerPaymentModal.classList.add('hidden'));
    registerPaymentForm.addEventListener('submit', handleRegisterPayment);

    // --- MANEJADORES DE EVENTOS ---

    function handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value.toLowerCase();
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const user = users[username];

        if (user && user.password === password && user.role === role) {
            loggedInUser = { username, ...user };
            errorMessage.classList.remove('show');
            mainContainer.classList.add('hidden');
            if (role === 'cliente') showClientDashboard(user);
            else if (role === 'administrador') showAdminDashboard();
            else if (role === 'cobrador') showCollectorDashboard();
        } else {
            errorMessage.textContent = 'Usuario, contraseña o rol incorrecto.';
            errorMessage.classList.add('show');
        }
    }

    function handleLogout() {
        loggedInUser = null;
        clientDashboard.classList.add('hidden');
        adminDashboard.classList.add('hidden');
        collectorDashboard.classList.add('hidden');
        mainContainer.classList.remove('hidden');
        loginForm.reset();
    }
    
    function handleClientListClick(event) {
        if (event.target.classList.contains('button-manage')) {
            openManagementModal(event.target.dataset.username);
        }
    }
    
    function handleCollectorClientListClick(event) {
        if (event.target.classList.contains('button-register-payment')) {
            openRegisterPaymentModal(event.target.dataset.username);
        }
    }

    function handlePendingPaymentsClick(event) {
        const target = event.target;
        const clientUsername = target.dataset.username;
        const paymentIndex = target.dataset.index;

        if (target.classList.contains('button-approve')) {
            approvePayment(clientUsername, paymentIndex);
        } else if (target.classList.contains('button-reject')) {
            rejectPayment(clientUsername, paymentIndex);
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
                date: new Date().toISOString(),
                type: 'payment',
                approvedBy: 'admin'
            });
            const planAmount = user.account.paymentPlan.amount;
            if (planAmount && newPayment >= planAmount) {
                user.account.nextDueDate = getNextDueDate(user.account.nextDueDate, user.account.paymentPlan.frequency).toISOString();
            }
        }
        if (!isNaN(newDebt) && newDebt >= 0) user.account.totalDebt = newDebt;

        manageClientModal.classList.add('hidden');
        manageClientForm.reset();
        renderClientList();
    }
    
    function handleApplyLateFee(event) {
        const username = event.target.dataset.username;
        const user = users[username];
        const balance = calculateBalance(user.account);
        const lateFee = balance * (user.account.lateFeeRate / 100);
        
        user.account.totalDebt += lateFee;
        user.account.paymentHistory.push({
            amount: lateFee,
            date: new Date().toISOString(),
            type: 'late_fee'
        });
        user.account.nextDueDate = getNextDueDate(user.account.nextDueDate, user.account.paymentPlan.frequency).toISOString();
        
        manageClientModal.classList.add('hidden');
        renderClientList();
    }

    function handleCreateUser(event) {
        event.preventDefault();
        const errorMessage = document.getElementById('create-error-message');
        const newUsername = document.getElementById('new-username').value.toLowerCase().trim();
        const role = newUserRoleSelect.value;

        if (users[newUsername]) {
            errorMessage.textContent = 'El nombre de usuario ya existe.';
            errorMessage.classList.add('show');
            return;
        }

        tempNewUserData = {
            username: newUsername,
            password: document.getElementById('new-password').value,
            role: role,
            profile: { fullName: document.getElementById('new-fullname').value.trim() }
        };

        if (role === 'cliente') {
            tempNewUserData.profile.address = document.getElementById('new-address').value;
            tempNewUserData.profile.contact = document.getElementById('new-contact').value;
            tempNewUserData.profile.idNumber = document.getElementById('new-idnumber').value;
            tempNewUserData.account = {
                totalDebt: parseFloat(document.getElementById('initial-debt').value),
                paymentHistory: [],
                pendingPayments: [],
                paymentPlan: {},
                lateFeeRate: parseFloat(document.getElementById('late-fee-rate').value),
                nextDueDate: null
            };
            const { totalDebt } = tempNewUserData.account;
            const termInMonths = parseInt(document.getElementById('loan-term').value);
            const monthlyInterest = parseFloat(document.getElementById('interest-rate').value);
            calculateAndShowPlans(totalDebt, termInMonths, monthlyInterest);
            createUserModal.classList.add('hidden');
            paymentPlanModal.classList.remove('hidden');
        } else { // Es Cobrador
            users[newUsername] = tempNewUserData;
            closeCreateUserModal();
            // Aquí se podría renderizar una lista de cobradores también si se quisiera.
        }
        errorMessage.classList.remove('show');
    }

    function handleConfirmPlan(event) {
        event.preventDefault();
        const selectedPlanInput = document.querySelector('input[name="payment-plan"]:checked');
        const errorMessage = document.getElementById('plan-error-message');

        if (!selectedPlanInput) {
            errorMessage.textContent = 'Debe seleccionar un plan de pago.';
            errorMessage.classList.add('show');
            return;
        }
        
        const planData = JSON.parse(selectedPlanInput.value);
        tempNewUserData.account.paymentPlan = planData;
        tempNewUserData.account.nextDueDate = getNextDueDate(new Date(), planData.frequency).toISOString();
        users[tempNewUserData.username] = tempNewUserData;

        tempNewUserData = null;
        paymentPlanModal.classList.add('hidden');
        selectPlanForm.reset();
        renderClientList();
    }
    
    function handleRegisterPayment(event) {
        event.preventDefault();
        const clientUsername = event.target.dataset.username;
        const amount = parseFloat(document.getElementById('collector-payment-amount').value);
        
        if (amount > 0) {
            users[clientUsername].account.pendingPayments.push({
                amount,
                date: new Date().toISOString(),
                collectorId: loggedInUser.username
            });
        }
        registerPaymentModal.classList.add('hidden');
        registerPaymentForm.reset();
    }

    // --- LÓGICA DE VISTAS Y MODALES ---

    function showClientDashboard(userData) {
        clientDashboard.classList.remove('hidden');
        const balance = calculateBalance(userData.account);
        const totalPayments = userData.account.paymentHistory.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);

        document.getElementById('client-welcome').textContent = `Bienvenido, ${userData.profile.fullName}`;
        document.getElementById('client-address').textContent = userData.profile.address;
        document.getElementById('client-contact').textContent = userData.profile.contact;
        document.getElementById('client-id').textContent = userData.profile.idNumber;
        document.getElementById('total-debt').textContent = formatCurrency(userData.account.totalDebt);
        document.getElementById('payments-made').textContent = formatCurrency(totalPayments);
        document.getElementById('current-balance').textContent = formatCurrency(balance);
        
        renderPaymentHistory(userData.account.paymentHistory);
        
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
    
    function showAdminDashboard() {
        adminDashboard.classList.remove('hidden');
        renderClientList();
        renderPendingPayments();
    }

    function showCollectorDashboard() {
        collectorDashboard.classList.remove('hidden');
        document.getElementById('collector-welcome').textContent = `Bienvenido, ${loggedInUser.profile.fullName} (Cobrador)`;
        renderClientListForCollector();
    }

    function renderPaymentHistory(history) {
        const container = document.getElementById('payment-history-container');
        if (history.length === 0) {
            container.innerHTML = '<p>No se han registrado transacciones.</p>';
            return;
        }

        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedHistory.forEach(transaction => {
            const isFee = transaction.type === 'late_fee';
            tableHTML += `
                <tr class="${isFee ? 'transaction-late-fee' : ''}">
                    <td>${new Date(transaction.date).toLocaleDateString('es-DO')}</td>
                    <td>${isFee ? 'Cargo por Mora' : 'Pago Realizado'}</td>
                    <td>RD$ ${formatCurrency(transaction.amount)}</td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    function renderClientList() {
        const clientUsers = Object.entries(users).filter(([, user]) => user.role === 'cliente');
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>Balance Pendiente</th>
                        <th>Próximo Vencimiento</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>`;

        clientUsers.forEach(([username, client]) => {
            const balance = calculateBalance(client.account);
            const dueDate = client.account.nextDueDate ? new Date(client.account.nextDueDate) : null;
            const lateStatus = isLate(dueDate) ? '<span class="status-late">Atrasado</span>' : '';

            tableHTML += `
                <tr>
                    <td>${client.profile.fullName} ${lateStatus}</td>
                    <td>RD$ ${formatCurrency(balance)}</td>
                    <td>${dueDate ? dueDate.toLocaleDateString('es-DO') : 'N/A'}</td>
                    <td><button class="button-manage" data-username="${username}">Gestionar</button></td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        clientListContainer.innerHTML = tableHTML;
    }
    
    function renderClientListForCollector() {
        const clientUsers = Object.entries(users).filter(([, user]) => user.role === 'cliente');
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>Balance Pendiente</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>`;

        clientUsers.forEach(([username, client]) => {
            const balance = calculateBalance(client.account);
            tableHTML += `
                <tr>
                    <td>${client.profile.fullName}</td>
                    <td>RD$ ${formatCurrency(balance)}</td>
                    <td><button class="button-register-payment" data-username="${username}">Registrar Pago</button></td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        collectorClientListContainer.innerHTML = tableHTML;
    }
    
    function renderPendingPayments() {
        let allPending = [];
        Object.entries(users).forEach(([username, user]) => {
            if (user.role === 'cliente' && user.account.pendingPayments.length > 0) {
                user.account.pendingPayments.forEach((payment, index) => {
                    allPending.push({ clientUsername: username, clientName: user.profile.fullName, payment, index });
                });
            }
        });

        if (allPending.length === 0) {
            pendingPaymentsContainer.innerHTML = '<p>No hay pagos pendientes de aprobación.</p>';
            return;
        }

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Monto</th>
                        <th>Fecha Registro</th>
                        <th>Cobrador</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>`;
        
        allPending.forEach(({ clientUsername, clientName, payment, index }) => {
            tableHTML += `
                <tr>
                    <td>${clientName}</td>
                    <td>RD$ ${formatCurrency(payment.amount)}</td>
                    <td>${new Date(payment.date).toLocaleString('es-DO')}</td>
                    <td>${users[payment.collectorId].profile.fullName}</td>
                    <td>
                        <button class="button-approve" data-username="${clientUsername}" data-index="${index}">Aprobar</button>
                        <button class="button-reject" data-username="${clientUsername}" data-index="${index}">Rechazar</button>
                    </td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        pendingPaymentsContainer.innerHTML = tableHTML;
    }

    function openManagementModal(username) {
        const user = users[username];
        if (!user) return;
        document.getElementById('modal-client-name').textContent = `Gestionar a: ${user.profile.fullName}`;
        manageClientForm.dataset.username = username;
        
        const lateFeeSection = document.getElementById('late-fee-section');
        if (isLate(new Date(user.account.nextDueDate))) {
            lateFeeSection.classList.remove('hidden');
            applyLateFeeButton.dataset.username = username;
        } else {
            lateFeeSection.classList.add('hidden');
        }
        manageClientModal.classList.remove('hidden');
    }
    
    function openRegisterPaymentModal(username) {
        const user = users[username];
        if (!user) return;
        document.getElementById('register-payment-client-name').textContent = `Registrar pago para: ${user.profile.fullName}`;
        registerPaymentForm.dataset.username = username;
        registerPaymentModal.classList.remove('hidden');
    }

    function closeCreateUserModal() {
        createUserModal.classList.add('hidden');
        createUserForm.reset();
        toggleClientSpecificFields();
        document.getElementById('create-error-message').classList.remove('show');
    }
    
    function toggleClientSpecificFields() {
        const role = newUserRoleSelect.value;
        const clientFields = document.getElementById('client-specific-fields');
        const button = createUserForm.querySelector('button[type="submit"]');
        
        if (role === 'cliente') {
            clientFields.classList.remove('hidden');
            button.textContent = 'Generar Planes de Pago';
        } else {
            clientFields.classList.add('hidden');
            button.textContent = 'Crear Usuario';
        }
    }

    // --- LÓGICA DE APROBACIÓN ---
    function approvePayment(clientUsername, paymentIndex) {
        const client = users[clientUsername];
        const paymentToApprove = client.account.pendingPayments[paymentIndex];
        
        client.account.paymentHistory.push({
            ...paymentToApprove,
            type: 'payment',
            approvedBy: loggedInUser.username
        });

        const planAmount = client.account.paymentPlan.amount;
        if (planAmount && paymentToApprove.amount >= planAmount) {
            client.account.nextDueDate = getNextDueDate(client.account.nextDueDate, client.account.paymentPlan.frequency).toISOString();
        }
        
        client.account.pendingPayments.splice(paymentIndex, 1);
        
        renderPendingPayments();
        renderClientList();
    }

    function rejectPayment(clientUsername, paymentIndex) {
        users[clientUsername].account.pendingPayments.splice(paymentIndex, 1);
        renderPendingPayments();
    }

    // --- FUNCIONES DE UTILIDAD ---
    function calculateBalance(account) {
        const totalPayments = account.paymentHistory.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
        return account.totalDebt - totalPayments;
    }
    
    function isLate(dueDate) {
        if (!dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(dueDate) < today;
    }

    function getNextDueDate(currentDate, frequency) {
        const date = new Date(currentDate);
        switch (frequency) {
            case 'Mensual': date.setMonth(date.getMonth() + 1); break;
            case 'Quincenal': date.setDate(date.getDate() + 15); break;
            case 'Semanal': date.setDate(date.getDate() + 7); break;
        }
        return date;
    }
    
    function formatCurrency(amount) {
        return amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // Inicializar campos de cliente en el modal de creación
    toggleClientSpecificFields();
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
                { amount: 5000, date: '2025-06-15T14:00:00Z', type: 'payment' },
                { amount: 10000, date: '2025-07-16T15:30:00Z', type: 'payment' }
            ],
            pendingPayments: [],
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
                { amount: 25000, date: '2025-05-20T10:00:00Z', type: 'payment' }
            ],
            pendingPayments: [
                { amount: 1000, date: '2025-07-29T18:00:00Z', collectorId: 'cobrador1' }
            ],
            paymentPlan: { frequency: 'Mensual', amount: 12500 },
            lateFeeRate: 4.5,
            nextDueDate: '2025-07-20T11:00:00Z'
        }
    },
    'admin': {
        password: 'admin',
        role: 'administrador',
        profile: { fullName: 'Administrador Principal' }
    },
    'cobrador1': {
        password: 'cob',
        role: 'cobrador',
        profile: { fullName: 'Carlos Cobrador' }
    }
};
