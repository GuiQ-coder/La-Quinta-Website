class ComponentManager {
    constructor() {
        this.cache = new Map();
        this.loadedComponents = new Set();
        this.initializedSections = new Set();
        this.currentSection = 'dashboard';
        this.components = {
            sidebar: 'components/sidebar.html',
            topbar: 'components/topbar.html',
            dashboard: 'sections/dashboard.html',
            calendario: 'sections/calendario.html',
            reservas: 'sections/reservas.html',
            clientes: 'sections/clientes.html',
            facturacion: 'sections/facturacion.html',
            reportes: 'sections/reportes.html',
            usuarios: 'sections/usuarios.html',
            configuracion: 'sections/configuracion.html'
        };
        this.modals = {
            reserva: 'modals/reserva-modal.html',
            cliente: 'modals/cliente-modal.html',
            factura: 'modals/factura-modal.html',
            usuario: 'modals/usuario-modal.html'
        };
        // Configuración de títulos por sección
        this.sectionTitles = {
            dashboard: {
                show: true,
                title: 'Dashboard',
                subtitle: 'Resumen general del sistema'
            },
            calendario: {
                show: false
            },
            reservas: {
                show: false
            },
            clientes: {
                show: false
            },
            facturacion: {
                show: false
            },
            reportes: {
                show: false
            },
            usuarios: {
                show: false
            },
            configuracion: {
                show: false
            }
        };
        this.eventHandlers = new Map();
        this.sectionInitializers = new Map();
        this.init();
    }

    async init() {
        this.showLoader();
        try {
            // Cargar componentes principales
            await this.loadComponent('sidebar', '#sidebar-container');
            await this.loadComponent('topbar', '#topbar-container');
            
            // Cargar sección inicial
            await this.loadSection('dashboard');
            
            // Cargar modales
            await this.loadAllModals();
            
            // Inicializar eventos globales
            this.initGlobalEvents();
            
        } catch (error) {
            console.error('Error inicializando componentes:', error);
            this.showError('Error cargando la aplicación');
        } finally {
            this.hideLoader();
        }
    }

    async loadComponent(componentName, targetSelector) {
        try {
            const componentPath = this.components[componentName];
            if (!componentPath) {
                throw new Error(`Componente ${componentName} no encontrado`);
            }

            // Verificar si ya está en caché
            if (this.cache.has(componentName)) {
                this.renderComponent(componentName, targetSelector);
                return;
            }

            // Cargar desde servidor
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Error cargando ${componentPath}: ${response.status}`);
            }

            const html = await response.text();
            this.cache.set(componentName, html);
            this.renderComponent(componentName, targetSelector);
            
            // Marcar como cargado
            this.loadedComponents.add(componentName);
            
            // Inicializar eventos específicos del componente
            this.initComponentEvents(componentName);

        } catch (error) {
            console.error(`Error cargando componente ${componentName}:`, error);
            throw error;
        }
    }

    renderComponent(componentName, targetSelector) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.error(`Target selector ${targetSelector} no encontrado`);
            return;
        }

        const html = this.cache.get(componentName);
        if (html) {
            target.innerHTML = html;
            this.triggerComponentEvent('componentLoaded', { componentName, targetSelector });
        }
    }

    async loadSection(sectionName) {
        try {
            // Ocultar sección actual
            this.hideSections();
            
            // Manejar visibilidad del título
            this.updateSectionTitle(sectionName);
            
            // Cargar nueva sección si no está cargada
            if (!this.loadedComponents.has(sectionName)) {
                await this.loadComponent(sectionName, `#${sectionName}-section-container`);
            }
            
            // Siempre mostrar la sección después de cargarla
            this.showSection(sectionName);
            
            // Actualizar estado
            this.currentSection = sectionName;
            this.updateActiveNavigation(sectionName);
            
            // Inicializar datos de la sección
            await this.initSectionData(sectionName);
            
        } catch (error) {
            console.error(`Error cargando sección ${sectionName}:`, error);
            this.showError(`Error cargando la sección ${sectionName}`);
        }
    }

    updateSectionTitle(sectionName) {
        const titleConfig = this.sectionTitles[sectionName];
        const titleContainer = document.querySelector('.section-content');
        
        if (!titleContainer) {
            console.warn('Contenedor de título no encontrado');
            return;
        }

        if (titleConfig && titleConfig.show) {
            // Mostrar título para esta sección
            titleContainer.style.display = 'block';
            
            // Actualizar contenido si está configurado
            if (titleConfig.title) {
                const titleElement = titleContainer.querySelector('h1, h2, .title');
                if (titleElement) {
                    titleElement.textContent = titleConfig.title;
                }
            }
            
            if (titleConfig.subtitle) {
                const subtitleElement = titleContainer.querySelector('.subtitle, .breadcrumb, p');
                if (subtitleElement) {
                    subtitleElement.textContent = titleConfig.subtitle;
                }
            }
        } else {
            // Ocultar título para esta sección
            titleContainer.style.display = 'none';
        }
    }

    async loadAllModals() {
        const modalContainer = document.getElementById('modals-container') || this.createModalsContainer();
        
        for (const [modalName, modalPath] of Object.entries(this.modals)) {
            try {
                const response = await fetch(modalPath);
                if (response.ok) {
                    const html = await response.text();
                    this.cache.set(`modal-${modalName}`, html);
                    
                    // Agregar al contenedor de modales
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    modalContainer.appendChild(tempDiv.firstElementChild);
                }
            } catch (error) {
                console.warn(`No se pudo cargar modal ${modalName}:`, error);
            }
        }
    }

    createModalsContainer() {
        const container = document.createElement('div');
        container.id = 'modals-container';
        document.body.appendChild(container);
        return container;
    }

    hideSections() {
        const sections = document.querySelectorAll('[id$="-section"]');
        sections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
    }

    showSection(sectionName) {
        const section = document.getElementById(`${sectionName}-section`);
        if (section) {
            section.classList.add('active');
            section.style.display = 'block';
        }
    }

    updateActiveNavigation(sectionName) {
        // Actualizar sidebar
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });
    }

    async initSectionData(sectionName) {
        // Inicializar datos específicos por sección
        switch (sectionName) {
            case 'dashboard':
                await this.initDashboard();
                break;
            case 'calendario':
                await this.initCalendario();
                break;
            case 'reservas':
                await this.initReservas();
                break;
            case 'clientes':
                await this.initClientes();
                break;
            case 'facturacion':
                await this.initFacturacion();
                break;
            case 'reportes':
                await this.initReportes();
                break;
            case 'usuarios':
                await this.initUsuarios();
                break;
            case 'configuracion':
                await this.initConfiguracion();
                break;
        }
    }

    initGlobalEvents() {
        // Navegación del sidebar
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link[data-section]');
            if (navLink) {
                e.preventDefault();
                const section = navLink.dataset.section;
                this.loadSection(section);
            }
        });

        // Cerrar sesión
        document.addEventListener('click', (e) => {
            if (e.target.matches('#logout-btn, #logout-btn-dropdown')) {
                e.preventDefault();
                this.logout();
            }
        });

        // Manejo de errores globales
        window.addEventListener('error', (e) => {
            console.error('Error global:', e.error);
            this.showError('Ha ocurrido un error inesperado');
        });
    }

    initComponentEvents(componentName) {
        switch (componentName) {
            case 'sidebar':
                this.initSidebarEvents();
                break;
            case 'topbar':
                this.initTopbarEvents();
                break;
        }
    }

    initSidebarEvents() {
        // Collapse sidebar en mobile
        const toggleBtn = document.querySelector('.sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('collapsed');
            });
        }
    }

    initTopbarEvents() {
        // Dropdown usuario
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            // Bootstrap ya maneja esto, pero podemos agregar lógica personalizada
        }

        // Notificaciones
        const notificationBell = document.querySelector('.notification-badge');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    // Métodos de inicialización por sección
    async initDashboard() {
        if (window.DashboardManager) {
            window.DashboardManager.init();
        }
    }

    async initCalendario() {
        try {
            console.log('Inicializando calendario...');
            
            // Verificar que la función global existe
            if (typeof window.initCalendario !== 'function') {
                throw new Error('Función initCalendario no encontrada. Asegúrate de que CalendarioManager.js esté cargado.');
            }
            
            // Llamar a la función de inicialización con las dependencias necesarias
            const result = await window.initCalendario(this.authService, this.fileDB);
            
            if (!result) {
                throw new Error('No se pudo inicializar el calendario');
            }
            
            console.log('Calendario inicializado correctamente');
            return true;
            
        } catch (error) {
            console.error('Error inicializando calendario:', error);
            
            // Mostrar mensaje de error al usuario
            const calendarContainer = document.querySelector('.calendar-container') || document.getElementById('calendar-content');
            if (calendarContainer) {
                calendarContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <h5>Error al cargar el calendario</h5>
                        <p>No se pudo inicializar el calendario. Error: ${error.message}</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">
                            Recargar página
                        </button>
                    </div>
                `;
            }
            
            return false;
        }
    }

    async loadAllModals() {
        const modalTypes = ['cliente', 'factura', 'usuario']; // los que necesites
        
        for (const modalType of modalTypes) {
            try {
                const modalContent = await this.loadModal(modalType);
                
                if (modalContent && typeof modalContent === 'string') {
                    const modalContainer = document.createElement('div');
                    modalContainer.innerHTML = modalContent;
                    document.body.appendChild(modalContainer);
                    console.log(`Modal ${modalType} cargado correctamente`);
                } else {
                    console.warn(`Modal ${modalType} no pudo ser cargado - contenido inválido`);
                }
            } catch (error) {
                console.error(`No se pudo cargar modal ${modalType}:`, error);
                // Continuar con el siguiente modal en lugar de fallar completamente
            }
        }
    }

    async initReservas() {
        if (window.ReservasManager) {
            window.ReservasManager.init();
        }
    }

    async initClientes() {
        if (window.ClientesManager) {
            window.ClientesManager.init();
        }
    }

    async initFacturacion() {
        if (window.FacturacionManager) {
            window.FacturacionManager.init();
        }
    }

    async initReportes() {
        if (window.ReportesManager) {
            window.ReportesManager.init();
        }
    }

    async initUsuarios() {
        if (window.UsuariosManager) {
            window.UsuariosManager.init();
        }
    }

    async initConfiguracion() {
        if (window.ConfiguracionManager) {
            window.ConfiguracionManager.init();
        }
    }

    // Utilidades para manejar títulos
    showTitleForSection(sectionName, title = null, subtitle = null) {
        this.sectionTitles[sectionName] = {
            show: true,
            title: title,
            subtitle: subtitle
        };
        
        if (this.currentSection === sectionName) {
            this.updateSectionTitle(sectionName);
        }
    }

    hideTitleForSection(sectionName) {
        this.sectionTitles[sectionName] = {
            show: false
        };
        
        if (this.currentSection === sectionName) {
            this.updateSectionTitle(sectionName);
        }
    }

    // Utilidades existentes
    showLoader() {
        let loader = document.getElementById('app-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.innerHTML = `
                <div class="loader-overlay">
                    <div class="loader-spinner">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    hideLoader() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showError(message) {
        // Crear toast de error
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // Contenedor de toasts
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);
        
        // Mostrar toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remover después de que se oculte
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    showNotifications() {
        // Implementar sistema de notificaciones
        console.log('Mostrar notificaciones');
    }

    logout() {
        // Confirmar logout
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            // Limpiar datos de sesión
            localStorage.removeItem('userSession');
            sessionStorage.clear();
            
            // Redireccionar a login
            window.location.href = '../login/login.html';
        }
    }

    // Eventos personalizados
    triggerComponentEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    onComponentEvent(eventName, handler) {
        document.addEventListener(eventName, handler);
    }

    // Método para refrescar componente
    async refreshComponent(componentName) {
        this.cache.delete(componentName);
        this.loadedComponents.delete(componentName);
        
        const targetSelector = this.getTargetSelector(componentName);
        if (targetSelector) {
            await this.loadComponent(componentName, targetSelector);
        }
    }

    getTargetSelector(componentName) {
        const selectors = {
            sidebar: '#sidebar-container',
            topbar: '#topbar-container',
            dashboard: '#dashboard-section-container',
            calendario: '#calendario-section-container',
            reservas: '#reservas-section-container',
            clientes: '#clientes-section-container',
            facturacion: '#facturacion-section-container',
            reportes: '#reportes-section-container',
            usuarios: '#usuarios-section-container',
            configuracion: '#configuracion-section-container'
        };
        return selectors[componentName];
    }

    // Gestión de estado
    getCurrentSection() {
        return this.currentSection;
    }

    isComponentLoaded(componentName) {
        return this.loadedComponents.has(componentName);
    }

    // Limpieza
    destroy() {
        this.cache.clear();
        this.loadedComponents.clear();
        this.eventHandlers.clear();
        
        // Remover event listeners globales si es necesario
        // (En este caso los eventos están delegados al document)
    }
}

// Instancia global
window.ComponentManager = ComponentManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.componentManager = new ComponentManager();
});

// Exportar para módulos ES6 si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentManager;
}