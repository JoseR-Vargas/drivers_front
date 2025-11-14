// Usar la configuración del archivo config.js
const API_URL = CONFIG.getDriversUrl();

// Log de configuración al cargar
console.log('🌍 Entorno:', CONFIG.isProduction() ? 'PRODUCCIÓN' : 'LOCAL');
console.log('🔗 Backend URL:', CONFIG.getBackendUrl());
console.log('📍 Drivers URL:', API_URL);
console.log('🌐 Hostname:', window.location.hostname);

document.addEventListener('DOMContentLoaded', function() {
	const tbody = document.getElementById('tbodyConductores');
	const filtroFecha = document.getElementById('filtroFecha');
	const btnFiltrar = document.getElementById('btnFiltrar');
	const btnLimpiarFiltro = document.getElementById('btnLimpiarFiltro');
	const btnExportarExcel = document.getElementById('btnExportarExcel');
	const totalRegistros = document.getElementById('totalRegistros');
	const registrosMostrados = document.getElementById('registrosMostrados');

	let datosFiltrados = [];
	let fechaFiltro = null;

	// Mostrar mensaje de carga inicial
	tbody.innerHTML = '<tr><td colspan="11" class="no-data">🔄 Cargando datos...</td></tr>';
	
	cargarDatos();

	btnFiltrar.addEventListener('click', function() {
		fechaFiltro = filtroFecha.value;
		if (fechaFiltro) {
			filtrarPorFecha(fechaFiltro);
		} else {
			alert('Por favor, seleccione una fecha');
		}
	});

	btnLimpiarFiltro.addEventListener('click', function() {
		filtroFecha.value = '';
		fechaFiltro = null;
		cargarDatos();
	});

	btnExportarExcel.addEventListener('click', async function() {
		await exportarAExcel();
	});

	async function cargarDatos() {
		try {
			console.log('🔄 Cargando datos desde:', API_URL);
			const response = await fetch(API_URL);
			
			console.log('📡 Response status:', response.status);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('❌ Error response:', errorText);
				throw new Error(`Error ${response.status}: ${errorText}`);
			}
			
			const conductores = await response.json();
			console.log('✅ Datos cargados:', conductores.length, 'registros');
			
			totalRegistros.textContent = conductores.length;
			
			if (fechaFiltro) {
				await filtrarPorFecha(fechaFiltro);
			} else {
				datosFiltrados = conductores;
				renderizarTabla(conductores);
			}
		} catch (error) {
			console.error('❌ Error al cargar datos:', error);
			mostrarMensajeError(error.message);
		}
	}

	async function filtrarPorFecha(fecha) {
		try {
			const response = await fetch(`${API_URL}?fecha=${fecha}`);
			if (!response.ok) {
				throw new Error('Error al filtrar los datos');
			}
			datosFiltrados = await response.json();
			registrosMostrados.textContent = datosFiltrados.length;
			renderizarTabla(datosFiltrados);
		} catch (error) {
			console.error('Error al filtrar datos:', error);
			mostrarMensajeError();
		}
	}

	function renderizarTabla(datos) {
		if (datos.length === 0) {
			tbody.innerHTML = '<tr><td colspan="11" class="no-data">No hay datos disponibles</td></tr>';
			registrosMostrados.textContent = '0';
			return;
		}

		tbody.innerHTML = '';

		datos.forEach(function(conductor) {
			const fila = document.createElement('tr');
			const fecha = new Date(conductor.createdAt || conductor.fechaCreacion);
			const fechaFormateada = fecha.toLocaleDateString('es-ES', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});

			fila.innerHTML = `
				<td>${fechaFormateada}</td>
				<td>${conductor.nombreApellido || '-'}</td>
				<td>${conductor.patente || '-'}</td>
				<td>${conductor.ruta || '-'}</td>
				<td>${conductor.numeroPaquetes || '-'}</td>
				<td>${conductor.paquetesRecibidos || '-'}</td>
				<td>${conductor.cantidadParadas || '-'}</td>
				<td>${conductor.paquetesEntregados || '-'}</td>
				<td>${conductor.paquetesDevueltos || '-'}</td>
				<td>${conductor.observaciones || '-'}</td>
				<td>
					<button class="btn-delete" data-id="${conductor._id}" data-nombre="${(conductor.nombreApellido || 'este registro').replace(/"/g, '&quot;')}">
						Eliminar
					</button>
				</td>
			`;

			tbody.appendChild(fila);
			
			// Agregar event listener al botón de eliminar
			const btnDelete = fila.querySelector('.btn-delete');
			btnDelete.addEventListener('click', function() {
				const id = this.getAttribute('data-id');
				const nombre = this.getAttribute('data-nombre');
				eliminarRegistro(id, nombre);
			});
		});

		if (!fechaFiltro) {
			registrosMostrados.textContent = datos.length;
		}
	}

	async function exportarAExcel() {
		try {
			let datosParaExportar = datosFiltrados;
			
			if (!fechaFiltro && datosFiltrados.length === 0) {
				const response = await fetch(API_URL);
				if (!response.ok) {
					throw new Error('Error al obtener los datos');
				}
				datosParaExportar = await response.json();
			}

			if (datosParaExportar.length === 0) {
				alert('No hay datos para exportar');
				return;
			}

			const datosExcel = datosParaExportar.map(function(conductor) {
				const fecha = new Date(conductor.createdAt || conductor.fechaCreacion);
				const fechaFormateada = fecha.toLocaleDateString('es-ES', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit'
				});

				return {
					'Fecha': fechaFormateada,
					'Nombre y Apellido': conductor.nombreApellido || '',
					'Patente': conductor.patente || '',
					'Ruta': conductor.ruta || '',
					'Número de Paquetes': conductor.numeroPaquetes || '',
					'Paquetes Recibidos': conductor.paquetesRecibidos || '',
					'Cantidad de Paradas': conductor.cantidadParadas || '',
					'Paquetes Entregados': conductor.paquetesEntregados || '',
					'Paquetes Devueltos': conductor.paquetesDevueltos || '',
					'Observaciones': conductor.observaciones || ''
				};
			});

			const ws = XLSX.utils.json_to_sheet(datosExcel);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, 'Conductores');

			const fechaActual = new Date().toISOString().split('T')[0];
			const nombreArchivo = fechaFiltro 
				? `conductores_${fechaFiltro}.xlsx` 
				: `conductores_${fechaActual}.xlsx`;

			XLSX.writeFile(wb, nombreArchivo);
			console.log('Excel exportado correctamente:', nombreArchivo);
		} catch (error) {
			console.error('Error al exportar a Excel:', error);
			alert('Error al exportar el archivo Excel');
		}
	}

	function mostrarMensajeError(mensaje = 'Error al cargar los datos') {
		tbody.innerHTML = `<tr><td colspan="11" class="no-data">
			⚠️ ${mensaje}<br>
			<small style="margin-top: 10px; display: block;">
				API: ${API_URL}<br>
				Verifica la consola del navegador para más detalles.
			</small>
		</td></tr>`;
	}

	async function eliminarRegistro(id, nombre) {
		if (!confirm(`¿Está seguro de que desea eliminar el registro de ${nombre}?`)) {
			return;
		}

		try {
			const response = await fetch(`${API_URL}/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				console.log('Registro eliminado correctamente');
				// Recargar los datos después de eliminar
				await cargarDatos();
			} else {
				const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
				console.error('Error al eliminar:', response.status, errorData);
				alert(`Error al eliminar el registro: ${errorData.message || 'Error desconocido'}`);
			}
		} catch (error) {
			console.error('Error al eliminar registro:', error);
			alert('Error al conectar con el servidor');
		}
	}
});
