// auth.js - Versión adaptada para navegador

// 1. PRIMERO: Definir la clase FileDatabase para navegador
class FileDatabase {
    constructor() {
        this.storagePrefix = 'filedb_'; // Prefijo para localStorage
        this.collections = {
            users: 'users',
            clients: 'clients',
            reservations: 'reservations',
            invoices: 'invoices'
        };
        this.cache = {}; // Cache en memoria para mejor rendimiento
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return; // Evitar múltiples inicializaciones
        
        console.log('🔧 Inicializando FileDatabase para navegador...');
        
        // Inicializar colecciones vacías si no existen
        Object.values(this.collections).forEach(collection => {
            const key = this.storagePrefix + collection;
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
                console.log(`📁 Colección ${collection} inicializada`);
            }
        });
        
        // Marcar como inicializado ANTES de crear el admin
        this.initialized = true;
        
        // Crear usuario admin por defecto si no existe
        await this.createDefaultAdmin();
        
        console.log('✅ FileDatabase inicializada correctamente');
    }

    async createDefaultAdmin() {
        // Leer directamente de localStorage sin usar getAll para evitar bucle
        const users = this.readFromStorage('users');
        
        if (users.length === 0) {
            console.log('👤 Creando usuario admin por defecto...');
            
            // Hash de la contraseña "admin123"
            const { hash, salt } = await hashPassword('admin123');
            
            const adminUser = {
                id: this.generateId(),
                name: 'Administrador',
                email: 'admin@laquinta.com',
                password: hash,
                salt: salt,
                role: 'superadmin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLogin: null
            };
            
            users.push(adminUser);
            this.writeToStorage('users', users);
            this.cache['users'] = users; // Actualizar cache
            console.log('✅ Usuario admin creado:', adminUser.email);
        }
    }

    async getAll(collection) {
        if (!this.initialized) await this.initialize();
        
        try {
            // Verificar si existe en cache
            if (this.cache[collection]) {
                return [...this.cache[collection]]; // Devolver copia
            }

            // Leer de localStorage
            const data = this.readFromStorage(collection);
            this.cache[collection] = data;
            return [...data]; // Devolver copia
        } catch (error) {
            console.error(`❌ Error obteniendo ${collection}:`, error);
            return [];
        }
    }

    async get(collection, id) {
        const items = await this.getAll(collection);
        return items.find(item => item.id === id) || null;
    }

    async add(collection, data) {
        const items = await this.getAll(collection);
        const newItem = {
            id: this.generateId(),
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        items.push(newItem);
        await this.saveCollection(collection, items);
        return newItem.id;
    }

    async update(collection, id, data) {
        const items = await this.getAll(collection);
        const index = items.findIndex(item => item.id === id);
        
        if (index === -1) return false;
        
        items[index] = {
            ...items[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        await this.saveCollection(collection, items);
        return true;
    }

    async delete(collection, id) {
        const items = await this.getAll(collection);
        const filteredItems = items.filter(item => item.id !== id);
        
        if (filteredItems.length === items.length) return false;
        
        await this.saveCollection(collection, filteredItems);
        return true;
    }

    async query(collection, field, operator, value) {
        const items = await this.getAll(collection);
        
        return items.filter(item => {
            const fieldValue = item[field];
            
            switch (operator) {
                case '==':
                    return fieldValue === value;
                case '!=':
                    return fieldValue !== value;
                case '>':
                    return fieldValue > value;
                case '>=':
                    return fieldValue >= value;
                case '<':
                    return fieldValue < value;
                case '<=':
                    return fieldValue <= value;
                case 'array-contains':
                    return Array.isArray(fieldValue) && fieldValue.includes(value);
                default:
                    return false;
            }
        });
    }

    async saveCollection(collection, data) {
        try {
            this.cache[collection] = [...data]; // Guardar copia en cache
            this.writeToStorage(collection, data);
            console.log(`✅ ${collection} guardado exitosamente (${data.length} elementos)`);
        } catch (error) {
            console.error(`❌ Error guardando ${collection}:`, error);
            throw error;
        }
    }

    readFromStorage(collection) {
        try {
            const key = this.storagePrefix + collection;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`❌ Error leyendo ${collection} de localStorage:`, error);
            return [];
        }
    }

    writeToStorage(collection, data) {
        try {
            const key = this.storagePrefix + collection;
            localStorage.setItem(key, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`❌ Error escribiendo ${collection} en localStorage:`, error);
            throw error;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Métodos de utilidad y debug
    showStructure() {
        console.log('=== 📊 ESTRUCTURA DE LA BASE DE DATOS ===');
        Object.entries(this.collections).forEach(([key, collection]) => {
            const data = this.readFromStorage(collection);
            console.log(`📁 ${key.toUpperCase()}: ${data.length} elementos`);
            if (data.length > 0) {
                console.log(`   └─ Ejemplo:`, data[0]);
            }
        });
        console.log('=========================================');
    }

    exportAllData() {
        console.log('📤 Exportando backup completo...');
        const backup = {};
        
        Object.entries(this.collections).forEach(([key, collection]) => {
            backup[key] = this.readFromStorage(collection);
        });
        
        const dataStr = JSON.stringify(backup, null, 2);
        console.log('💾 Backup generado:', backup);
        
        // Crear archivo descargable
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laquinta_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        return backup;
    }

    generateRealFiles() {
        console.log('📄 Generando archivos JSON...');
        
        Object.entries(this.collections).forEach(([key, collection]) => {
            const data = this.readFromStorage(collection);
            const dataStr = JSON.stringify(data, null, 2);
            
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${collection}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        console.log('✅ Archivos JSON generados y descargados');
    }
}

// 2. Función hashPassword (sin cambios)
async function hashPassword(password, salt = null) {
    const encoder = new TextEncoder();
    
    let saltBytes;
    if (!salt) {
        saltBytes = crypto.getRandomValues(new Uint8Array(16));
    } else {
        saltBytes = new Uint8Array(salt.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
    }
    
    const passwordBytes = encoder.encode(password);
    const combined = new Uint8Array(passwordBytes.length + saltBytes.length);
    combined.set(passwordBytes);
    combined.set(saltBytes, passwordBytes.length);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
        hash: hashHex,
        salt: saltHex
    };
}

// 3. Clase AuthService
class AuthService {
    constructor(db) {
        this.db = db;
        this.currentUser = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            await this.db.initialize();
            this.checkRememberedUser();
            this.initialized = true;
            console.log('✅ AuthService inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando AuthService:', error);
            throw error;
        }
    }

    checkRememberedUser() {
        if (typeof localStorage !== 'undefined') {
            const rememberedEmail = localStorage.getItem('rememberedEmail');
            const emailInput = document.getElementById('email');
            const rememberCheckbox = document.getElementById('remember');
            
            if (rememberedEmail && emailInput) {
                emailInput.value = rememberedEmail;
                if (rememberCheckbox) {
                    rememberCheckbox.checked = true;
                }
            }
        }
    }

    async login(email, password, remember) {
        if (!this.initialized) await this.initialize();

        try {
            console.log('🔍 Buscando usuario:', email);
            const users = await this.db.getAll('users');
            console.log(`📊 Total usuarios en DB: ${users.length}`);
            
            const user = users.find(u => u.email === email);
            
            if (!user) {
                console.error('❌ Usuario no encontrado');
                console.log('📋 Usuarios disponibles:', users.map(u => ({ email: u.email, role: u.role })));
                throw new Error('Credenciales incorrectas');
            }

            console.log('✅ Usuario encontrado:', { id: user.id, email: user.email, role: user.role });
            
            // Verificar contraseña
            const { hash } = await hashPassword(password, user.salt);
            
            if (hash !== user.password) {
                console.error('❌ Contraseña incorrecta');
                throw new Error('Credenciales incorrectas');
            }

            // Actualizar último login
            const updatedUser = {
                ...user,
                lastLogin: new Date().toISOString()
            };
            await this.db.update('users', user.id, { lastLogin: updatedUser.lastLogin });
            this.currentUser = updatedUser;

            // Manejar "recordar usuario"
            if (remember) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
            console.log('🎉 Login exitoso');
            return updatedUser;
            
        } catch (error) {
            console.error('❌ Error en login:', error);
            throw error;
        }
    }

    async isAuthenticated() {
        if (!this.initialized) await this.initialize();

        if (this.currentUser) return true;

        const userJson = sessionStorage.getItem('currentUser');
        if (userJson) {
            try {
                this.currentUser = JSON.parse(userJson);
                return true;
            } catch (e) {
                console.error('Error parseando usuario de sessionStorage:', e);
                sessionStorage.removeItem('currentUser');
                return false;
            }
        }

        return false;
    }

    getCurrentUser() {
        return this.currentUser;
    }


    // Métodos de debug y administración
    async debugUsers() {
        const users = await this.db.getAll('users');
        console.log('=== 👥 DEBUG USUARIOS ===');
        users.forEach(user => {
            console.log(`ID: ${user.id} | Email: ${user.email} | Role: ${user.role} | Created: ${user.createdAt}`);
        });
        console.log('========================');
        return users;
    }

    async createUser(userData) {
        if (!this.initialized) await this.initialize();

        try {
            // Verificar que no exista el email
            const users = await this.db.getAll('users');
            const existingUser = users.find(u => u.email === userData.email);
            
            if (existingUser) {
                throw new Error('El email ya está registrado');
            }

            // Hashear contraseña
            const { hash, salt } = await hashPassword(userData.password);

            // Crear usuario
            const newUser = {
                name: userData.name,
                email: userData.email,
                password: hash,
                salt: salt,
                role: userData.role || 'user',
                lastLogin: null
            };

            const userId = await this.db.add('users', newUser);
            console.log('✅ Usuario creado con ID:', userId);
            return userId;

        } catch (error) {
            console.error('❌ Error creando usuario:', error);
            throw error;
        }
    }
}

// 4. Instancias globales
const fileDB = new FileDatabase();
const authService = new AuthService(fileDB);

// 5. Utilidades globales
window.dbUtils = {
    // Ver estructura de la DB
    showStructure: () => fileDB.showStructure(),
    
    // Exportar backup
    exportBackup: () => fileDB.exportAllData(),
    
    // Generar archivos JSON reales
    generateFiles: () => fileDB.generateRealFiles(),
    
    // Ver usuarios
    debugUsers: () => authService.debugUsers(),
    
    // Crear usuario admin manualmente
    createAdmin: async () => {
        try {
            const adminData = {
                name: 'Administrador Secundario',
                email: 'admin2@laquinta.com',
                password: 'admin456',
                role: 'admin'
            };
            
            const userId = await authService.createUser(adminData);
            console.log('✅ Usuario admin secundario creado con ID:', userId);
            return userId;
        } catch (error) {
            console.error('❌ Error creando admin:', error);
            return false;
        }
    },
    
    // Limpiar y recrear DB
    resetDB: async () => {
        console.log('🔄 Reseteando base de datos...');
        
        // Limpiar localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('filedb_')) {
                localStorage.removeItem(key);
            }
        });
        
        // Reinicializar
        fileDB.cache = {};
        fileDB.initialized = false;
        authService.initialized = false;
        authService.currentUser = null;
        
        await authService.initialize();
        console.log('✅ Base de datos reseteada');
    },
    
    // Ver datos de localStorage
    viewStorage: () => {
        console.log('=== 💾 CONTENIDO LOCALSTORAGE ===');
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('filedb_')) {
                const data = JSON.parse(localStorage.getItem(key));
                console.log(`${key}: ${data.length} elementos`);
            }
        });
        console.log('================================');
    }
};

