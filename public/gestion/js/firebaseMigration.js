// Firebase Migration Script - Continuación
// Este script te ayudará a migrar de archivos JSON a Firebase

// 1. Configuración de Firebase
const firebaseConfig = {
    // Tu configuración de Firebase aquí
    apiKey: "tu-api-key",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "tu-app-id"
};

// 2. Clase FirebaseDatabase (para reemplazar FileDatabase)
class FirebaseDatabase {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.collections = ['users', 'clients', 'reservations', 'invoices'];
    }

    async initialize() {
        // Inicializar Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.firestore();
        this.initialized = true;
        console.log('✅ Firebase inicializado');
    }

    async getAll(collection) {
        if (!this.initialized) await this.initialize();
        
        try {
            const snapshot = await this.db.collection(collection).get();
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error(`Error obteniendo ${collection}:`, error);
            throw error;
        }
    }

    async get(collection, id) {
        if (!this.initialized) await this.initialize();
        
        try {
            const doc = await this.db.collection(collection).doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error(`Error obteniendo documento ${id}:`, error);
            throw error;
        }
    }

    async add(collection, data) {
        if (!this.initialized) await this.initialize();
        
        try {
            const docRef = await this.db.collection(collection).add(data);
            console.log(`✅ Documento agregado a ${collection}:`, docRef.id);
            return docRef.id;
        } catch (error) {
            console.error(`Error agregando a ${collection}:`, error);
            throw error;
        }
    }

    async update(collection, id, data) {
        if (!this.initialized) await this.initialize();
        
        try {
            await this.db.collection(collection).doc(id).update(data);
            console.log(`✅ Documento actualizado en ${collection}:`, id);
            return true;
        } catch (error) {
            console.error(`Error actualizando ${id}:`, error);
            throw error;
        }
    }

    async delete(collection, id) {
        if (!this.initialized) await this.initialize();
        
        try {
            await this.db.collection(collection).doc(id).delete();
            console.log(`✅ Documento eliminado de ${collection}:`, id);
            return true;
        } catch (error) {
            console.error(`Error eliminando ${id}:`, error);
            throw error;
        }
    }

    async query(collection, field, operator, value) {
        if (!this.initialized) await this.initialize();
        
        try {
            const snapshot = await this.db.collection(collection)
                .where(field, operator, value)
                .get();
            
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error(`Error en query ${collection}:`, error);
            throw error;
        }
    }

    // Método para migración por lotes (batch)
    async batchWrite(operations) {
        if (!this.initialized) await this.initialize();
        
        const batch = this.db.batch();
        operations.forEach(op => {
            const docRef = this.db.collection(op.collection).doc(op.id);
            if (op.type === 'set') {
                batch.set(docRef, op.data);
            } else if (op.type === 'update') {
                batch.update(docRef, op.data);
            } else if (op.type === 'delete') {
                batch.delete(docRef);
            }
        });
        
        await batch.commit();
        console.log(`✅ Batch completado: ${operations.length} operaciones`);
    }
}

// 3. Script de migración de datos
class MigrationTool {
    constructor(fromDB, toDB) {
        this.fromDB = fromDB; // FileDatabase
        this.toDB = toDB;     // FirebaseDatabase
        this.migrationLog = [];
    }

    async migrateAll() {
        console.log('🚀 Iniciando migración completa...');
        
        const collections = ['users', 'clients', 'reservations', 'invoices'];
        const migrationResults = {
            success: 0,
            errors: 0,
            total: 0
        };

        for (const collection of collections) {
            try {
                console.log(`📦 Migrando colección: ${collection}`);
                const result = await this.migrateCollection(collection);
                migrationResults.success += result.success;
                migrationResults.errors += result.errors;
                migrationResults.total += result.total;
                
                console.log(`✅ ${collection}: ${result.success}/${result.total} migrados`);
            } catch (error) {
                console.error(`❌ Error migrando ${collection}:`, error);
                migrationResults.errors++;
            }
        }

        console.log('🎉 Migración completada:');
        console.log(`   Total: ${migrationResults.total}`);
        console.log(`   Exitosos: ${migrationResults.success}`);
        console.log(`   Errores: ${migrationResults.errors}`);

        return migrationResults;
    }

