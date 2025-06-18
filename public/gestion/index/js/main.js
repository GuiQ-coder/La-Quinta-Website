// main.js - Funcionalidad principal del panel de gestión

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar la base de datos
    await localDB.open();
    
    // Cargar datos iniciales
    await loadInitialData();
    
    // Configurar navegación entre secciones
    setupNavigation();
    
    // Configurar eventos de los botones
    setupEventListeners();
    
    // Mostrar la sección activa
    showSection('dashboard');
});

async function loadInitialData() {
    // Cargar datos para el dashboard
    const reservations = await localDB.getAll('reservations');
    const clients = await localDB.getAll('clients');
    const invoices = await localDB.getAll('invoices');
    const users = await localDB.getAll('users');
    
    // Actualizar contadores del dashboard
    updateDashboardCounters(reservations, invoices);
    
    // Cargar próximas reservas
    loadUpcomingReservations(reservations);
    
    // Cargar facturas recientes
    loadRecentInvoices(invoices);
    
    // Cargar usuarios
    loadUsersList(users);
}

function setupEventListeners() {
    // Botón de nueva reserva (dashboard)
    document.getElementById('btn-nueva-reserva-dashboard')?.addEventListener('click', () => {
        showNewReservationModal();
    });
    
    // Botón de nuevo usuario (dashboard)
    document.getElementById('btn-nuevo-usuario')?.addEventListener('click', () => {
        showNewUserModal();
    });
    
    // Configurar otros eventos según sea necesario...

    document.getElementById('guardarReservaBtn')?.addEventListener('click', () => {
        saveReservation();
    });

    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('logout-btn-dropdown')?.addEventListener('click', logout);
}

// Funciones específicas para cada sección
class CustomCalendar {
    constructor() {
        this.currentDate = new Date();
        this.reservations = [];
        this.initElements();
        this.initEvents();
    }

    initElements() {
        this.calendarGrid = document.getElementById('calendar-grid');
        this.monthYearElement = document.getElementById('current-month-year');
        this.prevMonthBtn = document.getElementById('prev-month');
        this.nextMonthBtn = document.getElementById('next-month');
        this.currentMonthBtn = document.getElementById('current-month');
    }

    initEvents() {
        this.prevMonthBtn.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        this.nextMonthBtn.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        this.currentMonthBtn.addEventListener('click', () => {
            this.currentDate = new Date();
            this.renderCalendar();
        });
    }

    

async loadReservations() {
        try {
            this.reservations = await localDB.getAll('reservations');
            this.renderCalendar();
            
            // Actualizar tooltips después de renderizar
            setTimeout(() => {
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            }, 100);
        } catch (error) {
            console.error('Error cargando reservas:', error);
        }
    }

