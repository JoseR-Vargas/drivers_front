// Usar la configuración del archivo config.js
const API_URL = CONFIG.getDriversUrl();
const STORAGE_KEY = 'conductores_pendientes';

document.addEventListener('DOMContentLoaded', function() {
	const form = document.getElementById('formConductor');
	const mensaje = document.getElementById('mensaje');

	// Intentar enviar datos pendientes del storage al cargar la página
	intentarEnviarPendientes();

	form.addEventListener('submit', async function(e) {
		e.preventDefault();

		const paquetesEntregadosValue = document.getElementById('paquetesEntregados').value;
		const paquetesDevueltosValue = document.getElementById('paquetesDevueltos').value;
		const observacionesValue = document.getElementById('observaciones').value.trim();

		const formData = {
			nombreApellido: document.getElementById('nombreApellido').value.trim(),
			patente: document.getElementById('patente').value.trim(),
			ruta: document.getElementById('ruta').value.trim(),
			numeroPaquetes: parseInt(document.getElementById('numeroPaquetes').value) || 0,
			paquetesRecibidos: parseInt(document.getElementById('paquetesRecibidos').value) || 0,
			cantidadParadas: parseInt(document.getElementById('cantidadParadas').value) || 0,
			...(paquetesEntregadosValue && { paquetesEntregados: parseInt(paquetesEntregadosValue) }),
			...(paquetesDevueltosValue && { paquetesDevueltos: parseInt(paquetesDevueltosValue) }),
			...(observacionesValue && { observaciones: observacionesValue })
		};

		if (validarCamposObligatorios(formData)) {
			console.log('Datos a guardar:', formData);
			
			// Guardar en localStorage como respaldo
			guardarEnStorage(formData);
			
			try {
				const guardado = await guardarEnBackend(formData);
				if (guardado) {
					console.log('✓ Datos guardados correctamente en el backend');
					// Eliminar del storage si se guardó correctamente
					eliminarDelStorage(formData);
					form.reset();
					mostrarMensaje('Datos enviados correctamente', 'exito');
				} else {
					console.error('✗ Error al guardar los datos en el backend');
					mostrarMensaje('Error al guardar los datos. Los datos se guardaron localmente.', 'error');
				}
			} catch (error) {
				console.error('Error al guardar:', error);
				mostrarMensaje('Error al conectar con el servidor. Los datos se guardaron localmente.', 'error');
			}
		} else {
			console.warn('Validación fallida: Campos obligatorios incompletos');
			mostrarMensaje('Por favor, complete todos los campos obligatorios', 'error');
		}
	});

	function validarCamposObligatorios(data) {
		return data.nombreApellido !== '' &&
			data.patente !== '' &&
			data.ruta !== '' &&
			!isNaN(data.numeroPaquetes) &&
			data.numeroPaquetes >= 0 &&
			!isNaN(data.paquetesRecibidos) &&
			data.paquetesRecibidos >= 0 &&
			!isNaN(data.cantidadParadas) &&
			data.cantidadParadas >= 0;
	}

	async function guardarEnBackend(data) {
		try {
			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data)
			});

			if (response.ok) {
				const resultado = await response.json();
				console.log('Respuesta del servidor:', resultado);
				return true;
			} else {
				const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
				console.error('Error en la respuesta del servidor:', response.status, errorData);
				mostrarMensaje(`Error ${response.status}: ${errorData.message || 'Error al guardar los datos'}`, 'error');
				return false;
			}
		} catch (error) {
			console.error('Error al guardar en el backend:', error);
			throw error;
		}
	}

	function mostrarMensaje(texto, tipo) {
		mensaje.textContent = texto;
		mensaje.className = 'mensaje ' + tipo;
		setTimeout(function() {
			mensaje.className = 'mensaje';
			mensaje.textContent = '';
		}, 3000);
	}

	function guardarEnStorage(data) {
		try {
			const pendientes = obtenerPendientesDelStorage();
			// Agregar timestamp para identificar el registro
			const registroConTimestamp = {
				...data,
				timestamp: new Date().toISOString()
			};
			pendientes.push(registroConTimestamp);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(pendientes));
			console.log('Datos guardados en localStorage:', registroConTimestamp);
		} catch (error) {
			console.error('Error al guardar en localStorage:', error);
		}
	}

	function obtenerPendientesDelStorage() {
		try {
			const pendientes = localStorage.getItem(STORAGE_KEY);
			return pendientes ? JSON.parse(pendientes) : [];
		} catch (error) {
			console.error('Error al leer localStorage:', error);
			return [];
		}
	}

	function eliminarDelStorage(data) {
		try {
			const pendientes = obtenerPendientesDelStorage();
			const filtrados = pendientes.filter(function(item) {
				return !(
					item.nombreApellido === data.nombreApellido &&
					item.patente === data.patente &&
					item.ruta === data.ruta &&
					item.numeroPaquetes === data.numeroPaquetes &&
					item.paquetesRecibidos === data.paquetesRecibidos &&
					item.cantidadParadas === data.cantidadParadas
				);
			});
			localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrados));
		} catch (error) {
			console.error('Error al eliminar del localStorage:', error);
		}
	}

	async function intentarEnviarPendientes() {
		const pendientes = obtenerPendientesDelStorage();
		if (pendientes.length === 0) {
			return;
		}

		console.log(`Intentando enviar ${pendientes.length} registro(s) pendiente(s)...`);

		const pendientesExitosos = [];
		
		for (let i = 0; i < pendientes.length; i++) {
			const registro = pendientes[i];
			// Eliminar el timestamp antes de enviar
			const { timestamp, ...datosParaEnviar } = registro;
			
			try {
				const guardado = await guardarEnBackend(datosParaEnviar);
				if (guardado) {
					console.log('✓ Registro pendiente guardado:', datosParaEnviar);
					pendientesExitosos.push(registro);
				}
			} catch (error) {
				console.error('Error al enviar registro pendiente:', error);
			}
		}

		// Eliminar los registros que se enviaron correctamente
		if (pendientesExitosos.length > 0) {
			const pendientesRestantes = pendientes.filter(function(item) {
				return !pendientesExitosos.some(function(exitoso) {
					return exitoso.timestamp === item.timestamp;
				});
			});
			localStorage.setItem(STORAGE_KEY, JSON.stringify(pendientesRestantes));
			console.log(`✓ ${pendientesExitosos.length} registro(s) pendiente(s) enviado(s) correctamente`);
		}
	}
});