    async migrateCollection(collectionName) {
        const result = { success: 0, errors: 0, total: 0 };
        
        try {
            // Obtener datos del sistema actual
            const data = await this.fromDB.getAll(collectionName);
            result.total = data.length;

            if (data.length === 0) {
                console.log(`   No hay datos en ${collectionName}`);
                return result;
            }

            // Migrar en lotes de 50 (límite de Firestore)
            const batchSize = 50;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                
                try {
                    await this.migrateBatch(collectionName, batch);
                    result.success += batch.length;
                } catch (error) {
                    console.error(`Error en lote ${i}-${i + batch.length}:`, error);
                    result.errors += batch.length;
                }
            }

        } catch (error) {
            console.error(`Error obteniendo datos de ${collectionName}:`, error);
            result.errors = result.total;
        }

        return result;
    }

    async migrateBatch(collectionName, items) {
        const operations = items.map(item => {
            // Limpiar datos antes de migrar
            const cleanData = this.cleanDataForFirestore(item);
            
            return {
                collection: collectionName,
                id: item.id || this.generateId(),
                type: 'set',
                data: cleanData
            };
        });

        await this.toDB.batchWrite(operations);
    }

    cleanDataForFirestore(data) {
        // Remover propiedades no válidas para Firestore
        const cleaned = { ...data };
        
        // Remover undefined values
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === undefined) {
                delete cleaned[key];
            }
        });

        // Convertir fechas a Timestamp si es necesario
        if (cleaned.createdAt && typeof cleaned.createdAt === 'string') {
            cleaned.createdAt = new Date(cleaned.createdAt);
        }
        if (cleaned.updatedAt && typeof cleaned.updatedAt === 'string') {
            cleaned.updatedAt = new Date(cleaned.updatedAt);
        }

        return cleaned;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    async validateMigration() {
        console.log('🔍 Validando migración...');
        const collections = ['users', 'clients', 'reservations', 'invoices'];
        
        for (const collection of collections) {
            const originalCount = (await this.fromDB.getAll(collection)).length;
            const migratedCount = (await this.toDB.getAll(collection)).length;
            
            console.log(`${collection}: Original=${originalCount}, Migrado=${migratedCount}`);
            
            if (originalCount !== migratedCount) {
                console.warn(`⚠️ Discrepancia en ${collection}`);
            } else {
                console.log(`✅ ${collection} migrado correctamente`);
            }
        }
    }

    async rollback() {
        console.log('🔄 Iniciando rollback...');
        const collections = ['users', 'clients', 'reservations', 'invoices'];
        
        for (const collection of collections) {
            try {
                const docs = await this.toDB.getAll(collection);
                console.log(`Eliminando ${docs.length} documentos de ${collection}`);
                
                for (const doc of docs) {
                    await this.toDB.delete(collection, doc.id);
                }
                
                console.log(`✅ ${collection} limpiado`);
            } catch (error) {
                console.error(`Error en rollback de ${collection}:`, error);
            }
        }
    }
}

// 4. Función principal de migración
async function executeMigration() {
    try {
        // Inicializar bases de datos
        const fileDB = new FileDatabase(); // Tu clase actual
        const firebaseDB = new FirebaseDatabase();
        
        await firebaseDB.initialize();
        
        // Crear herramienta de migración
        const migrator = new MigrationTool(fileDB, firebaseDB);
        
        // Ejecutar migración
        const results = await migrator.migrateAll();
        
        // Validar migración
        await migrator.validateMigration();
        
        console.log('🎉 Migración completada exitosamente');
        return results;
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    }
}

// 5. Funciones auxiliares
function createBackup() {
    console.log('💾 Creando backup de datos actuales...');
    // Implementar backup de archivos JSON actuales
    // Por ejemplo, copiar archivos a una carpeta backup/
}

async function testFirebaseConnection() {
    try {
        const testDB = new FirebaseDatabase();
        await testDB.initialize();
        console.log('✅ Conexión a Firebase exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a Firebase:', error);
        return false;
    }
}

// 6. Uso del script
async function main() {
    console.log('🔄 Iniciando proceso de migración a Firebase');
    
    // 1. Verificar conexión
    const connected = await testFirebaseConnection();
    if (!connected) {
        console.error('No se puede conectar a Firebase. Verifica tu configuración.');
        return;
    }
    
    // 2. Crear backup
    createBackup();
    
    // 3. Ejecutar migración
    await executeMigration();
    
    console.log('✨ Proceso completado');
}

// Exportar para uso
export { FirebaseDatabase, MigrationTool, executeMigration, main };

// Para ejecutar directamente:
// main().catch(console.error);