    renderCalendar() {
        // Actualizar el título del mes/año
        this.monthYearElement.textContent = this.currentDate.toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
        }).replace(/^\w/, c => c.toUpperCase());

        // Limpiar el grid
        this.calendarGrid.innerHTML = '';

        // Obtener primer día del mes y último día del mes
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

        // Obtener día de la semana del primer día (0-6 donde 0 es domingo)
        const firstDayOfWeek = firstDay.getDay();

        // Obtener último día del mes anterior para rellenar días vacíos
        const daysInLastMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 0).getDate();

        // Obtener el día actual para resaltarlo
        const today = new Date();
        const isCurrentMonth = today.getMonth() === this.currentDate.getMonth() && 
                             today.getFullYear() === this.currentDate.getFullYear();

        // Crear días del calendario
        let dayCount = 1;
        let nextMonthDayCount = 1;
        const totalCells = Math.ceil((firstDayOfWeek + lastDay.getDate()) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            if (i < firstDayOfWeek) {
                // Días del mes anterior
                const dayNumber = daysInLastMonth - (firstDayOfWeek - i - 1);
                dayElement.classList.add('other-month');
                dayElement.innerHTML = `<div class="calendar-day-number">${dayNumber}</div>`;
            } else if (dayCount <= lastDay.getDate()) {
                // Días del mes actual
                const currentDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), dayCount);
                
                // Resaltar día actual
                if (isCurrentMonth && dayCount === today.getDate()) {
                    dayElement.classList.add('today');
                }

                dayElement.innerHTML = `<div class="calendar-day-number">${dayCount}</div>`;
                
                // Agregar eventos/reservas para este día
                const dayReservations = this.getReservationsForDay(currentDay);
                this.renderDayReservations(dayElement, dayReservations, dayCount);
                
                // Agregar evento click al día
                dayElement.addEventListener('click', (e) => {
                    // Evitar que se active cuando se hace clic en un evento
                    if (!e.target.classList.contains('calendar-event') && 
                        !e.target.classList.contains('calendar-more-events')) {
                        this.showDayReservationsModal(currentDay, dayReservations);
                    }
                });
                
                dayCount++;
            } else {
                // Días del próximo mes
                dayElement.classList.add('other-month');
                dayElement.innerHTML = `<div class="calendar-day-number">${nextMonthDayCount}</div>`;
                nextMonthDayCount++;
            }

            this.calendarGrid.appendChild(dayElement);
        }
    }

    getReservationsForDay(date) {
        return this.reservations.filter(reservation => {
            const startDate = new Date(reservation.fechaInicio);
            const endDate = new Date(reservation.fechaFin);
            
            // Comprobar si la fecha está dentro del rango de la reserva
            return date >= startDate && date <= endDate;
        });
    }

    renderDayReservations(dayElement, reservations, dayNumber) {
        const maxVisibleEvents = 2; // Máximo de eventos visibles por día
        
        if (reservations.length === 0) return;

        // Ordenar por fecha de inicio
        reservations.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

        // Mostrar solo los primeros eventos
        const visibleEvents = reservations.slice(0, maxVisibleEvents);
        const hiddenEventsCount = reservations.length - maxVisibleEvents;

        visibleEvents.forEach(reservation => {
            const eventElement = document.createElement('div');
            eventElement.className = `calendar-event ${reservation.estado}`;
            eventElement.textContent = `${reservation.nombre} - ${reservation.tipoEvento}`;
            eventElement.title = `${reservation.nombre}\n${reservation.tipoEvento}\n${reservation.estado}`;
            
            // Agregar tooltip con más información
            eventElement.setAttribute('data-bs-toggle', 'tooltip');
            eventElement.setAttribute('data-bs-placement', 'top');
            eventElement.setAttribute('title', 
                `Cliente: ${reservation.nombre}\n` +
                `Evento: ${reservation.tipoEvento}\n` +
                `Personas: ${reservation.personas}\n` +
                `Estado: ${reservation.estado}`
            );
            
            dayElement.appendChild(eventElement);
        });

        // Mostrar contador de eventos adicionales si hay más
        if (hiddenEventsCount > 0) {
            const moreEventsElement = document.createElement('div');
            moreEventsElement.className = 'calendar-more-events';
            moreEventsElement.textContent = `+${hiddenEventsCount} más`;
            dayElement.appendChild(moreEventsElement);
        }
    }

    showDayReservationsModal(date, reservations) {
        const modalTitle = document.getElementById('modal-day-date');
        modalTitle.textContent = date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }).replace(/^\w/, c => c.toUpperCase());

        const reservationsList = document.getElementById('day-reservations-list');
        reservationsList.innerHTML = '';

        if (reservations.length === 0) {
            reservationsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-calendar-times fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No hay reservas para este día</p>
                </div>
            `;
        } else {
            reservations.forEach(reservation => {
                const clientName = reservation.nombre || 'Cliente no especificado';
                const eventType = reservation.tipoEvento || 'Evento no especificado';
                
                const reservationElement = document.createElement('div');
                reservationElement.className = 'card mb-2';
                reservationElement.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h6 class="card-title mb-1">${eventType}</h6>
                            <span class="badge ${getStatusBadgeClass(reservation.estado)}">
                                ${reservation.estado}
                            </span>
                        </div>
                        <p class="card-text mb-1"><small>${clientName}</small></p>
                        <p class="card-text mb-1"><small>${reservation.personas} personas</small></p>
                        <p class="card-text">
                            <small class="text-muted">
                                ${new Date(reservation.fechaInicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                ${new Date(reservation.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </small>
                        </p>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary me-1" data-id="${reservation.id}">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" data-id="${reservation.id}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        </div>
                    </div>
                `;
                reservationsList.appendChild(reservationElement);
            });
        }

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('dayReservationsModal'));
        modal.show();
    }
}

