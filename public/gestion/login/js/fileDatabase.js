/***
// FileDatabase.js - Sistema de base de datos basado en archivos JSON
class FileDatabase {
    constructor() {
        this.dbPath = './db/'; // Carpeta donde se guardan los archivos
        this.collections = {
            users: 'users.json',
            clients: 'clients.json',
            reservations: 'reservations.json',
            invoices: 'invoices.json'
        };
        this.cache = {}; // Cache en memoria para mejor rendimiento
        this.initialized = false;
    }

    async initialize() {
        console.log('Inicializando FileDatabase...');
        
        // Verificar si existe la estructura de archivos
        try {
            await this.ensureDbStructure();
            await this.loadAllToCache();
            this.initialized = true;
            console.log('✅ FileDatabase inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando FileDatabase:', error);
            throw error;
        }
    }

    async ensureDbStructure() {
        // Verificar/crear estructura de archivos
        for (const [collection, filename] of Object.entries(this.collections)) {
            try {
                await this.loadFromFile(filename);
            } catch (error) {
                // Si el archivo no existe, crear con estructura inicial
                console.log(`Creando archivo inicial: ${filename}`);
                await this.saveToFile(filename, []);
            }
        }
        
        // Verificar si necesitamos datos iniciales
        const users = await this.loadFromFile(this.collections.users);
        if (users.length === 0) {
            await this.seedInitialData();
        }
    }

    async loadFromFile(filename) {
        const fullPath = this.dbPath + filename;
        
        try {
            // En un entorno real, usarías fetch o fs
            // Para simulación, usamos localStorage como fallback
            const data = localStorage.getItem(`filedb_${filename}`);
            if (data) {
                return JSON.parse(data);
            } else {
                // Archivo no existe, retornar array vacío
                return [];
            }
        } catch (error) {
            console.error(`Error cargando ${filename}:`, error);
            return [];
        }
    }

    async saveToFile(filename, data) {
        const fullPath = this.dbPath + filename;
        
        try {
            // En un entorno real, usarías una API para guardar archivos
            // Para simulación, usamos localStorage
            localStorage.setItem(`filedb_${filename}`, JSON.stringify(data, null, 2));
            
            // También actualizar cache
            this.cache[filename] = [...data];
            
            console.log(`💾 Guardado: ${filename} (${data.length} registros)`);
            return true;
        } catch (error) {
            console.error(`Error guardando ${filename}:`, error);
            throw error;
        }
    }

    async loadAllToCache() {
        console.log('Cargando datos a cache...');
        for (const [collection, filename] of Object.entries(this.collections)) {
            this.cache[filename] = await this.loadFromFile(filename);
            console.log(`📂 ${collection}: ${this.cache[filename].length} registros`);
        }
    }

    // Método para exportar todos los datos (útil para backups)
    async exportAllData() {
        const exportData = {};
        
        for (const [collection, filename] of Object.entries(this.collections)) {
            exportData[collection] = this.cache[filename] || [];
        }
        
        const exportJson = JSON.stringify(exportData, null, 2);
        
        // Crear y descargar archivo
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📦 Backup exportado');
        return exportData;
    }

    // Método para importar datos
    async importData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            for (const [collection, records] of Object.entries(data)) {
                if (this.collections[collection]) {
                    await this.saveToFile(this.collections[collection], records);
                    console.log(`📥 Importados ${records.length} registros de ${collection}`);
                }
            }
            
            await this.loadAllToCache();
            console.log('✅ Importación completada');
        } catch (error) {
            console.error('❌ Error importando datos:', error);
            throw error;
        }
    }

    // CRUD Operations
    async getAll(collection) {
        if (!this.initialized) await this.initialize();
        
        const filename = this.collections[collection];
        if (!filename) throw new Error(`Colección ${collection} no existe`);
        
        return [...(this.cache[filename] || [])];
    }

    async get(collection, id) {
        const records = await this.getAll(collection);
        return records.find(record => record.id === id);
    }

    async add(collection, data) {
        if (!this.initialized) await this.initialize();
        
        const filename = this.collections[collection];
        if (!filename) throw new Error(`Colección ${collection} no existe`);
        
        const records = this.cache[filename] || [];
        
        // Generar ID único
        const newId = records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1;
        const newRecord = { ...data, id: newId };
        
        records.push(newRecord);
        await this.saveToFile(filename, records);
        
        console.log(`➕ Agregado a ${collection}:`, newId);
        return newId;
    }

    async update(collection, id, data) {
        if (!this.initialized) await this.initialize();
        
        const filename = this.collections[collection];
        if (!filename) throw new Error(`Colección ${collection} no existe`);
        
        const records = this.cache[filename] || [];
        const index = records.findIndex(record => record.id === id);
        
        if (index === -1) throw new Error(`Registro con ID ${id} no encontrado`);
        
        records[index] = { ...data, id };
        await this.saveToFile(filename, records);
        
        console.log(`✏️ Actualizado en ${collection}:`, id);
        return true;
    }

    async delete(collection, id) {
        if (!this.initialized) await this.initialize();
        
        const filename = this.collections[collection];
        if (!filename) throw new Error(`Colección ${collection} no existe`);
        
        const records = this.cache[filename] || [];
        const filteredRecords = records.filter(record => record.id !== id);
        
        if (filteredRecords.length === records.length) {
            throw new Error(`Registro con ID ${id} no encontrado`);
        }
        
        await this.saveToFile(filename, filteredRecords);
        
        console.log(`🗑️ Eliminado de ${collection}:`, id);
        return true;
    }

    async query(collection, filter) {
        const records = await this.getAll(collection);
        
        if (typeof filter === 'function') {
            return records.filter(filter);
        }
        
        // Filter object: { field: value }
        return records.filter(record => {
            return Object.entries(filter).every(([key, value]) => record[key] === value);
        });
    }

    async seedInitialData() {
        console.log('🌱 Sembrando datos iniciales...');
        
        try {
            // Crear usuario admin
            const { hash, salt } = await hashPassword('admin123');
            await this.add('users', {
                name: 'Administrador',
                email: 'admin@laquinta.com',
                password: hash,
                salt: salt,
                role: 'superadmin',
                createdAt: new Date().toISOString(),
                lastLogin: null
            });

            // Crear clientes de ejemplo
            const client1Id = await this.add('clients', {
                nombre: 'Carlos López',
                email: 'carlos@email.com',
                telefono: '+54 9 387 512-3456',
                dni: '30123456',
                createdAt: new Date().toISOString()
            });

            const client2Id = await this.add('clients', {
                nombre: 'Laura Fernández',
                email: 'laura@email.com',
                telefono: '+54 9 387 423-9876',
                dni: '29654321',
                createdAt: new Date().toISOString()
            });

            // Crear reserva de ejemplo
            const hoy = new Date();
            const manana = new Date(hoy);
            manana.setDate(hoy.getDate() + 1);

            await this.add('reservations', {
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
            });

            // Crear factura de ejemplo
            await this.add('invoices', {
                numero: 'F-0001-00001234',
                clienteId: client1Id,
                fecha: hoy.toISOString(),
                concepto: 'Reserva de evento',
                subtotal: 45000,
                iva: 5000,
                total: 50000,
                estado: 'pagada',
                createdAt: new Date().toISOString()
            });

            console.log('✅ Datos iniciales creados');
            console.log('📧 Email: admin@laquinta.com');
            console.log('🔑 Password: admin123');

        } catch (error) {
            console.error('❌ Error sembrando datos:', error);
            throw error;
        }
    }

    // Método para ver estructura de archivos (debug)
    async showStructure() {
        console.log('📁 Estructura de la base de datos:');
        for (const [collection, filename] of Object.entries(this.collections)) {
            const count = (this.cache[filename] || []).length;
            console.log(`  📄 ${filename} (${collection}): ${count} registros`);
        }
    }

    // Método para generar archivos reales (para desarrollo)
    generateRealFiles() {
        console.log('📝 Generando archivos JSON reales...');
        
        let fileContents = '';
        
        for (const [collection, filename] of Object.entries(this.collections)) {
            const data = this.cache[filename] || [];
            const jsonContent = JSON.stringify(data, null, 2);
            
            fileContents += `\n\n=== ${filename} ===\n`;
            fileContents += jsonContent;
            
            // También crear un blob para descarga individual
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            
            console.log(`📄 ${filename} preparado para descarga`);
        }
        
        // Crear archivo combinado
        const combinedBlob = new Blob([fileContents], { type: 'text/plain' });
        const combinedUrl = URL.createObjectURL(combinedBlob);
        const combinedLink = document.createElement('a');
        combinedLink.href = combinedUrl;
        combinedLink.download = 'db_structure.txt';
        combinedLink.textContent = 'Descargar todos los archivos DB';
        combinedLink.style.cssText = 'display: block; margin: 10px; padding: 10px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;';
        
        document.body.appendChild(combinedLink);
        
        console.log('💾 Archivos listos para descarga');
        console.log('Haz clic en el enlace azul que apareció en la página');
    }
}

***/