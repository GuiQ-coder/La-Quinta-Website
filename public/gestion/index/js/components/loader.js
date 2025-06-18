// Sistema de carga de componentes y secciones
class ComponentLoader {
    constructor() {
        this.loadedSections = new Set();
        this.components = {
            sidebar: 'components/sidebar.html',
            topbar: 'components/topbar.html'
        };
        
        this.sections = {
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
            usuario: 'modals/usuario-modal.html',
            factura: 'modals/factura-modal.html'
        };
    }

    async init() {
        try {
            // Cargar componentes principales
            await this.loadComponent('sidebar', 'sidebar-container');
            await this.loadComponent('topbar', 'topbar-container');
            
            // Cargar sección inicial (dashboard)
            await this.loadSection('dashboard');
            
            // Cargar modales principales
            await this.loadModal('reserva');
            
            // Configurar navegación
            this.setupNavigation();
            
            console.log('Componentes cargados exitosamente');
        } catch (error) {
            console.error('Error cargando componentes:', error);
        }
    }

    async loadComponent(componentName, containerId) {
        try {
            const response = await fetch(this.components[componentName]);
            if (!response.ok) throw new Error(`Error cargando ${componentName}`);
            
            const html = await response.text();
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
            }
        } catch (error) {
            console.error(`Error cargando componente ${componentName}:`, error);
        }
    }

        async loadSection(sectionName) {
        try {
            const container = document.getElementById('sections-container');
            if (!container) return;

            // Ocultar todas las secciones primero
            this.hideAllSections();

            // Verificar si ya está cargada
            let sectionElement = document.getElementById(`${sectionName}-section`);
            
            if (!sectionElement) {
                // Cargar nueva sección si no existe
                const response = await fetch(this.sections[sectionName]);
                if (!response.ok) throw new Error(`Error cargando sección ${sectionName}`);
                
                const html = await response.text();
                container.insertAdjacentHTML('beforeend', html);
                this.loadedSections.add(sectionName);
                sectionElement = document.getElementById(`${sectionName}-section`);
                
                // Inicializar scripts específicos
                this.initSectionScripts(sectionName);
            }

            // Mostrar la sección
            if (sectionElement) {
                sectionElement.classList.add('active');
                this.updateSectionTitle(sectionName);
            }
        } catch (error) {
            console.error(`Error cargando sección ${sectionName}:`, error);
        }
    }

     hideAllSections() {
        const container = document.getElementById('sections-container');
        if (!container) return;
        
        const sections = container.querySelectorAll('.section-content');
        sections.forEach(section => section.classList.remove('active'));
    }


    showSection(sectionName) {
        const container = document.getElementById('sections-container');
        if (!container) return;
        
        // Ocultar todas las secciones
        const sections = container.querySelectorAll('.section-content');
        sections.forEach(section => section.classList.remove('active'));
        
        // Mostrar la sección solicitada
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Actualizar título
        this.updateSectionTitle(sectionName);
    }

    async loadModal(modalName) {
        try {
            const response = await fetch(this.modals[modalName]);
            if (!response.ok) throw new Error(`Error cargando modal ${modalName}`);
            
            const html = await response.text();
            const container = document.getElementById('modals-container');
            
            if (container) {
                container.insertAdjacentHTML('beforeend', html);
            }
        } catch (error) {
            console.error(`Error cargando modal ${modalName}:`, error);
        }
    }

    setupNavigation() {
        // Eliminar listeners anteriores para evitar duplicados
        document.removeEventListener('click', this.navigationHandler);
        
        // Crear nuevo handler con referencia para poder removerlo
        this.navigationHandler = async (e) => {
            const navLink = e.target.closest('[data-section]');
            if (!navLink) return;
            
            e.preventDefault();
            const sectionName = navLink.dataset.section;
            
            // Actualizar estado activo en navegación
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            navLink.classList.add('active');
            
            // Cargar y mostrar sección
            await this.loadSection(sectionName);
        };
        
        // Agregar el nuevo listener
        document.addEventListener('click', this.navigationHandler);
    }

    updateSectionTitle(sectionName) {
        const titles = {
            dashboard: 'Dashboard',
            calendario: 'Calendario',
            reservas: 'Gestión de Reservas',
            clientes: 'Gestión de Clientes',
            facturacion: 'Gestión de Facturación',
            reportes: 'Reportes y Estadísticas',
            usuarios: 'Gestión de Usuarios',
            configuracion: 'Configuración'
        };
        
        const titleElement = document.getElementById('section-title');
        if (titleElement && titles[sectionName]) {
            titleElement.textContent = titles[sectionName];
        }
    }

    initSectionScripts(sectionName) {
        // Ejecutar scripts específicos para cada sección
        switch (sectionName) {
            case 'dashboard':
                this.initDashboard();
                break;
            case 'calendario':
                this.initCalendario();
                break;
            case 'reservas':
                this.initReservas();
                break;
            case 'clientes':
                this.initClientes();
                break;
            case 'facturacion':
                this.initFacturacion();
                break;
            case 'reportes':
                this.initReportes();
                break;
            case 'usuarios':
                this.initUsuarios();
                break;
            case 'configuracion':
                this.initConfiguracion();
                break;
        }
    }

    // Métodos de inicialización para cada sección
    initDashboard() {
        console.log('Inicializando Dashboard');
        // Aquí irían las funciones específicas del dashboard
    }

    initCalendario() {
        console.log('Inicializando Calendario');
        // Inicializar calendario
    }

    initReservas() {
        console.log('Inicializando Reservas');
        // Inicializar tabla de reservas
    }

    initClientes() {
        console.log('Inicializando Clientes');
        // Inicializar gestión de clientes
    }

    initFacturacion() {
        console.log('Inicializando Facturación');
        // Inicializar facturación
    }

    initReportes() {
        console.log('Inicializando Reportes');
        // Inicializar gráficos y reportes
    }

    initUsuarios() {
        console.log('Inicializando Usuarios');
        // Inicializar gestión de usuarios
    }

    initConfiguracion() {
        console.log('Inicializando Configuración');
        // Inicializar configuración
    }
}

// Inicializar el sistema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    window.componentLoader = new ComponentLoader();
    await window.componentLoader.init();
});

// Exportar para uso global
window.ComponentLoader = ComponentLoader;