// Inicializar el calendario cuando se cargue la sección


function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmado':
            return 'bg-success';
        case 'pendiente':
            return 'bg-warning text-dark';
        case 'cancelado':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Funciones para mostrar modales
function showNewReservationModal() {
    // Limpiar formulario
    document.getElementById('reservaForm').reset();
    
    // Configurar fecha por defecto (hoy)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').value = today;
    document.getElementById('fechaFin').value = today;
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('reservaModal'));
    modal.show();
}

async function saveReservation() {
    const form = document.getElementById('reservaForm');
    const formData = new FormData(form);
    
    // Validación básica
    if (!formData.get('nombre') || !formData.get('fechaInicio') || !formData.get('fechaFin')) {
        alert('Por favor complete los campos obligatorios');
        return;
    }
    
    const reservationData = {
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        tipoEvento: formData.get('tipoEvento'),
        personas: parseInt(formData.get('personas')) || 1,
        fechaInicio: formData.get('fechaInicio'),
        fechaFin: formData.get('fechaFin'),
        comentarios: formData.get('comentarios'),
        estado: formData.get('estado') || 'pendiente',
        total: parseFloat(formData.get('total')) || 0,
        createdAt: new Date().toISOString()
    };
    
    try {
        await localDB.add('reservations', reservationData);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
        modal.hide();
        
        // Recargar datos
        if (document.getElementById('calendario-section').classList.contains('active')) {
            loadCalendar();
        } else if (document.getElementById('reservas-section').classList.contains('active')) {
            loadReservations();
        } else {
            loadInitialData(); // Para el dashboard
        }
        
        // Mostrar notificación
        showNotification('Reserva guardada correctamente', 'success');
    } catch (error) {
        console.error('Error guardando reserva:', error);
        showNotification('Error al guardar la reserva', 'danger');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 150);
    }, 5000);
}

