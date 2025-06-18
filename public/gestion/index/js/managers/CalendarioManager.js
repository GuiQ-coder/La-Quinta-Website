// CalendarioManager.js
class CalendarioManager {
    constructor(authService, fileDB) {
        this.authService = authService;
        this.db = fileDB;
        this.currentDate = new Date();
        this.reservations = [];
        this.clients = [];
        this.selectedDate = null;
        
        // Bindear eventos
        this.prevMonth = this.prevMonth.bind(this);
        this.nextMonth = this.nextMonth.bind(this);
        this.goToToday = this.goToToday.bind(this);
        this.showNewReservationModal = this.showNewReservationModal.bind(this);
        this.renderCalendar = this.renderCalendar.bind(this);
        this.loadReservations = this.loadReservations.bind(this);
    }

    async initialize() {
        // Verificar autenticación
        if (!(await this.authService.isAuthenticated())) {
            console.error('Usuario no autenticado');
            return false;
        }

        // Cargar datos iniciales
        await this.loadReservations();
        await this.loadClients();

        // Configurar eventos
        document.getElementById('prev-month')?.addEventListener('click', this.prevMonth);
        document.getElementById('next-month')?.addEventListener('click', this.nextMonth);
        document.getElementById('current-month')?.addEventListener('click', this.goToToday);
        document.getElementById('btn-nueva-reserva-calendario')?.addEventListener('click', this.showNewReservationModal);

        // Renderizar calendario inicial
        this.renderCalendar();

        console.log('CalendarioManager inicializado correctamente');
        return true;
    }

    async loadReservations() {
        try {
            this.reservations = await this.db.getAll('reservations');
            console.log(`Reservas cargadas: ${this.reservations.length}`);
        } catch (error) {
            console.error('Error cargando reservas:', error);
            this.reservations = [];
        }
    }

    async loadClients() {
        try {
            this.clients = await this.db.getAll('clients');
            console.log(`Clientes cargados: ${this.clients.length}`);
        } catch (error) {
            console.error('Error cargando clientes:', error);
            this.clients = [];
        }
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }

    getMonthName(monthIndex) {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[monthIndex];
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Actualizar el título del mes/año
        const monthYearElement = document.getElementById('current-month-year');
        if (monthYearElement) {
            monthYearElement.textContent = `${this.getMonthName(month)} ${year}`;
        }

        // Obtener primer día del mes y último día del mes
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Obtener día de la semana del primer día (0-6 donde 0 es Domingo)
        const firstDayOfWeek = firstDay.getDay();
        
        // Obtener total de días en el mes
        const totalDays = lastDay.getDate();
        
        // Obtener días del mes anterior a mostrar
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const daysFromPrevMonth = firstDayOfWeek;
        
        // Obtener días del próximo mes a mostrar
        const totalCells = Math.ceil((totalDays + daysFromPrevMonth) / 7) * 7;
        const daysFromNextMonth = totalCells - (totalDays + daysFromPrevMonth);
        
        // Generar días del calendario
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;
        
        calendarGrid.innerHTML = '';
        
        // Días del mes anterior (si es necesario)
        for (let i = 0; i < daysFromPrevMonth; i++) {
            const day = prevMonthLastDay - daysFromPrevMonth + i + 1;
            const date = new Date(year, month - 1, day);
            this.createDayElement(calendarGrid, date, true);
        }
        
        // Días del mes actual
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(year, month, i);
            this.createDayElement(calendarGrid, date, false);
        }
        
