// --- EVENT LISTENERS ---
// Se ejecuta cuando todo el contenido de la página se ha cargado.
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

    // Asignación de eventos
    loginForm.addEventListener('submit', handleLogin);
    logoutButtons.forEach(button => button.addEventListener('click', handleLogout));
    closeModalButton.addEventListener('click', closeManagementModal);
    manageClientForm.addEventListener('submit', handleSaveChanges);
    clientListContainer.addEventListener('click', handleClientListClick);


    // --- HANDLERS (Manejadores de eventos) ---

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
            user.account.paymentsMade += newPayment;
        }

        if (!isNaN(newDebt)) {
            user.account.totalDebt = newDebt;
        }

        closeManagementModal();
        renderClientList(); // Refresca la lista para mostrar los cambios
    }


    // --- FUNCIONES DE LÓGICA DE VISTAS (Dashboards y Modal) ---

    function showClientDashboard(userData) {
        clientDashboard.classList.remove('hidden');
        const balance = userData.account.totalDebt - userData.account.paymentsMade;

        document.getElementById('client-welcome').textContent = `Bienvenido, ${userData.profile.fullName}`;
        document.getElementById('client-address').textContent = userData.profile.address;
        document.getElementById('client-contact').textContent = userData.profile.contact;
        document.getElementById('client-id').textContent = userData.profile.idNumber;
        document.getElementById('total-debt').textContent = userData.account.totalDebt.toLocaleString('es-DO');
        document.getElementById('payments-made').textContent = userData.account.paymentsMade.toLocaleString('es-DO');
        document.getElementById('current-balance').textContent = balance.toLocaleString('es-DO');
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
            const balance = client.account.totalDebt - client.account.paymentsMade;
            tableHTML += `
                <tr>
                    <td>${client.profile.fullName}</td>
                    <td>RD$ ${client.account.totalDebt.toLocaleString('es-DO')}</td>
                    <td>RD$ ${client.account.paymentsMade.toLocaleString('es-DO')}</td>
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
        manageClientForm.dataset.username = username; // Guardamos el username en el form
        manageClientModal.classList.remove('hidden');
    }

    function closeManagementModal() {
        manageClientModal.classList.add('hidden');
        manageClientForm.reset(); // Limpia los campos del formulario
    }
});


// --- BASE DE DATOS DE EJEMPLO ---
// En una aplicación real, estos datos vendrían de un servidor/base de datos.
const users = {
    'juanperez': {
        password: '123',
        role: 'cliente',
        profile: {
            fullName: 'Juan Pérez',
            address: 'Calle Falsa 123, Santo Domingo',
            contact: '809-123-4567',
            idNumber: '001-1234567-8'
        },
        account: {
            totalDebt: 50000,
            paymentsMade: 15000
        }
    },
    'mariagomez': {
        password: '456',
        role: 'cliente',
        profile: {
            fullName: 'Maria Gómez',
            address: 'Avenida Siempreviva 742, Santiago',
            contact: '829-987-6543',
            idNumber: '002-7654321-0'
        },
        account: {
            totalDebt: 125000,
            paymentsMade: 75000
        }
    },
    'carlosrodriguez': {
        password: '789',
        role: 'cliente',
        profile: {
            fullName: 'Carlos Rodríguez',
            address: 'Plaza Central, Local 5, Punta Cana',
            contact: '849-555-0101',
            idNumber: '003-1122334-5'
        },
        account: {
            totalDebt: 2500,
            paymentsMade: 0
        }
    },
    'admin': {
        password: 'admin',
        role: 'administrador',
        profile: {
            fullName: 'Administrador Principal',
        }
    }
};