async function loadReservations(filter = 'todas') {
    try {
        let reservations = await localDB.getAll('reservations');
        const clients = await localDB.getAll('clients');
        
        // Aplicar filtro
        if (filter !== 'todas') {
            reservations = reservations.filter(r => r.estado.toLowerCase() === filter.toLowerCase());
        }
        
        // Ordenar por fecha más reciente
        reservations.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
        
        // Mostrar en la tabla
        const tableBody = document.getElementById('reservas-list');
        tableBody.innerHTML = '';
        
        reservations.forEach(reservation => {
            const client = clients.find(c => c.email === reservation.email) || {};
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${reservation.id}</td>
                <td>${reservation.nombre} ${client.dni ? `(DNI: ${client.dni})` : ''}</td>
                <td>${new Date(reservation.fechaInicio).toLocaleDateString()} - ${new Date(reservation.fechaFin).toLocaleDateString()}</td>
                <td>${reservation.tipoEvento}</td>
                <td>${reservation.personas}</td>
                <td><span class="badge ${getStatusBadgeClass(reservation.estado)}">${reservation.estado}</span></td>
                <td>$${reservation.total.toLocaleString('es-AR')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 view-reservation" data-id="${reservation.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary me-1 edit-reservation" data-id="${reservation.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-reservation" data-id="${reservation.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Configurar eventos para los botones de acción
        document.querySelectorAll('.view-reservation').forEach(btn => {
            btn.addEventListener('click', () => viewReservation(btn.dataset.id));
        });
        
        document.querySelectorAll('.edit-reservation').forEach(btn => {
            btn.addEventListener('click', () => editReservation(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-reservation').forEach(btn => {
            btn.addEventListener('click', () => deleteReservation(btn.dataset.id));
        });
        
        // Configurar pestañas de filtro
        document.querySelectorAll('#reservasTabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#reservasTabs .nav-link').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadReservations(tab.dataset.status);
            });
        });
        
    } catch (error) {
        console.error('Error cargando reservas:', error);
        showNotification('Error al cargar las reservas', 'danger');
    }
}

async function viewReservation(id) {
    try {
        const reservation = await localDB.get('reservations', parseInt(id));
        if (!reservation) return;
        
        const modalTitle = document.getElementById('reservaModalLabel');
        const modalBody = document.getElementById('reservaForm');
        
        modalTitle.textContent = `Reserva #${reservation.id}`;
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Nombre del Cliente</label>
                        <p class="form-control-static">${reservation.nombre}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email</label>
                        <p class="form-control-static">${reservation.email || 'N/A'}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Teléfono</label>
                        <p class="form-control-static">${reservation.telefono || 'N/A'}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Tipo de Evento</label>
                        <p class="form-control-static">${reservation.tipoEvento}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Número de Personas</label>
                        <p class="form-control-static">${reservation.personas}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Estado</label>
                        <p class="form-control-static"><span class="badge ${getStatusBadgeClass(reservation.estado)}">${reservation.estado}</span></p>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Fecha de Inicio</label>
                        <p class="form-control-static">${new Date(reservation.fechaInicio).toLocaleDateString()} ${new Date(reservation.fechaInicio).toLocaleTimeString()}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Fecha de Fin</label>
                        <p class="form-control-static">${new Date(reservation.fechaFin).toLocaleDateString()} ${new Date(reservation.fechaFin).toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">Total</label>
                <p class="form-control-static">$${reservation.total.toLocaleString('es-AR')}</p>
            </div>
            <div class="mb-3">
                <label class="form-label">Comentarios</label>
                <p class="form-control-static">${reservation.comentarios || 'Ninguno'}</p>
            </div>
            <div class="mb-3">
                <label class="form-label">Fecha de Creación</label>
                <p class="form-control-static">${new Date(reservation.createdAt).toLocaleString()}</p>
            </div>
        `;
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('reservaModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viendo reserva:', error);
        showNotification('Error al cargar la reserva', 'danger');
    }
}

async function editReservation(id) {
    try {
        const reservation = await localDB.get('reservations', parseInt(id));
        if (!reservation) return;
        
        // Configurar modal para edición
        const modalTitle = document.getElementById('reservaModalLabel');
        const modalBody = document.getElementById('reservaForm');
        
        modalTitle.textContent = `Editar Reserva #${reservation.id}`;
        
        // Llenar formulario con datos existentes
        document.getElementById('nombre').value = reservation.nombre;
        document.getElementById('email').value = reservation.email || '';
        document.getElementById('telefono').value = reservation.telefono || '';
        document.getElementById('tipoEvento').value = reservation.tipoEvento || 'Cumpleaños';
        document.getElementById('personas').value = reservation.personas || 1;
        document.getElementById('estado').value = reservation.estado || 'pendiente';
        document.getElementById('fechaInicio').value = reservation.fechaInicio.split('T')[0];
        document.getElementById('fechaFin').value = reservation.fechaFin.split('T')[0];
        document.getElementById('total').value = reservation.total || '';
        document.getElementById('comentarios').value = reservation.comentarios || '';
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('reservaModal'));
        modal.show();
        
        // Cambiar el botón de guardar para actualizar en lugar de crear
        const saveBtn = document.getElementById('guardarReservaBtn');
        saveBtn.textContent = 'Actualizar Reserva';
        saveBtn.onclick = () => updateReservation(id);
        
    } catch (error) {
        console.error('Error editando reserva:', error);
        showNotification('Error al cargar la reserva para edición', 'danger');
    }
}

async function updateReservation(id) {
    const form = document.getElementById('reservaForm');
    const formData = new FormData(form);
    
    // Validación básica
    if (!formData.get('nombre') || !formData.get('fechaInicio') || !formData.get('fechaFin')) {
        alert('Por favor complete los campos obligatorios');
        return;
    }
    
    const reservationData = {
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        tipoEvento: formData.get('tipoEvento'),
        personas: parseInt(formData.get('personas')) || 1,
        fechaInicio: formData.get('fechaInicio'),
        fechaFin: formData.get('fechaFin'),
        comentarios: formData.get('comentarios'),
        estado: formData.get('estado') || 'pendiente',
        total: parseFloat(formData.get('total')) || 0
    };
    
    try {
        await localDB.update('reservations', parseInt(id), reservationData);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
        modal.hide();
        
        // Recargar datos
        if (document.getElementById('calendario-section').classList.contains('active')) {
            loadCalendar();
        } else {
            loadReservations();
        }
        
        // Mostrar notificación
        showNotification('Reserva actualizada correctamente', 'success');
    } catch (error) {
        console.error('Error actualizando reserva:', error);
        showNotification('Error al actualizar la reserva', 'danger');
    }
}

async function deleteReservation(id) {
    if (!confirm('¿Está seguro que desea eliminar esta reserva?')) return;
    
    try {
        await localDB.delete('reservations', parseInt(id));
        
        // Recargar datos
        if (document.getElementById('calendario-section').classList.contains('active')) {
            loadCalendar();
        } else {
            loadReservations();
        }
        
        // Mostrar notificación
        showNotification('Reserva eliminada correctamente', 'success');
    } catch (error) {
        console.error('Error eliminando reserva:', error);
        showNotification('Error al eliminar la reserva', 'danger');
    }
}

async function loadUsers(filter = 'todos') {
    try {
        let users = await localDB.getAll('users');
        
        // Aplicar filtro
        if (filter === 'activos') {
            users = users.filter(u => u.active !== false);
        } else if (filter === 'inactivos') {
            users = users.filter(u => u.active === false);
        } else if (filter === 'admin') {
            users = users.filter(u => u.role === 'admin' || u.role === 'superadmin');
        }
        
        // Mostrar en la tabla
        const tableBody = document.getElementById('usuarios-list');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="badge ${user.active !== false ? 'bg-success' : 'bg-secondary'}">${user.active !== false ? 'Activo' : 'Inactivo'}</span></td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-user" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger ${user.role === 'superadmin' ? 'd-none' : ''} delete-user" data-id="${user.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Configurar eventos para los botones de acción
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', () => editUser(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id));
        });
        
        // Configurar filtro
        document.getElementById('usuarios-filter')?.addEventListener('change', (e) => {
            loadUsers(e.target.value);
        });
        
        // Configurar búsqueda
        document.getElementById('btn-buscar-usuario')?.addEventListener('click', () => {
            const searchTerm = document.getElementById('buscar-usuario').value.toLowerCase();
            const rows = tableBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showNotification('Error al cargar los usuarios', 'danger');
    }
}

function showNewUserModal() {
    // Limpiar formulario
    document.getElementById('usuarioForm').reset();
    
    // Establecer valores por defecto
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-active').checked = true;
    
    // Cambiar título del modal
    document.getElementById('usuarioModalLabel').textContent = 'Nuevo Usuario';
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
    modal.show();
}

async function editUser(userId) {
    try {
        const user = await localDB.get('users', userId);
        
        if (!user) {
            showNotification('Usuario no encontrado', 'danger');
            return;
        }
        
        // Llenar formulario con datos del usuario
        document.getElementById('usuario-id').value = user.id;
        document.getElementById('usuario-name').value = user.name;
        document.getElementById('usuario-email').value = user.email;
        document.getElementById('usuario-role').value = user.role;
        document.getElementById('usuario-active').checked = user.active !== false;
        
        // Cambiar título del modal
        document.getElementById('usuarioModalLabel').textContent = 'Editar Usuario';
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error editando usuario:', error);
        showNotification('Error al cargar los datos del usuario', 'danger');
    }
}

async function deleteUser(userId) {
    try {
        const user = await localDB.get('users', userId);
        
        if (!user) {
            showNotification('Usuario no encontrado', 'danger');
            return;
        }
        
        // Prevenir eliminación de superadmin
        if (user.role === 'superadmin') {
            showNotification('No se puede eliminar un superadministrador', 'warning');
            return;
        }
        
        // Confirmar eliminación
        if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${user.name}"?`)) {
            await localDB.delete('users', userId);
            showNotification('Usuario eliminado correctamente', 'success');
            loadUsers(); // Recargar la lista
        }
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showNotification('Error al eliminar el usuario', 'danger');
    }
}

async function saveUser() {
    try {
        const form = document.getElementById('usuarioForm');
        const formData = new FormData(form);
        
        // Validar campos requeridos
        const name = formData.get('name')?.trim();
        const email = formData.get('email')?.trim();
        const role = formData.get('role');
        
        if (!name || !email || !role) {
            showNotification('Por favor completa todos los campos requeridos', 'warning');
            return;
        }
        
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('Por favor ingresa un email válido', 'warning');
            return;
        }
        
        const userId = document.getElementById('usuario-id').value;
        const isEditing = userId !== '';
        
        // Verificar si el email ya existe (solo para nuevos usuarios o si cambió el email)
        if (!isEditing || (isEditing && (await localDB.get('users', userId)).email !== email)) {
            const existingUsers = await localDB.getAll('users');
            const emailExists = existingUsers.some(u => u.email === email && u.id !== userId);
            
            if (emailExists) {
                showNotification('Ya existe un usuario con ese email', 'warning');
                return;
            }
        }
        
        const userData = {
            name: name,
            email: email,
            role: role,
            active: document.getElementById('usuario-active').checked,
            updatedAt: new Date().toISOString()
        };
        
        if (isEditing) {
            // Actualizar usuario existente
            const existingUser = await localDB.get('users', userId);
            userData.id = userId;
            userData.createdAt = existingUser.createdAt;
            await localDB.put('users', userData);
            showNotification('Usuario actualizado correctamente', 'success');
        } else {
            // Crear nuevo usuario
            userData.id = generateId();
            userData.createdAt = new Date().toISOString();
            userData.lastLogin = null;
            await localDB.put('users', userData);
            showNotification('Usuario creado correctamente', 'success');
        }
        
        // Cerrar modal y recargar lista
        const modal = bootstrap.Modal.getInstance(document.getElementById('usuarioModal'));
        modal.hide();
        loadUsers();
        
    } catch (error) {
        console.error('Error guardando usuario:', error);
        showNotification('Error al guardar el usuario', 'danger');
    }
}

// Función auxiliar para generar IDs únicos
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Función para mostrar notificaciones (debe estar implementada en tu aplicación)
function showNotification(message, type = 'info') {
    // Implementación básica con alert (reemplaza con tu sistema de notificaciones)
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Ejemplo con toast de Bootstrap si está disponible
    if (typeof bootstrap !== 'undefined') {
        const toastHtml = `
            <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">Notificación</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body bg-${type} text-white">
                    ${message}
                </div>
            </div>
        `;
        
        // Agregar toast al container (debes tener un container en tu HTML)
        const toastContainer = document.querySelector('.toast-container') || document.body;
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Eliminar toast después de que se oculte
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    } else {
        // Fallback a alert
        alert(message);
    }
}


async function logout() {
    try {
        // Aquí deberías agregar la lógica para cerrar sesión en Firebase si estás usando autenticación
        // await firebase.auth().signOut();
        
        // Redirigir a la página de login
        window.location.href = '../login/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showNotification('Error al cerrar sesión', 'danger');
    }
}

// Funciones para actualizar el dashboard
function updateDashboardCounters(reservations, invoices) {
    // Reservas este mes
    const currentMonth = new Date().getMonth();
    const monthlyReservations = reservations.filter(r => {
        const resDate = new Date(r.fechaInicio);
        return resDate.getMonth() === currentMonth;
    });
    document.getElementById('reservations-count').textContent = monthlyReservations.length;
    
    // Ingresos mensuales
    const monthlyIncome = monthlyReservations.reduce((sum, res) => sum + (res.total || 0), 0);
    document.getElementById('monthly-income').textContent = `$${monthlyIncome.toLocaleString()}`;
    
    // Ocupación (simplificado)
    const totalCapacity = 100; // Capacidad total hipotética
    const occupied = monthlyReservations.reduce((sum, res) => sum + (res.personas || 0), 0);
    const occupancyRate = Math.min(100, Math.round((occupied / totalCapacity) * 100));
    document.getElementById('occupancy-rate').textContent = `${occupancyRate}%`;
    
    // Reservas pendientes
    const pendingReservations = reservations.filter(r => r.estado === 'pendiente').length;
    document.getElementById('pending-reservations').textContent = pendingReservations;
}

function loadUpcomingReservations(reservations) {
    // Ordenar por fecha más cercana
    const upcoming = reservations
        .filter(r => new Date(r.fechaInicio) >= new Date())
        .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))
        .slice(0, 5);
    
    const listContainer = document.getElementById('proximas-reservas-list');
    listContainer.innerHTML = '';
    
    upcoming.forEach(res => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${res.nombre} - ${res.tipoEvento}</h6>
                <small>${new Date(res.fechaInicio).toLocaleDateString()}</small>
            </div>
            <p class="mb-1">${res.personas} personas</p>
            <small class="text-muted">Estado: <span class="${getStatusTextClass(res.estado)}">${res.estado}</span></small>
        `;
        listContainer.appendChild(item);
    });
}

function loadRecentInvoices(invoices) {
    // Ordenar por fecha más reciente
    const recent = invoices
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 3);
    
    const listContainer = document.getElementById('facturas-recientes-list');
    listContainer.innerHTML = '';
    
    recent.forEach(invoice => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${invoice.numero}</h6>
                <small>$${invoice.total.toLocaleString()}</small>
            </div>
            <p class="mb-1">${invoice.concepto}</p>
            <small class="text-muted">${new Date(invoice.fecha).toLocaleDateString()} - 
                <span class="${getStatusTextClass(invoice.estado)}">${invoice.estado}</span>
            </small>
        `;
        listContainer.appendChild(item);
    });
}

function loadUsersList(users) {
    const listContainer = document.getElementById('usuarios-list');
    listContainer.innerHTML = '';
    
    users.slice(0, 4).forEach(user => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="avatar me-3">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div>
                    <h6 class="mb-0">${user.name}</h6>
                    <small class="text-muted">${user.email}</small>
                </div>
                <span class="badge bg-primary ms-auto">${user.role}</span>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

function getStatusTextClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmado':
        case 'pagada':
            return 'text-success';
        case 'pendiente':
            return 'text-warning';
        case 'cancelado':
        case 'vencida':
            return 'text-danger';
        default:
            return 'text-secondary';
    }
}

function loadCalendar() {
    const calendar = new CustomCalendar();
    calendar.loadReservations();
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Botón de nueva reserva en el calendario
    document.getElementById('btn-nueva-reserva-calendario')?.addEventListener('click', () => {
        showNewReservationModal();
    });
}