// 6. Código para página de login
if (window.location.pathname.includes('login/login.html') || window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('📱 Página de login cargada');
        
        try {
            // Mensaje de carga
            const loadingMsg = document.createElement('div');
            loadingMsg.innerHTML = '⚙️ Inicializando sistema...';
            loadingMsg.style.cssText = `
                position: fixed; 
                top: 20px; 
                left: 50%; 
                transform: translateX(-50%); 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                padding: 15px 25px; 
                border-radius: 10px; 
                z-index: 1000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;
            document.body.appendChild(loadingMsg);
            
            // Inicializar sistema
            await authService.initialize();
            
            // Mostrar información de debug
            await authService.debugUsers();
            fileDB.showStructure();
            
            loadingMsg.innerHTML = '✅ Sistema listo - Credenciales: admin@laquinta.com / admin123';
            setTimeout(() => loadingMsg.remove(), 5000);
            
            // Agregar botón para herramientas de desarrollo
            const devToolsBtn = document.createElement('button');
            devToolsBtn.innerHTML = '🔧 Dev Tools';
            devToolsBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                z-index: 1000;
                font-size: 12px;
            `;
            devToolsBtn.onclick = () => {
                const menu = `
🔧 HERRAMIENTAS DE DESARROLLO

Disponibles en consola (F12):
• dbUtils.showStructure() - Ver estructura DB
• dbUtils.exportBackup() - Exportar backup JSON
• dbUtils.generateFiles() - Descargar archivos JSON
• dbUtils.debugUsers() - Ver usuarios
• dbUtils.createAdmin() - Crear admin adicional
• dbUtils.resetDB() - Resetear DB completa
• dbUtils.viewStorage() - Ver localStorage

Usuario por defecto:
📧 admin@laquinta.com
🔐 admin123
                `;
                alert(menu);
                console.log('🔧 Herramientas disponibles:', window.dbUtils);
            };
            document.body.appendChild(devToolsBtn);
            
            // Configurar formulario de login
            const loginForm = document.getElementById('login-form');
            if (!loginForm) {
                console.error('❌ Formulario de login no encontrado');
                return;
            }
            
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '⏳ Verificando...';
                
                try {
                    const email = document.getElementById('email').value.trim();
                    const password = document.getElementById('password').value;
                    const remember = document.getElementById('remember') ? document.getElementById('remember').checked : false;
                    
                    if (!email || !password) {
                        throw new Error('Email y contraseña son requeridos');
                    }
                    
                    console.log('🔐 Intentando login:', { email, remember });
                    await authService.login(email, password, remember);
                    
                    // Redirección exitosa
                    window.location.href = '../index/index.html';
                    
                } catch (error) {
                    console.error('❌ Error de login:', error);
                    
                    const errorElement = document.getElementById('login-error');
                    if (errorElement) {
                        errorElement.textContent = error.message;
                        errorElement.style.display = 'block';
                    } else {
                        alert('❌ Error: ' + error.message);
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
            
        } catch (error) {
            console.error('💥 Error crítico:', error);
            alert('Error crítico al inicializar. Revisa la consola para más detalles.');
        }
    });
}

// 7. Exportar para uso en otras páginas
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fileDB, authService, hashPassword };
}