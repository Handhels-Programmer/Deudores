// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Variable temporal para almacenar datos del nuevo cliente
    let tempNewClientData = null;

    // Referencias a elementos del DOM
    const loginForm = document.getElementById('login-form');
    const mainContainer = document.getElementById('main-container');
    const clientDashboard = document.getElementById('client-dashboard');
    const adminDashboard = document.getElementById('admin-dashboard');
    const logoutButtons = document.querySelectorAll('.logout-button');
    const clientListContainer = document.getElementById('client-list-container');
    
    // Referencias al Modal de Gestión
    const manageClientModal = document.getElementById('manage-client-modal');
    const manageClientForm = document.getElementById('manage-client-form');
    const applyLateFeeButton = document.getElementById('apply-late-fee-button');

    // Referencias al Modal de Creación
    const createClientModal = document.getElementById('create-client-modal');
    const createClientButton = document.getElementById('create-client-button');
    const createClientForm = document.getElementById('create-client-form');
    
    // Referencias al Modal de Planes de Pago
    const paymentPlanModal = document.getElementById('payment-plan-modal');
    const selectPlanForm = document.getElementById('select-plan-form');
    
    // Asignación de eventos
    loginForm.addEventListener('submit', handleLogin);
    logoutButtons.forEach(button => button.addEventListener('click', handleLogout));
    clientListContainer.addEventListener('click', handleClientListClick);

    // Eventos del Modal de Gestión
    manageClientModal.querySelector('.close-modal-button').addEventListener('click', () => manageClientModal.classList.add('hidden'));
    manageClientForm.addEventListener('submit', handleSaveChanges);
    applyLateFeeButton.addEventListener('click', handleApplyLateFee);

    // Eventos del Modal de Creación
    createClientButton.addEventListener('click', () => createClientModal.classList.remove('hidden'));
    createClientModal.querySelector('.close-modal-button').addEventListener('click', () => {
        createClientModal.classList.add('hidden');
        createClientForm.reset();
        document.getElementById('create-error-message').classList.remove('show');
    });
    createClientForm.addEventListener('submit', handleGeneratePlans);
    
    // Eventos del Modal de Planes de Pago
    paymentPlanModal.querySelector('.close-modal-button').addEventListener('click', () => paymentPlanModal.classList.add('hidden'));
    selectPlanForm.addEventListener('submit', handleConfirmPlan);


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
                showClientDashboard(user);
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
                date: new Date().toISOString(),
                type: 'payment'
            });
            // Lógica para avanzar la fecha de pago si se cumple la cuota
            const planAmount = user.account.paymentPlan.amount;
            if (planAmount && newPayment >= planAmount) {
                user.account.nextDueDate = getNextDueDate(user.account.nextDueDate, user.account.paymentPlan.frequency).toISOString();
            }
        }
        if (!isNaN(newDebt) && newDebt >= 0) {
            user.account.totalDebt = newDebt;
        }

        manageClientModal.classList.add('hidden');
        manageClientForm.reset();
        renderClientList();
    }
    
    function handleApplyLateFee(event) {
        const username = event.target.dataset.username;
        const user = users[username];
        const totalPayments = user.account.paymentHistory.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
        const balance = user.account.totalDebt - totalPayments;
        
        const lateFee = balance * (user.account.lateFeeRate / 100);
        
        // Se añade el cargo por mora a la deuda total.
        user.account.totalDebt += lateFee;
        
        // Se registra la transacción de mora
        user.account.paymentHistory.push({
            amount: lateFee,
            date: new Date().toISOString(),
            type: 'late_fee'
        });
        
        // Se avanza la fecha de vencimiento al siguiente ciclo
        user.account.nextDueDate = getNextDueDate(user.account.nextDueDate, user.account.paymentPlan.frequency).toISOString();
        
        manageClientModal.classList.add('hidden');
        renderClientList();
    }

    function handleGeneratePlans(event) {
        event.preventDefault();
        const errorMessage = document.getElementById('create-error-message');
        
        const newUsername = document.getElementById('new-username').value.toLowerCase().trim();
        if (users[newUsername]) {
            errorMessage.textContent = 'El nombre de usuario ya existe.';
            errorMessage.classList.add('show');
            return;
        }

        tempNewClientData = {
            username: newUsername,
            password: document.getElementById('new-password').value,
            role: 'cliente',
            profile: {
                fullName: document.getElementById('new-fullname').value.trim(),
                address: document.getElementById('new-address').value,
                contact: document.getElementById('new-contact').value,
                idNumber: document.getElementById('new-idnumber').value
            },
            account: {
                totalDebt: parseFloat(document.getElementById('initial-debt').value),
                paymentHistory: [],
                paymentPlan: {},
                lateFeeRate: parseFloat(document.getElementById('late-fee-rate').value),
                nextDueDate: null
            }
        };

        const initialDebt = tempNewClientData.account.totalDebt;
        const termInMonths = parseInt(document.getElementById('loan-term').value);
        const monthlyInterestRateInput = parseFloat(document.getElementById('interest-rate').value);

        calculateAndShowPlans(initialDebt, termInMonths, monthlyInterestRateInput);

        createClientModal.classList.add('hidden');
        paymentPlanModal.classList.remove('hidden');
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
        tempNewClientData.account.paymentPlan = planData;
        tempNewClientData.account.nextDueDate = getNextDueDate(new Date(), planData.frequency).toISOString();
        
        users[tempNewClientData.username] = tempNewClientData;

        tempNewClientData = null;
        paymentPlanModal.classList.add('hidden');
        createClientForm.reset();
        renderClientList();
    }

    // --- LÓGICA DE CÁLCULO Y VISTAS ---

    function calculateAndShowPlans(principal, termInMonths, monthlyInterest) {
        const container = document.getElementById('plan-options-container');
        container.innerHTML = ''; // Limpiar opciones anteriores

        const monthlyInterestRate = monthlyInterest / 100;

        const monthlyPayment = monthlyInterestRate > 0 ?
            principal * [monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termInMonths)] / [Math.pow(1 + monthlyInterestRate, termInMonths) - 1] :
            principal / termInMonths;
        const totalMonthly = monthlyPayment * termInMonths;
        
        const biweeklyPayment = monthlyPayment / 2;
        const weeklyPayment = monthlyPayment / 4;

        const plans = [
            { name: 'Plan Mensual', frequency: 'Mensual', amount: monthlyPayment, total: totalMonthly, installments: termInMonths },
            { name: 'Plan Quincenal', frequency: 'Quincenal', amount: biweeklyPayment, total: biweeklyPayment * termInMonths * 2, installments: termInMonths * 2 },
            { name: 'Plan Semanal', frequency: 'Semanal', amount: weeklyPayment, total: weeklyPayment * termInMonths * 4, installments: termInMonths * 4 }
        ];

        plans.forEach((plan, index) => {
            const planData = JSON.stringify({ frequency: plan.frequency, amount: plan.amount });
            const planElement = document.createElement('label');
            planElement.className = 'plan-option';
            planElement.innerHTML = `
                <input type="radio" name="payment-plan" value='${planData}' id="plan-${index}">
                <div class="plan-details">
                    <h4>${plan.name}</h4>
                    <p>${plan.installments} cuotas de <strong>RD$ ${plan.amount.toFixed(2)}</strong></p>
                    <p class="plan-total">Total a pagar: RD$ ${plan.total.toFixed(2)}</p>
                </div>
            `;
            container.appendChild(planElement);
        });
    }

    function showClientDashboard(userData) {
        clientDashboard.classList.remove('hidden');
        const totalPayments = userData.account.paymentHistory.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
        const balance = userData.account.totalDebt - totalPayments;

        document.getElementById('client-welcome').textContent = `Bienvenido, ${userData.profile.fullName}`;
        document.getElementById('client-address').textContent = userData.profile.address;
        document.getElementById('client-contact').textContent = userData.profile.contact;
        document.getElementById('client-id').textContent = userData.profile.idNumber;
        document.getElementById('total-debt').textContent = userData.account.totalDebt.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('payments-made').textContent = totalPayments.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('current-balance').textContent = balance.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        
        renderPaymentHistory(userData.account.paymentHistory);
        
        const planCard = document.getElementById('client-plan-card');
        if (userData.account.paymentPlan && userData.account.paymentPlan.frequency) {
            const dueDate = new Date(userData.account.nextDueDate);
            document.getElementById('plan-frequency').textContent = userData.account.paymentPlan.frequency;
            document.getElementById('plan-amount').textContent = userData.account.paymentPlan.amount.toFixed(2);
            document.getElementById('plan-due-date').textContent = dueDate.toLocaleDateString('es-DO');
            planCard.classList.remove('hidden');

            if (isLate(dueDate)) {
                document.getElementById('late-fee-warning').classList.remove('hidden');
            } else {
                document.getElementById('late-fee-warning').classList.add('hidden');
            }

        } else {
            planCard.classList.add('hidden');
        }
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
            const transactionDate = new Date(transaction.date);
            const formattedDate = transactionDate.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
            const isFee = transaction.type === 'late_fee';
            const description = isFee ? 'Cargo por Mora' : 'Pago Realizado';
            const rowClass = isFee ? 'transaction-late-fee' : '';
            
            tableHTML += `
                <tr class="${rowClass}">
                    <td>${formattedDate}</td>
                    <td>${description}</td>
                    <td>RD$ ${transaction.amount.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
            const totalPayments = client.account.paymentHistory.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
            const balance = client.account.totalDebt - totalPayments;
            const lateStatus = isLate(new Date(client.account.nextDueDate)) ? '<span class="status-late">Atrasado</span>' : '';

            tableHTML += `
                <tr>
                    <td>${client.profile.fullName} ${lateStatus}</td>
                    <td>RD$ ${client.account.totalDebt.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>RD$ ${totalPayments.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>RD$ ${balance.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
        
        const lateFeeSection = document.getElementById('late-fee-section');
        if (isLate(new Date(user.account.nextDueDate))) {
            lateFeeSection.classList.remove('hidden');
            applyLateFeeButton.dataset.username = username;
        } else {
            lateFeeSection.classList.add('hidden');
        }

        manageClientModal.classList.remove('hidden');
    }

    // --- FUNCIONES DE UTILIDAD ---
    
    function isLate(dueDate) {
        if (!dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparar solo fechas
        return dueDate < today;
    }

    function getNextDueDate(currentDate, frequency) {
        const date = new Date(currentDate);
        switch (frequency) {
            case 'Mensual':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'Quincenal':
                date.setDate(date.getDate() + 15);
                break;
            case 'Semanal':
                date.setDate(date.getDate() + 7);
                break;
        }
        return date;
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
                { amount: 5000, date: '2025-06-15T14:00:00Z', type: 'payment' },
                { amount: 10000, date: '2025-07-16T15:30:00Z', type: 'payment' }
            ],
            paymentPlan: { frequency: 'Mensual', amount: 5500 },
            lateFeeRate: 5, // 5%
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
                { amount: 25000, date: '2025-05-20T10:00:00Z', type: 'payment' },
                { amount: 25000, date: '2025-06-20T11:00:00Z', type: 'payment' }
            ],
            paymentPlan: { frequency: 'Mensual', amount: 12500 },
            lateFeeRate: 4.5, // 4.5%
            nextDueDate: '2025-07-20T11:00:00Z' // Esta fecha está en el pasado, por lo que estará atrasada
        }
    },
    'carlosrodriguez': {
        password: '789',
        role: 'cliente',
        profile: { fullName: 'Carlos Rodríguez', address: 'Plaza Central, Local 5, Punta Cana', contact: '849-555-0101', idNumber: '003-1122334-5' },
        account: { 
            totalDebt: 2500, 
            paymentHistory: [],
            paymentPlan: {},
            lateFeeRate: 6,
            nextDueDate: null
        }
    },
    'admin': {
        password: 'admin',
        role: 'administrador',
        profile: { fullName: 'Administrador Principal' }
    }
};
