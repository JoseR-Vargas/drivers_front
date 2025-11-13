// Configuración de la aplicación
const CONFIG = {
	// URLs del backend
	BACKEND_URLS: {
		LOCAL: 'http://localhost:3000',
		PRODUCTION: 'https://drivers-back-479x.onrender.com'
	},
	
	// Detectar si estamos en producción o local
	isProduction: function() {
		// Verificar si estamos en el dominio de producción
		const hostname = window.location.hostname;
		return hostname === 'driversform.netlify.app' || 
		       hostname.includes('netlify.app') ||
		       (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('localhost'));
	},
	
	// Obtener la URL del backend según el entorno
	getBackendUrl: function() {
		return this.isProduction() 
			? this.BACKEND_URLS.PRODUCTION 
			: this.BACKEND_URLS.LOCAL;
	},
	
	// Obtener la URL completa del endpoint de drivers
	getDriversUrl: function() {
		return `${this.getBackendUrl()}/drivers`;
	}
};

// Exportar configuración (compatible con navegadores)
if (typeof window !== 'undefined') {
	window.CONFIG = CONFIG;
	
	// Log de depuración (solo en desarrollo)
	if (!CONFIG.isProduction()) {
		console.log('🔧 Modo: LOCAL');
		console.log('📍 Backend URL:', CONFIG.getBackendUrl());
	} else {
		console.log('🚀 Modo: PRODUCCIÓN');
		console.log('📍 Backend URL:', CONFIG.getBackendUrl());
	}
}

