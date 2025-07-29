Descripción del Proyecto: Sistema de Gestión de Deudores
1. Resumen General

Este proyecto es una aplicación web diseñada para la gestión simple y efectiva de cuentas de deudores. La plataforma permite dos tipos de acceso: un portal para clientes (deudores) donde pueden consultar el estado de sus cuentas, y un panel para administradores con herramientas para gestionar la información financiera de todos los clientes.

El objetivo principal es ofrecer una interfaz clara y funcional que centralice la información de deudas y pagos, facilitando el seguimiento tanto para el deudor como para la entidad administradora.

2. Características Principales

La aplicación se divide en las siguientes funcionalidades clave:

Sistema de Autenticación por Roles:

Un portal de inicio de sesión seguro que diferencia entre usuarios de tipo Cliente y Administrador.

La validación se realiza verificando el nombre de usuario, la contraseña y el rol seleccionado, mostrando un mensaje de error en caso de que los datos sean incorrectos.

Panel de Cliente:

Una vez que un cliente inicia sesión, accede a un panel personal y privado.

En este panel puede visualizar de forma clara:

Información de Perfil: Sus datos personales como dirección, número de contacto y cédula de identidad.

Estado de Cuenta Detallado: Un resumen financiero que incluye el monto total de la deuda, la suma de todos los pagos realizados hasta la fecha y el balance pendiente actual.

Panel de Administrador:

El administrador tiene acceso a una vista de gestión centralizada que le permite supervisar a todos los clientes.

El panel incluye:

Una tabla con la lista completa de clientes, mostrando un resumen del estado financiero de cada uno (deuda total, pagos, balance).

La capacidad de realizar acciones de gestión sobre cada cliente.

Gestión de Cuentas (Funcionalidad del Administrador):

Al hacer clic en el botón "Gestionar" de un cliente, se abre una ventana emergente (modal) que permite al administrador:

Registrar nuevos pagos: El monto ingresado se suma automáticamente al total de pagos del cliente.

Actualizar o modificar el monto total de la deuda si es necesario.

Todos los cambios se guardan y reflejan instantáneamente en el sistema.

3. Aspectos Técnicos

Tecnologías Frontend: La aplicación está construida utilizando tecnologías web estándar:

HTML5: Para la estructura y el contenido de las páginas.

CSS3: Para el diseño, la paleta de colores (rojo, negro, blanco) y la apariencia moderna y minimalista. Se utilizan variables para un fácil mantenimiento del tema.

JavaScript (Vanilla JS): Para toda la lógica de la aplicación, incluyendo la validación de formularios, la manipulación del DOM (mostrar/ocultar vistas), el manejo de eventos y la lógica de negocio.

Manejo de Datos:

Actualmente, y para fines de demostración, toda la información de los usuarios y sus cuentas se almacena en un objeto de JavaScript directamente en el código. Esto simula una base de datos y permite que la aplicación sea completamente funcional en un entorno local sin necesidad de un servidor.

4. Próximos Pasos y Mejoras Futuras

La base actual del proyecto es sólida y permite varias expansiones, como:

Integración con una Base de Datos Real: Conectar la aplicación a un servicio como Firebase (Firestore) para que los datos sean persistentes, seguros y se puedan acceder desde cualquier lugar.

Creación de Usuarios: Añadir una función para que el administrador pueda crear, editar o eliminar perfiles de clientes directamente desde su panel.

Historial de Transacciones: Guardar un registro de cada pago o modificación de deuda con su fecha, para que tanto el cliente como el administrador puedan ver un historial detallado.

Conexión a APIs Externas: Implementar llamadas a APIs reales para obtener y mostrar la tasa del dólar y la información del clima en tiempo real.

Vista previa
https://handhels-programmer.github.io/Deudores/
