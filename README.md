<h1> Sistema de Gestión de Deudores </h1>
<h2> 1. Resumen General </h2>

<p>Este proyecto es una aplicación web diseñada para la gestión simple y efectiva de cuentas de deudores. La plataforma permite dos tipos de acceso: un portal para clientes (deudores) donde pueden consultar el estado de sus cuentas, y un panel para administradores con herramientas para gestionar la información financiera de todos los clientes. </p>

El objetivo principal es ofrecer una interfaz clara y funcional que centralice la información de deudas y pagos, facilitando el seguimiento tanto para el deudor como para la entidad administradora.

<h2> 2. Características Principales </h2>

<h3> La aplicación se divide en las siguientes funcionalidades clave: </h3>

<h4> Sistema de Autenticación por Roles: </h4> 

Un portal de inicio de sesión seguro que diferencia entre usuarios de tipo Cliente y Administrador.

La validación se realiza verificando el nombre de usuario, la contraseña y el rol seleccionado, mostrando un mensaje de error en caso de que los datos sean incorrectos.

<h4> Panel de Cliente: </h4> 

Una vez que un cliente inicia sesión, accede a un panel personal y privado.

<h4> En este panel puede visualizar de forma clara: </h4> 

Información de Perfil: Sus datos personales como dirección, número de contacto y cédula de identidad.

Estado de Cuenta Detallado: Un resumen financiero que incluye el monto total de la deuda, la suma de todos los pagos realizados hasta la fecha y el balance pendiente actual.

<h4> Panel de Administrador: </h4> 

El administrador tiene acceso a una vista de gestión centralizada que le permite supervisar a todos los clientes.

<h4> El panel incluye: </h4> 

Una tabla con la lista completa de clientes, mostrando un resumen del estado financiero de cada uno (deuda total, pagos, balance).

La capacidad de realizar acciones de gestión sobre cada cliente.

<h4> Gestión de Cuentas (Funcionalidad del Administrador): </h4> 

Al hacer clic en el botón "Gestionar" de un cliente, se abre una ventana emergente (modal) que permite al administrador:

Registrar nuevos pagos: El monto ingresado se suma automáticamente al total de pagos del cliente.

Actualizar o modificar el monto total de la deuda si es necesario.

Todos los cambios se guardan y reflejan instantáneamente en el sistema.

<h2> 3. Aspectos Técnicos </h2>

<h3> Tecnologías Frontend: La aplicación está construida utilizando tecnologías web estándar: </h3>

HTML5: Para la estructura y el contenido de las páginas.

CSS3: Para el diseño, la paleta de colores (rojo, negro, blanco) y la apariencia moderna y minimalista. Se utilizan variables para un fácil mantenimiento del tema.

JavaScript (Vanilla JS): Para toda la lógica de la aplicación, incluyendo la validación de formularios, la manipulación del DOM (mostrar/ocultar vistas), el manejo de eventos y la lógica de negocio.

<h3> Manejo de Datos: </h3>

Actualmente, y para fines de demostración, toda la información de los usuarios y sus cuentas se almacena en un objeto de JavaScript directamente en el código. Esto simula una base de datos y permite que la aplicación sea completamente funcional en un entorno local sin necesidad de un servidor.
