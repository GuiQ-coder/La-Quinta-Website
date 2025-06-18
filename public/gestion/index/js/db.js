class LocalDatabase {
    constructor() {
        this.dbName = 'LaQuintaDB';
        this.dbVersion = 14; // Incrementa la versión para forzar recreación
        this.db = null;
    }

    async open() {
        return new Promise(async (resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error("Error al abrir la base de datos", event);
                reject('Error al abrir la base de datos');
            };
            
            request.onsuccess = async (event) => {
                this.db = event.target.result;
                console.log('Base de datos abierta con éxito, versión:', this.db.version);
                
                // AGREGADO: Verificar si necesitamos hacer seeding manual
                try {
                    const users = await this.getAll('users');
                    if (users.length === 0) {
                        console.log('No hay usuarios, ejecutando seeding manual...');
                        await this.seedInitialData();
                    }
                } catch (error) {
                    console.log('Error verificando usuarios, probablemente necesita seeding:', error);
                }
                
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                console.log('Actualización de DB necesaria, versión anterior:', event.oldVersion, 'nueva:', event.newVersion);
                const db = event.target.result;
                
                // Eliminar stores existentes si existen (para recrear limpio)
                const storeNames = ['users', 'reservations', 'clients', 'invoices'];
                storeNames.forEach(storeName => {
                    if (db.objectStoreNames.contains(storeName)) {
                        db.deleteObjectStore(storeName);
                        console.log(`Store ${storeName} eliminado`);
                    }
                });
                
                this.createObjectStores(db);
                
                // Sembrar datos después de que se complete la transacción de upgrade
                event.target.transaction.oncomplete = async () => {
                    console.log('Estructura DB creada, iniciando siembra de datos...');
                    try {
                        await this.seedInitialData();
                        console.log('Siembra completada exitosamente');
                    } catch (error) {
                        console.error('Error en siembra:', error);
                    }
                };
            };
        });
    }

    createObjectStores(db) {
        console.log('Creando object stores...');
        
        // Users store
        const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        usersStore.createIndex('email', 'email', { unique: true });
        console.log('Store users creado');
        
        // Reservations store
        const resStore = db.createObjectStore('reservations', { keyPath: 'id', autoIncrement: true });
        resStore.createIndex('date', 'fechaInicio', { unique: false });
        resStore.createIndex('clientId', 'clienteId', { unique: false });
        resStore.createIndex('status', 'estado', { unique: false });
        console.log('Store reservations creado');
        
        // Clients store
        const clientsStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
        clientsStore.createIndex('email', 'email', { unique: true });
        clientsStore.createIndex('dni', 'dni', { unique: true });
        console.log('Store clients creado');
        
        // Invoices store
        const invoicesStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
        invoicesStore.createIndex('number', 'numero', { unique: true });
        invoicesStore.createIndex('clientId', 'clienteId', { unique: false });
        invoicesStore.createIndex('date', 'fecha', { unique: false });
        console.log('Store invoices creado');
    }

    async seedInitialData() {
        try {
            console.log('=== INICIANDO SIEMBRA DE DATOS ===');
            
            // Verificar que no existan usuarios ya
            const existingUsers = await this.getAll('users');
            if (existingUsers.length > 0) {
                console.log('Ya existen usuarios, saltando siembra');
                return;
            }
            
            // Hashear la contraseña admin con salt
            const { hash, salt } = await hashPassword('admin123');
            console.log('Credenciales admin generadas');
            console.log('Hash:', hash.substring(0, 20) + '...');
            console.log('Salt:', salt);
            
            // Añadir usuario admin
            const adminUser = {
                name: 'Administrador',
                email: 'admin@laquinta.com',
                password: hash,
                salt: salt,
                role: 'superadmin',
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            
            const userId = await this.add('users', adminUser);
            console.log('✅ Usuario admin creado con ID:', userId);
            
            // Verificar que se creó correctamente
            const createdUser = await this.get('users', userId);
            console.log('Usuario verificado:', {
                id: createdUser.id,
                email: createdUser.email,
                hasPassword: !!createdUser.password,
                hasSalt: !!createdUser.salt
            });
            
            // Añadir clientes de ejemplo
            const client1 = {
                nombre: 'Carlos López',
                email: 'carlos@email.com',
                telefono: '+54 9 387 512-3456',
                dni: '30123456',
                createdAt: new Date().toISOString()
            };
            
            const client2 = {
                nombre: 'Laura Fernández',
                email: 'laura@email.com',
                telefono: '+54 9 387 423-9876',
                dni: '29654321',
                createdAt: new Date().toISOString()
            };
            
            const client1Id = await this.add('clients', client1);
            const client2Id = await this.add('clients', client2);
            console.log('✅ Clientes creados con IDs:', client1Id, client2Id);
            
            // Añadir reserva de ejemplo
            const hoy = new Date();
            const manana = new Date(hoy);
            manana.setDate(hoy.getDate() + 1);
            
            const reserva = {
                clienteId: client1Id,
                nombre: 'Carlos López',
                email: 'carlos@email.com',
                telefono: '+54 9 387 512-3456',
                tipoEvento: 'Cumpleaños',
                personas: 20,
                fechaInicio: hoy.toISOString(),
                fechaFin: manana.toISOString(),
                comentarios: 'Necesitamos mesa de postres',
                estado: 'confirmado',
                total: 50000,
                createdAt: new Date().toISOString()
            };
            
            const reservaId = await this.add('reservations', reserva);
            console.log('✅ Reserva creada con ID:', reservaId);
            
            // Añadir factura de ejemplo
            const factura = {
                numero: 'F-0001-00001234',
                clienteId: client1Id,
                fecha: hoy.toISOString(),
                concepto: 'Reserva de evento',
                subtotal: 45000,
                iva: 5000,
                total: 50000,
                estado: 'pagada',
                createdAt: new Date().toISOString()
            };
            
            const facturaId = await this.add('invoices', factura);
            console.log('✅ Factura creada con ID:', facturaId);
            
            console.log('=== SIEMBRA COMPLETADA EXITOSAMENTE ===');
            console.log('Credenciales de login:');
            console.log('Email: admin@laquinta.com');
            console.log('Password: admin123');
            
        } catch (error) {
            console.error('❌ Error en seedInitialData:', error);
            throw error;
        }
    }

    // Métodos CRUD genéricos
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => {
                console.log(`Registro añadido a ${storeName} con ID:`, request.result);
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error(`Error añadiendo a ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                console.log(`Obtenidos ${request.result.length} registros de ${storeName}`);
                resolve(request.result);
            };
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async update(storeName, id, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ ...data, id });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async query(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // AGREGADO: Método para limpiar completamente la DB (útil para debug)
    async clearAll() {
        const storeNames = ['users', 'reservations', 'clients', 'invoices'];
        for (const storeName of storeNames) {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        console.log('Todas las tablas limpiadas');
    }
}