        // Días del próximo mes (si es necesario)
        for (let i = 1; i <= daysFromNextMonth; i++) {
            const date = new Date(year, month + 1, i);
            this.createDayElement(calendarGrid, date, true);
        }
    }

    createDayElement(container, date, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        } else {
            dayElement.addEventListener('click', () => this.selectDate(date));
        }
        
        // Verificar si es hoy
        const today = new Date();
        if (date.getDate() === today.getDate() && 
            date.getMonth() === today.getMonth() && 
            date.getFullYear() === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        // Número del día
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);
        
        // Reservas para este día
        const reservationsForDay = this.getReservationsForDate(date);
        if (reservationsForDay.length > 0) {
            const reservationsContainer = document.createElement('div');
            reservationsContainer.className = 'day-reservations';
            
            // Mostrar hasta 3 reservas (el resto se muestra como "+X más")
            const maxVisible = 3;
            const visibleReservations = reservationsForDay.slice(0, maxVisible);
            const hiddenCount = reservationsForDay.length - maxVisible;
            
            visibleReservations.forEach(reservation => {
                const reservationElement = this.createReservationElement(reservation);
                reservationsContainer.appendChild(reservationElement);
            });
            
            if (hiddenCount > 0) {
                const moreElement = document.createElement('div');
                moreElement.className = 'reservation-more';
                moreElement.textContent = `+${hiddenCount} más`;
                reservationsContainer.appendChild(moreElement);
            }
            
            dayElement.appendChild(reservationsContainer);
        }
        
        container.appendChild(dayElement);
    }

    createReservationElement(reservation) {
        const element = document.createElement('div');
        element.className = 'reservation-item';
        element.dataset.reservationId = reservation.id;
        
        // Obtener nombre del cliente
        const client = this.clients.find(c => c.id === reservation.clientId) || { name: 'Cliente no encontrado' };
        
        // Formatear hora
        const startTime = new Date(reservation.startDate);
        const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        element.innerHTML = `
            <span class="reservation-time">${timeStr}</span>
            <span class="reservation-client">${client.name}</span>
        `;
        
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showReservationDetails(reservation);
        });
        
        return element;
    }

    getReservationsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.reservations.filter(reservation => {
            const reservationDate = new Date(reservation.startDate).toISOString().split('T')[0];
            return reservationDate === dateStr;
        }).sort((a, b) => {
            return new Date(a.startDate) - new Date(b.startDate);
        });
    }

    selectDate(date) {
        this.selectedDate = date;
        
        // Remover selección previa
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Agregar clase selected al día clickeado
        const dayElements = document.querySelectorAll('.calendar-day:not(.other-month)');
        const clickedDay = Array.from(dayElements).find(el => {
            const dayNumber = parseInt(el.querySelector('.day-number').textContent);
            return dayNumber === date.getDate();
        });
        
        if (clickedDay) {
            clickedDay.classList.add('selected');
        }
        
        // Mostrar detalles del día
        this.showDayDetails(date);
    }

    showDayDetails(date) {
        // Implementar lógica para mostrar detalles del día seleccionado
        console.log('Día seleccionado:', date);
        
        // Puedes implementar un modal o un panel lateral para mostrar más detalles
        const reservations = this.getReservationsForDate(date);
        const dateStr = date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        // Ejemplo simple con alert (reemplazar por tu implementación UI)
        if (reservations.length === 0) {
            alert(`No hay reservas para ${dateStr}`);
        } else {
            const reservationsList = reservations.map(r => {
                const client = this.clients.find(c => c.id === r.clientId) || { name: 'Cliente desconocido' };
                const startTime = new Date(r.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `${startTime} - ${client.name} (${r.status || 'confirmada'})`;
            }).join('\n');
            
            alert(`Reservas para ${dateStr}:\n\n${reservationsList}`);
        }
    }

    showReservationDetails(reservation) {
        // Implementar lógica para mostrar detalles de una reserva específica
        console.log('Mostrando detalles de reserva:', reservation);
        
        const client = this.clients.find(c => c.id === reservation.clientId) || { name: 'Cliente no encontrado' };
        const startDate = new Date(reservation.startDate);
        const endDate = new Date(reservation.endDate);
        
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">Detalles de Reserva</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">Cliente:</label>
                    <p class="form-control-static">${client.name}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label">Fecha:</label>
                    <p class="form-control-static">${startDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label">Hora:</label>
                    <p class="form-control-static">${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label">Estado:</label>
                    <p class="form-control-static">${reservation.status || 'Confirmada'}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label">Notas:</label>
                    <p class="form-control-static">${reservation.notes || 'Ninguna'}</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                <button type="button" class="btn btn-primary">Editar</button>
            </div>
        `;
        
        // Ejemplo simple con alert (reemplazar por tu implementación UI con Bootstrap Modal)
        alert(`Detalles de Reserva:\n\nCliente: ${client.name}\nFecha: ${startDate.toLocaleDateString()}\nHora: ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}\nEstado: ${reservation.status || 'Confirmada'}`);
    }

    showNewReservationModal() {
        const selectedDate = this.selectedDate || new Date();
        const defaultDate = selectedDate.toISOString().split('T')[0];
        const defaultTime = '12:00';
        
        // Implementar un modal de Bootstrap para nueva reserva
        // Aquí un ejemplo básico con prompt (reemplazar por tu implementación UI)
        const clientName = prompt('Nombre del cliente:');
        if (!clientName) return;
        
        const dateStr = prompt('Fecha (YYYY-MM-DD):', defaultDate);
        if (!dateStr) return;
        
        const timeStr = prompt('Hora (HH:MM):', defaultTime);
        if (!timeStr) return;
        
        const notes = prompt('Notas adicionales:');
        
        // Crear objeto de reserva
        const [hours, minutes] = timeStr.split(':').map(Number);
        const startDate = new Date(dateStr);
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 2); // Duración por defecto de 2 horas
        
        const newReservation = {
            clientName, // Temporal hasta que implementemos selección de cliente
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: 'confirmed',
            notes: notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Guardar la reserva
        this.saveReservation(newReservation);
    }

    async saveReservation(reservationData) {
        try {
            // Verificar si el cliente existe o crear uno nuevo
            let client = this.clients.find(c => c.name === reservationData.clientName);
            
            if (!client) {
                // Crear nuevo cliente (simplificado)
                client = {
                    name: reservationData.clientName,
                    email: '',
                    phone: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                client.id = await this.db.add('clients', client);
                this.clients.push(client);
                console.log('Nuevo cliente creado:', client);
            }
            
            // Crear objeto de reserva completo
            const reservation = {
                clientId: client.id,
                startDate: reservationData.startDate,
                endDate: reservationData.endDate,
                status: reservationData.status || 'confirmed',
                notes: reservationData.notes || '',
                userId: this.authService.getCurrentUser().id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Guardar en la base de datos
            const reservationId = await this.db.add('reservations', reservation);
            console.log('Reserva guardada con ID:', reservationId);
            
            // Actualizar lista local
            reservation.id = reservationId;
            this.reservations.push(reservation);
            
            // Volver a renderizar el calendario
            this.renderCalendar();
            
            return reservationId;
        } catch (error) {
            console.error('Error guardando reserva:', error);
            throw error;
        }
    }

    // Métodos para limpieza
    destroy() {
        document.getElementById('prev-month')?.removeEventListener('click', this.prevMonth);
        document.getElementById('next-month')?.removeEventListener('click', this.nextMonth);
        document.getElementById('current-month')?.removeEventListener('click', this.goToToday);
        document.getElementById('btn-nueva-reserva-calendario')?.removeEventListener('click', this.showNewReservationModal);
    }
}

// Estilos CSS recomendados para el calendario
const calendarStyles = `
<style>
.calendar-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.calendar-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    font-weight: bold;
    text-align: center;
    padding: 10px 0;
}

.calendar-day-name {
    padding: 5px;
    color: #495057;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-gap: 1px;
    background-color: #e9ecef;
}

.calendar-day {
    min-height: 100px;
    background-color: white;
    padding: 5px;
    position: relative;
    border: 1px solid #e9ecef;
}

.calendar-day.other-month {
    background-color: #f8f9fa;
    color: #adb5bd;
}

.calendar-day.today {
    background-color: #e3f2fd;
}

.calendar-day.selected {
    background-color: #d1e7ff;
    border: 2px solid #0d6efd;
}

.day-number {
    font-weight: bold;
    margin-bottom: 5px;
}

.day-reservations {
    overflow-y: auto;
    max-height: calc(100% - 20px);
}

.reservation-item {
    font-size: 12px;
    padding: 2px 5px;
    margin: 2px 0;
    background-color: #e2f0d9;
    border-radius: 3px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.reservation-item:hover {
    background-color: #d5e8c4;
}

.reservation-time {
    font-weight: bold;
    margin-right: 5px;
}

.reservation-more {
    font-size: 11px;
    color: #6c757d;
    text-align: center;
    margin-top: 3px;
}
</style>
`;

// Agregar estilos al documento
document.head.insertAdjacentHTML('beforeend', calendarStyles);

// Exportar para uso global
window.CalendarioManager = CalendarioManager;